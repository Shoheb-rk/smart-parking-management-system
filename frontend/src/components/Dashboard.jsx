import { useState, useEffect } from 'react'
import axios from 'axios'
import { useWS } from '../App'

const API_URL = 'http://10.113.109.96:8000'

function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [slots, setSlots]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const releaseSlot = async (slotId) => {
    try {
      await axios.post(`${API_URL}/slots/${slotId}/release`)
      fetchData()
    } catch (err) {
      console.error('Release failed:', err)
    }
  }

  const fetchData = async () => {
    try {
      const [statsRes, slotsRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/slots`)
      ])
      setStats(statsRes.data)
      setSlots(slotsRes.data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const lastEvent = useWS()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (lastEvent) {
      fetchData()
    }
  }, [lastEvent])

  if (loading) return (
    <div style={styles.center}>
      <p>Loading dashboard...</p>
    </div>
  )

  if (error) return (
    <div style={styles.center}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontSize: '18px', marginBottom: '12px' }}>
          Error: {error}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          API URL: {API_URL}
        </p>
        <button
          onClick={fetchData}
          style={{
            marginTop:       '16px',
            padding:         '10px 20px',
            backgroundColor: '#6366f1',
            border:          'none',
            borderRadius:    '8px',
            color:           '#fff',
            cursor:          'pointer',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <h1 style={styles.title}>Manager Dashboard</h1>

      {/* Stats Cards */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={{ ...styles.bigCard, borderColor: '#22c55e' }}>
            <div style={styles.bigNumber}>
              {stats.free_slots}
            </div>
            <div style={styles.bigLabel}>Free Slots</div>
          </div>

          <div style={{ ...styles.bigCard, borderColor: '#ef4444' }}>
            <div style={{ ...styles.bigNumber, color: '#ef4444' }}>
              {stats.occupied_slots}
            </div>
            <div style={styles.bigLabel}>Occupied</div>
          </div>

          <div style={{ ...styles.bigCard, borderColor: '#f59e0b' }}>
            <div style={{ ...styles.bigNumber, color: '#f59e0b' }}>
              {stats.reserved_slots}
            </div>
            <div style={styles.bigLabel}>Reserved</div>
          </div>

          <div style={{ ...styles.bigCard, borderColor: '#6366f1' }}>
            <div style={{ ...styles.bigNumber, color: '#6366f1' }}>
              {stats.occupancy_pct}%
            </div>
            <div style={styles.bigLabel}>Occupancy Rate</div>
          </div>
        </div>
      )}

      {/* Occupancy Bar */}
      {stats && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Occupancy Overview</h2>
          <div style={styles.barContainer}>
            <div style={{
              ...styles.barFill,
              width: `${stats.occupancy_pct}%`,
              backgroundColor: stats.occupancy_pct > 80
                ? '#ef4444'
                : stats.occupancy_pct > 50
                ? '#f59e0b'
                : '#22c55e'
            }}/>
          </div>
          <p style={styles.barLabel}>
            {stats.occupied_slots} of {stats.total_slots} slots occupied
          </p>
        </div>
      )}

      {/* Slot Status Table */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Slot Status Details
          <span style={{
            fontSize:    '13px',
            fontWeight:  '400',
            color:       'var(--text-secondary)',
            marginLeft:  '12px'
          }}>
            ({slots.length} slots)
          </span>
        </h2>

        {slots.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            No slots found. Check API connection.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Slot</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Updated</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(slot => (
                <tr key={slot.id} style={styles.tr}>
                  <td style={styles.td}>
                    Slot {slot.slot_name}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor:
                        slot.status === 'occupied' ? '#ef4444' :
                        slot.status === 'reserved' ? '#f59e0b' :
                        '#22c55e'
                    }}>
                      {slot.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{
                    ...styles.td,
                    color:    'var(--text-secondary)',
                    fontSize: '12px'
                  }}>
                    {slot.updated_at
                      ? new Date(slot.updated_at).toLocaleTimeString()
                      : 'N/A'}
                  </td>
                  <td style={styles.td}>
                    {slot.status !== 'free' && (
                      <button
                        style={styles.releaseBtn}
                        onClick={() => releaseSlot(slot.id)}
                      >
                        Release
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const styles = {
  title: {
    fontSize:     '28px',
    fontWeight:   '700',
    marginBottom: '24px',
  },
  statsGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap:                 '16px',
    marginBottom:        '32px',
  },
  bigCard: {
    backgroundColor: 'var(--bg-card)',
    border:          '2px solid',
    borderRadius:    '16px',
    padding:         '24px',
    textAlign:       'center',
  },
  bigNumber: {
    fontSize:     '48px',
    fontWeight:   '800',
    color:        '#22c55e',
    lineHeight:   '1',
    marginBottom: '8px',
  },
  bigLabel: {
    fontSize: '14px',
    color:    'var(--text-secondary)',
  },
  section: {
    backgroundColor: 'var(--bg-card)',
    border:          '1px solid var(--border-color)',
    borderRadius:    '16px',
    padding:         '24px',
    marginBottom:    '24px',
  },
  sectionTitle: {
    fontSize:     '18px',
    fontWeight:   '600',
    marginBottom: '16px',
    color:        'var(--text-primary)',
  },
  barContainer: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius:    '8px',
    height:          '24px',
    overflow:        'hidden',
    marginBottom:    '8px',
  },
  barFill: {
    height:       '100%',
    borderRadius: '8px',
    transition:   'width 0.5s ease',
  },
  barLabel: {
    fontSize: '13px',
    color:    'var(--text-secondary)',
  },
  table: {
    width:          '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign:     'left',
    padding:       '12px',
    fontSize:      '12px',
    color:         'var(--text-secondary)',
    borderBottom:  '1px solid var(--border-color)',
    fontWeight:    '600',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  td: {
    padding:  '14px 12px',
    fontSize: '14px',
    color:    'var(--text-primary)',
  },
  badge: {
    padding:      '4px 10px',
    borderRadius: '20px',
    fontSize:     '11px',
    fontWeight:   '700',
    color:        '#000',
  },
  center: {
    display:        'flex',
    justifyContent: 'center',
    alignItems:     'center',
    height:         '50vh',
    color:          'var(--text-secondary)',
  },
  releaseBtn: {
    padding:         '6px 12px',
    backgroundColor: 'transparent',
    border:          '1px solid #ef4444',
    borderRadius:    '6px',
    color:           '#ef4444',
    fontSize:        '12px',
    cursor:          'pointer',
  },
}

export default Dashboard