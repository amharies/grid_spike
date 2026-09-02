import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Users, EyeOff, TrendingDown, ShieldAlert, Award } from 'lucide-react';

const Overview = ({ accounts, stats }) => {
  const totalAccounts = stats?.total_accounts || 42372;
  const highRisk = stats?.high_risk_count || accounts.filter(a => a.risk_score >= 0.75).length;
  
  const bins = [
    { name: 'Low (0-0.24)', count: 0 },
    { name: 'Mod (0.25-0.49)', count: 0 },
    { name: 'High (0.50-0.74)', count: 0 },
    { name: 'Very High (0.75+)', count: 0 }
  ];

  accounts.forEach(a => {
    if (a.risk_score < 0.25) bins[0].count++;
    else if (a.risk_score < 0.5) bins[1].count++;
    else if (a.risk_score < 0.75) bins[2].count++;
    else bins[3].count++;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0e172a 0%, #1e293b 100%)',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
          AI-Powered Behavioural Anomaly Screening
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '14px', maxWidth: '640px' }}>
          Screening household consumption patterns for sustained, unexplained drops below expected baselines. Powered by LightGBM Model o2 Engine.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="card-grid">
        <div className="kpi-card">
          <div className="kpi-icon primary">
            <Users size={24} />
          </div>
          <div>
            <div className="kpi-label">Accounts Screened</div>
            <div className="kpi-value">{totalAccounts.toLocaleString()}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon danger">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="kpi-label">Very High Risk Alerts</div>
            <div className="kpi-value">{highRisk}</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon warning">
            <TrendingDown size={24} />
          </div>
          <div>
            <div className="kpi-label">Precision@50</div>
            <div className="kpi-value">72.0%</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon primary">
            <Award size={24} />
          </div>
          <div>
            <div className="kpi-label">AUC-PR Score</div>
            <div className="kpi-value">0.2272</div>
          </div>
        </div>
      </div>

      {/* Risk Distribution Chart */}
      <div style={{
        background: '#0e172a',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', marginBottom: '20px', fontFamily: 'Outfit, sans-serif' }}>
          Model Risk Score Distribution
        </h3>
        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bins}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                cursor={{fill: '#1e293b'}}
                contentStyle={{backgroundColor: '#0e172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px'}}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default Overview;
