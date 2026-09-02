import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Activity, ShieldAlert, Calendar, Droplet, ZapOff, CloudRain } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const AccountView = ({ account, onBack }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:8000/api/accounts/${account.CONS_NO}/timeline`)
      .then(res => res.json())
      .then(data => {
        setTimeline(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Timeline error", err);
        setLoading(false);
      });
  }, [account.CONS_NO]);

  const riskLabel = account.risk_score >= 0.75 ? 'VERY HIGH RISK' : 
                    account.risk_score >= 0.5 ? 'HIGH RISK' : 
                    account.risk_score >= 0.25 ? 'MODERATE RISK' : 'LOW RISK';
                    
  const riskColor = account.risk_score >= 0.75 ? 'text-danger' : 
                    account.risk_score >= 0.5 ? 'text-warning' : 
                    account.risk_score >= 0.25 ? 'text-primary' : 'text-success';

  const dropMagnitude = (account.recent_mean_shift * 100).toFixed(1);
  const isDrop = account.recent_mean_shift < 0;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
      
      {/* Header */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-textMuted hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Queue
      </button>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase font-mono">ACCOUNT {account.CONS_NO}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`font-bold ${riskColor}`}>{riskLabel}</span>
            <span className="text-textMuted">|</span>
            <span className="text-textMuted">Behavioural change detected</span>
          </div>
        </div>
        
        <div className="bg-surface border border-surfaceHover px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
          <span className="text-sm text-textMuted uppercase tracking-wider font-semibold">Status:</span>
          <select className="bg-transparent text-white font-medium outline-none cursor-pointer">
            <option>Unreviewed</option>
            <option>Reviewing</option>
            <option>Needs inspection</option>
            <option>Cleared</option>
            <option>Confirmed</option>
          </select>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-2">Consumption Timeline: Actual vs Expected</h3>
        <p className="text-sm text-textMuted mb-6">
          Observed consumption has remained below the model's expected baseline for the recent evaluation window.
        </p>
        
        <div className="h-80">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3655" vertical={false} />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => val.split('T')[0]} />
                <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} />
                <RechartsTooltip 
                  contentStyle={{backgroundColor: '#1A233A', borderColor: '#2A3655', color: '#F3F4F6'}}
                  labelFormatter={(val) => `Date: ${val.split('T')[0]}`}
                />
                <Legend />
                <ReferenceLine x={timeline[timeline.length - 46]?.date} stroke="#EF4444" strokeDasharray="3 3" label={{ position: 'top', value: 'CHANGE DETECTED', fill: '#EF4444', fontSize: 12 }} />
                <Line type="monotone" dataKey="expected" name="Expected Baseline" stroke="#9CA3AF" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="actual" name="Actual Consumption" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Evidence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-lg group hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4 text-primary">
            <Droplet size={20} />
            <h4 className="font-semibold text-white">Behavioural Drop</h4>
          </div>
          <p className={`text-3xl font-bold ${isDrop ? 'text-danger' : 'text-success'} mb-2`}>
            {isDrop ? '' : '+'}{dropMagnitude}%
          </p>
          <p className="text-xs text-textMuted">
            Average consumption after the detected change is approximately {Math.abs(dropMagnitude)}% {isDrop ? 'below' : 'above'} the pre-change baseline.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-lg group hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4 text-warning">
            <Activity size={20} />
            <h4 className="font-semibold text-white">Anomaly Score</h4>
          </div>
          <p className="text-3xl font-bold text-white mb-2">
            {(account.anomaly_score || 0).toFixed(2)}
          </p>
          <p className="text-xs text-textMuted">
            Isolation Forest anomaly score indicating deviation from normal multi-dimensional behaviour.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-lg group hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4 text-primary">
            <ZapOff size={20} />
            <h4 className="font-semibold text-white">Missingness Shift</h4>
          </div>
          <p className="text-3xl font-bold text-white mb-2">
            +{(account.missing_pct_shift * 100).toFixed(1)} pts
          </p>
          <p className="text-xs text-textMuted">
            The proportion of missing readings increased around the detected behavioural change.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-lg group hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4 text-primary">
            <CloudRain size={20} />
            <h4 className="font-semibold text-white">Peer Deviation</h4>
          </div>
          <p className="text-3xl font-bold text-white mb-2">
            {(account.peer_dev_mean || 0).toFixed(2)}
          </p>
          <p className="text-xs text-textMuted">
            Deviation from expected peer group behaviour. Negative values indicate usage lower than peers.
          </p>
        </div>

      </div>

      {/* Why Flagged Panel */}
      <div className="bg-gradient-to-br from-surface to-[#221010] p-6 rounded-xl border border-danger/30 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ShieldAlert className="text-danger" size={20} />
          Why was this account flagged?
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-danger/20 text-danger flex items-center justify-center shrink-0 text-sm mt-0.5">1</div>
            <p className="text-textMuted text-sm"><strong className="text-white">Consumption fell substantially</strong> below the expected baseline, indicating a drop of {Math.abs(dropMagnitude)}%.</p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-danger/20 text-danger flex items-center justify-center shrink-0 text-sm mt-0.5">2</div>
            <p className="text-textMuted text-sm"><strong className="text-white">Anomaly detected</strong> with an isolation score of {(account.anomaly_score || 0).toFixed(2)}.</p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-danger/20 text-danger flex items-center justify-center shrink-0 text-sm mt-0.5">3</div>
            <p className="text-textMuted text-sm">Data quality shifted concurrently, showing a <strong className="text-white">{(account.missing_pct_shift * 100).toFixed(1)} percentage point increase in missing readings</strong>.</p>
          </li>
        </ul>
      </div>

    </div>
  );
};

export default AccountView;
