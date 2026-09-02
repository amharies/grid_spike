import { useState, useEffect } from 'react'
import { Activity, Users, AlertTriangle, ShieldAlert, BarChart3, LayoutDashboard, Search, Map } from 'lucide-react'
import Overview from './components/Overview'
import InvestigationQueue from './components/InvestigationQueue'
import AccountView from './components/AccountView'
import GridMap from './components/GridMap'

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8000/api/accounts')
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
    <div className="flex h-screen bg-background text-textMain overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-surfaceHover flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-primary" />
            AI 02 Theft Detect
          </h1>
          <p className="text-xs text-textMuted mt-1">Build 1.0 (Model o2)</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => {setActiveTab('overview'); setSelectedAccount(null)}}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
              activeTab === 'overview' ? 'bg-primary/10 text-primary' : 'text-textMuted hover:bg-surfaceHover hover:text-white'
            }`}
          >
            <LayoutDashboard size={18} />
            Overview Dashboard
          </button>
          
          <button 
            onClick={() => {setActiveTab('queue'); setSelectedAccount(null)}}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
              activeTab === 'queue' ? 'bg-primary/10 text-primary' : 'text-textMuted hover:bg-surfaceHover hover:text-white'
            }`}
          >
            <Users size={18} />
            Investigation Queue
          </button>
          
          <button 
            onClick={() => {setActiveTab('gridmap'); setSelectedAccount(null)}}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
              activeTab === 'gridmap' ? 'bg-primary/10 text-primary' : 'text-textMuted hover:bg-surfaceHover hover:text-white'
            }`}
          >
            <Map size={18} />
            Grid Map
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <header className="h-16 border-b border-surfaceHover flex items-center justify-between px-8 bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-white">
            {activeTab === 'overview' && 'Overview'}
            {activeTab === 'queue' && 'Ranked Investigation Queue'}
            {activeTab === 'gridmap' && 'Grid Map — Service Area'}
            {activeTab === 'account_view' && selectedAccount && `Account ${selectedAccount.CONS_NO}`}
          </h2>
          
          {/* Quick Stats or User Profile */}
          <div className="flex items-center gap-4 text-sm text-textMuted">
            <span className="flex items-center gap-1"><Activity size={16}/> System Healthy</span>
          </div>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <Overview accounts={accounts} />}
              {activeTab === 'queue' && <InvestigationQueue accounts={accounts} onSelectAccount={handleSelectAccount} />}
              {activeTab === 'gridmap' && <GridMap accounts={accounts} onSelectAccount={handleSelectAccount} />}
              {activeTab === 'account_view' && selectedAccount && (
                <AccountView account={selectedAccount} onBack={handleBackToQueue} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
