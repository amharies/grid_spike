import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Search, X, ChevronRight, AlertTriangle, Shield } from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────────── */

// Deterministic hash so the same account always sits at the same spot
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

function riskColor(score) {
  if (score >= 0.75) return { fill: '#EF4444', glow: 'rgba(239,68,68,.45)', label: 'CRITICAL' };
  if (score >= 0.50) return { fill: '#F59E0B', glow: 'rgba(245,158,11,.35)', label: 'HIGH' };
  if (score >= 0.25) return { fill: '#3B82F6', glow: 'rgba(59,130,246,.30)', label: 'MODERATE' };
  return { fill: '#10B981', glow: 'rgba(16,185,129,.25)', label: 'LOW' };
}

/* ── component ───────────────────────────────────────────────────── */

const GridMap = ({ accounts, onSelectAccount }) => {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const animRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [search, setSearch] = useState('');
  const [highlightId, setHighlightId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  // Place accounts deterministically on a virtual 2‑D plane
  const WORLD = 4000; // virtual world size

  const nodes = useMemo(() => {
    // top 500 accounts by risk to keep the map readable
    const sorted = [...accounts].sort((a, b) => b.risk_score - a.risk_score).slice(0, 500);
    return sorted.map((acc) => {
      const h = hashCode(String(acc.CONS_NO));
      // golden-ratio scatter for even spread
      const angle = (h & 0xffff) * 2.399963;
      const radius = Math.sqrt((h >>> 16) / 65535) * (WORLD * 0.45);
      const x = WORLD / 2 + Math.cos(angle) * radius;
      const y = WORLD / 2 + Math.sin(angle) * radius;
      const r = 4 + acc.risk_score * 14; // radius 4-18
      return { ...acc, x, y, r, ...riskColor(acc.risk_score) };
    });
  }, [accounts]);

  /* ── drawing ───────────────────────────────────────────────────── */

  const draw = useCallback((time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // background grid
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // faint grid lines
    const gridSpacing = 200;
    ctx.strokeStyle = 'rgba(42,54,85,0.35)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= WORLD; gx += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, WORLD); ctx.stroke();
    }
    for (let gy = 0; gy <= WORLD; gy += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(WORLD, gy); ctx.stroke();
    }

    // draw connections between nearby high-risk nodes (network edges)
    const highRiskNodes = nodes.filter(n => n.risk_score >= 0.5);
    ctx.strokeStyle = 'rgba(239,68,68,0.06)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < highRiskNodes.length; i++) {
      for (let j = i + 1; j < highRiskNodes.length; j++) {
        const dx = highRiskNodes[i].x - highRiskNodes[j].x;
        const dy = highRiskNodes[i].y - highRiskNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 350) {
          ctx.beginPath();
          ctx.moveTo(highRiskNodes[i].x, highRiskNodes[i].y);
          ctx.lineTo(highRiskNodes[j].x, highRiskNodes[j].y);
          ctx.stroke();
        }
      }
    }

    // draw nodes
    const pulse = Math.sin(time / 600) * 0.5 + 0.5; // 0..1 pulse
    for (const node of nodes) {
      const isHighlighted = highlightId === String(node.CONS_NO);

      // glow
      if (node.risk_score >= 0.5 || isHighlighted) {
        const glowR = node.r + 6 + pulse * 6;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = isHighlighted ? 'rgba(255,255,255,0.18)' : node.glow;
        ctx.fill();
      }

      // main circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = isHighlighted ? '#ffffff' : node.fill;
      ctx.fill();

      // ring for highlighted
      if (isHighlighted) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();

    animRef.current = requestAnimationFrame(draw);
  }, [nodes, zoom, pan, highlightId]);

  /* ── lifecycle ─────────────────────────────────────────────────── */

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) return;
      canvas.width = wrapper.clientWidth;
      canvas.height = wrapper.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  /* ── interactions ──────────────────────────────────────────────── */

  const worldFromScreen = (sx, sy) => ({
    wx: (sx - pan.x) / zoom,
    wy: (sy - pan.y) / zoom,
  });

  const handleMouseMove = (e) => {
    if (isPanning.current) {
      setPan({
        x: panOrigin.current.x + (e.clientX - panStart.current.x),
        y: panOrigin.current.y + (e.clientY - panStart.current.y),
      });
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { wx, wy } = worldFromScreen(sx, sy);

    let found = null;
    for (const node of nodes) {
      const dx = node.x - wx;
      const dy = node.y - wy;
      if (dx * dx + dy * dy < (node.r + 4) * (node.r + 4)) {
        found = node;
        break;
      }
    }
    if (found) {
      setTooltip({ x: e.clientX - canvasRef.current.getBoundingClientRect().left, y: e.clientY - canvasRef.current.getBoundingClientRect().top, node: found });
      canvasRef.current.style.cursor = 'pointer';
    } else {
      setTooltip(null);
      canvasRef.current.style.cursor = isPanning.current ? 'grabbing' : 'grab';
    }
  };

  const handleMouseDown = (e) => {
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...pan };
    canvasRef.current.style.cursor = 'grabbing';
  };

  const handleMouseUp = () => {
    isPanning.current = false;
    canvasRef.current.style.cursor = 'grab';
  };

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { wx, wy } = worldFromScreen(sx, sy);

    for (const node of nodes) {
      const dx = node.x - wx;
      const dy = node.y - wy;
      if (dx * dx + dy * dy < (node.r + 4) * (node.r + 4)) {
        onSelectAccount(node);
        return;
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(Math.max(zoom * factor, 0.15), 5);

    // zoom toward cursor
    setPan({
      x: mx - (mx - pan.x) * (newZoom / zoom),
      y: my - (my - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  /* ── search ────────────────────────────────────────────────────── */

  const handleSearch = (val) => {
    setSearch(val);
    if (!val) { setHighlightId(null); return; }
    const match = nodes.find(n => String(n.CONS_NO).toLowerCase().includes(val.toLowerCase()));
    if (match) {
      setHighlightId(String(match.CONS_NO));
      // center on match
      const canvas = canvasRef.current;
      if (canvas) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        setPan({ x: cx - match.x * zoom, y: cy - match.y * zoom });
      }
    } else {
      setHighlightId(null);
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHighlightId(null);
    setSearch('');
  };

  /* ── legend counts ─────────────────────────────────────────────── */
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, moderate: 0, low: 0 };
    nodes.forEach(n => {
      if (n.risk_score >= 0.75) c.critical++;
      else if (n.risk_score >= 0.5) c.high++;
      else if (n.risk_score >= 0.25) c.moderate++;
      else c.low++;
    });
    return c;
  }, [nodes]);

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Service Area Grid Map</h2>
          <p className="text-textMuted text-sm mt-1">Top 500 accounts plotted by behavioural risk. Scroll to zoom, drag to pan.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
            <input
              type="text"
              placeholder="Locate account…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="bg-surface border border-surfaceHover text-white rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-primary transition-colors w-56"
            />
            {search && (
              <button onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-textMuted hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          <button onClick={() => setZoom(z => Math.min(z * 1.3, 5))} className="p-2 bg-surface border border-surfaceHover rounded-lg hover:bg-surfaceHover text-textMuted hover:text-white transition-colors">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(z => Math.max(z / 1.3, 0.15))} className="p-2 bg-surface border border-surfaceHover rounded-lg hover:bg-surfaceHover text-textMuted hover:text-white transition-colors">
            <ZoomOut size={16} />
          </button>
          <button onClick={resetView} className="p-2 bg-surface border border-surfaceHover rounded-lg hover:bg-surfaceHover text-textMuted hover:text-white transition-colors">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* canvas area */}
      <div ref={wrapperRef} className="relative w-full bg-[#060a14] rounded-xl border border-surfaceHover shadow-xl overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); setTooltip(null); }}
          onClick={handleClick}
          onWheel={handleWheel}
          style={{ display: 'block', cursor: 'grab' }}
        />

        {/* tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 bg-surface/95 backdrop-blur-md border border-surfaceHover rounded-xl shadow-2xl p-4 w-64"
            style={{ left: tooltip.x + 16, top: tooltip.y - 20 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs text-textMuted">{tooltip.node.CONS_NO}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border`} style={{ color: tooltip.node.fill, borderColor: tooltip.node.fill, backgroundColor: tooltip.node.glow }}>
                {tooltip.node.label}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-textMuted">Risk Score</span>
                <span className="text-white font-mono">{tooltip.node.risk_score.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Drop</span>
                <span className={tooltip.node.recent_mean_shift < 0 ? 'text-danger' : 'text-success'}>
                  {(tooltip.node.recent_mean_shift * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Anomaly</span>
                <span className="text-white">{(tooltip.node.anomaly_score || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-primary flex items-center gap-1">
              Click to inspect <ChevronRight size={12} />
            </div>
          </div>
        )}

        {/* legend */}
        <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur-md border border-surfaceHover rounded-xl p-4 shadow-lg z-10">
          <p className="text-xs text-textMuted uppercase tracking-wider font-semibold mb-3">Risk Level</p>
          <div className="space-y-2">
            {[
              { color: '#EF4444', label: 'Critical (≥0.75)', count: counts.critical },
              { color: '#F59E0B', label: 'High (0.50–0.74)', count: counts.high },
              { color: '#3B82F6', label: 'Moderate (0.25–0.49)', count: counts.moderate },
              { color: '#10B981', label: 'Low (<0.25)', count: counts.low },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-textMuted flex-1">{item.label}</span>
                <span className="text-white font-mono">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* zoom indicator */}
        <div className="absolute bottom-4 right-4 bg-surface/80 backdrop-blur-md border border-surfaceHover rounded-lg px-3 py-1.5 text-xs text-textMuted z-10">
          {(zoom * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export default GridMap;
