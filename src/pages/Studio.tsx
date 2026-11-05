import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, AudioLines, Check, ChevronsUpDown, Copy, Download, EyeOff, FileArchive, FileAudio, FileJson, FileText, LayoutTemplate,
  Loader2, Music, Pause, Pencil, Play, Plus, RefreshCw, Replace, ScrollText, Sparkles, Trash2, Upload, Users, Volume2,
} from 'lucide-react'
import { useStore } from '../store'
import { Avatar, Button, Card, Chip, Coin, Modal, SectionTitle, cx, fmt } from '../ui'
import { MAX_CHARS, TEMPLATES, costOf, parseJson, parsePaste, toPaste, uid, type Line, type TemplateLine } from '../data'

// ---------- helpers ----------
export function download(name: string, content: string, type = 'text/plain') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export function useImport() {
  const { voices, setLines, toast } = useStore()
  return (items: TemplateLine[], mode: 'replace' | 'append', fallbackVoiceId: string) => {
    let unknown = 0
    const newLines: Line[] = items.map((t) => {
      const v = voices.find((x) => x.name.toLowerCase() === t.voice.toLowerCase())
      if (!v) unknown++
      return { id: uid('line'), voiceId: v?.id ?? fallbackVoiceId, styleHint: t.style ?? '', text: t.text.slice(0, MAX_CHARS), versions: [], activeVersion: -1, dirty: true }
    })
    setLines((ls) => (mode === 'replace' ? newLines : [...ls, ...newLines]))
    toast(`Imported ${newLines.length} line(s)${unknown ? ` · ${unknown} unknown speaker(s) mapped to default voice` : ''}`)
  }
}

export const toTemplate = (lines: Line[], voiceName: (id: string) => string): TemplateLine[] =>
  lines.map((l) => ({ voice: voiceName(l.voiceId), text: l.text, ...(l.styleHint ? { style: l.styleHint } : {}) }))

// ---------- page ----------
export function Studio() {
  const { lines, generate, tokens, generating } = useStore()
  const [selectedVoice, setSelectedVoice] = useState('chingchang')
  const [modal, setModal] = useState<null | 'templates' | 'paste' | 'json' | 'replace'>(null)
  const [follow, setFollow] = useState(false)
  const queued = lines.filter((l) => l.dirty && l.text.trim())
  const queuedCost = queued.reduce((s, l) => s + costOf(l.text), 0)

  return (
    <div className="flex min-h-full flex-col gap-4 p-5 pb-0">
      <ProjectHeader />
      <CastingPool selected={selectedVoice} onSelect={setSelectedVoice} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <DialogueScript selectedVoice={selectedVoice} follow={follow} setFollow={setFollow} openModal={setModal} />
        <AudioDeck follow={follow} />
      </div>

      {/* bottom bar */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-auto bg-gradient-to-t from-white via-white to-white/0 px-5 pb-5 pt-3 dark:from-neutral-950 dark:via-neutral-950">
        <Card className="flex items-center justify-between gap-4 px-5 py-4 shadow-sm">
          <div className="text-[15px] text-neutral-600 dark:text-neutral-400">
            {queued.length} dialogue line(s) queued
            {queued.length > 0 && (
              <span className="ml-3 inline-flex items-center gap-1.5 text-sm">
                <Coin className="size-3.5" /> {queuedCost} tokens
              </span>
            )}
          </div>
          <Button
            variant="solid"
            disabled={!queued.length || generating.size > 0 || queuedCost > tokens}
            onClick={() => generate(queued.map((l) => l.id))}
            className="h-11 px-5 disabled:bg-neutral-400 disabled:opacity-100"
          >
            {generating.size ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {generating.size ? `Generating (${generating.size})…` : `Generate Voice Track (${queued.length})`}
          </Button>
        </Card>
      </div>

      <TemplatesModal open={modal === 'templates'} onClose={() => setModal(null)} fallback={selectedVoice} />
      <PasteModal open={modal === 'paste'} onClose={() => setModal(null)} fallback={selectedVoice} />
      <JsonModal open={modal === 'json'} onClose={() => setModal(null)} fallback={selectedVoice} />
      <ReplaceModal open={modal === 'replace'} onClose={() => setModal(null)} />
    </div>
  )
}

// ---------- header ----------
function ProjectHeader() {
  const { title, setTitle, description, setDescription, tokens, setPage } = useStore()
  const [editing, setEditing] = useState(false)
  return (
    <Card className="flex items-center gap-4 px-5 py-4">
      <Button variant="ghost" size="icon" className="rounded-md" onClick={() => setPage('projects')}><ArrowLeft className="size-5" /></Button>
      <div className="grid size-12 place-items-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
        <AudioLines className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex flex-col gap-1">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
              className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xl font-semibold outline-none dark:border-neutral-700" />
            <input value={description} placeholder="Description" onChange={(e) => setDescription(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
              onBlur={() => setEditing(false)} className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm outline-none dark:border-neutral-700" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{title}</h1>
              <button onClick={() => setEditing(true)} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Pencil className="size-4" /></button>
            </div>
            <p className="text-neutral-500">{description || 'No description'}</p>
          </>
        )}
      </div>
      <Chip className="h-10 gap-2 rounded-xl px-4 text-[15px]">
        <Coin /> Tokens: <b className="text-neutral-900 dark:text-white">{tokens.toLocaleString()}</b>
      </Chip>
      <Button variant="solid" onClick={() => setPage('buy')}>Buy Tokens</Button>
    </Card>
  )
}

// ---------- casting pool ----------
function CastingPool({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const { voices, lines, play, startPlay, setPage } = useStore()
  const [hidePresets, setHidePresets] = useState(false)
  const [hideUnused, setHideUnused] = useState(false)
  const used = new Set(lines.map((l) => l.voiceId))
  const shown = voices.filter((v) => (!hidePresets || v.kind !== 'preset') && (!hideUnused || used.has(v.id)))

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle icon={<Users className="size-5" />}>Voice Casting Pool ({voices.length})</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className={cx('h-10', hidePresets && 'bg-neutral-100 dark:bg-neutral-800')} onClick={() => setHidePresets(!hidePresets)}>
            <EyeOff className="size-4" /> {hidePresets ? 'Show presets' : 'Hide presets'}
          </Button>
          <Button size="sm" className={cx('h-10', hideUnused && 'bg-neutral-100 dark:bg-neutral-800')} onClick={() => setHideUnused(!hideUnused)}>
            <EyeOff className="size-4" /> {hideUnused ? 'Show unused' : 'Hide unused'}
          </Button>
          <Button size="sm" className="h-10" onClick={() => setPage('voices')}><Plus className="size-4" /> New Voice</Button>
        </div>
      </div>
      <div className="grid max-h-[232px] grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3 overflow-y-auto p-0.5">
        {shown.map((v) => {
          const isSel = v.id === selected
          const isPlaying = play?.key === `voice:${v.id}`
          return (
            <div
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={cx('flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-shadow hover:shadow-sm', v.tint, isSel && 'border-neutral-800 shadow-[0_2px_0_0_rgba(0,0,0,0.6)] dark:border-neutral-300')}
            >
              <Avatar name={v.name} color={v.color} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{v.name}</div>
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <MicIcon /> {v.kind === 'preset' ? 'preset' : 'Custom'} · {v.lang}
                  {used.has(v.id) && <span className="ml-1 rounded bg-neutral-900/5 px-1 dark:bg-white/10">in use</span>}
                </div>
              </div>
              <button onClick={(e) => (e.stopPropagation(), startPlay(`voice:${v.id}`, v.sampleSec))} className="rounded-md p-1.5 text-neutral-600 hover:bg-black/5 dark:text-neutral-300">
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              {v.kind === 'custom' && (
                <button onClick={(e) => (e.stopPropagation(), setPage('voices'))} className="rounded-md p-1.5 text-neutral-600 hover:bg-black/5 dark:text-neutral-300"><Pencil className="size-4" /></button>
              )}
              {isSel && <span className="grid size-6 place-items-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"><Check className="size-3.5" /></span>}
            </div>
          )
        })}
        {!shown.length && <p className="col-span-full py-6 text-center text-sm text-neutral-500">No voices match the filters.</p>}
      </div>
    </Card>
  )
}
const MicIcon = () => (
  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5" /></svg>
)

// ---------- dialogue script ----------
function DialogueScript({ selectedVoice, follow, setFollow, openModal }: {
  selectedVoice: string; follow: boolean; setFollow: (b: boolean) => void; openModal: (m: 'templates' | 'paste' | 'json' | 'replace') => void
}) {
  const { lines, voices, addLine, title } = useStore()
  const voiceName = (id: string) => voices.find((v) => v.id === id)?.name ?? id
  const dist = useMemo(() => {
    const m = new Map<string, number>()
    lines.forEach((l) => m.set(l.voiceId, (m.get(l.voiceId) ?? 0) + 1))
    return [...m.entries()]
  }, [lines])
  const distColors = ['bg-neutral-700', 'bg-rose-600', 'bg-sky-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-500']

  return (
    <Card className="flex min-w-0 flex-col p-5">
      <SectionTitle icon={<FileText className="size-5" />} extra={<Chip>Max {MAX_CHARS} chars/line</Chip>}>Dialogue Script ({lines.length})</SectionTitle>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="solid" onClick={() => openModal('templates')}><LayoutTemplate className="size-4" /> Templates</Button>
        <Button onClick={() => setFollow(!follow)} className={cx(follow && 'border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-800')}>
          <ScrollText className="size-4" /> Follow playback {follow && <Check className="size-4" />}
        </Button>
        <Button onClick={() => openModal('replace')}><Replace className="size-4" /> Bulk replace</Button>
        <Button onClick={() => openModal('json')}><Upload className="size-4" /> Load JSON</Button>
        <Button onClick={() => download(`${title}.json`, JSON.stringify({ title, lines: toTemplate(lines, voiceName) }, null, 2), 'application/json')}>
          <Download className="size-4" /> Export JSON
        </Button>
        <Button onClick={() => openModal('paste')}><Copy className="size-4" /> Bulk Paste</Button>
        <Button onClick={() => addLine(undefined, { voiceId: selectedVoice })}><Plus className="size-4" /> Add Line</Button>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Voice distribution</div>
        <div className="flex h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          {dist.map(([id, n], i) => <div key={id} className={distColors[i % distColors.length]} style={{ width: `${(n / lines.length) * 100}%` }} />)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
          {dist.map(([id, n], i) => (
            <span key={id} className="flex items-center gap-1.5"><span className={cx('size-2 rounded-full', distColors[i % distColors.length])} />{voiceName(id)} ({n})</span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex max-h-[640px] flex-col gap-3 overflow-y-auto pr-1">
        {lines.map((l, i) => <LineCard key={l.id} line={l} index={i} follow={follow} />)}
        {!lines.length && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
            <p className="mb-3 text-neutral-500">Your script is empty.</p>
            <div className="flex justify-center gap-2">
              <Button variant="solid" onClick={() => openModal('templates')}><LayoutTemplate className="size-4" /> Start from a template</Button>
              <Button onClick={() => addLine(undefined, { voiceId: selectedVoice })}><Plus className="size-4" /> Add Line</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function LineCard({ line: l, index, follow }: { line: Line; index: number; follow: boolean }) {
  const { voices, updateLine, addLine, removeLine, generate, generating, play, startPlay } = useStore()
  const ref = useRef<HTMLDivElement>(null)
  const isPlaying = play?.key === `line:${l.id}`
  const isGen = generating.has(l.id)
  const voice = voices.find((v) => v.id === l.voiceId)

  useEffect(() => {
    if (follow && isPlaying) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [follow, isPlaying])

  return (
    <div ref={ref} className={cx('rounded-2xl border bg-white p-4 transition-colors dark:bg-neutral-900', isPlaying ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-neutral-200 dark:border-neutral-800')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-6 text-neutral-500">{index + 1}</span>
        <label className="relative flex h-10 items-center gap-2 rounded-md bg-neutral-100 px-3 font-semibold dark:bg-neutral-800">
          <span className={cx('size-2.5 rounded-full', voice?.color ?? 'bg-neutral-500')} />
          {voice?.name ?? 'Unknown'}
          <ChevronsUpDown className="size-4" />
          <select value={l.voiceId} onChange={(e) => updateLine(l.id, { voiceId: e.target.value, dirty: true })} className="absolute inset-0 cursor-pointer opacity-0">
            {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <Chip className={cx(l.text.length > MAX_CHARS * 0.9 && 'border-amber-300 text-amber-700')}>{l.text.length}/{MAX_CHARS}</Chip>
        <Chip><Coin className="size-3.5" /> {costOf(l.text)}</Chip>
        {l.dirty && l.text.trim() && <Chip className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">queued</Chip>}
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" className="rounded-lg" disabled={l.activeVersion < 0} onClick={() => startPlay(`line:${l.id}`, l.versions[l.activeVersion].duration)}>
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button className="rounded-lg font-semibold" disabled={isGen || !l.text.trim()} onClick={() => generate([l.id])}>
            <RefreshCw className={cx('size-4', isGen && 'animate-spin')} /> {l.versions.length ? 'Regenerate' : 'Generate'}
          </Button>
          <Button variant="ghost" size="icon" title="Duplicate" onClick={() => addLine(l.id, { voiceId: l.voiceId, text: l.text, styleHint: l.styleHint })}><Copy className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Insert below" onClick={() => addLine(l.id, { voiceId: l.voiceId })}><Plus className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => removeLine(l.id)}><Trash2 className="size-4" /></Button>
        </div>
      </div>
      <input value={l.styleHint} onChange={(e) => updateLine(l.id, { styleHint: e.target.value, dirty: true })} placeholder="Style hint (e.g. whisper, calm)"
        className="mt-3 h-11 w-full border border-neutral-200 bg-transparent px-4 outline-none placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800" />
      <textarea value={l.text} maxLength={MAX_CHARS} onChange={(e) => updateLine(l.id, { text: e.target.value, dirty: true })} placeholder="Type the line…" rows={3}
        className="khmer mt-2 w-full resize-y border border-neutral-200 bg-transparent px-4 py-3 text-[17px] leading-relaxed outline-none focus:border-neutral-400 dark:border-neutral-800" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Versions</span>
        {isGen && <Chip><Loader2 className="size-3 animate-spin" /> generating…</Chip>}
        {l.versions.map((v, vi) => (
          <Chip key={v.id} className={cx('cursor-pointer gap-1', vi === l.activeVersion && 'border-neutral-400 font-semibold text-neutral-900 dark:text-white')}>
            <button className="flex items-center gap-1" onClick={() => updateLine(l.id, { activeVersion: vi })}>
              <span className={cx('size-1.5 rounded-full', vi === l.activeVersion ? 'bg-neutral-800 dark:bg-white' : 'bg-neutral-400')} /> v{v.n}
              {vi === l.activeVersion && <Check className="size-3.5" />}
            </button>
            <button onClick={() => {
              const versions = l.versions.filter((x) => x.id !== v.id)
              updateLine(l.id, { versions, activeVersion: Math.min(l.activeVersion, versions.length - 1), dirty: versions.length === 0 })
            }}><Trash2 className="size-3.5" /></button>
          </Chip>
        ))}
        {!l.versions.length && !isGen && <span className="text-xs text-neutral-400">none yet — click Generate</span>}
      </div>
    </div>
  )
}

// ---------- audio deck ----------
function Waveform({ seed, progress, onSeek }: { seed: string; progress: number; onSeek: (p: number) => void }) {
  const bars = useMemo(() => {
    let h = 0
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return Array.from({ length: 90 }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0
      const silence = i < 14 ? 0.08 : 0
      return silence || 0.3 + ((h >> 8) % 100) / 140
    })
  }, [seed])
  return (
    <div className="relative flex h-24 cursor-pointer items-center gap-[3px] px-1" onClick={(e) => {
      const r = e.currentTarget.getBoundingClientRect()
      onSeek((e.clientX - r.left) / r.width)
    }}>
      {bars.map((b, i) => (
        <div key={i} className={cx('flex-1 rounded-full', i / bars.length <= progress ? 'bg-emerald-400' : 'bg-emerald-400/45')} style={{ height: `${b * 100}%` }} />
      ))}
      <div className="absolute inset-y-0 w-0.5 bg-blue-500" style={{ left: `${progress * 100}%` }} />
    </div>
  )
}

function AudioDeck({ follow }: { follow: boolean }) {
  const { lines, voices, play, startPlay, seek, generate, toast, title, sequential, setSequential } = useStore()
  const clips = lines.filter((l) => l.activeVersion >= 0)
  const [current, setCurrent] = useState<string | null>(null)
  const playingClip = clips.find((c) => play?.key === `line:${c.id}`)
  const focused = playingClip ?? clips.find((c) => c.id === current) ?? clips[0]
  const voiceName = (id: string) => voices.find((v) => v.id === id)?.name ?? id
  const [mode, setMode] = useState('Phrase mode')

  useEffect(() => { if (playingClip) setCurrent(playingClip.id) }, [playingClip?.id])

  const total = clips.reduce((s, c) => s + c.versions[c.activeVersion].duration, 0)
  const srt = () => {
    let t = 0
    const ts = (s: number) => {
      const ms = Math.round(s * 1000)
      const p = (n: number, w = 2) => String(n).padStart(w, '0')
      return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
    }
    return clips.map((c, i) => {
      const d = c.versions[c.activeVersion].duration
      const block = `${i + 1}\n${ts(t)} --> ${ts(t + d)}\n${mode === 'Speaker mode' ? `[${voiceName(c.voiceId)}] ` : ''}${c.text}\n`
      t += d
      return block
    }).join('\n')
  }
  const fake = (what: string) => toast(`Mock: ${what} would download (${clips.length} clips · ${fmt(total)})`)

  const dur = focused ? focused.versions[focused.activeVersion].duration : 0
  const isPlaying = !!focused && play?.key === `line:${focused.id}`
  const progress = isPlaying ? play.progress : 0

  return (
    <Card className="flex min-w-0 flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={cx('size-2.5 rounded-full', clips.length ? 'bg-emerald-500' : 'bg-neutral-300')} />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">Audio Deck ({clips.length})</h2>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-500">
          <input type="checkbox" checked={sequential} onChange={(e) => setSequential(e.target.checked)} className="accent-emerald-600" />
          Sequential playback {sequential ? 'enabled' : 'off'}
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => fake('ZIP')}><FileArchive className="size-4" /> Download ZIP</Button>
        <Button onClick={() => fake('Merged WAV')}><FileAudio className="size-4" /> Merged WAV</Button>
        <Button onClick={() => fake('Merged MP3')}><Music className="size-4" /> Merged MP3</Button>
        <Button onClick={() => { download(`${title}.txt`, clips.map((c) => c.text).join('\n')); toast('Caption text downloaded') }}><Sparkles className="size-4" /> Caption</Button>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <label className="relative flex h-10 items-center gap-2 border border-neutral-200 px-3 text-sm dark:border-neutral-800">
          {mode} <ChevronsUpDown className="size-4" />
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="absolute inset-0 opacity-0">
            <option>Phrase mode</option><option>Speaker mode</option>
          </select>
        </label>
        <Button disabled={!clips.length} onClick={() => { download(`${title}.srt`, srt()); toast('SRT file created') }}><RefreshCw className="size-4" /> Create SRT</Button>
      </div>

      {focused ? (
        <>
          <div className="mt-4 rounded-2xl bg-neutral-950 p-4 text-white">
            <div className="rounded-xl bg-neutral-900/80 p-2">
              <Waveform seed={focused.id + focused.activeVersion} progress={progress} onSeek={(p) => { if (!isPlaying) startPlay(`line:${focused.id}`, dur); seek(p) }} />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <button onClick={() => startPlay(`line:${focused.id}`, dur)} className="grid size-11 place-items-center rounded-full bg-emerald-500 text-white hover:bg-emerald-400">
                {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
              </button>
              <span className="font-mono text-sm tabular-nums text-neutral-300">{fmt(progress * dur)} / {fmt(dur)}</span>
              <Volume2 className="ml-auto size-5 text-neutral-400" />
              <div className="h-1.5 w-24 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="font-semibold">#{lines.indexOf(focused) + 1}</span>
              <span className="rounded bg-neutral-700 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">{voiceName(focused.voiceId)}</span>
              <span className="text-neutral-400">v{focused.versions[focused.activeVersion].n}</span>
              <span className="khmer truncate italic text-neutral-300">“{focused.text}”</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => generate([focused.id])} className="flex h-10 items-center gap-2 rounded-md bg-neutral-800 px-3 text-sm hover:bg-neutral-700"><RefreshCw className="size-4" /> Regenerate</button>
              <button onClick={() => fake('WAV clip')} className="flex h-10 items-center gap-2 rounded-md bg-neutral-800 px-3 text-sm hover:bg-neutral-700"><Download className="size-4" /> Download</button>
              <button onClick={() => fake('MP3 clip')} className="flex h-10 items-center gap-2 rounded-md bg-neutral-800 px-3 text-sm hover:bg-neutral-700"><Music className="size-4" /> MP3</button>
            </div>
          </div>
          <div className="mt-3 flex max-h-[420px] flex-col gap-2 overflow-y-auto">
            {clips.map((c) => {
              const on = play?.key === `line:${c.id}`
              return (
                <div key={c.id} onClick={() => setCurrent(c.id)} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5', c.id === focused.id ? 'border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60' : 'border-neutral-200 dark:border-neutral-800')}>
                  <button onClick={(e) => (e.stopPropagation(), startPlay(`line:${c.id}`, c.versions[c.activeVersion].duration))}
                    className={cx('grid size-8 shrink-0 place-items-center rounded-full', on ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800')}>
                    {on ? <span className="flex h-3 items-center gap-[2px]">{[0, 1, 2].map((k) => <span key={k} className="animate-bar h-full w-[2px] bg-current" style={{ animationDelay: `${k * 0.15}s` }} />)}</span> : <Volume2 className="size-4" />}
                  </button>
                  <span className="text-sm font-semibold">#{lines.indexOf(c) + 1}</span>
                  <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">{voiceName(c.voiceId)}</span>
                  <span className="text-xs text-neutral-400">v{c.versions[c.activeVersion].n}</span>
                  <span className="khmer min-w-0 flex-1 truncate">{c.text}</span>
                  <button onClick={(e) => (e.stopPropagation(), generate([c.id]))} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><RefreshCw className="size-4" /></button>
                  <button onClick={(e) => (e.stopPropagation(), fake('clip'))} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Download className="size-4" /></button>
                </div>
              )
            })}
          </div>
          {follow && <p className="mt-2 text-xs text-neutral-400">Follow playback is on — the script scrolls to the playing line.</p>}
        </>
      ) : (
        <div className="mt-4 grid flex-1 place-items-center rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500 dark:border-neutral-700">
          No audio yet. Generate lines to fill the deck.
        </div>
      )}
    </Card>
  )
}

// ---------- modals ----------
function ModeToggle({ mode, setMode }: { mode: 'replace' | 'append'; setMode: (m: 'replace' | 'append') => void }) {
  return (
    <div className="flex rounded-lg border border-neutral-200 p-0.5 text-sm dark:border-neutral-800">
      {(['replace', 'append'] as const).map((m) => (
        <button key={m} onClick={() => setMode(m)} className={cx('rounded-md px-3 py-1.5 capitalize', mode === m && 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900')}>
          {m === 'replace' ? 'Replace script' : 'Append to script'}
        </button>
      ))}
    </div>
  )
}

function Preview({ items }: { items: TemplateLine[] }) {
  const { voices } = useStore()
  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      {items.map((t, i) => {
        const known = voices.some((v) => v.name.toLowerCase() === t.voice.toLowerCase())
        return (
          <div key={i} className="flex gap-2 border-b border-neutral-100 px-3 py-2 text-sm last:border-0 dark:border-neutral-800">
            <span className="w-5 shrink-0 text-neutral-400">{i + 1}</span>
            <span className={cx('shrink-0 rounded px-1.5 text-xs font-semibold leading-5', known ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-amber-100 text-amber-800')} title={known ? '' : 'Unknown voice → default voice'}>
              {t.voice}
            </span>
            {t.style && <span className="shrink-0 text-xs italic leading-5 text-neutral-400">({t.style})</span>}
            <span className="khmer">{t.text}</span>
          </div>
        )
      })}
      {!items.length && <p className="p-4 text-center text-sm text-neutral-400">Nothing to preview yet.</p>}
    </div>
  )
}

export function TemplatesModal({ open, onClose, fallback }: { open: boolean; onClose: () => void; fallback: string }) {
  const doImport = useImport()
  const [pick, setPick] = useState(TEMPLATES[0].id)
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const t = TEMPLATES.find((x) => x.id === pick)!
  return (
    <Modal open={open} onClose={onClose} title="Start from an example case"
      footer={<>
        <Button onClick={() => download(`${t.id}.json`, JSON.stringify({ title: t.title, lines: t.lines }, null, 2), 'application/json')}><FileJson className="size-4" /> Download as JSON</Button>
        <Button variant="solid" onClick={() => { doImport(t.lines, mode, fallback); onClose() }}>Use template</Button>
      </>}>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((x) => (
          <button key={x.id} onClick={() => setPick(x.id)} className={cx('rounded-xl border p-3 text-left', pick === x.id ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50')}>
            <div className="font-semibold">{x.title}</div>
            <div className="text-xs text-neutral-500">{x.desc}</div>
            <div className="mt-1 text-xs text-neutral-400">{x.lines.length} lines · {new Set(x.lines.map((l) => l.voice)).size} voice(s)</div>
          </button>
        ))}
      </div>
      <div className="my-3"><Preview items={t.lines} /></div>
      <ModeToggle mode={mode} setMode={setMode} />
    </Modal>
  )
}

const PASTE_EXAMPLE = `female-1: សួស្តីបង! ថ្ងៃនេះបងសុខសប្បាយទេ?
male-1: សុខសប្បាយ អរគុណ! ចុះអូនវិញ?
បន្ទាត់គ្មានឈ្មោះ នឹងប្រើសំឡេងដែលបានជ្រើស។`

export function PasteModal({ open, onClose, fallback }: { open: boolean; onClose: () => void; fallback: string }) {
  const { voices, toast } = useStore()
  const doImport = useImport()
  const [raw, setRaw] = useState('')
  const [mode, setMode] = useState<'replace' | 'append'>('append')
  const [view, setView] = useState<'preview' | 'json'>('preview')
  const fallbackName = voices.find((v) => v.id === fallback)?.name ?? 'ChingChang'
  const items = parsePaste(raw, fallbackName)
  const json = JSON.stringify({ lines: items }, null, 2)
  return (
    <Modal open={open} onClose={onClose} title="Bulk Paste"
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="solid" disabled={!items.length} onClick={() => { doImport(items, mode, fallback); setRaw(''); onClose() }}>Import {items.length} line(s)</Button>
      </>}>
      <p className="mb-2 text-sm text-neutral-500">One line per row. Use <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">Speaker: text</code> to set the voice; rows without a speaker use <b>{fallbackName}</b>.</p>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={6} placeholder={PASTE_EXAMPLE}
        className="khmer w-full rounded-lg border border-neutral-200 bg-transparent p-3 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" />
      <div className="my-2 flex items-center gap-2">
        <button onClick={() => setRaw(PASTE_EXAMPLE)} className="text-sm text-blue-600 hover:underline">Insert example</button>
        <div className="ml-auto flex rounded-lg border border-neutral-200 p-0.5 text-xs dark:border-neutral-800">
          {(['preview', 'json'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cx('rounded-md px-2.5 py-1', view === v && 'bg-neutral-100 font-semibold dark:bg-neutral-800')}>{v === 'json' ? 'Convert → JSON' : 'Preview'}</button>
          ))}
        </div>
      </div>
      {view === 'preview' ? <Preview items={items} /> : (
        <div className="relative">
          <pre className="khmer max-h-56 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-emerald-300">{json}</pre>
          <button onClick={() => { navigator.clipboard?.writeText(json); toast('JSON copied') }} className="absolute right-2 top-2 rounded bg-neutral-800 px-2 py-1 text-xs text-white">Copy</button>
        </div>
      )}
      <div className="mt-3"><ModeToggle mode={mode} setMode={setMode} /></div>
    </Modal>
  )
}

const JSON_EXAMPLE = JSON.stringify({ lines: TEMPLATES[2].lines }, null, 2)

export function JsonModal({ open, onClose, fallback }: { open: boolean; onClose: () => void; fallback: string }) {
  const { toast } = useStore()
  const doImport = useImport()
  const [raw, setRaw] = useState('')
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const fileRef = useRef<HTMLInputElement>(null)
  let items: TemplateLine[] = []
  let error = ''
  if (raw.trim()) {
    try { items = parseJson(raw) } catch (e) { error = (e as Error).message }
  }
  return (
    <Modal open={open} onClose={onClose} title="Load JSON"
      footer={<>
        <Button onClick={() => items.length && (setRaw(toPaste(items)), toast('Converted — copy it into Bulk Paste'))} disabled={!items.length}>Convert → paste text</Button>
        <Button variant="solid" disabled={!items.length} onClick={() => { doImport(items, mode, fallback); setRaw(''); onClose() }}>Import {items.length} line(s)</Button>
      </>}>
      <div className="mb-2 flex items-center gap-2">
        <Button size="sm" onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Choose .json file</Button>
        <button onClick={() => setRaw(JSON_EXAMPLE)} className="text-sm text-blue-600 hover:underline">Insert example</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) setRaw(await f.text())
          e.target.value = ''
        }} />
      </div>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={7} placeholder={'{ "lines": [ { "voice": "female-1", "text": "...", "style": "calm" } ] }'}
        className="khmer w-full rounded-lg border border-neutral-200 bg-transparent p-3 font-mono text-xs outline-none focus:border-neutral-400 dark:border-neutral-800" />
      {error ? <p className="my-2 text-sm text-red-600">⚠ {error}</p> : <div className="my-2"><Preview items={items} /></div>}
      <ModeToggle mode={mode} setMode={setMode} />
    </Modal>
  )
}

export function ReplaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines, setLines, toast } = useStore()
  const [find, setFind] = useState('')
  const [rep, setRep] = useState('')
  const hits = find ? lines.reduce((s, l) => s + l.text.split(find).length - 1, 0) : 0
  return (
    <Modal open={open} onClose={onClose} title="Bulk replace"
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="solid" disabled={!hits} onClick={() => {
          setLines((ls) => ls.map((l) => (l.text.includes(find) ? { ...l, text: l.text.split(find).join(rep), dirty: true } : l)))
          toast(`Replaced ${hits} occurrence(s)`)
          onClose()
        }}>Replace {hits}</Button>
      </>}>
      <div className="flex flex-col gap-2">
        <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find (e.g. អាស្កា)" className="khmer h-11 rounded-lg border border-neutral-200 bg-transparent px-3 outline-none dark:border-neutral-800" />
        <input value={rep} onChange={(e) => setRep(e.target.value)} placeholder="Replace with" className="khmer h-11 rounded-lg border border-neutral-200 bg-transparent px-3 outline-none dark:border-neutral-800" />
        <p className="text-sm text-neutral-500">{find ? `${hits} match(es) across ${lines.filter((l) => l.text.includes(find)).length} line(s)` : 'Type something to find.'}</p>
      </div>
    </Modal>
  )
}
