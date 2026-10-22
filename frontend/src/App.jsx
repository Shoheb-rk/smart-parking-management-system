import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, createContext, useContext } from 'react'
import ParkingGrid from './components/ParkingGrid'
import Dashboard from './components/Dashboard'
import KioskView from './components/KioskView'
import './index.css'

// ─── WebSocket Context ────────────────────────────────────────
// This allows any component to access the WebSocket event
const WSContext = createContext(null)

export function useWS() {
  return useContext(WSContext)
}

// ─── Main App ─────────────────────────────────────────────────
function App() {
  const [lastEvent, setLastEvent] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    // Connect WebSocket once when app loads
    const connect = () => {
      const socket = new WebSocket('ws://10.107.53.96:8000/ws')

      socket.onopen = () => {
        console.log('Global WebSocket connected')
      }

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('Global WebSocket Event:', data)
        // Update lastEvent — all components listening will re-fetch
        setLastEvent(data)
      }

      socket.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting in 3s...')
        // Auto reconnect after 3 seconds
        setTimeout(connect, 3000)
      }

      socket.onerror = (err) => {
        console.error('WebSocket error:', err)
        socket.close()
      }

      socketRef.current = socket
    }

    connect()

    // Cleanup on app unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  return (
    <WSContext.Provider value={lastEvent}>
      <BrowserRouter>
        <div style={styles.app}>

          {/* Navigation Bar */}
          <nav style={styles.nav}>
            <div style={styles.navBrand}>
              🅿️ Smart Parking System
            </div>
            <div style={styles.navLinks}>
              <Link to="/"          style={styles.navLink}>Live Map</Link>
              <Link to="/kiosk"     style={styles.navLink}>Kiosk</Link>
              <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
            </div>
          </nav>

          {/* Page Content */}
          <main style={styles.main}>
            <Routes>
              <Route path="/"          element={<ParkingGrid />} />
              <Route path="/kiosk"     element={<KioskView />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>

        </div>
      </BrowserRouter>
    </WSContext.Provider>
  )
}

const styles = {
  app: {
    minHeight:       '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  nav: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '16px 32px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom:    '1px solid var(--border-color)',
  },
  navBrand: {
    fontSize:   '20px',
    fontWeight: '700',
    color:      'var(--text-primary)',
  },
  navLinks: {
    display: 'flex',
    gap:     '24px',
  },
  navLink: {
    color:          'var(--text-secondary)',
    textDecoration: 'none',
    fontSize:       '14px',
    fontWeight:     '500',
  },
  main: {
    padding: '32px',
  },
}

export default App