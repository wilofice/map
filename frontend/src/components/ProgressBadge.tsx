import { useState } from 'react';
import { useMindMapStore } from '../store/mindMapStore';

function Row({ color, label, count, pulse }: { color: string; label: string; count: number; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#525252]">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${pulse ? 'animate-pulse' : ''}`}
        style={{ background: color }}
      />
      <span className="flex-1">{label}</span>
      <span className="text-[#161616] font-medium tabular-nums">{count}</span>
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
  const color = pct === 100 ? '#198038' : '#0f62fe';

  return (
    <div
      className="absolute bottom-4 right-4 z-10 select-none cursor-pointer"
      onClick={() => setOpen(o => !o)}
      title={open ? 'Click to collapse' : 'Click for breakdown'}
    >
      <div className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden shadow-md">
        {/* Main pill */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <svg width="40" height="40" className="-rotate-90 shrink-0">
            <circle cx="20" cy="20" r={r} fill="none" stroke="#e0e0e0" strokeWidth="3" />
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
          <span className="text-[#a8a8a8] text-[10px] ml-1">{open ? '▴' : '▾'}</span>
        </div>

        {/* Expanded breakdown */}
        {open && (
          <div className="border-t border-[#e0e0e0] px-3 py-2 space-y-1.5">
            <Row color="#198038" label="Completed"   count={done}    />
            <Row color="#0f62fe" label="In progress" count={inProg}  pulse />
            <Row color="#8d8d8d" label="Pending"     count={pending} />
          </div>
        )}
      </div>
    </div>
  );
}
