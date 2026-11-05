import { useMemo, useState } from 'react'
import { AudioLines, LayoutGrid, List, Loader2, Mic, MoreHorizontal, Pause, Pencil, Play, Plus, Search, Sparkles, Star, Trash2, X } from 'lucide-react'
import { useStore } from '../store'
import { Avatar, Coin, Modal, cx, fmt } from '../ui'
import type { Voice } from '../data'
import { VoiceModal } from './MyVoices'

const btn = 'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors'
const MAX_CLONES = 20

function MiniWave({ seed, progress, on }: { seed: string; progress: number; on: boolean }) {
  const bars = useMemo(() => {
    let h = 7
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return Array.from({ length: 36 }, () => { h = (h * 1103515245 + 12345) >>> 0; return 0.25 + ((h >> 8) % 100) / 130 })
  }, [seed])
  return (
    <div className="flex h-8 flex-1 items-center gap-[2px]">
      {bars.map((b, i) => (
        <span key={i} className={cx('flex-1 rounded-full', on && i / bars.length <= progress ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700')} style={{ height: `${b * 100}%` }} />
      ))}
    </div>
  )
}

export function VoicesNew() {
  const { voices, setVoices, tokens, setPage, favorites, toggleFav, play, startPlay, lines, setLines, toast } = useStore()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'mine' | 'preset' | 'fav'>('all')
  const [gender, setGender] = useState<'all' | 'female' | 'male'>('all')
  const [lang, setLang] = useState('all')
  const [sort, setSort] = useState<'name' | 'length' | 'used'>('name')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [editing, setEditing] = useState<Voice | 'new' | null>(null)
  const [del, setDel] = useState<Voice | null>(null)
  const [menu, setMenu] = useState<string | null>(null)

  const mine = voices.filter((v) => v.kind === 'custom')
  const langs = [...new Set(voices.map((v) => v.lang))]
  const usage = new Map<string, number>()
  lines.forEach((l) => usage.set(l.voiceId, (usage.get(l.voiceId) ?? 0) + 1))

  const list = voices
    .filter((v) => {
      if (tab === 'mine' && v.kind !== 'custom') return false
      if (tab === 'preset' && v.kind !== 'preset') return false
      if (tab === 'fav' && !favorites.has(v.id)) return false
      if (gender !== 'all' && v.gender !== gender) return false
      if (lang !== 'all' && v.lang !== lang) return false
      const s = q.toLowerCase()
      return !s || v.name.toLowerCase().includes(s) || v.tags?.some((t) => t.includes(s))
    })
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'length' ? b.sampleSec - a.sampleSec : (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0)))

  const filtersOn = q || gender !== 'all' || lang !== 'all'
  const stats = [
    { label: 'Total voices', value: voices.length, sub: `${langs.length} languages` },
    { label: 'My clones', value: `${mine.length}/${MAX_CLONES}`, sub: 'free to clone', bar: mine.length / MAX_CLONES },
    { label: 'Favorites', value: favorites.size, sub: 'quick access in Studio' },
    { label: 'Tokens', value: tokens.toLocaleString(), sub: 'ASR costs 20 / clone', coin: true },
  ]

  const actions = (v: Voice) => (
    <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-neutral-200 bg-white p-1 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-900" onMouseLeave={() => setMenu(null)}>
      <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => { toast(`Use ${v.name} in Studio`); setPage('studio-new') }}><AudioLines className="size-4" /> Use in Studio</button>
      {v.kind === 'custom' && <>
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => { setEditing(v); setMenu(null) }}><Pencil className="size-4" /> Edit</button>
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => { setDel(v); setMenu(null) }}><Trash2 className="size-4" /> Delete</button>
      </>}
    </div>
  )

  return (
    <div className="min-h-full bg-neutral-50/60 p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl">
        {/* hero */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight"><Mic className="size-7 text-emerald-600" /> Voice Library</h1>
            <p className="mt-1 text-neutral-500">Find a preset or clone your own from a 15-second sample.</p>
          </div>
          <button onClick={() => setEditing('new')} className={cx(btn, 'h-11 bg-emerald-600 px-5 text-white hover:bg-emerald-500')}><Sparkles className="size-4" /> Clone a voice</button>
        </div>

        {/* stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">{s.label}</div>
              <div className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">{s.coin && <Coin className="size-5" />}{s.value}</div>
              {s.bar !== undefined ? (
                <div className="mt-2 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.bar * 100}%` }} /></div>
              ) : <div className="mt-1 text-xs text-neutral-400">{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* toolbar */}
        <div className="sticky top-0 z-10 -mx-2 mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-neutral-50/90 px-2 py-2 backdrop-blur dark:bg-neutral-950/90">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or tag (news, calm, kids…)"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 dark:border-neutral-800 dark:bg-neutral-900" />
          </div>
          <div className="flex rounded-xl border border-neutral-200 bg-white p-0.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            {([['all', `All ${voices.length}`], ['mine', `My clones ${mine.length}`], ['preset', 'Presets'], ['fav', `★ ${favorites.size}`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cx('rounded-lg px-3 py-1.5', tab === k ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500')}>{l}</button>
            ))}
          </div>
          <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <option value="all">Any gender</option><option value="female">Female</option><option value="male">Male</option>
          </select>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <option value="all">Any language</option>{langs.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <option value="name">Sort: Name</option><option value="length">Sort: Sample length</option><option value="used">Sort: Most used</option>
          </select>
          <div className="flex rounded-xl border border-neutral-200 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
            <button onClick={() => setView('grid')} className={cx('rounded-lg p-2', view === 'grid' && 'bg-neutral-100 dark:bg-neutral-800')}><LayoutGrid className="size-4" /></button>
            <button onClick={() => setView('list')} className={cx('rounded-lg p-2', view === 'list' && 'bg-neutral-100 dark:bg-neutral-800')}><List className="size-4" /></button>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 text-sm text-neutral-500">
          {list.length} voice{list.length !== 1 && 's'}
          {filtersOn && <button onClick={() => { setQ(''); setGender('all'); setLang('all') }} className="flex items-center gap-1 text-emerald-600 hover:underline"><X className="size-3.5" /> Clear filters</button>}
        </div>

        {view === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {tab !== 'preset' && tab !== 'fav' && !filtersOn && (
              <button onClick={() => setEditing('new')} className="flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                <Plus className="size-6" /><span className="font-medium">Clone a new voice</span><span className="text-xs text-neutral-500">Upload 15s · ~1 min</span>
              </button>
            )}
            {list.map((v) => {
              const on = play?.key === `voice:${v.id}`
              return (
                <div key={v.id} className={cx('group relative rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md dark:bg-neutral-900', on ? 'border-emerald-500' : 'border-neutral-200 dark:border-neutral-800')}>
                  <div className="flex items-start gap-3">
                    <Avatar name={v.name} color={v.color} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold">{v.name}</span>
                        {v.kind === 'custom' && <span className="rounded bg-violet-100 px-1 text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">CLONE</span>}
                      </div>
                      <div className="text-xs text-neutral-500">{v.gender} · {v.lang} · {v.sampleSec.toFixed(0)}s{usage.get(v.id) ? ` · used ${usage.get(v.id)}×` : ''}</div>
                    </div>
                    <button onClick={() => toggleFav(v.id)} className={cx('p-1', favorites.has(v.id) ? 'text-amber-500' : 'text-neutral-300 hover:text-amber-500 dark:text-neutral-600')}><Star className={cx('size-4', favorites.has(v.id) && 'fill-current')} /></button>
                    <div className="relative">
                      <button onClick={() => setMenu(menu === v.id ? null : v.id)} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><MoreHorizontal className="size-4" /></button>
                      {menu === v.id && actions(v)}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {v.tags?.map((t) => <button key={t} onClick={() => setQ(t)} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-neutral-800 dark:text-neutral-300">#{t}</button>)}
                  </div>
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-neutral-50 p-2 dark:bg-neutral-800/50">
                    {v.status === 'Processing' ? (
                      <span className="flex h-8 items-center gap-2 px-1 text-sm text-amber-600"><Loader2 className="size-4 animate-spin" /> Processing sample…</span>
                    ) : <>
                      <button onClick={() => startPlay(`voice:${v.id}`, v.sampleSec)} className={cx('grid size-8 shrink-0 place-items-center rounded-full', on ? 'bg-emerald-600 text-white' : 'bg-white shadow-sm dark:bg-neutral-700')}>
                        {on ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
                      </button>
                      <MiniWave seed={v.id} progress={on ? play.progress : 0} on={on} />
                      <span className="w-9 text-right font-mono text-[11px] text-neutral-400">{fmt(on ? play.progress * v.sampleSec : v.sampleSec)}</span>
                    </>}
                  </div>
                  {v.transcript && <p className="mt-2 line-clamp-2 text-xs text-neutral-500">“{v.transcript}”</p>}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_1.5fr_120px] gap-3 border-b border-neutral-200 px-4 py-2 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800">
              <span /><span>Voice</span><span>Language</span><span>Type</span><span>Tags</span><span />
            </div>
            {list.map((v) => {
              const on = play?.key === `voice:${v.id}`
              return (
                <div key={v.id} className="grid grid-cols-[40px_1.5fr_1fr_1fr_1.5fr_120px] items-center gap-3 border-b border-neutral-100 px-4 py-2 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                  <button onClick={() => startPlay(`voice:${v.id}`, v.sampleSec)} className={cx('grid size-8 place-items-center rounded-full', on ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800')}>
                    {on ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
                  </button>
                  <span className="flex min-w-0 items-center gap-2"><Avatar name={v.name} color={v.color} size="sm" /><span className="truncate font-medium">{v.name}</span></span>
                  <span className="text-sm text-neutral-500">{v.lang}</span>
                  <span className="text-sm text-neutral-500">{v.kind === 'custom' ? 'Clone' : 'Preset'} · {v.gender}</span>
                  <span className="truncate text-xs text-neutral-500">{v.tags?.map((t) => `#${t}`).join(' ')}</span>
                  <span className="relative flex justify-end gap-1">
                    <button onClick={() => toggleFav(v.id)} className={cx('p-1', favorites.has(v.id) ? 'text-amber-500' : 'text-neutral-300')}><Star className={cx('size-4', favorites.has(v.id) && 'fill-current')} /></button>
                    <button onClick={() => setMenu(menu === v.id ? null : v.id)} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><MoreHorizontal className="size-4" /></button>
                    {menu === v.id && actions(v)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {!list.length && <p className="py-16 text-center text-neutral-400">No voices match your filters.</p>}
      </div>

      <VoiceModal key={editing === 'new' ? 'new' : editing?.id} voice={editing} onClose={() => setEditing(null)}
        onSave={(v, isNew) => {
          setVoices((vs) => (isNew ? [v, ...vs] : vs.map((x) => (x.id === v.id ? { ...x, ...v } : x))))
          toast(isNew ? `Voice "${v.name}" cloned` : `Saved "${v.name}"`)
          setEditing(null)
        }} />
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete voice?"
        footer={<>
          <button className={cx(btn, 'border border-neutral-200 dark:border-neutral-800')} onClick={() => setDel(null)}>Cancel</button>
          <button className={cx(btn, 'bg-red-600 text-white hover:bg-red-700')} onClick={() => {
            setVoices((vs) => vs.filter((x) => x.id !== del!.id))
            setLines(lines.map((l) => (l.voiceId === del!.id ? { ...l, voiceId: 'chingchang', dirty: true } : l)))
            toast(`Deleted "${del!.name}"`)
            setDel(null)
          }}>Delete</button>
        </>}>
        <p className="text-neutral-600 dark:text-neutral-400">“{del?.name}” will be removed. Lines using it switch to ChingChang. (Mock only.)</p>
      </Modal>
    </div>
  )
}
