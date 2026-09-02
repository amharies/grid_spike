import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Users, EyeOff, TrendingDown } from 'lucide-react';

const Overview = ({ accounts }) => {
  const totalAccounts = accounts.length;
  const highRisk = accounts.filter(a => a.risk_score >= 0.75).length;
  
  // Create risk distribution buckets
  const bins = [
    { name: 'Low (0-0.24)', count: 0 },
    { name: 'Mod (0.25-0.49)', count: 0 },
    { name: 'High (0.50-0.74)', count: 0 },
    { name: 'Critical (0.75+)', count: 0 }
  ];

  accounts.forEach(a => {
    if (a.risk_score < 0.25) bins[0].count++;
    else if (a.risk_score < 0.5) bins[1].count++;
    else if (a.risk_score < 0.75) bins[2].count++;
    else bins[3].count++;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-surface to-surfaceHover p-8 rounded-2xl border border-surfaceHover shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">AI-powered behavioural theft screening</h1>
          <p className="text-textMuted max-w-2xl text-lg">
            Detecting sustained, unexplained changes in household electricity consumption. 
            Investigate accounts ranked by behavioural anomaly risk.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-lg flex items-center gap-4 hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-textMuted">Accounts Screened</p>
            <p className="text-2xl font-bold text-white">{totalAccounts.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-lg flex items-center gap-4 hover:border-danger/50 transition-colors">
          <div className="w-12 h-12 bg-danger/20 rounded-lg flex items-center justify-center text-danger">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-textMuted">Critical Risk</p>
            <p className="text-2xl font-bold text-white">{highRisk}</p>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-lg flex items-center gap-4 hover:border-warning/50 transition-colors">
          <div className="w-12 h-12 bg-warning/20 rounded-lg flex items-center justify-center text-warning">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm text-textMuted">Detected Changes</p>
            <p className="text-2xl font-bold text-white">{accounts.filter(a => a.cusum_score > 0).length}</p>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-lg flex items-center gap-4 hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
            <EyeOff size={24} />
          </div>
          <div>
            <p className="text-sm text-textMuted">High Missingness</p>
            <p className="text-2xl font-bold text-white">{accounts.filter(a => a.recent_missing_pct > 0.5).length}</p>
          </div>
        </div>
      </div>

      {/* Risk Distribution Chart */}
      <div className="bg-surface p-6 rounded-xl border border-surfaceHover shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6">Risk Score Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bins}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3655" vertical={false} />
              <XAxis dataKey="name" stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} />
              <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF'}} />
              <Tooltip 
                cursor={{fill: '#2A3655'}}
                contentStyle={{backgroundColor: '#1A233A', borderColor: '#2A3655', color: '#F3F4F6'}}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default Overview;
