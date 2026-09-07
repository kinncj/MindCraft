import { useEffect, useState } from 'react';
import { getEngine } from '../game/engineRef';
import { useGameStore } from '../game/gameStore';
import type { HelperDiagnostics } from '../engine/chat/WebLlmProvider';

/** `?debug=true` shows what the helper model is doing. Off by default. */
export function debugEnabled(): boolean {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('debug') === 'true';
}

type Snapshot = {
  helper: HelperDiagnostics | null;
  provider: string;
  lastError: string;
  lastLatencyMs: number;
  render: Record<string, unknown> | null;
  ua: string;
};

export function DebugOverlay() {
  const helperState = useGameStore((state) => state.helper);
  const errors = useGameStore((state) => state.errors);
  const [open, setOpen] = useState(true);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  useEffect(() => {
    const tick = (): void => {
      const engine = getEngine();
      if (!engine) return;
      setSnap({
        helper: engine.chat.helper.diagnostics(),
        provider: engine.chat.lastProvider || engine.chat.providerName,
        lastError: engine.chat.lastError,
        lastLatencyMs: engine.chat.lastLatencyMs,
        render: window.mindcraftDebug?.renderStats() ?? null,
        ua: navigator.userAgent,
      });
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);
  if (!open) {
    return (
      <button type="button" className="debug-toggle" onClick={() => setOpen(true)} aria-label="Show debug">
        🐞
      </button>
    );
  }
  const h = snap?.helper;
  const thinkingFor = h?.busySince ? ((Date.now() - h.busySince) / 1000).toFixed(1) : null;
  const gpu = typeof navigator !== 'undefined' && 'gpu' in navigator ? 'yes' : 'no';
  return (
    <div className="debug-overlay" role="region" aria-label="Debug">
      <div className="debug-head">
        <strong>🐞 Debug</strong>
        <button type="button" onClick={() => setOpen(false)} aria-label="Hide debug">✕</button>
      </div>
      <dl>
        <dt>Helper</dt>
        <dd>{helperState.status} {helperState.status === 'downloading' || helperState.status === 'loading' ? `${Math.round(helperState.progress * 100)}% · ${helperState.text}` : ''} · enabled: {String(helperState.enabled)}</dd>
        <dt>Model</dt>
        <dd>{h?.info ? `${h.info.model} · ${h.info.runtime} thread · f16: ${String(h.info.hasF16)} · max buffer: ${h.info.maxBufferMB ?? '?'} MB · ${h.info.adapter}` : 'not loaded'} · WebGPU: {gpu} · JSON mode: {String(h?.jsonMode)}</dd>
        <dt>State</dt>
        <dd>{thinkingFor ? `thinking… ${thinkingFor}s` : h?.status ?? '-'} · replies: {h?.replies ?? 0} · last: {h?.lastLatencyMs ?? '-'} ms</dd>
        <dt>Last answer by</dt>
        <dd>{snap?.provider ?? '-'} ({snap?.lastLatencyMs ?? 0} ms){snap?.lastError ? ` · fell back: ${snap.lastError}` : ''}</dd>
        {h?.error && (
          <>
            <dt>Helper error</dt>
            <dd className="debug-error">{h.error}</dd>
          </>
        )}
        <dt>Errors</dt>
        <dd className={errors.length ? 'debug-error' : undefined}>{errors.length === 0 ? 'none' : `${errors.length} (loop skipped ${getEngine()?.loop.errors ?? 0} frames)`}</dd>
        <dt>Frame</dt>
        <dd>{snap?.render ? `${String(snap.render.fps)} fps · ${String(snap.render.frameMs)} ms · ${String(snap.render.drawCalls)} draws · ${String(snap.render.triangles)} tris · mesh jobs ${String(snap.render.meshJobs)} (worker meshed ${String(snap.render.meshedInWorker)})` : '-'}</dd>
        <dt>Render</dt>
        <dd>{snap?.render ? JSON.stringify(snap.render) : '-'}</dd>
        <dt>Browser</dt>
        <dd>{snap?.ua ?? '-'}</dd>
      </dl>
      <div className="debug-buttons">
        <button
          type="button"
          disabled={testing || helperState.status !== 'ready'}
          onClick={async () => {
            const engine = getEngine();
            if (!engine) return;
            setTesting(true);
            setTestResult('asking…');
            const started = Date.now();
            try {
              const reply = await engine.chat.helper.reply({
                villager: { id: 'debug', name: 'Test', job: 'builder', jobLabel: 'Builder', emoji: '🔨', x: 0, z: 0 },
                message: 'Say hello in one short sentence.',
                history: [],
                player: { x: 0, y: 0, z: 0, yaw: 0 },
                site: { x: 0, y: 1, z: 0 },
                blueprints: [],
                blocks: [],
                tools: [],
                world: { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'debug' },
              });
              setTestResult(`OK in ${Date.now() - started} ms: ${reply.say}`);
            } catch (error) {
              setTestResult(`FAILED after ${Date.now() - started} ms: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
              setTesting(false);
            }
          }}
        >
          Test the helper
        </button>
        <span>{testResult}</span>
      </div>
      {errors.length > 0 && (
        <details open>
          <summary>Recent errors</summary>
          <pre>{errors.slice(-6).map((e) => `${new Date(e.at).toLocaleTimeString()} [${e.where}] ${e.message}`).join('\n\n')}</pre>
        </details>
      )}
      <details>
        <summary>Last prompt</summary>
        <pre>{h?.lastPrompt || '-'}</pre>
      </details>
      <details>
        <summary>Last raw output</summary>
        <pre>{h?.lastRaw || '-'}</pre>
      </details>
    </div>
  );
}
