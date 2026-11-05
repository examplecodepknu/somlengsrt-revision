// SomlengPit backend — zero dependencies (Node 18+).
//   node server/index.mjs        ->  http://127.0.0.1:8787
// - Saves the whole app state (projects, voices, tokens, history…) to server/data/db.json
// - Real speech: forwards TTS + voice uploads to VoxPocket studio (VOXPOCKET_URL, default http://127.0.0.1:7870)
// - Keeps every generated clip in server/data/audio/<id>.wav
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(HERE, 'data')
const AUDIO = path.join(DATA, 'audio')
const DB = path.join(DATA, 'db.json')
const PORT = Number(process.env.PORT || 8787)
const VOX = process.env.VOXPOCKET_URL || 'http://127.0.0.1:7870'
const ENGINE = process.env.ENGINE || 'pocket' // 'pocket' (our model) or 'v2' (VoxCPM2)
fs.mkdirSync(AUDIO, { recursive: true })

// Preset voices -> how VoxPocket should speak them.
// clip = a VoxPocket voice file (cloned, needs its .txt words); design = describe a voice, no clip.
const PRESETS = {
  chingchang: { clip: 'voices/1.mp3' },
  'female-1': { design: 'A young woman, clear and bright voice', seed: 11 },
  'female-2': { design: 'A gentle young woman, soft and warm voice', seed: 12 },
  'female-3': { design: 'A mature woman, calm and confident voice', seed: 13 },
  'male-1': { design: 'A young man, warm and clear voice', seed: 21 },
  'male-2': { design: 'A deep male voice, slow and steady', seed: 22 },
  'male-3': { design: 'A cheerful young man, energetic voice', seed: 23 },
  'male-4': { design: 'A middle-aged man, news anchor voice', seed: 24 },
  'male-5': { design: 'A friendly man, relaxed conversational voice', seed: 25 },
  'male-6': { design: 'An older man, low and wise voice', seed: 26 },
  'male-7': { design: 'A teenage boy, light and quick voice', seed: 27 },
  'male-8': { design: 'A strong man, loud and excited voice', seed: 28 },
}

let voxRoot = null // absolute folder of the VoxPocket app (learned from /api/info)

// ---------- helpers ----------
const send = (res, code, body, headers = {}) => {
  const isBuf = Buffer.isBuffer(body)
  res.writeHead(code, { 'content-type': isBuf ? 'application/octet-stream' : 'application/json', 'cache-control': 'no-store', ...headers })
  res.end(isBuf ? body : JSON.stringify(body))
}
const readBody = (req, limit = 30e6) =>
  new Promise((ok, bad) => {
    const parts = []
    let n = 0
    req.on('data', (c) => { n += c.length; if (n > limit) { bad(new Error('too large')); req.destroy() } else parts.push(c) })
    req.on('end', () => ok(Buffer.concat(parts)))
    req.on('error', bad)
  })
const readDb = () => { try { return JSON.parse(fs.readFileSync(DB, 'utf8')) } catch { return null } }
const writeDb = (state) => {
  const tmp = DB + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(state))
  fs.renameSync(tmp, DB)
}
const voxInfo = async () => {
  const r = await fetch(`${VOX}/api/info`, { signal: AbortSignal.timeout(4000) })
  const j = await r.json()
  const first = j.voices?.find((v) => v.id.includes(`${path.sep}voices${path.sep}`))
  if (first) voxRoot = path.dirname(path.dirname(first.id))
  return j
}
const wavSeconds = (buf) => {
  // PCM WAV: find "data" chunk; bytes / (sampleRate * channels * 2)
  try {
    const sr = buf.readUInt32LE(24), ch = buf.readUInt16LE(22), bits = buf.readUInt16LE(34)
    let i = 12
    while (i < buf.length - 8) {
      const id = buf.toString('ascii', i, i + 4), size = buf.readUInt32LE(i + 4)
      if (id === 'data') return Math.min(size, buf.length - i - 8) / (sr * ch * (bits / 8))
      i += 8 + size
    }
  } catch { /* fall through */ }
  return 0
}

// ---------- routes ----------
async function tts(req, res) {
  const { text = '', voice = {}, style = '', engine = ENGINE, steps = 10, cfg = 2, seed } = JSON.parse((await readBody(req)).toString() || '{}')
  if (!text.trim()) return send(res, 400, { error: 'empty text' })
  if (!voxRoot) await voxInfo().catch(() => {})
  const preset = PRESETS[voice.id]
  let voxVoice = voice.ref || '' // custom voices carry the VoxPocket file path from upload
  let fullStyle = style.trim()
  let useSeed = seed ?? 0
  if (!voxVoice && preset?.clip && voxRoot) voxVoice = path.join(voxRoot, preset.clip)
  if (!voxVoice) {
    // no clip -> design a voice from words (preset description, or a gender guess for library voices)
    const d = preset?.design || (voice.gender === 'male' ? 'A young man, warm and clear voice' : 'A young woman, clear and bright voice')
    fullStyle = [d, fullStyle].filter(Boolean).join(', ')
    useSeed = seed ?? preset?.seed ?? 0
  }
  const fd = new FormData()
  Object.entries({ engine, text, voice: voxVoice, style: fullStyle, steps, cfg, seed: useSeed, fix_text: 'true' }).forEach(([k, v]) => fd.append(k, String(v)))
  let r
  try {
    r = await fetch(`${VOX}/api/tts`, { method: 'POST', body: fd, signal: AbortSignal.timeout(180000) })
  } catch {
    return send(res, 503, { error: `VoxPocket is not running at ${VOX} — start it with ./run.sh` })
  }
  if (!r.ok) return send(res, r.status, await r.json().catch(() => ({ error: `VoxPocket error ${r.status}` })))
  const buf = Buffer.from(await r.arrayBuffer())
  const id = crypto.randomBytes(6).toString('hex')
  fs.writeFileSync(path.join(AUDIO, `${id}.wav`), buf)
  const h = (k) => r.headers.get(`x-${k}`)
  send(res, 200, {
    audioId: id, url: `/api/audio/${id}.wav`, duration: Number(h('dur')) || wavSeconds(buf),
    seconds: Number(h('total')), speed: Number(h('speed')), how: decodeURIComponent(h('how') || ''), engine,
  })
}

async function uploadVoice(req, res) {
  // body = the raw audio file; headers: x-text (words, URI-encoded), x-start / x-len (trim, seconds), x-name
  const raw = path.join(DATA, `up_${crypto.randomBytes(4).toString('hex')}`)
  const wav = raw + '.wav'
  fs.writeFileSync(raw, await readBody(req))
  const start = Math.max(0, Number(req.headers['x-start']) || 0)
  const len = Math.min(20, Number(req.headers['x-len']) || 20)
  const cut = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(start), '-i', raw, '-t', String(len), '-ac', '1', '-ar', '44100', wav])
  fs.rmSync(raw, { force: true })
  if (cut.status !== 0) return send(res, 400, { error: 'could not read this audio file' })
  const fd = new FormData()
  const name = String(req.headers['x-name'] || 'clip').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 30) || 'clip'
  fd.append('file', new Blob([fs.readFileSync(wav)], { type: 'audio/wav' }), `${name}.wav`)
  fd.append('text', decodeURIComponent(String(req.headers['x-text'] || '')))
  fs.rmSync(wav, { force: true })
  let r
  try {
    r = await fetch(`${VOX}/api/upload`, { method: 'POST', body: fd })
  } catch {
    return send(res, 503, { error: `VoxPocket is not running at ${VOX}` })
  }
  send(res, r.status, await r.json())
}

async function voiceText(req, res) {
  const { ref, text } = JSON.parse((await readBody(req)).toString())
  const fd = new FormData()
  fd.append('voice', ref)
  fd.append('text', text)
  const r = await fetch(`${VOX}/api/voice_text`, { method: 'POST', body: fd }).catch(() => null)
  if (!r) return send(res, 503, { error: 'VoxPocket is not running' })
  send(res, r.status, await r.json())
}

function audio(req, res, name) {
  const f = path.join(AUDIO, path.basename(name))
  if (!/^[a-f0-9]+\.wav$/.test(path.basename(name)) || !fs.existsSync(f)) return send(res, 404, { error: 'not found' })
  const buf = fs.readFileSync(f)
  // support Range so the browser can seek
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '')
  if (m) {
    const s = m[1] ? Number(m[1]) : 0, e = m[2] ? Number(m[2]) : buf.length - 1
    res.writeHead(206, { 'content-type': 'audio/wav', 'content-range': `bytes ${s}-${e}/${buf.length}`, 'accept-ranges': 'bytes', 'content-length': e - s + 1 })
    return res.end(buf.subarray(s, e + 1))
  }
  send(res, 200, buf, { 'content-type': 'audio/wav', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=31536000' })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  const p = url.pathname
  try {
    if (p === '/api/health') {
      const info = await voxInfo().catch(() => null)
      return send(res, 200, { ok: true, saved: fs.existsSync(DB), tts: !!info, engines: info?.engines ?? {}, model: info?.pocket ?? null, engine: ENGINE, device: info?.device ?? null })
    }
    if (p === '/api/state' && req.method === 'GET') return send(res, 200, { state: readDb() })
    if (p === '/api/state' && req.method === 'PUT') {
      const state = JSON.parse((await readBody(req)).toString())
      writeDb({ ...state, savedAt: new Date().toISOString() })
      return send(res, 200, { ok: true })
    }
    if (p === '/api/state' && req.method === 'DELETE') { fs.rmSync(DB, { force: true }); return send(res, 200, { ok: true }) }
    if (p === '/api/tts' && req.method === 'POST') return await tts(req, res)
    if (p === '/api/voices/upload' && req.method === 'POST') return await uploadVoice(req, res)
    if (p === '/api/voices/text' && req.method === 'POST') return await voiceText(req, res)
    if (p.startsWith('/api/audio/')) return audio(req, res, p.slice('/api/audio/'.length))
    send(res, 404, { error: 'unknown route' })
  } catch (e) {
    send(res, 500, { error: String(e?.message || e) })
  }
})
server.listen(PORT, '127.0.0.1', () => console.log(`SomlengPit backend: http://127.0.0.1:${PORT}  (TTS -> ${VOX}, engine ${ENGINE})`))
