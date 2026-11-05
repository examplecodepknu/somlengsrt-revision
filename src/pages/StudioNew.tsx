import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, AudioLines, Check, ChevronDown, Copy, Download, FileJson, LayoutTemplate, Loader2, MoreHorizontal, Pause, Pencil, Play, Plus,
  RefreshCw, Replace, Search, SkipBack, SkipForward, Star, Trash2, Upload, Users, Wand2, X,
} from 'lucide-react'
import { useStore } from '../store'
import { Avatar, Coin, cx, fmt } from '../ui'
import { MAX_CHARS, costOf, type Line, type Voice } from '../data'
import { JsonModal, PasteModal, ReplaceModal, TemplatesModal, download, toTemplate } from './Studio'

// accent button styles for the new design
const btn = 'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const ghost = `${btn} text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800`
const soft = `${btn} bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700`
const primary = `${btn} bg-emerald-600 text-white hover:bg-emerald-500`

type Modal = null | 'templates' | 'paste' | 'json' | 'replace'

export function StudioNew() {
  const { lines, generate, generating, tokens } = useStore()
  const [defaultVoice, setDefaultVoice] = useState('chingchang')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<Modal>(null)
  const queued = lines.filter((l) => l.dirty && l.text.trim())
  const cost = queued.reduce((s, l) => s + costOf(l.text), 0)

  return (
    <div className="flex h-full flex-col bg-neutral-50/60 dark:bg-neutral-950">
      <TopBar queued={queued.length} cost={cost} onGenerate={() => generate(queued.map((l) => l.id))} busy={generating.size > 0} disabled={!queued.length || cost > tokens} />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_1fr]">
        <Library defaultVoice={defaultVoice} setDefaultVoice={setDefaultVoice} selected={selected} />
        <Script defaultVoice={defaultVoice} selected={selected} setSelected={setSelected} openModal={setModal} />
      </div>
      <Timeline />

      <TemplatesModal open={modal === 'templates'} onClose={() => setModal(null)} fallback={defaultVoice} />
      <PasteModal open={modal === 'paste'} onClose={() => setModal(null)} fallback={defaultVoice} />
      <JsonModal open={modal === 'json'} onClose={() => setModal(null)} fallback={defaultVoice} />
      <ReplaceModal open={modal === 'replace'} onClose={() => setModal(null)} />
    </div>
  )
}

// ---------- top bar ----------
function TopBar({ queued, cost, onGenerate, busy, disabled }: { queued: number; cost: number; onGenerate: () => void; busy: boolean; disabled: boolean }) {
  const { title, setTitle, tokens, setPage, lines } = useStore()
  const [edit, setEdit] = useState(false)
  const total = lines.reduce((s, l) => s + (l.activeVersion >= 0 ? l.versions[l.activeVersion].duration : 0), 0)
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <button className={ghost + ' px-2'} onClick={() => setPage('projects-new')}><ArrowLeft className="size-4" /></button>
      <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white"><AudioLines className="size-5" /></div>
      <div className="min-w-0">
        {edit ? (
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => setEdit(false)} onKeyDown={(e) => e.key === 'Enter' && setEdit(false)}
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-0.5 font-semibold outline-none dark:border-neutral-700" />
        ) : (
          <button onClick={() => setEdit(true)} className="group flex items-center gap-1.5 font-semibold">
            {title} <Pencil className="size-3.5 text-neutral-400 opacity-0 group-hover:opacity-100" />
          </button>
        )}
        <div className="text-xs text-neutral-500">{lines.length} lines · {fmt(total)} audio · autosaved just now</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => setPage('buy')} className="flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm dark:border-neutral-800">
          <Coin /> <b>{tokens.toLocaleString()}</b> <Plus className="size-3.5 text-neutral-400" />
        </button>
        <button className={primary + ' h-10 px-4 disabled:bg-neutral-300 dark:disabled:bg-neutral-700'} disabled={disabled || busy} onClick={onGenerate}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          {busy ? 'Generating…' : queued ? `Generate ${queued} line${queued > 1 ? 's' : ''}` : 'All lines generated'}
          {queued > 0 && !busy && <span className="flex items-center gap-1 rounded bg-white/20 px-1.5 text-xs"><Coin className="size-3" />{cost}</span>}
        </button>
      </div>
    </div>
  )
}

// ---------- voice library (scales to many voices) ----------
function Library({ defaultVoice, setDefaultVoice, selected }: { defaultVoice: string; setDefaultVoice: (id: string) => void; selected: Set<string> }) {
  const { voices, lines, setLines, favorites, toggleFav, play, startPlay, setPage, toast } = useStore()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'fav' | 'mine' | 'preset'>('all')
  const [gender, setGender] = useState<'all' | 'female' | 'male'>('all')
  const [lang, setLang] = useState('all')
  const langs = [...new Set(voices.map((v) => v.lang))]
  const usage = useMemo(() => {
    const m = new Map<string, number>()
    lines.forEach((l) => m.set(l.voiceId, (m.get(l.voiceId) ?? 0) + 1))
    return m
  }, [lines])
  const cast = voices.filter((v) => usage.has(v.id))

  const list = voices.filter((v) => {
    if (tab === 'fav' && !favorites.has(v.id)) return false
    if (tab === 'mine' && v.kind !== 'custom') return false
    if (tab === 'preset' && v.kind !== 'preset') return false
    if (gender !== 'all' && v.gender !== gender) return false
    if (lang !== 'all' && v.lang !== lang) return false
    const s = q.toLowerCase()
    return !s || v.name.toLowerCase().includes(s) || v.tags?.some((t) => t.includes(s)) || v.lang.toLowerCase().includes(s)
  })

  const assign = (v: Voice) => {
    if (selected.size) {
      setLines((ls) => ls.map((l) => (selected.has(l.id) ? { ...l, voiceId: v.id, dirty: true } : l)))
      toast(`Assigned ${v.name} to ${selected.size} line(s)`)
    } else {
      setDefaultVoice(v.id)
      toast(`${v.name} is now the default voice for new lines`)
    }
  }

  return (
    <aside className="flex min-h-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* cast of this project */}
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"><Users className="size-3.5" /> Cast in this project</div>
        <div className="flex flex-wrap gap-1.5">
          {cast.map((v) => (
            <span key={v.id} className="flex items-center gap-1.5 rounded-full border border-neutral-200 py-0.5 pl-0.5 pr-2 text-xs dark:border-neutral-700">
              <Avatar name={v.name} color={v.color} size="sm" />
              <span className="font-medium">{v.name}</span>
              <span className="text-neutral-400">{usage.get(v.id)}</span>
            </span>
          ))}
          {!cast.length && <span className="text-xs text-neutral-400">No voices used yet</span>}
        </div>
      </div>

      {/* search + filters */}
      <div className="space-y-2 p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${voices.length} voices, tags, language…`}
            className="h-9 w-full rounded-lg bg-neutral-100 pl-9 pr-8 text-sm outline-none ring-emerald-500 focus:ring-2 dark:bg-neutral-800" />
          {q && <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400"><X className="size-4" /></button>}
        </div>
        <div className="flex gap-1 rounded-lg bg-neutral-100 p-0.5 text-xs dark:bg-neutral-800">
          {([['all', 'All'], ['fav', '★ Fav'], ['mine', 'Mine'], ['preset', 'Presets']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={cx('flex-1 rounded-md py-1.5 font-medium', tab === k ? 'bg-white shadow-sm dark:bg-neutral-950' : 'text-neutral-500')}>{label}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'female', 'male'] as const).map((g) => (
            <button key={g} onClick={() => setGender(g)} className={cx('rounded-full border px-2.5 py-0.5 text-xs capitalize', gender === g ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'border-neutral-200 text-neutral-500 dark:border-neutral-700')}>{g}</button>
          ))}
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="ml-auto rounded-full border border-neutral-200 bg-transparent px-2 text-xs text-neutral-600 outline-none dark:border-neutral-700 dark:text-neutral-300">
            <option value="all">All languages</option>
            {langs.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between pt-1 text-xs text-neutral-400">
          <span>Showing {list.length} of {voices.length}</span>
          {selected.size > 0 ? <span className="font-medium text-emerald-600">Click a voice to assign to {selected.size} line(s)</span> : <span>Click to set default</span>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {list.map((v) => {
          const on = play?.key === `voice:${v.id}`
          const isDef = v.id === defaultVoice
          return (
            <div key={v.id} onClick={() => assign(v)}
              className={cx('group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2', isDef ? 'bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60')}>
              <div className="relative">
                <Avatar name={v.name} color={v.color} />
                <button onClick={(e) => (e.stopPropagation(), startPlay(`voice:${v.id}`, v.sampleSec))}
                  className={cx('absolute inset-0 grid place-items-center rounded-lg bg-black/50 text-white transition-opacity', on ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                  {on ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{v.name}</span>
                  {v.kind === 'custom' && <span className="rounded bg-violet-100 px-1 text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">CLONE</span>}
                  {v.status === 'Processing' && <Loader2 className="size-3 animate-spin text-amber-500" />}
                </div>
                <div className="truncate text-xs text-neutral-500">{v.gender} · {v.lang}{v.tags?.length ? ` · ${v.tags.join(', ')}` : ''}</div>
              </div>
              {isDef && <Check className="size-4 text-emerald-600" />}
              <button onClick={(e) => (e.stopPropagation(), toggleFav(v.id))} className={cx('p-1', favorites.has(v.id) ? 'text-amber-500' : 'text-neutral-300 opacity-0 group-hover:opacity-100 dark:text-neutral-600')}>
                <Star className={cx('size-4', favorites.has(v.id) && 'fill-current')} />
              </button>
            </div>
          )
        })}
        {!list.length && <p className="p-6 text-center text-sm text-neutral-400">No voices match.</p>}
      </div>
      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <button onClick={() => setPage('voices-new')} className={soft + ' w-full justify-center'}><Plus className="size-4" /> Clone a new voice</button>
      </div>
    </aside>
  )
}

// ---------- script ----------
function Script({ defaultVoice, selected, setSelected, openModal }: { defaultVoice: string; selected: Set<string>; setSelected: (s: Set<string>) => void; openModal: (m: Modal) => void }) {
  const { lines, setLines, voices, addLine, generate, title } = useStore()
  const [importOpen, setImportOpen] = useState(false)
  const voiceName = (id: string) => voices.find((v) => v.id === id)?.name ?? id
  const allSel = lines.length > 0 && selected.size === lines.length

  return (
    <section className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
        {selected.size ? (
          <>
            <span className="mr-2 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">{selected.size} selected</span>
            <button className={ghost} onClick={() => generate([...selected])}><RefreshCw className="size-4" /> Generate</button>
            <button className={ghost} onClick={() => setLines((ls) => ls.map((l) => (selected.has(l.id) ? { ...l, voiceId: defaultVoice, dirty: true } : l)))}>
              <Users className="size-4" /> Use {voiceName(defaultVoice)}
            </button>
            <button className={ghost + ' text-red-600'} onClick={() => { setLines((ls) => ls.filter((l) => !selected.has(l.id))); setSelected(new Set()) }}><Trash2 className="size-4" /> Delete</button>
            <button className={ghost + ' ml-auto'} onClick={() => setSelected(new Set())}><X className="size-4" /> Clear</button>
          </>
        ) : (
          <>
            <button className={soft} onClick={() => openModal('templates')}><LayoutTemplate className="size-4" /> Templates</button>
            <div className="relative">
              <button className={ghost} onClick={() => setImportOpen(!importOpen)}><Upload className="size-4" /> Import <ChevronDown className="size-3.5" /></button>
              {importOpen && (
                <div className="absolute left-0 top-10 z-20 w-56 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900" onMouseLeave={() => setImportOpen(false)}>
                  {([['paste', Copy, 'Paste text', 'Speaker: line format'], ['json', FileJson, 'Load JSON', 'File or pasted JSON']] as const).map(([m, Icon, label, hint]) => (
                    <button key={m} onClick={() => { openModal(m); setImportOpen(false) }} className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <Icon className="mt-0.5 size-4" /><span><span className="block text-sm font-medium">{label}</span><span className="text-xs text-neutral-500">{hint}</span></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className={ghost} onClick={() => download(`${title}.json`, JSON.stringify({ title, lines: toTemplate(lines, voiceName) }, null, 2), 'application/json')}><Download className="size-4" /> Export</button>
            <button className={ghost} onClick={() => openModal('replace')}><Replace className="size-4" /> Find & replace</button>
            <span className="ml-auto text-xs text-neutral-400">Max {MAX_CHARS} chars/line</span>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl">
          {lines.length > 0 && (
            <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 px-1 text-xs text-neutral-500">
              <input type="checkbox" checked={allSel} onChange={() => setSelected(allSel ? new Set() : new Set(lines.map((l) => l.id)))} className="accent-emerald-600" /> Select all
            </label>
          )}
          <div className="flex flex-col gap-2">
            {lines.map((l, i) => (
              <Row key={l.id} line={l} index={i} checked={selected.has(l.id)} onCheck={() => {
                const n = new Set(selected)
                if (n.has(l.id)) n.delete(l.id)
                else n.add(l.id)
                setSelected(n)
              }} />
            ))}
          </div>
          <button onClick={() => addLine(undefined, { voiceId: defaultVoice })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-3 text-sm text-neutral-500 hover:border-emerald-500 hover:text-emerald-600 dark:border-neutral-700">
            <Plus className="size-4" /> Add line as {voiceName(defaultVoice)}
          </button>
          {!lines.length && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {([['templates', LayoutTemplate, 'Start from a template', 'Story, dialogue, ad, podcast'], ['paste', Copy, 'Paste a script', 'Speaker: text per line'], ['json', FileJson, 'Import JSON', 'From a file or API']] as const).map(([m, Icon, t, d]) => (
                <button key={m} onClick={() => openModal(m)} className="rounded-2xl border border-neutral-200 bg-white p-5 text-left hover:border-emerald-500 dark:border-neutral-800 dark:bg-neutral-900">
                  <Icon className="mb-3 size-6 text-emerald-600" /><div className="font-semibold">{t}</div><div className="text-sm text-neutral-500">{d}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Row({ line: l, index, checked, onCheck }: { line: Line; index: number; checked: boolean; onCheck: () => void }) {
  const { voices, updateLine, addLine, removeLine, generate, generating, play, startPlay } = useStore()
  const [menu, setMenu] = useState(false)
  const [showStyle, setShowStyle] = useState(!!l.styleHint)
  const ref = useRef<HTMLDivElement>(null)
  const voice = voices.find((v) => v.id === l.voiceId)
  const on = play?.key === `line:${l.id}`
  const isGen = generating.has(l.id)
  const ta = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (on) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [on])
  useEffect(() => {
    const t = ta.current
    if (t) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px` }
  }, [l.text])

  const status = isGen ? 'gen' : l.dirty && l.text.trim() ? 'queued' : l.activeVersion >= 0 ? 'ready' : 'empty'

  return (
    <div ref={ref} className={cx('group relative flex gap-3 rounded-2xl border bg-white p-3 transition-all dark:bg-neutral-900',
      on ? 'border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' : checked ? 'border-emerald-300 dark:border-emerald-800' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800')}>
      <div className="flex flex-col items-center gap-2 pt-1">
        <input type="checkbox" checked={checked} onChange={onCheck} className={cx('accent-emerald-600', !checked && 'opacity-0 group-hover:opacity-100')} />
        <span className="text-xs tabular-nums text-neutral-400">{index + 1}</span>
      </div>

      <div className="w-32 shrink-0">
        <label className="relative flex cursor-pointer items-center gap-2 rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          {voice && <Avatar name={voice.name} color={voice.color} size="sm" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{voice?.name ?? 'Unknown'}</span>
            <span className="block text-[11px] text-neutral-400">{voice?.lang}</span>
          </span>
          <ChevronDown className="size-3.5 text-neutral-400" />
          <select value={l.voiceId} onChange={(e) => updateLine(l.id, { voiceId: e.target.value, dirty: true })} className="absolute inset-0 cursor-pointer opacity-0">
            {voices.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.lang})</option>)}
          </select>
        </label>
      </div>

      <div className="min-w-0 flex-1">
        {showStyle && (
          <input value={l.styleHint} onChange={(e) => updateLine(l.id, { styleHint: e.target.value, dirty: true })} placeholder="Style: whisper, calm, excited…" autoFocus={!l.styleHint}
            className="mb-1 w-full rounded-md bg-violet-50 px-2 py-1 text-xs text-violet-800 outline-none placeholder:text-violet-400 dark:bg-violet-950/40 dark:text-violet-200" />
        )}
        <textarea ref={ta} value={l.text} rows={1} maxLength={MAX_CHARS} onChange={(e) => updateLine(l.id, { text: e.target.value, dirty: true })} placeholder="Write what this voice says…"
          className="khmer block w-full resize-none bg-transparent py-1 text-[17px] leading-relaxed outline-none" />
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          {!showStyle && <button onClick={() => setShowStyle(true)} className="hover:text-violet-600">+ style</button>}
          <span className={cx(l.text.length > MAX_CHARS * 0.9 && 'text-amber-600')}>{l.text.length}/{MAX_CHARS}</span>
          <span className="flex items-center gap-1"><Coin className="size-3" />{costOf(l.text)}</span>
          {l.versions.length > 0 && (
            <span className="flex items-center gap-0.5">
              {l.versions.map((v, vi) => (
                <button key={v.id} onClick={() => updateLine(l.id, { activeVersion: vi })}
                  className={cx('rounded px-1.5 py-0.5', vi === l.activeVersion ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800')}>v{v.n}</button>
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-1">
        <StatusPill s={status} />
        <button disabled={l.activeVersion < 0} onClick={() => startPlay(`line:${l.id}`, l.versions[l.activeVersion].duration)}
          className={cx('grid size-9 place-items-center rounded-full disabled:opacity-30', on ? 'bg-emerald-600 text-white' : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800')}>
          {on ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
        </button>
        <button title={l.versions.length ? 'Regenerate' : 'Generate'} disabled={isGen || !l.text.trim()} onClick={() => generate([l.id])} className="grid size-9 place-items-center rounded-full hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
          <RefreshCw className={cx('size-4', isGen && 'animate-spin')} />
        </button>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="grid size-9 place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"><MoreHorizontal className="size-4" /></button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-neutral-200 bg-white p-1 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-900" onMouseLeave={() => setMenu(false)}>
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => { addLine(l.id, { voiceId: l.voiceId }); setMenu(false) }}><Plus className="size-4" /> Insert below</button>
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => { addLine(l.id, { voiceId: l.voiceId, text: l.text, styleHint: l.styleHint }); setMenu(false) }}><Copy className="size-4" /> Duplicate</button>
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => removeLine(l.id)}><Trash2 className="size-4" /> Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ s }: { s: 'gen' | 'queued' | 'ready' | 'empty' }) {
  if (s === 'empty') return null
  const map = {
    gen: ['bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300', 'Generating'],
    queued: ['bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', 'Queued'],
    ready: ['bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', 'Ready'],
  } as const
  const [c, t] = map[s]
  return <span className={cx('mr-1 mt-2 rounded-full px-2 py-0.5 text-[11px] font-medium', c)}>{t}</span>
}

// ---------- timeline player ----------
function Timeline() {
  const { lines, voices, play, startPlay, stopPlay, seek, toast, title } = useStore()
  const clips = lines.filter((l) => l.activeVersion >= 0)
  const durs = clips.map((c) => c.versions[c.activeVersion].duration)
  const total = durs.reduce((a, b) => a + b, 0)
  const idx = clips.findIndex((c) => play?.key === `line:${c.id}`)
  const elapsed = idx >= 0 ? durs.slice(0, idx).reduce((a, b) => a + b, 0) + play!.progress * durs[idx] : 0
  const current = idx >= 0 ? clips[idx] : null
  const voice = (id: string) => voices.find((v) => v.id === id)
  const playAt = (i: number) => clips[i] && startPlay(`line:${clips[i].id}`, durs[i])

  if (!clips.length) return null
  return (
    <div className="border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => playAt(Math.max(0, idx - 1))} className={ghost + ' px-2'}><SkipBack className="size-4" /></button>
          <button onClick={() => (current ? stopPlay() : playAt(0))} className="grid size-10 place-items-center rounded-full bg-emerald-600 text-white hover:bg-emerald-500">
            {current ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </button>
          <button onClick={() => playAt(idx + 1)} className={ghost + ' px-2'}><SkipForward className="size-4" /></button>
        </div>
        <span className="w-24 text-center font-mono text-xs tabular-nums text-neutral-500">{fmt(elapsed)} / {fmt(total)}</span>

        {/* clip blocks proportional to duration, coloured by voice */}
        <div className="relative flex h-12 min-w-0 flex-1 gap-0.5 overflow-hidden rounded-lg">
          {clips.map((c, i) => {
            const v = voice(c.voiceId)
            const on = i === idx
            return (
              <button key={c.id} onClick={(e) => {
                if (!on) playAt(i)
                const r = e.currentTarget.getBoundingClientRect()
                setTimeout(() => seek((e.clientX - r.left) / r.width), 0)
              }}
                style={{ flexGrow: durs[i] }} title={`#${lines.indexOf(c) + 1} ${v?.name}: ${c.text}`}
                className={cx('relative min-w-1 basis-0 overflow-hidden text-left text-[10px] font-semibold text-white', v?.color ?? 'bg-neutral-500', on ? 'opacity-100' : 'opacity-60 hover:opacity-90')}>
                {on && <span className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${play!.progress * 100}%` }} />}
                <span className="relative block truncate px-1.5 pt-1">{v?.name}</span>
                <span className="relative block truncate px-1.5 font-normal opacity-80">#{lines.indexOf(c) + 1}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1">
          <button className={soft} onClick={() => toast(`Mock: merged MP3 (${fmt(total)}) would download`)}><Download className="size-4" /> Export</button>
          <button className={ghost} onClick={() => {
            let t = 0
            const ts = (s: number) => new Date(s * 1000).toISOString().slice(11, 23).replace('.', ',')
            download(`${title}.srt`, clips.map((c, i) => { const b = `${i + 1}\n${ts(t)} --> ${ts(t + durs[i])}\n${c.text}\n`; t += durs[i]; return b }).join('\n'))
            toast('SRT downloaded')
          }}>SRT</button>
        </div>
      </div>
      <div className="mt-2 h-5 truncate pl-1 text-sm">
        {current ? (
          <span className="khmer"><b>{voice(current.voiceId)?.name}</b> <span className="text-neutral-500">— {current.text}</span></span>
        ) : <span className="text-neutral-400">Press play to hear the whole track in order · click a block to jump</span>}
      </div>
    </div>
  )
}
