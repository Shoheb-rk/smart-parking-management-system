import { useState, useEffect } from 'react'
import axios from 'axios'
import { useWS } from '../App'

const API_URL = 'http://10.113.109.96:8000'

function ParkingGrid() {
  const [slots, setSlots]   = useState([])
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  // Fetch slots from API
  const fetchSlots = async () => {
    try {
      const response = await axios.get(`${API_URL}/slots`)
      setSlots(response.data)
      setError(null)
    } catch (err) {
      setError('Cannot connect to backend. Is FastAPI running?')
    } finally {
      setLoading(false)
    }
  }

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats`)
      setStats(response.data)
    } catch (err) {
      console.error('Stats fetch failed:', err)
    }
  }

// Import global WebSocket context
  const lastEvent = useWS()

  // Initial load
  useEffect(() => {
    fetchSlots()
    fetchStats()
  }, [])

  // Re-fetch whenever a WebSocket event arrives
  useEffect(() => {
    if (lastEvent) {
      fetchSlots()
      fetchStats()
    }
  }, [lastEvent])
  // Get color based on slot status
  const getSlotColor = (status) => {
    if (status === 'occupied') return 'var(--occupied-color)'
    if (status === 'reserved') return 'var(--reserved-color)'
    return 'var(--free-color)'
  }

  const getSlotBg = (status) => {
    if (status === 'occupied') return '#2d1515'
    if (status === 'reserved') return '#2d2415'
    return '#152d1e'
  }

  if (loading) return (
    <div style={styles.center}>
      <p>Loading parking data...</p>
    </div>
  )

  if (error) return (
    <div style={styles.center}>
      <p style={{ color: 'var(--occupied-color)' }}>{error}</p>
    </div>
  )

  return (
    <div>
      <h1 style={styles.title}>Live Parking Map</h1>

      {/* Stats Bar */}
      {stats && (
        <div style={styles.statsBar}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{stats.total_slots}</div>
            <div style={styles.statLabel}>Total Slots</div>
          </div>
          <div style={styles.statCard}>
            <div style={{
              ...styles.statNumber,
              color: 'var(--free-color)'
            }}>
              {stats.free_slots}
            </div>
            <div style={styles.statLabel}>Free</div>
          </div>
          <div style={styles.statCard}>
            <div style={{
              ...styles.statNumber,
              color: 'var(--occupied-color)'
            }}>
              {stats.occupied_slots}
            </div>
            <div style={styles.statLabel}>Occupied</div>
          </div>
          <div style={styles.statCard}>
            <div style={{
              ...styles.statNumber,
              color: 'var(--reserved-color)'
            }}>
              {stats.reserved_slots}
            </div>
            <div style={styles.statLabel}>Reserved</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>
              {stats.occupancy_pct}%
            </div>
            <div style={styles.statLabel}>Occupancy</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{
            ...styles.legendDot,
            backgroundColor: 'var(--free-color)'
          }}/>
          Free
        </span>
        <span style={styles.legendItem}>
          <span style={{
            ...styles.legendDot,
            backgroundColor: 'var(--occupied-color)'
          }}/>
          Occupied
        </span>
        <span style={styles.legendItem}>
          <span style={{
            ...styles.legendDot,
            backgroundColor: 'var(--reserved-color)'
          }}/>
          Reserved
        </span>
      </div>

      {/* Parking Grid */}
      <div style={styles.grid}>
        {slots.map(slot => (
          <div
            key={slot.id}
            style={{
              ...styles.slotCard,
              backgroundColor: getSlotBg(slot.status),
              borderColor:     getSlotColor(slot.status),
            }}
          >
            {/* Slot Icon */}
            <div style={styles.slotIcon}>🚗</div>

            {/* Slot Number */}
            <div style={styles.slotNumber}>
              Slot {slot.slot_name}
            </div>

            {/* Status Badge */}
            <div style={{
              ...styles.statusBadge,
              backgroundColor: getSlotColor(slot.status),
            }}>
              {slot.status.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Auto refresh notice */}
      <p style={styles.refreshNote}>
        Real-time updates via WebSocket
      </p>
    </div>
  )
}

const styles = {
  title: {
    fontSize:     '28px',
    fontWeight:   '700',
    marginBottom: '24px',
    color:        'var(--text-primary)',
  },
  statsBar: {
    display:       'flex',
    gap:           '16px',
    marginBottom:  '24px',
    flexWrap:      'wrap',
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    border:          '1px solid var(--border-color)',
    borderRadius:    '12px',
    padding:         '16px 24px',
    textAlign:       'center',
    minWidth:        '100px',
  },
  statNumber: {
    fontSize:     '32px',
    fontWeight:   '700',
    color:        'var(--text-primary)',
  },
  statLabel: {
    fontSize: '12px',
    color:    'var(--text-secondary)',
    marginTop: '4px',
  },
  legend: {
    display:       'flex',
    gap:           '24px',
    marginBottom:  '24px',
  },
  legendItem: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    fontSize:   '14px',
    color:      'var(--text-secondary)',
  },
  legendDot: {
    width:        '12px',
    height:       '12px',
    borderRadius: '50%',
    display:      'inline-block',
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
    cursor:       'default',
    transition:   'transform 0.2s',
  },
  slotIcon: {
    fontSize:     '32px',
    marginBottom: '8px',
  },
  slotNumber: {
    fontSize:     '18px',
    fontWeight:   '700',
    color:        'var(--text-primary)',
    marginBottom: '8px',
  },
  statusBadge: {
    display:      'inline-block',
    padding:      '4px 12px',
    borderRadius: '20px',
    fontSize:     '11px',
    fontWeight:   '700',
    color:        '#000000',
  },
  center: {
    display:        'flex',
    justifyContent: 'center',
    alignItems:     'center',
    height:         '50vh',
    fontSize:       '18px',
    color:          'var(--text-secondary)',
  },
  refreshNote: {
    fontSize: '12px',
    color:    'var(--text-secondary)',
    textAlign: 'center',
  },
}

export default ParkingGrid