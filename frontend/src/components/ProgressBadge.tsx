import { useState } from 'react';
import { useMindMapStore } from '../store/mindMapStore';

function Row({ color, label, count, pulse }: { color: string; label: string; count: number; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-300">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''}`}
        style={{ background: color }}
      />
      <span className="flex-1">{label}</span>
      <span className="text-slate-400 font-medium tabular-nums">{count}</span>
    </div>
  );
}

export default function ProgressBadge() {
  const rawNodes = useMindMapStore(s => s.rawNodes);
  const [open, setOpen] = useState(false);

  if (rawNodes.length === 0) return null;

  const total   = rawNodes.length;
  const done    = rawNodes.filter(n => n.status === 'completed').length;
  const inProg  = rawNodes.filter(n => n.status === 'in-progress').length;
  const pending = total - done - inProg;
  const pct     = Math.round((done / total) * 100);

  const r    = 18;
  const circ = 2 * Math.PI * r;
  const dash = (done / total) * circ;
  const color = pct === 100 ? '#22c55e' : '#3b82f6';

  return (
    <div
      className="absolute bottom-4 right-4 z-10 select-none cursor-pointer"
      onClick={() => setOpen(o => !o)}
      title={open ? 'Click to collapse' : 'Click for breakdown'}
    >
      <div className="bg-[#13192a]/90 backdrop-blur-sm border border-slate-700/60 rounded-xl overflow-hidden shadow-lg">
        {/* Main pill */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <svg width="40" height="40" className="-rotate-90 shrink-0">
            {/* Track */}
            <circle cx="20" cy="20" r={r} fill="none" stroke="#1e293b" strokeWidth="3" />
            {/* Progress arc */}
            <circle
              cx="20" cy="20" r={r} fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
            />
          </svg>
          <div>
            <div className="text-sm font-semibold text-slate-100 leading-tight" style={{ color }}>
              {pct}%
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">{done}/{total} done</div>
          </div>
          <span className="text-slate-600 text-[10px] ml-1">{open ? '▴' : '▾'}</span>
        </div>

        {/* Expanded breakdown */}
        {open && (
          <div className="border-t border-slate-700/60 px-3 py-2 space-y-1.5">
            <Row color="#22c55e" label="Completed"   count={done}    />
            <Row color="#3b82f6" label="In progress" count={inProg}  pulse />
            <Row color="#64748b" label="Pending"     count={pending} />
          </div>
        )}
      </div>
    </div>
  );
}
