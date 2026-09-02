import React, { useState } from 'react';
import { Search, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';

const getRiskLabel = (score) => {
  if (score >= 0.75) return { label: 'Very High', color: 'text-danger bg-danger/10 border-danger/20' };
  if (score >= 0.50) return { label: 'High', color: 'text-warning bg-warning/10 border-warning/20' };
  if (score >= 0.25) return { label: 'Moderate', color: 'text-primary bg-primary/10 border-primary/20' };
  return { label: 'Low', color: 'text-success bg-success/10 border-success/20' };
};

const InvestigationQueue = ({ accounts, onSelectAccount }) => {
  const [search, setSearch] = useState('');
  
  const filtered = accounts.filter(a => 
    String(a.CONS_NO).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Investigation Queue</h2>
          <p className="text-textMuted text-sm mt-1">Review ranked accounts prioritizing the highest risk anomalies.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
          <input 
            type="text" 
            placeholder="Search Account ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-surface border border-surfaceHover text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-primary transition-colors w-64"
          />
        </div>
      </div>

      <div className="bg-surface border border-surfaceHover rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surfaceHover/50 text-textMuted text-sm border-b border-surfaceHover">
                <th className="p-4 font-medium">Rank</th>
                <th className="p-4 font-medium">Account ID</th>
                <th className="p-4 font-medium">Risk Score</th>
                <th className="p-4 font-medium">Risk Band</th>
                <th className="p-4 font-medium">Drop Magnitude</th>
                <th className="p-4 font-medium">Missingness Shift</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceHover">
              {filtered.map((acc, idx) => {
                const risk = getRiskLabel(acc.risk_score);
                const drop = (acc.recent_mean_shift * 100).toFixed(1);
                const isDrop = acc.recent_mean_shift < 0;
                
                return (
                  <tr 
                    key={acc.CONS_NO} 
                    className="hover:bg-surfaceHover/30 transition-colors cursor-pointer group"
                    onClick={() => onSelectAccount(acc)}
                  >
                    <td className="p-4 text-white font-mono text-sm">#{idx + 1}</td>
                    <td className="p-4 font-medium text-white">{acc.CONS_NO}</td>
                    <td className="p-4 font-mono text-textMuted">{acc.risk_score.toFixed(4)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${risk.color}`}>
                        {risk.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`${isDrop ? 'text-danger' : 'text-success'} font-medium`}>
                        {isDrop ? '' : '+'}{drop}%
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-textMuted">
                        +{(acc.missing_pct_shift * 100).toFixed(1)} pts
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-primary hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-end w-full gap-1">
                        Inspect <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-textMuted">
                    No accounts found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvestigationQueue;
