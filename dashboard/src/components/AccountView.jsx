import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Activity, ShieldAlert, CloudRain, Droplet, ZapOff } from 'lucide-react';
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

  const isHighRisk = account.risk_score >= 0.5 || account.normalized_risk_score >= 0.5;
  const riskLabel = account.normalized_risk_score >= 0.75 ? 'VERY HIGH RISK' : 
                    account.normalized_risk_score >= 0.5 ? 'MODERATE RISK' : 'LOW RISK';
                    
  const riskClass = account.normalized_risk_score >= 0.75 ? 'very-high' : 
                    account.normalized_risk_score >= 0.5 ? 'high' : 'normal';

  // Fix: recent_mean_shift is in raw kWh. Calculate percentage relative to consumption_mean.
  const shiftKwh = account.recent_mean_shift || 0;
  const baseMean = account.consumption_mean || 1; // prevent div by zero
  const dropPctValue = (shiftKwh / baseMean) * 100;
  const dropMagnitude = Math.abs(dropPctValue).toFixed(1);
  const isDrop = shiftKwh < 0;

  // Fix: The CSV column is 'missing_rate', not 'missing_pct_shift'
  const missingRate = (account.missing_rate || 0) * 100;

  return (
    <div style={{ padding: '24px', animation: 'fadeIn 0.4s ease-out', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Navigation & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          onClick={onBack}
          className="nav-btn"
          style={{ width: 'auto', padding: '8px 16px', display: 'inline-flex', border: '1px solid var(--border)' }}
        >
          <ArrowLeft size={16} /> Back to queue
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className={`badge-risk ${riskClass}`}>{riskLabel}</div>
          <div className="panel-box" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status</span>
            <select style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontFamily: 'Inter', fontSize: '12px' }}>
              <option>Unreviewed</option>
              <option>Reviewing</option>
              <option>Cleared</option>
            </select>
          </div>
          <button className="nav-btn" style={{ width: 'auto', padding: '8px 16px', border: '1px solid var(--border)', color: 'var(--gold)' }}>
            ↓ Export file
          </button>
        </div>
      </div>

      {/* Header Profile */}
      <div style={{ marginBottom: '24px', position: 'relative' }}>
        <div style={{ fontSize: '11px', color: 'var(--gold)', fontFamily: 'Orbitron', letterSpacing: '0.1em', marginBottom: '8px' }}>
          INVESTIGATION FILE
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="telemetry-id" style={{ fontSize: '32px', margin: 0 }}>
            Account {account.CONS_NO}
          </div>
          <div className="panel-box" style={{ padding: '8px 16px', color: 'var(--gold)', fontFamily: 'Orbitron', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--gold)' }}>
            <Activity size={16} /> Risk score {(account.normalized_risk_score || account.risk_score).toFixed(4)}
          </div>
        </div>
      </div>

      {/* KPI 4-Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="c-tile">
          <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f0ff' }}>
            <Droplet size={14} /> Behavioural Drop
          </div>
          <div className="val" style={{ color: '#00f0ff' }}>
            {isDrop ? '' : '+'}{dropMagnitude}%
          </div>
          <div className="sub" style={{ marginTop: '12px', lineHeight: '1.4' }}>
            Average usage deviation against the recent behavioural baseline.
          </div>
        </div>

        <div className="c-tile">
          <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold)' }}>
            <Activity size={14} /> Anomaly Score
          </div>
          <div className="val">
            {(account.anomaly_score || 0).toFixed(2)}
          </div>
          <div className="sub" style={{ marginTop: '12px', lineHeight: '1.4' }}>
            Deviation from expected multi-signal usage patterns.
          </div>
        </div>

        <div className="c-tile">
          <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold)' }}>
            <ZapOff size={14} /> Missingness
          </div>
          <div className="val">
            {missingRate.toFixed(1)}%
          </div>
          <div className="sub" style={{ marginTop: '12px', lineHeight: '1.4' }}>
            Overall rate of incomplete readings for this account.
          </div>
        </div>

        <div className="c-tile">
          <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold)' }}>
            <CloudRain size={14} /> Peer Deviation
          </div>
          <div className="val">
            {(account.peer_dev_mean || 0).toFixed(2)}
          </div>
          <div className="sub" style={{ marginTop: '12px', lineHeight: '1.4' }}>
            Difference versus the expected peer consumption envelope.
          </div>
        </div>
      </div>

      {/* Chart & Notes Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* Left: Chart */}
        <div className="panel-box" style={{ padding: '24px', height: '420px', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-hdr" style={{ borderBottom: 'none', marginBottom: '4px', fontSize: '10px' }}>CONSUMPTION PATTERN</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '20px', fontFamily: 'Orbitron', fontWeight: '800' }}>Actual vs expected load</h3>
            <div style={{ border: '1px solid var(--border)', padding: '4px 12px', borderRadius: '16px', fontSize: '10px', color: 'var(--gold)' }}>
              90-day window
            </div>
          </div>
          
          <div style={{ flex: 1, minHeight: 0 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <span style={{ color: 'var(--gold)', fontFamily: 'Orbitron', animation: 'pulse 1.5s infinite' }}>LOADING TELEMETRY...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 153, 0, 0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono'}} tickFormatter={(val) => val.split('T')[0].substring(5)} />
                  <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono'}} />
                  <RechartsTooltip 
                    contentStyle={{backgroundColor: 'rgba(5, 5, 8, 0.95)', border: '1px solid var(--gold)', color: '#fff', borderRadius: '4px', fontFamily: 'JetBrains Mono', fontSize: '12px'}}
                    labelFormatter={(val) => `Date: ${val.split('T')[0]}`}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '12px', paddingTop: '10px' }} />
                  <ReferenceLine x={timeline[timeline.length - 31]?.date} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'CHANGE', fill: '#ef4444', fontSize: 10 }} />
                  <Line type="monotone" dataKey="expected" name="Expected baseline" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="actual" name="Actual load" stroke="#ff9900" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Notes */}
        <div className="panel-box" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <div className="panel-hdr" style={{ borderBottom: 'none', marginBottom: '4px', fontSize: '10px' }}>CASE NOTES</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontFamily: 'Orbitron', fontWeight: '800' }}>Why this was flagged</h3>
              <AlertCircle size={18} color="var(--gold)" />
            </div>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>1</div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Consumption drifted below expected baseline by {dropMagnitude}% over the review window.
              </p>
            </li>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>2</div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                The anomaly score reached {(account.anomaly_score || 0).toFixed(2)}, indicating a sustained deviation from the normal usage envelope.
              </p>
            </li>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>3</div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                Missingness currently stands at {missingRate.toFixed(1)}%, strengthening the confidence in the pattern.
              </p>
            </li>
          </ul>

          <div style={{ background: 'rgba(5, 5, 8, 0.8)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginTop: 'auto' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold)', marginBottom: '4px' }}>Source dataset</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: '14px', fontWeight: '700' }}>investigation_features.csv</div>
          </div>

          <div className={isHighRisk ? "rec-card" : "rec-card normal"} style={{ margin: 0 }}>
            <div className="rec-hdr">
              <ShieldAlert size={16} /> Recommended action
            </div>
            <div>
              {isHighRisk 
                ? "Sustained consumption drop below expected baseline. Recommend technician dispatch for physical meter audit."
                : "Monitor the account for another cycle and re-evaluate drift severity."}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default AccountView;
