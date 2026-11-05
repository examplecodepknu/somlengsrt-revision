// Talks to the SomlengPit backend (server/index.mjs) through the /api proxy.
// Every call fails softly so the site keeps working on mock data when the backend is off.
import type { Voice } from './data'

export type Health = { ok: boolean; saved: boolean; tts: boolean; model: string | null; engine: string; device: string | null }
export type TtsResult = { audioId: string; url: string; duration: number; seconds: number; speed: number; how: string; engine: string }

const json = async <T,>(r: Response): Promise<T> => {
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
  return j as T
}

export const api = {
  health: () => fetch('/api/health', { signal: AbortSignal.timeout(5000) }).then((r) => json<Health>(r)),
  loadState: () => fetch('/api/state').then((r) => json<{ state: Record<string, unknown> | null }>(r)).then((j) => j.state),
  saveState: (state: unknown) => fetch('/api/state', { method: 'PUT', body: JSON.stringify(state) }).then((r) => json(r)),
  resetState: () => fetch('/api/state', { method: 'DELETE' }).then((r) => json(r)),
  tts: (text: string, voice: Voice | undefined, style: string) =>
    fetch('/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text, style, voice: voice ? { id: voice.id, ref: voice.ref, gender: voice.gender } : {} }),
    }).then((r) => json<TtsResult>(r)),
  uploadVoice: (file: File, text: string, start = 0, len = 20) =>
    fetch('/api/voices/upload', {
      method: 'POST',
      body: file,
      headers: { 'x-text': encodeURIComponent(text), 'x-start': String(start), 'x-len': String(len), 'x-name': file.name.replace(/\.[^.]+$/, '') },
    }).then((r) => json<{ id: string; text: string }>(r)),
  voiceText: (ref: string, text: string) =>
    fetch('/api/voices/text', { method: 'POST', body: JSON.stringify({ ref, text }) }).then((r) => json(r)),
}
