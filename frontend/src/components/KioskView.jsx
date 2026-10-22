import { useState, useEffect } from 'react'
import axios from 'axios'
import { useWS } from '../App'

const API_URL = 'http://10.107.53.96:8000'

function KioskView() {
  const [slots, setSlots]           = useState([])
  const [selected, setSelected]     = useState(null)
  const [driverName, setDriverName] = useState('')
  const [vehicleNo, setVehicleNo]   = useState('')
  const [step, setStep]             = useState('select')
  const [reservation, setReservation] = useState(null)
  const [payment, setPayment]       = useState(null)
  const [countdowns, setCountdowns] = useState({})
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  const fetchSlots = async () => {
    try {
      const res = await axios.get(`${API_URL}/slots`)
      setSlots(res.data)
    } catch (err) {
      setError('Cannot connect to server')
    }
  }

  const lastEvent = useWS()

  // Initial load
  useEffect(() => {
    fetchSlots()
  }, [])

  // Re-fetch on WebSocket event
  useEffect(() => {
    if (lastEvent) {
      fetchSlots()
    }
  }, [lastEvent])
  useEffect(() => {
  const timer = setInterval(() => {
    const now = new Date()

    setCountdowns(prev => {
      const updated = {}

      slots.forEach(slot => {
        if (
          slot.status === 'reserved' &&
          slot.updated_at
        ) {
          const expiresAt = new Date(
            new Date(slot.updated_at).getTime() +
            5 * 60 * 1000
          )

          const diff = expiresAt - now

          if (diff > 0) {
            const minutes = Math.floor(diff / 60000)
            const seconds = Math.floor((diff % 60000) / 1000)

            updated[slot.id] =
              `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          }
        }
      })

      return updated
    })
  }, 1000)

  return () => clearInterval(timer)
}, [slots])

  const getSlotColor = (slot) => {
    if (selected?.id === slot.id) return '#6366f1'
    if (slot.status === 'occupied') return '#ef4444'
    if (slot.status === 'reserved') return '#f59e0b'
    return '#22c55e'
  }

  const getSlotBg = (slot) => {
    if (selected?.id === slot.id) return '#1e1f3a'
    if (slot.status === 'occupied') return '#2d1515'
    if (slot.status === 'reserved') return '#2d2415'
    return '#152d1e'
  }

  const handleSlotClick = (slot) => {
    if (slot.status !== 'free') return
    setSelected(slot)
    setError(null)
  }

  const handleReserve = async () => {
    if (!driverName || !vehicleNo) {
      setError('Please enter your name and vehicle number')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post(
        `${API_URL}/slots/${selected.id}/reserve`,
        {
          driver_name:    driverName,
          vehicle_number: vehicleNo
        }
      )
      setReservation(res.data)
      setStep('payment')
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reservation failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/payments`, {
        reservation_id: reservation.id,
        amount:         50.00
      })
      setPayment(res.data)
      setStep('success')
      setError(null)
      fetchSlots()
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelected(null)
    setDriverName('')
    setVehicleNo('')
    setStep('select')
    setReservation(null)
    setPayment(null)
    setError(null)
    fetchSlots()
  }

  return (
    <div>
      <h1 style={styles.title}>Driver Kiosk</h1>
      <p style={styles.subtitle}>
        Select a free slot to reserve your parking space
      </p>

      {error && (
        <div style={styles.errorBox}>{error}</div>
      )}

      {/* Step 1 — Select Slot */}
      {step === 'select' && (
        <div>
          <div style={styles.grid}>
            {slots.map(slot => (
              <div
                key={slot.id}
                onClick={() => handleSlotClick(slot)}
                style={{
                  ...styles.slotCard,
                  backgroundColor: getSlotBg(slot),
                  borderColor:     getSlotColor(slot),
                  cursor: slot.status === 'free'
                    ? 'pointer' : 'not-allowed',
                  opacity: slot.status === 'occupied' ? 0.6 : 1,
                }}
              >
                <div style={styles.slotIcon}>
                  {slot.status === 'occupied' ? '🚗' :
                   slot.status === 'reserved' ? '⏳' : '🅿️'}
                </div>
                <div style={styles.slotNumber}>
                  Slot {slot.slot_name}
                </div>
                <div style={{
                  ...styles.statusBadge,
                  backgroundColor: getSlotColor(slot),
                }}>
                  {slot.status.toUpperCase()}
                </div>
                {slot.status === 'reserved' && countdowns[slot.id] && (
                 <div style={styles.countdown}>
                    ⏳ {countdowns[slot.id]}
                 </div>
                )}
                {selected?.id === slot.id && (
                  <div style={styles.selectedMark}>✓ Selected</div>
                )}
              </div>
            ))}
          </div>

          {selected && (
            <div style={styles.formCard}>
              <h2 style={styles.formTitle}>
                Reserve Slot {selected.slot_name}
              </h2>
              <input
                style={styles.input}
                placeholder="Your Full Name"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Vehicle Number (e.g. KA01AB1234)"
                value={vehicleNo}
                onChange={e => setVehicleNo(e.target.value)}
              />
              <p style={styles.timerNote}>
                ⏱ Reservation valid for 5 minutes
              </p>
              <button
                style={styles.primaryBtn}
                onClick={handleReserve}
                disabled={loading}
              >
                {loading ? 'Reserving...' : 'Reserve Slot'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Payment */}
      {step === 'payment' && reservation && (
        <div style={styles.card}>
          <h2 style={styles.formTitle}>Complete Payment</h2>
          <div style={styles.summaryBox}>
            <div style={styles.summaryRow}>
              <span>Slot</span>
              <span>#{selected.slot_name}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Driver</span>
              <span>{driverName}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Vehicle</span>
              <span>{vehicleNo}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Amount</span>
              <span style={{ color: '#22c55e', fontWeight: '700' }}>
                Rs. 50.00
              </span>
            </div>
            <div style={styles.summaryRow}>
              <span>Expires At</span>
              <span style={{ color: '#f59e0b' }}>
                {new Date(reservation.expires_at)
                  .toLocaleTimeString()}
              </span>
            </div>
          </div>
          <button
            style={styles.primaryBtn}
            onClick={handlePayment}
            disabled={loading}
          >
            {loading ? 'Processing...' : '✓ Pay Rs. 50 & Confirm'}
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={handleReset}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Step 3 — Success */}
      {step === 'success' && payment && (
        <div style={styles.card}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={styles.successTitle}>Access Authorized!</h2>
          <p style={styles.successMsg}>Gate Opened</p>
          <p style={styles.successMsg}>
            Proceed to Slot <strong>{selected.slot_name}</strong>
          </p>

          {/* QR Code */}
          <div style={styles.qrContainer}>
            <img
              src={`data:image/png;base64,${payment.qr_code_data}`}
              alt="Parking QR Code"
              style={styles.qrImage}
            />
            <p style={styles.qrLabel}>Show this QR at exit</p>
          </div>

          <button
            style={styles.primaryBtn}
            onClick={handleReset}
          >
            New Reservation
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  title: {
    fontSize:     '28px',
    fontWeight:   '700',
    marginBottom: '8px',
  },
  subtitle: {
    color:        'var(--text-secondary)',
    marginBottom: '24px',
  },
  errorBox: {
    backgroundColor: '#2d1515',
    border:          '1px solid #ef4444',
    borderRadius:    '8px',
    padding:         '12px 16px',
    color:           '#ef4444',
    marginBottom:    '16px',
  },
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap:                 '16px',
    marginBottom:        '24px',
  },
  slotCard: {
    border:       '2px solid',
    borderRadius: '12px',
    padding:      '20px',
    textAlign:    'center',
    transition:   'transform 0.2s, box-shadow 0.2s',
  },
  slotIcon: {
    fontSize:     '32px',
    marginBottom: '8px',
  },
  slotNumber: {
    fontSize:     '18px',
    fontWeight:   '700',
    marginBottom: '8px',
  },
  statusBadge: {
    display:      'inline-block',
    padding:      '4px 12px',
    borderRadius: '20px',
    fontSize:     '11px',
    fontWeight:   '700',
    color:        '#000',
    marginBottom: '8px',
  },
  selectedMark: {
    color:      '#6366f1',
    fontSize:   '12px',
    fontWeight: '700',
    marginTop:  '4px',
  },
  formCard: {
    backgroundColor: 'var(--bg-card)',
    border:          '1px solid var(--border-color)',
    borderRadius:    '16px',
    padding:         '24px',
    maxWidth:        '480px',
  },
  formTitle: {
    fontSize:     '20px',
    fontWeight:   '700',
    marginBottom: '16px',
  },
  input: {
    width:           '100%',
    padding:         '12px 16px',
    backgroundColor: 'var(--bg-secondary)',
    border:          '1px solid var(--border-color)',
    borderRadius:    '8px',
    color:           'var(--text-primary)',
    fontSize:        '14px',
    marginBottom:    '12px',
    outline:         'none',
  },
  timerNote: {
    fontSize:     '13px',
    color:        '#f59e0b',
    marginBottom: '16px',
  },
  primaryBtn: {
    width:           '100%',
    padding:         '14px',
    backgroundColor: '#6366f1',
    border:          'none',
    borderRadius:    '8px',
    color:           '#fff',
    fontSize:        '16px',
    fontWeight:      '700',
    cursor:          'pointer',
    marginBottom:    '8px',
  },
  secondaryBtn: {
    width:           '100%',
    padding:         '12px',
    backgroundColor: 'transparent',
    border:          '1px solid var(--border-color)',
    borderRadius:    '8px',
    color:           'var(--text-secondary)',
    fontSize:        '14px',
    cursor:          'pointer',
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    border:          '1px solid var(--border-color)',
    borderRadius:    '16px',
    padding:         '32px',
    maxWidth:        '480px',
    textAlign:       'center',
  },
  summaryBox: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius:    '12px',
    padding:         '16px',
    marginBottom:    '20px',
    textAlign:       'left',
  },
  summaryRow: {
    display:        'flex',
    justifyContent: 'space-between',
    padding:        '8px 0',
    borderBottom:   '1px solid var(--border-color)',
    fontSize:       '14px',
    color:          'var(--text-secondary)',
  },
  successIcon: {
    fontSize:     '64px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize:     '28px',
    fontWeight:   '800',
    color:        '#22c55e',
    marginBottom: '8px',
  },
  successMsg: {
    fontSize:     '16px',
    color:        'var(--text-secondary)',
    marginBottom: '8px',
  },
  qrContainer: {
    margin:       '24px 0',
    padding:      '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    display:      'inline-block',
  },
  qrImage: {
    width:  '200px',
    height: '200px',
  },
  qrLabel: {
    color:     '#000',
    fontSize:  '12px',
    marginTop: '8px',
  },
  countdown: {
  marginTop: '6px',
  color: '#f59e0b',
  fontWeight: '700',
  fontSize: '16px',
},
}

export default KioskView