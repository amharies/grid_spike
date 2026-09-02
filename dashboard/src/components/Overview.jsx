import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Users, EyeOff, TrendingDown, ShieldAlert, Award } from 'lucide-react';

const Overview = ({ accounts, stats }) => {
  const totalAccounts = stats?.total_accounts || 42372;
  const highRisk = stats?.high_risk_count || accounts.filter(a => a.normalized_risk_score >= 0.75).length;
  const modRisk = stats?.moderate_risk_count || accounts.filter(a => a.normalized_risk_score >= 0.5 && a.normalized_risk_score < 0.75).length;
  
  const bins = [
    { name: 'Low (0-0.49)', count: 0, color: 'rgba(255, 153, 0, 0.4)' },
    { name: 'Moderate (0.50-0.74)', count: 0, color: 'rgba(255, 153, 0, 0.8)' },
    { name: 'Very High (0.75+)', count: 0, color: '#ef4444' }
  ];

  accounts.forEach(a => {
    // Fallback to raw risk_score if normalized is not available
    const score = a.normalized_risk_score !== undefined ? a.normalized_risk_score : (a.risk_score || 0);
    if (score < 0.5) bins[0].count++;
    else if (score < 0.75) bins[1].count++;
    else bins[2].count++;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Hero Banner (Bitcoin DeFi Aesthetic) */}
      <div className="panel-box" style={{ padding: '28px', background: 'radial-gradient(ellipse at top left, rgba(255,153,0,0.1) 0%, var(--card-bg) 70%)', borderTop: '2px solid var(--gold)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--gold)', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          AI-Powered Behavioural Anomaly Screening
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '13px', maxWidth: '640px', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.6' }}>
          Screening household consumption patterns for sustained, unexplained drops below expected baselines. Powered by LightGBM Model o2 Engine.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="c-tile">
          <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={14} color="var(--gold)" /> Accounts Screened
          </div>
          <div className="val">{totalAccounts.toLocaleString()}</div>
          <div className="sub">Total System Corpus</div>
        </div>

        <div className="c-tile" style={{ borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
            <AlertTriangle size={14} /> Very High Risk Alerts
          </div>
          <div className="val" style={{ color: 'var(--danger)', textShadow: '0 0 12px var(--danger-glow)' }}>{highRisk.toLocaleString()}</div>
          <div className="sub" style={{ color: 'var(--danger)' }}>Top ~8.5% Anomalies</div>
        </div>

        <div className="c-tile">
          <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={14} color="var(--gold)" /> Precision@50
          </div>
          <div className="val">72.0%</div>
          <div className="sub">Top 50 Rank Accuracy</div>
        </div>

        <div className="c-tile">
          <div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={14} color="var(--gold)" /> AUC-PR Score
          </div>
          <div className="val">0.2272</div>
          <div className="sub">Area Under PR Curve</div>
        </div>
      </div>

      {/* Risk Distribution Chart */}
      <div className="panel-box">
        <div className="panel-hdr">
          <span>MODEL RISK SCORE DISTRIBUTION (CALIBRATED)</span>
        </div>
        <div style={{ height: '320px', width: '100%', marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bins} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 153, 0, 0.15)" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono'}} />
              <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono'}} />
              <Tooltip 
                cursor={{fill: 'rgba(255, 153, 0, 0.05)'}}
                contentStyle={{backgroundColor: 'rgba(5, 5, 8, 0.95)', border: '1px solid var(--gold)', color: '#fff', borderRadius: '4px', fontFamily: 'JetBrains Mono', fontSize: '12px'}}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {
                  bins.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default Overview;
