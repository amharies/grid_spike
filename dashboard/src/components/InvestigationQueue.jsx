import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

const getRiskLabel = (score) => {
  if (score >= 0.75) return { label: 'Very High', class: 'very-high' };
  if (score >= 0.50) return { label: 'High', class: 'high' };
  if (score >= 0.25) return { label: 'Moderate', class: 'mod' };
  return { label: 'Low', class: 'normal' };
};

const InvestigationQueue = ({ accounts, onSelectAccount }) => {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFiltered = useMemo(() => {
    let result = [...accounts];

    if (search) {
      result = result.filter(a => String(a.CONS_NO).toLowerCase().includes(search.toLowerCase()));
    }

    if (sortConfig.key !== null) {
      result.sort((a, b) => {
        let valA, valB;

        switch (sortConfig.key) {
          case 'rank':
            valA = a.rank || 0; valB = b.rank || 0; break;
          case 'id':
            valA = a.CONS_NO; valB = b.CONS_NO; break;
          case 'score':
            valA = a.normalized_risk_score !== undefined ? a.normalized_risk_score : (a.risk_score || 0);
            valB = b.normalized_risk_score !== undefined ? b.normalized_risk_score : (b.risk_score || 0);
            break;
          case 'drop':
            valA = a.recent_mean_shift || 0; valB = b.recent_mean_shift || 0; break;
          case 'missing':
            valA = a.missing_pct_shift || 0; valB = b.missing_pct_shift || 0; break;
          default:
            valA = 0; valB = 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [accounts, search, sortConfig]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} style={{ display: 'inline', marginLeft: '4px', color: 'var(--gold)' }}/> : <ChevronDown size={14} style={{ display: 'inline', marginLeft: '4px', color: 'var(--gold)' }}/>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease-out' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--gold)', fontFamily: 'Orbitron', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investigation Queue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', marginTop: '6px' }}>Review ranked accounts prioritizing the highest risk anomalies.</p>
        </div>
        
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} size={16} />
          <input 
            type="text" 
            placeholder="Search Account ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              background: 'var(--surface)', border: '1px solid var(--border)', color: '#fff',
              borderRadius: '6px', padding: '8px 12px 8px 36px', outline: 'none', fontFamily: 'JetBrains Mono', fontSize: '12px', width: '260px'
            }}
          />
        </div>
      </div>

      <div className="panel-box" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(5, 5, 8, 0.95)', borderBottom: '1px solid var(--border)', color: 'var(--gold)', fontFamily: 'Orbitron', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('rank')}>Rank <SortIcon columnKey="rank" /></th>
                <th style={{ padding: '16px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('id')}>Account ID <SortIcon columnKey="id" /></th>
                <th style={{ padding: '16px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('score')}>Risk Score <SortIcon columnKey="score" /></th>
                <th style={{ padding: '16px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('score')}>Risk Band <SortIcon columnKey="score" /></th>
                <th style={{ padding: '16px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('drop')}>Drop Magnitude <SortIcon columnKey="drop" /></th>
                <th style={{ padding: '16px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('missing')}>Missing Rate <SortIcon columnKey="missing" /></th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFiltered.map((acc, idx) => {
                const score = acc.normalized_risk_score !== undefined ? acc.normalized_risk_score : (acc.risk_score || 0);
                const risk = getRiskLabel(score);
                
                const shiftKwh = acc.recent_mean_shift || 0;
                const baseMean = acc.consumption_mean || 1;
                const drop = Math.abs((shiftKwh / baseMean) * 100).toFixed(1);
                const isDrop = shiftKwh < 0;
                
                const missingRate = ((acc.missing_rate || 0) * 100).toFixed(1);
                
                // Colorize rows based on risk
                const rowBg = risk.class === 'very-high' ? 'rgba(239, 68, 68, 0.05)' : 'transparent';
                
                return (
                  <tr 
                    key={acc.CONS_NO} 
                    onClick={() => onSelectAccount(acc)}
                    style={{ background: rowBg, borderBottom: '1px solid rgba(255, 153, 0, 0.05)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 153, 0, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = rowBg}
                  >
                    <td style={{ padding: '16px', color: '#fff', fontFamily: 'JetBrains Mono', fontSize: '12px' }}>#{acc.rank || idx + 1}</td>
                    <td style={{ padding: '16px', color: '#fff', fontWeight: 'bold' }}>{acc.CONS_NO}</td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{score.toFixed(4)}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge-risk ${risk.class}`} style={{ display: 'inline-block', padding: '4px 10px', fontSize: '10px' }}>
                        {risk.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'JetBrains Mono', fontSize: '12px' }}>
                      <span style={{ color: isDrop ? 'var(--danger)' : '#10b981', fontWeight: 'bold' }}>
                        {isDrop ? '-' : '+'}{drop}%
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '12px' }}>
                      {missingRate}%
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--gold)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Orbitron', fontSize: '10px' }}>
                        INSPECT
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {sortedAndFiltered.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
