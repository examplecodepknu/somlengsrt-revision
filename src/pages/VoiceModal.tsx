import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Check, FileAudio, Loader2, Pause, Play, Upload, Wand2, X } from 'lucide-react'
import { useStore } from '../store'
import { Coin, cx, fmt } from '../ui'
import { uid, type Voice } from '../data'
import { api } from '../api'

// Same palette as the real "Create a voice clone" dialog
const COLORS = [
  { c: 'bg-[#2f9a6a]', tint: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40' },
  { c: 'bg-[#e6a95f]', tint: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40' },
  { c: 'bg-[#e8708a]', tint: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40' },
  { c: 'bg-[#9189f0]', tint: 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40' },
  { c: 'bg-[#7fb4e2]', tint: 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/40' },
  { c: 'bg-[#a872f0]', tint: 'bg-violet-50/70 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40' },
  { c: 'bg-[#97979c]', tint: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800' },
]
const MOCK_TRANSCRIPTS = [
  'សួស្តី ខ្ញុំឈ្មោះ ស្រីពៅ។ ថ្ងៃនេះខ្ញុំនឹងអានអត្ថបទខ្លីមួយ ដើម្បីបង្កើតសំឡេងរបស់ខ្ញុំ។',
  'Hello, this is my voice sample for SomlengPit. I am reading slowly and clearly.',
]
const MAX_SEC = 15
const MAX_MB = 10

type Sample = { name: string; size: number; duration: number; url?: string }

/** Create / edit voice clone — matches the real dialog, plus trim + preview + validation */
export function VoiceModal({ voice, onClose, onSave }: { voice: Voice | 'new' | null; onClose: () => void; onSave: (v: Voice, isNew: boolean) => void }) {
  const { spend, tokens, toast, backend } = useStore()
  const [file, setFile] = useState<File | null>(null)
  const isNew = voice === 'new'
  const base = voice && voice !== 'new' ? voice : null
  const [name, setName] = useState(base?.name ?? '')
  const [color, setColor] = useState(COLORS.find((x) => x.c === base?.color) ?? COLORS[0])
  const [sample, setSample] = useState<Sample | null>(base ? { name: `${base.name}-sample.wav`, size: 1.2e6, duration: base.sampleSec } : null)
  const [trim, setTrim] = useState<[number, number]>([0, base?.sampleSec ?? MAX_SEC])
  const [transcript, setTranscript] = useState(base?.transcript ?? '')
  const [autoAsr, setAutoAsr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const len = trim[1] - trim[0]
  const tooLong = len > MAX_SEC

  // real audio preview when a real file was uploaded
  const audio = useRef<HTMLAudioElement | null>(null)
  const [pos, setPos] = useState<number | null>(null)
  useEffect(() => () => { audio.current?.pause(); if (sample?.url) URL.revokeObjectURL(sample.url) }, [sample?.url])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const loadFile = (f: File) => {
    setError('')
    if (!f.type.startsWith('audio/') && !/\.(wav|mp3|m4a|ogg|flac|webm)$/i.test(f.name)) return setError('Please choose an audio file (WAV, MP3, M4A…)')
    if (f.size > MAX_MB * 1e6) return setError(`File is ${(f.size / 1e6).toFixed(1)}MB — max is ${MAX_MB}MB`)
    const url = URL.createObjectURL(f)
    setFile(f)
    const a = new Audio(url)
    a.onloadedmetadata = () => {
      const d = isFinite(a.duration) ? a.duration : 20
      setSample({ name: f.name, size: f.size, duration: d, url })
      setTrim([0, Math.min(d, MAX_SEC)])
      if (!name) setName(f.name.replace(/\.[^.]+$/, '').slice(0, 30))
    }
    a.onerror = () => { setSample({ name: f.name, size: f.size, duration: 20 }); setTrim([0, MAX_SEC]) }
  }
  const demo = () => { setSample({ name: 'demo-sample.wav', size: 1.4e6, duration: 22.4 }); setTrim([2, 14]); if (!name) setName('my-voice') }

  const togglePreview = () => {
    if (pos !== null) { audio.current?.pause(); setPos(null); return }
    if (sample?.url) {
      const a = (audio.current ??= new Audio(sample.url))
      a.currentTime = trim[0]
      a.ontimeupdate = () => { setPos(a.currentTime); if (a.currentTime >= trim[1]) { a.pause(); setPos(null) } }
      a.play()
      setPos(trim[0])
    } else {
      // fake preview
      let t = trim[0]
      setPos(t)
      const id = setInterval(() => {
        t += 0.1
        if (t >= trim[1]) { clearInterval(id); setPos(null) } else setPos(t)
      }, 100)
      audio.current = { pause: () => clearInterval(id) } as unknown as HTMLAudioElement
    }
  }

  const bars = useMemo(() => {
    let h = (sample?.name.length ?? 3) * 977
    return Array.from({ length: 80 }, () => { h = (h * 1103515245 + 12345) >>> 0; return 0.15 + ((h >> 8) % 100) / 120 })
  }, [sample?.name])

  const valid = name.trim() && sample && !tooLong && !busy
  const submit = () => {
    if (!valid) return
    const finish = (tr: string, ref = base?.ref) =>
      onSave({ id: base?.id ?? uid('voice'), name: name.trim(), kind: 'custom', lang: 'km-KH', color: color.c, tint: color.tint,
        sampleSec: Math.round(len * 10) / 10, samples: base?.samples ?? 1, transcript: tr, status: 'Ready', gender: base?.gender, tags: base?.tags ?? ['cloned'], ref }, isNew)
    // real clone: send the clip + its exact words to VoxPocket
    if (backend?.tts && (file || base?.ref)) {
      const tr = transcript.trim()
      if (!tr) return setError('VoxPocket needs the exact words spoken in the clip — please type them in the transcript')
      setBusy(true)
      setError('')
      const job = file ? api.uploadVoice(file, tr, trim[0], len).then((r) => r.id) : api.voiceText(base!.ref!, tr).then(() => base!.ref!)
      job.then((ref) => { toast('Voice cloned with VoxPocket'); finish(tr, ref) })
        .catch((e) => setError(`Upload failed: ${(e as Error).message}`))
        .finally(() => setBusy(false))
      return
    }
    if (autoAsr && !transcript.trim()) {
      if (tokens < 20) return toast('Not enough tokens for auto-transcribe', 'err')
      setBusy(true)
      setTimeout(() => { spend(20, `Voice clone ASR · ${name.trim()}`); finish(MOCK_TRANSCRIPTS[Math.floor(Math.random() * 2)]) }, 1400)
    } else finish(transcript.trim())
  }

  if (!voice) return null
  const pct = (s: number) => `${(s / (sample?.duration || 1)) * 100}%`

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-[560px] rounded-2xl bg-white p-7 shadow-xl dark:bg-neutral-900" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-display text-2xl">{isNew ? 'Create a voice clone' : `Edit ${base?.name}`}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"><X className="size-5" /></button>
        </div>
        <p className="mt-2 text-neutral-500">Trim a sample to {MAX_SEC}s or less. Typing the transcript is free; auto-transcribe costs 20 tokens.</p>

        <label className="mt-6 block font-medium">Voice name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Voice" maxLength={30}
          className="mt-2 h-12 w-full border border-neutral-300 bg-transparent px-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] outline-none focus:border-neutral-500 dark:border-neutral-700" />

        <label className="mt-5 block font-medium">Voice color</label>
        <div className="mt-2 flex items-center gap-2.5">
          {COLORS.map((x) => (
            <button key={x.c} onClick={() => setColor(x)} className={cx('size-8 rounded-full transition-transform hover:scale-110', x.c, color.c === x.c && 'ring-2 ring-neutral-900 ring-offset-2 dark:ring-white dark:ring-offset-neutral-900')} />
          ))}
          {name && <span className={cx('ml-3 grid size-8 place-items-center rounded-lg text-sm font-semibold text-white', color.c)}>{name[0].toUpperCase()}</span>}
        </div>

        {/* upload / trim */}
        {!sample ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
            className={cx('mt-6 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors', drag ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50')}
          >
            <Upload className="size-7 text-neutral-600" />
            <p className="mt-4 text-lg font-medium">Drop an audio file here or click to browse</p>
            <p className="mt-2 text-neutral-500">Max {MAX_SEC}s after trimming, up to {MAX_MB}MB</p>
            <button onClick={(e) => { e.stopPropagation(); demo() }} className="mt-3 text-sm text-blue-600 hover:underline">or use a demo sample</button>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <FileAudio className="size-5 text-neutral-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{sample.name}</div>
                <div className="text-xs text-neutral-500">{(sample.size / 1e6).toFixed(1)} MB · {fmt(sample.duration)} total</div>
              </div>
              <button onClick={() => { audio.current?.pause(); setPos(null); setSample(null); audio.current = null }} className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">Replace</button>
            </div>

            {/* waveform with trim window */}
            <div className="relative mt-3 h-16 select-none">
              <div className="absolute inset-0 flex items-center gap-[2px]">
                {bars.map((b, i) => {
                  const t = (i / bars.length) * sample.duration
                  const inside = t >= trim[0] && t <= trim[1]
                  const played = pos !== null && t <= pos && inside
                  return <span key={i} className={cx('flex-1 rounded-full', played ? 'bg-emerald-500' : inside ? 'bg-neutral-800 dark:bg-neutral-200' : 'bg-neutral-200 dark:bg-neutral-700')} style={{ height: `${b * 100}%` }} />
                })}
              </div>
              <div className={cx('pointer-events-none absolute inset-y-0 rounded-md border-2', tooLong ? 'border-red-500 bg-red-500/5' : 'border-emerald-500 bg-emerald-500/5')} style={{ left: pct(trim[0]), width: pct(len) }} />
              {/* two overlaid range inputs act as trim handles */}
              <input type="range" min={0} max={sample.duration} step={0.1} value={trim[0]} onChange={(e) => setTrim([Math.min(+e.target.value, trim[1] - 1), trim[1]])} className="trim absolute inset-0 w-full" />
              <input type="range" min={0} max={sample.duration} step={0.1} value={trim[1]} onChange={(e) => setTrim([trim[0], Math.max(+e.target.value, trim[0] + 1)])} className="trim absolute inset-0 w-full" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={togglePreview} className="grid size-9 place-items-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                {pos !== null ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
              </button>
              <span className="font-mono text-sm tabular-nums">{fmt(trim[0])}.{Math.floor((trim[0] % 1) * 10)} – {fmt(trim[1])}.{Math.floor((trim[1] % 1) * 10)}</span>
              <span className={cx('ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', tooLong ? 'bg-red-50 text-red-700 dark:bg-red-950/40' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300')}>
                {tooLong ? <AlertCircle className="size-3.5" /> : <Check className="size-3.5" />} {len.toFixed(1)}s {tooLong ? `— trim to ${MAX_SEC}s` : 'selected'}
              </span>
            </div>
            {len < 5 && <p className="mt-2 text-xs text-amber-600">Tip: 8–15 seconds of clear speech gives the best clone.</p>}
          </div>
        )}
        {error && <p className="mt-2 flex items-center gap-1 text-sm text-red-600"><AlertCircle className="size-4" /> {error}</p>}
        <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }} />

        <label className="mt-6 block font-medium">Reference transcript (optional)</label>
        <label className="mt-2 flex w-fit cursor-pointer items-center gap-3">
          <input type="checkbox" checked={autoAsr} onChange={(e) => setAutoAsr(e.target.checked)} disabled={!!transcript.trim()} className="size-5 accent-neutral-900" />
          <Wand2 className="size-4" /> Auto-transcribe <span className="flex items-center gap-1 text-neutral-500">(<Coin className="size-3" /> 20 tokens)</span>
        </label>
        <textarea value={transcript} onChange={(e) => { setTranscript(e.target.value); if (e.target.value) setAutoAsr(false) }} rows={3}
          placeholder={autoAsr ? 'Will be transcribed automatically when you create the voice…' : 'Type the exact speech spoken in the sample...'} disabled={autoAsr}
          className="khmer mt-3 w-full border border-neutral-200 bg-transparent p-4 outline-none focus:border-neutral-400 disabled:bg-neutral-50 dark:border-neutral-800 dark:disabled:bg-neutral-800/40" />
        <p className="mt-2 text-sm text-neutral-500">Typing the transcript is free and improves clone fidelity.</p>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-11 px-5 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">Cancel</button>
          <button onClick={submit} disabled={!valid} className="flex h-11 items-center gap-2 bg-neutral-900 px-5 font-medium text-white disabled:bg-neutral-400 dark:bg-white dark:text-neutral-900 dark:disabled:bg-neutral-600">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? 'Transcribing…' : isNew ? 'Create voice' : 'Save changes'}
            {autoAsr && !busy && <span className="flex items-center gap-1 text-xs opacity-80"><Coin className="size-3" />20</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
