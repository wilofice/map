import { useRef, useState, useEffect, useCallback } from 'react';
import { useMindMapStore } from '../store/mindMapStore';
import { STATUS_CONFIG, STATUS_CYCLE, PRIORITY_COLOR, PRIORITY_LABEL } from '../types/NodeTypes';
import type { NodeStatus, NodePriority, NodeAudioFile } from '../types/NodeTypes';
import { api } from '../hooks/useApi';

const PRIORITY_CYCLE: NodePriority[] = ['low', 'medium', 'high'];

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

  // Revoke previous object URL when it changes
  useEffect(() => {
    return () => { if (pendingUrl) URL.revokeObjectURL(pendingUrl); };
  }, [pendingUrl]);

  // Clear timer on unmount
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
        <div className="text-[10px] font-semibold text-[#6f6f6f] uppercase tracking-wide">🎵 Audio</div>
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

      {/* Pending recording: preview before saving */}
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
                <button
                  onClick={() => remove(f.id)}
                  className="text-[10px] text-[#fa4d56] hover:underline"
                >Remove</button>
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-[#6f6f6f] uppercase tracking-wide mb-1">
      {children}
    </div>
  );
}

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

export default function DetailPanel() {
  const { rawNodes, selectedNodeId, setSelectedNodeId, cycleStatus, updateNodeField } = useMindMapStore();

  if (!selectedNodeId) return null;
  const node = rawNodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const status     = STATUS_CONFIG[node.status];
  const nextStatus: NodeStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(node.status) + 1) % STATUS_CYCLE.length];
  const priorityColor = PRIORITY_COLOR[node.priority];
  const nextPriority: NodePriority = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(node.priority) + 1) % PRIORITY_CYCLE.length];

  const save = (patch: Parameters<typeof updateNodeField>[1]) => updateNodeField(node.id, patch);
  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <aside className="flex flex-col w-80 shrink-0 border-l border-[#2a2a2a] bg-[#161616] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] shrink-0">
        <span className="text-xs font-semibold text-[#6f6f6f] uppercase tracking-wide">Node detail</span>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-[#6f6f6f] hover:text-[#f4f4f4] text-lg leading-none transition-colors"
          title="Close (Esc)"
        >×</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Title */}
        <div>
          <Label>Title</Label>
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
        </div>

        {/* Status + Priority */}
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

        <hr className="border-[#2a2a2a]" />

        {/* Timeline */}
        <div>
          <Label>Timeline</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-[#525252] mb-0.5">Start</div>
              <input
                key={node.id + '-start'}
                type="date"
                defaultValue={node.start_date ?? ''}
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 h-7 text-xs
                  text-[#c6c6c6] outline-none focus:border-[#4589ff] transition-colors
                  [color-scheme:dark]"
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
                  text-[#c6c6c6] outline-none focus:border-[#4589ff] transition-colors
                  [color-scheme:dark]"
                onBlur={(e) => save({ end_date: e.target.value || undefined })}
              />
            </div>
          </div>
          <div className="mt-2">
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
        </div>

        <hr className="border-[#2a2a2a]" />

        {/* Comment */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>💬 Comment</Label>
            {node.content && <button onClick={() => copy(node.content!)} className="text-[10px] text-[#4589ff] hover:text-[#78a9ff]">copy</button>}
          </div>
          <FieldInput
            key={node.id + '-content'}
            value={node.content ?? ''}
            placeholder="Add a note…"
            multiline
            onSave={(v) => save({ content: v })}
          />
        </div>

        {/* Code */}
        <div>
          <Label>{'</>'} Code</Label>
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
        </div>

        {/* AI Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>🤖 AI Prompt</Label>
            {node.task_prompt && <button onClick={() => copy(node.task_prompt!)} className="text-[10px] text-[#4589ff] hover:text-[#78a9ff]">copy</button>}
          </div>
          <FieldInput
            key={node.id + '-prompt'}
            value={node.task_prompt ?? ''}
            placeholder="Describe the task for the AI…"
            multiline
            onSave={(v) => save({ task_prompt: v })}
          />
        </div>

        {/* CLI */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>$ CLI Command</Label>
            {node.cli_command && <button onClick={() => copy(node.cli_command!)} className="text-[10px] text-[#4589ff] hover:text-[#78a9ff]">copy</button>}
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
        </div>

        <hr className="border-[#2a2a2a]" />

        {/* Audio attachments */}
        <AudioSection nodeId={node.id} />

        {/* Node ID */}
        <div className="pt-2 border-t border-[#2a2a2a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#525252]">ID</span>
            <button onClick={() => copy(node.id)} className="text-[10px] text-[#525252] hover:text-[#8d8d8d] font-mono truncate max-w-[200px]">
              {node.id}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
