import { useState, useEffect } from 'react'
import { Activity, Users, ShieldAlert, LayoutDashboard, Map } from 'lucide-react'
import Overview from './components/Overview'
import InvestigationQueue from './components/InvestigationQueue'
import AccountView from './components/AccountView'

function App() {
  // Grid Map as the MAIN default landing page
  const [activeTab, setActiveTab] = useState('gridmap')
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch Model stats
    fetch('http://localhost:8000/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Stats fetch error", err))

    // Fetch accounts
    fetch('http://localhost:8000/api/accounts?limit=500')
      .then(res => res.json())
      .then(data => {
        setAccounts(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch accounts", err)
        setLoading(false)
      })
  }, [])

  const handleSelectAccount = (account) => {
    setSelectedAccount(account)
    setActiveTab('account_view')
  }

  const handleBackToQueue = () => {
    setSelectedAccount(null)
    setActiveTab('queue')
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-brand">
            <ShieldAlert size={22} />
            AI 02 Theft Detect
          </h1>
          <p className="sidebar-version">Build 1.0 (Model o2 Engine Active)</p>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            onClick={() => {setActiveTab('gridmap'); setSelectedAccount(null)}}
            className={`nav-btn ${activeTab === 'gridmap' ? 'active' : ''}`}
          >
            <Map size={18} />
            Grid Map (Main)
          </button>

          <button 
            onClick={() => {setActiveTab('overview'); setSelectedAccount(null)}}
            className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            Overview Dashboard
          </button>
          
          <button 
            onClick={() => {setActiveTab('queue'); setSelectedAccount(null)}}
            className={`nav-btn ${activeTab === 'queue' ? 'active' : ''}`}
          >
            <Users size={18} />
            Investigation Queue
          </button>
        </nav>
      </aside>

      {/* Main Content Viewport */}
      <main className="app-main">
        <header className="app-header">
          <h2 className="header-title">
            {activeTab === 'gridmap' && 'Grid Matrix — Energy Intelligence View'}
            {activeTab === 'overview' && 'Overview Dashboard'}
            {activeTab === 'queue' && 'Ranked Investigation Queue'}
            {activeTab === 'account_view' && selectedAccount && `Account ${selectedAccount.CONS_NO}`}
          </h2>
          
          <div className="header-status">
            <Activity size={16} />
            <span>Model o2 Engine Connected</span>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'gridmap' ? (
            <iframe 
              src="/map.html" 
              title="Grid Map" 
              className="iframe-view" 
            />
          ) : loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#94a3b8' }}>
              Loading Model o2 Dataset...
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              {activeTab === 'overview' && <Overview accounts={accounts} stats={stats} />}
              {activeTab === 'queue' && <InvestigationQueue accounts={accounts} onSelectAccount={handleSelectAccount} />}
              {activeTab === 'account_view' && selectedAccount && (
                <AccountView account={selectedAccount} onBack={handleBackToQueue} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
