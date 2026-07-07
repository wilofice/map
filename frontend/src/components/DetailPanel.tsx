import { useRef, useState, useEffect, useCallback } from 'react';
import { useMindMapStore } from '../store/mindMapStore';
import { STATUS_CONFIG, STATUS_CYCLE, PRIORITY_COLOR, PRIORITY_LABEL } from '../types/NodeTypes';
import type { NodeStatus, NodePriority, NodeAudioFile } from '../types/NodeTypes';
import { api } from '../hooks/useApi';
import type { AiSuggestion } from '../hooks/useApi';

const PRIORITY_CYCLE: NodePriority[] = ['low', 'medium', 'high'];

// ─── Collapsible section wrapper ────────────────────────────────────────────

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#1e1e1e]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5
          text-left hover:bg-[rgba(244,244,244,0.03)] transition-colors group"
      >
        <span className="text-[10px] font-semibold text-[#6f6f6f] uppercase tracking-wide">
          {title}
        </span>
        <span
          className={`text-[#3d3d3d] group-hover:text-[#525252] transition-transform duration-150 text-sm leading-none
            ${open ? 'rotate-90' : ''}`}
        >›</span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

// ─── Audio section ────────────────────────────────────────────────────────

function AudioSection({ nodeId }: { nodeId: string }) {
  const [files, setFiles] = useState<NodeAudioFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    api.getNodeAudio(nodeId).then(setFiles).catch(() => {});
  }, [nodeId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => { if (pendingUrl) URL.revokeObjectURL(pendingUrl); };
  }, [pendingUrl]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(picked.map(f => api.uploadNodeAudio(nodeId, f)));
      setFiles(prev => [...prev, ...results]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Recording requires HTTPS. Use "+ Attach" to upload files instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setPendingBlob(blob);
        setPendingUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      setMicError('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  const saveRecording = async () => {
    if (!pendingBlob) return;
    const mimeType = pendingBlob.type || 'audio/webm';
    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const file = new File([pendingBlob], `recording-${ts}.${ext}`, { type: mimeType });
    setUploading(true);
    try {
      const result = await api.uploadNodeAudio(nodeId, file);
      setFiles(prev => [...prev, result]);
      setPendingBlob(null);
      setPendingUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const discardRecording = () => {
    setPendingBlob(null);
    setPendingUrl(null);
  };

  const remove = async (id: string) => {
    await api.deleteNodeAudio(id);
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const fmtSize = (bytes?: number) =>
    !bytes ? '' : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {!isRecording && !pendingBlob && (
            <>
              <button
                onClick={startRecording}
                disabled={uploading}
                className="text-[10px] px-2 py-0.5 rounded border border-[#393939] text-[#8d8d8d]
                  hover:text-[#fa4d56] hover:border-[#fa4d56] transition-colors disabled:opacity-40"
                title="Record audio"
              >🎙 Record</button>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="text-[10px] px-2 py-0.5 rounded border border-[#393939] text-[#8d8d8d]
                  hover:text-[#f4f4f4] hover:border-[#4589ff] transition-colors disabled:opacity-40"
              >
                {uploading ? 'Uploading…' : '+ Attach'}
              </button>
            </>
          )}
          {isRecording && (
            <button
              onClick={stopRecording}
              className="text-[10px] px-2 py-0.5 rounded border border-[#fa4d56] text-[#fa4d56]
                hover:bg-[#fa4d5620] transition-colors flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#fa4d56] animate-pulse inline-block" />
              {fmtTime(recSeconds)}  ■ Stop
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleFiles} />
      </div>

      {micError && <p className="text-[11px] text-[#fa4d56] mb-2">{micError}</p>}

      {pendingBlob && pendingUrl && (
        <div className="bg-[#1a1a1a] border border-[#4589ff44] rounded p-2 mb-2">
          <div className="text-[10px] text-[#4589ff] font-medium mb-1.5">Preview recording</div>
          <audio controls src={pendingUrl} className="w-full h-7 mb-2" style={{ colorScheme: 'dark' }} />
          <div className="flex gap-2">
            <button
              onClick={saveRecording}
              disabled={uploading}
              className="text-[10px] px-3 py-1 rounded bg-[#4589ff] text-white
                hover:bg-[#78a9ff] transition-colors disabled:opacity-40"
            >{uploading ? 'Saving…' : 'Save'}</button>
            <button
              onClick={discardRecording}
              className="text-[10px] px-3 py-1 rounded border border-[#393939] text-[#8d8d8d]
                hover:text-[#f4f4f4] transition-colors"
            >Discard</button>
          </div>
        </div>
      )}

      {files.length === 0 && !pendingBlob && (
        <p className="text-[11px] text-[#525252] italic">No audio attached.</p>
      )}

      <div className="space-y-2">
        {files.map(f => (
          <div key={f.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[#c6c6c6] truncate flex-1 mr-2" title={f.original_filename}>
                {f.original_filename}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {f.file_size && <span className="text-[10px] text-[#525252]">{fmtSize(f.file_size)}</span>}
                <button
                  onClick={() => remove(f.id)}
                  className="text-[#525252] hover:text-[#fa4d56] text-xs w-4 h-4 flex items-center justify-center transition-colors"
                  title="Delete"
                >×</button>
              </div>
            </div>
            {f.missing ? (
              <div className="flex items-center gap-1.5 text-[11px] text-[#f1c21b]">
                <span>⚠</span>
                <span className="flex-1">File not found on disk</span>
                <button onClick={() => remove(f.id)} className="text-[10px] text-[#fa4d56] hover:underline">Remove</button>
              </div>
            ) : (
              <audio controls className="w-full h-7" style={{ colorScheme: 'dark' }}>
                <source src={`/api/db/audio/${f.id}/stream`} type={f.mime_type || 'audio/webm'} />
              </audio>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared field helpers ────────────────────────────────────────────────────

function FieldInput({
  value, placeholder, onSave, multiline = false, monospace = false,
}: {
  value: string; placeholder?: string; onSave: (v: string) => void;
  multiline?: boolean; monospace?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const cls = `w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-1.5 text-xs
    text-[#c6c6c6] placeholder-[#525252] resize-none outline-none
    focus:border-[#4589ff] focus:bg-[#222] transition-colors
    ${monospace ? 'font-mono' : ''}`;

  const handle = () => {
    const v = ref.current?.value ?? '';
    if (v !== value) onSave(v);
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        defaultValue={value}
        placeholder={placeholder}
        rows={3}
        className={cls}
        onBlur={handle}
      />
    );
  }
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      className={cls + ' h-7'}
      onBlur={handle}
    />
  );
}

// ─── AI: Generate child nodes ────────────────────────────────────────────────

const PRIORITY_COLOR_MAP: Record<AiSuggestion['priority'], string> = {
  high: '#fa4d56',
  medium: '#f1c21b',
  low: '#42be65',
};

function GenerateChildrenSection({ nodeId }: { nodeId: string }) {
  const { bulkAddChildren } = useMindMapStore();
  const [extraPrompt, setExtraPrompt] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    try {
      const result = await api.generateChildren(nodeId, extraPrompt, count);
      setSuggestions(result.suggestions);
      setSelected(new Set(result.suggestions.map((_, i) => i)));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelected = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const addSelected = async () => {
    if (!suggestions || selected.size === 0) return;
    setAdding(true);
    try {
      const toAdd = suggestions.filter((_, i) => selected.has(i));
      await bulkAddChildren(nodeId, toAdd);
      setSuggestions(null);
      setSelected(new Set());
    } catch (e) {
      setError(String(e));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      {/* Extra prompt */}
      <textarea
        value={extraPrompt}
        onChange={e => setExtraPrompt(e.target.value)}
        placeholder="Optional: focus, constraint, or angle…"
        rows={2}
        className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-1.5 text-xs
          text-[#c6c6c6] placeholder-[#525252] resize-none outline-none
          focus:border-[#4589ff] transition-colors mb-2"
      />

      {/* Count selector + Generate button */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-[#525252]">Count:</span>
        {([3, 5, 7] as const).map(n => (
          <button
            key={n}
            onClick={() => setCount(n)}
            className={`text-[10px] w-6 h-5 rounded transition-colors border ${
              count === n
                ? 'border-[#4589ff] text-[#4589ff] bg-[rgba(69,137,255,0.12)]'
                : 'border-[#393939] text-[#6f6f6f] hover:text-[#c6c6c6]'
            }`}
          >{n}</button>
        ))}
        <button
          onClick={generate}
          disabled={loading}
          className="ml-auto text-[11px] px-3 py-1 rounded border transition-colors
            border-[#4589ff] text-[#4589ff] hover:bg-[rgba(69,137,255,0.12)]
            disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <span className="w-2 h-2 rounded-full border border-[#4589ff] border-t-transparent animate-spin inline-block" />
              Generating…
            </>
          ) : '✨ Generate'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-2 text-[10px] text-[#fa4d56] bg-[#2d0709] border border-[#fa4d5633] rounded px-2 py-1.5 leading-snug">
          {error}
        </div>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] text-[#525252] mb-1.5">
            {suggestions.length} suggestions — select to add:
          </div>
          <div className="space-y-1">
            {suggestions.map((s, i) => (
              <label
                key={i}
                className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors border ${
                  selected.has(i)
                    ? 'bg-[rgba(69,137,255,0.08)] border-[#4589ff33]'
                    : 'border-transparent hover:bg-[rgba(244,244,244,0.03)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleSelected(i)}
                  className="mt-0.5 accent-[#4589ff] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[#c6c6c6] leading-snug">{s.title}</div>
                  {(s.content || s.comment) && (
                    <div className="text-[10px] text-[#525252] mt-0.5 leading-snug">{s.content || s.comment}</div>
                  )}
                </div>
                <span
                  className="text-[9px] font-medium uppercase tracking-wide shrink-0 mt-0.5"
                  style={{ color: PRIORITY_COLOR_MAP[s.priority] }}
                >{s.priority}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={addSelected}
              disabled={selected.size === 0 || adding}
              className="flex-1 py-1 rounded text-[11px] font-medium transition-colors
                bg-[#4589ff] text-white hover:bg-[#78a9ff]
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {adding ? 'Adding…' : `Add ${selected.size} node${selected.size !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => { setSuggestions(null); setSelected(new Set()); }}
              className="px-3 py-1 rounded text-[11px] border border-[#393939] text-[#6f6f6f]
                hover:text-[#f4f4f4] transition-colors"
            >Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export default function DetailPanel() {
  const { rawNodes, selectedNodeId, cycleStatus, updateNodeField, setDetailPanelOpen } = useMindMapStore();

  if (!selectedNodeId) return null;
  const node = rawNodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const status       = STATUS_CONFIG[node.status];
  const nextStatus: NodeStatus   = STATUS_CYCLE[(STATUS_CYCLE.indexOf(node.status) + 1) % STATUS_CYCLE.length];
  const priorityColor            = PRIORITY_COLOR[node.priority];
  const nextPriority: NodePriority = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(node.priority) + 1) % PRIORITY_CYCLE.length];

  const save = (patch: Parameters<typeof updateNodeField>[1]) => updateNodeField(node.id, patch);
  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <aside className="flex flex-col w-80 shrink-0 border-l border-[#2a2a2a] bg-[#161616] overflow-hidden">

      {/* ── Header (always visible) ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] shrink-0">
        <span className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Node detail</span>
        <button
          onClick={() => setDetailPanelOpen(false)}
          className="text-[#6f6f6f] hover:text-[#f4f4f4] text-lg leading-none transition-colors"
          title="Close (Esc)"
        >×</button>
      </div>

      {/* ── Sections ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Title */}
        <CollapsibleSection title="Title" defaultOpen>
          <textarea
            key={node.id + '-title'}
            defaultValue={node.title}
            rows={2}
            className="w-full bg-transparent border-b border-[#333] text-[14px] font-semibold
              text-[#e8e8e8] placeholder-[#525252] resize-none outline-none pb-1
              focus:border-[#4589ff] transition-colors"
            style={{ borderLeftColor: priorityColor, borderLeftWidth: 3, paddingLeft: 8 }}
            onBlur={(e) => { if (e.target.value.trim()) save({ title: e.target.value.trim() }); }}
          />
        </CollapsibleSection>

        {/* Status & Priority */}
        <CollapsibleSection title="Status & Priority" defaultOpen>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => cycleStatus(node.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:brightness-110"
              style={{ color: status.color, borderColor: `${status.color}55`, background: `${status.color}18` }}
              title={`Click → ${nextStatus}`}
            >
              <span className={`w-2 h-2 rounded-full ${status.pulse ? 'animate-pulse' : ''}`} style={{ background: status.color }} />
              {status.label}
            </button>
            <button
              onClick={() => save({ priority: nextPriority })}
              className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:brightness-110"
              style={{ color: priorityColor, borderColor: `${priorityColor}55`, background: `${priorityColor}18` }}
              title={`Click → ${nextPriority}`}
            >
              {PRIORITY_LABEL[node.priority]}
            </button>
            {node.depth_level !== undefined && (
              <span className="text-[10px] text-[#525252]">L{node.depth_level}</span>
            )}
          </div>
        </CollapsibleSection>

        {/* Timeline */}
        <CollapsibleSection title="Timeline">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-[10px] text-[#525252] mb-0.5">Start</div>
              <input
                key={node.id + '-start'}
                type="date"
                defaultValue={node.start_date ?? ''}
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 h-7 text-xs
                  text-[#c6c6c6] outline-none focus:border-[#4589ff] transition-colors [color-scheme:dark]"
                onBlur={(e) => save({ start_date: e.target.value || undefined })}
              />
            </div>
            <div>
              <div className="text-[10px] text-[#525252] mb-0.5">End</div>
              <input
                key={node.id + '-end'}
                type="date"
                defaultValue={node.end_date ?? ''}
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 h-7 text-xs
                  text-[#c6c6c6] outline-none focus:border-[#4589ff] transition-colors [color-scheme:dark]"
                onBlur={(e) => save({ end_date: e.target.value || undefined })}
              />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#525252] mb-0.5">Days spent</div>
            <input
              key={node.id + '-days'}
              type="number"
              min={0}
              defaultValue={node.days_spent ?? ''}
              placeholder="0"
              className="w-24 bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 h-7 text-xs
                text-[#c6c6c6] outline-none focus:border-[#4589ff] transition-colors"
              onBlur={(e) => save({ days_spent: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </CollapsibleSection>

        {/* Comment — larger font, auto-resize */}
        <CollapsibleSection title="💬 Comment" defaultOpen>
          <div className="flex items-center justify-between mb-1.5">
            {node.content && (
              <button onClick={() => copy(node.content!)} className="text-[10px] text-[#4589ff] hover:text-[#78a9ff] ml-auto">
                copy
              </button>
            )}
          </div>
          <CommentTextarea
            key={node.id + '-content'}
            value={node.content ?? ''}
            onSave={(v) => save({ content: v })}
          />
        </CollapsibleSection>

        {/* Code */}
        <CollapsibleSection title="</> Code">
          <input
            key={node.id + '-lang'}
            type="text"
            defaultValue={node.code_language ?? ''}
            placeholder="Language (e.g. typescript)"
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 h-7 text-xs
              text-[#c6c6c6] placeholder-[#525252] outline-none focus:border-[#4589ff]
              transition-colors mb-1.5"
            onBlur={(e) => save({ code_language: e.target.value || undefined })}
          />
          <div className="relative">
            {node.code_content && (
              <button
                onClick={() => copy(node.code_content!)}
                className="absolute top-1 right-1 text-[10px] text-[#4589ff] hover:text-[#78a9ff] z-10"
              >copy</button>
            )}
            <FieldInput
              key={node.id + '-code'}
              value={node.code_content ?? ''}
              placeholder="Paste code here…"
              multiline monospace
              onSave={(v) => save({ code_content: v })}
            />
          </div>
        </CollapsibleSection>

        {/* AI Prompt */}
        <CollapsibleSection title="🤖 AI Prompt">
          <div className="flex items-center justify-between mb-1">
            {node.task_prompt && (
              <button onClick={() => copy(node.task_prompt!)} className="text-[10px] text-[#4589ff] hover:text-[#78a9ff] ml-auto">
                copy
              </button>
            )}
          </div>
          <FieldInput
            key={node.id + '-prompt'}
            value={node.task_prompt ?? ''}
            placeholder="Describe the task for the AI…"
            multiline
            onSave={(v) => save({ task_prompt: v })}
          />
        </CollapsibleSection>

        {/* AI Generate children */}
        <CollapsibleSection title="✨ Generate Children">
          <GenerateChildrenSection nodeId={node.id} />
        </CollapsibleSection>

        {/* CLI */}
        <CollapsibleSection title="$ CLI Command">
          <div className="flex items-center justify-between mb-1">
            {node.cli_command && (
              <button onClick={() => copy(node.cli_command!)} className="text-[10px] text-[#4589ff] hover:text-[#78a9ff] ml-auto">
                copy
              </button>
            )}
          </div>
          <textarea
            key={node.id + '-cli'}
            defaultValue={node.cli_command ?? ''}
            placeholder="npm run …"
            rows={2}
            className="w-full bg-[#071908] border border-[#0e3a0e] rounded px-2 py-1.5 text-xs
              font-mono text-[#42be65] placeholder-[#1a5c1a] resize-none outline-none
              focus:border-[#198038] transition-colors"
            onBlur={(e) => save({ cli_command: e.target.value || undefined })}
          />
        </CollapsibleSection>

        {/* Audio */}
        <CollapsibleSection title="🎵 Audio">
          <AudioSection nodeId={node.id} />
        </CollapsibleSection>

      </div>

      {/* ── Footer: Node ID (always visible) ────────────────────────── */}
      <div className="px-4 py-2 border-t border-[#1e1e1e] shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#525252]">ID</span>
          <button
            onClick={() => copy(node.id)}
            className="text-[10px] text-[#525252] hover:text-[#8d8d8d] font-mono truncate max-w-[200px]"
          >
            {node.id}
          </button>
        </div>
      </div>

    </aside>
  );
}

// ─── Comment textarea (separate component for auto-resize ref) ───────────────

function CommentTextarea({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize on mount (fires when section opens)
  const mountRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleBlur = () => {
    const v = ref.current?.value ?? '';
    if (v !== value) {
      onSave(v);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setSaved(true);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    }
  };

  return (
    <div>
      <textarea
        ref={(el) => {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
          mountRef(el);
        }}
        defaultValue={value}
        placeholder="Add a note…"
        rows={3}
        onInput={handleInput}
        onBlur={handleBlur}
        className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-3 py-2
          text-[#d4d4d4] placeholder-[#525252] resize-none outline-none
          focus:border-[#4589ff] focus:bg-[#222] transition-colors leading-relaxed"
        style={{
          fontSize: '15px',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      />
      {saved && (
        <span className="text-[11px] text-[#42be65] mt-1 block">✓ Saved</span>
      )}
    </div>
  );
}
