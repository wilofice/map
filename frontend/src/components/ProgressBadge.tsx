import { useState } from 'react';
import { useMindMapStore } from '../store/mindMapStore';

function Row({ color, label, count, pulse }: { color: string; label: string; count: number; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#8d8d8d]">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''}`}
        style={{ background: color }}
      />
      <span className="flex-1">{label}</span>
      <span className="text-[#e8e8e8] font-medium tabular-nums">{count}</span>
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
  const color = pct === 100 ? '#42be65' : '#4589ff';

  return (
    <div
      className="absolute bottom-4 right-4 z-10 select-none cursor-pointer"
      onClick={() => setOpen(o => !o)}
      title={open ? 'Click to collapse' : 'Click for breakdown'}
    >
      <div className="bg-[#1e1e1e] border border-[#393939] rounded-xl overflow-hidden shadow-lg">
        {/* Main pill */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <svg width="40" height="40" className="-rotate-90 shrink-0">
            <circle cx="20" cy="20" r={r} fill="none" stroke="#333333" strokeWidth="3" />
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
            <div className="text-sm font-semibold leading-tight" style={{ color }}>
              {pct}%
            </div>
            <div className="text-[10px] text-[#6f6f6f] leading-tight">{done}/{total} done</div>
          </div>
          <span className="text-[#525252] text-[10px] ml-1">{open ? '▴' : '▾'}</span>
        </div>

        {/* Expanded breakdown */}
        {open && (
          <div className="border-t border-[#2a2a2a] px-3 py-2 space-y-1.5">
            <Row color="#42be65" label="Completed"   count={done}    />
            <Row color="#4589ff" label="In progress" count={inProg}  pulse />
            <Row color="#6f6f6f" label="Pending"     count={pending} />
          </div>
        )}
      </div>
    </div>
  );
}
