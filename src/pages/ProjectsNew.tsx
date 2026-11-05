import { useState } from 'react'
import { AudioLines, Copy, FilePlus2, MoreHorizontal, Pencil, Play, Plus, Search, Trash2, X } from 'lucide-react'
import { useStore } from '../store'
import { Avatar, Coin, Modal, cx, fmt } from '../ui'
import { TEMPLATES, uid, type Line, type Project } from '../data'
import { Pager, ProjectModal, defaultTitle, versionsOf } from './Projects'

const btn = 'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors'

const ago = (d: Date) => {
  const s = (Date.now() - d.getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
const durationOf = (p: Project) => p.lines.reduce((s, l) => s + (l.activeVersion >= 0 ? l.versions[l.activeVersion].duration : 0), 0)

export function ProjectsNew() {
  const { projects, voices, tokens, setPage, setCurrentId, createProject, deleteProject, duplicateProject, patchProject, toast } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'queued' | 'ready'>('all')
  const [sort, setSort] = useState<'recent' | 'name' | 'lines'>('recent')
  const [pageNo, setPageNo] = useState(1)
  const [modal, setModal] = useState<Project | 'new' | null>(null)
  const [del, setDel] = useState<Project | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const perPage = 12
  const voice = (id: string) => voices.find((v) => v.id === id)
  const open = (id: string) => { setCurrentId(id); setPage('studio-new') }

  const queuedOf = (p: Project) => p.lines.filter((l) => l.dirty && l.text.trim()).length
  const list = projects
    .filter((p) => (!q || (p.title + p.description).toLowerCase().includes(q.toLowerCase())) && (filter === 'all' || (filter === 'queued' ? queuedOf(p) > 0 : queuedOf(p) === 0)))
    .sort((a, b) => (sort === 'recent' ? b.updatedAt.getTime() - a.updatedAt.getTime() : sort === 'name' ? a.title.localeCompare(b.title) : b.lines.length - a.lines.length))
  const pages = Math.max(1, Math.ceil(list.length / perPage))
  const pg = Math.min(pageNo, pages)
  const shown = list.slice((pg - 1) * perPage, pg * perPage)

  const fromTemplate = (tid: string) => {
    const t = TEMPLATES.find((x) => x.id === tid)!
    const lines: Line[] = t.lines.map((x) => ({
      id: uid('line'), voiceId: voices.find((v) => v.name.toLowerCase() === x.voice.toLowerCase())?.id ?? 'chingchang',
      styleHint: x.style ?? '', text: x.text, versions: [], activeVersion: -1, dirty: true,
    }))
    const id = createProject(defaultTitle(tid), t.title, lines)
    toast(`Created from ${t.title}`)
    open(id)
  }

  return (
    <div className="min-h-full bg-neutral-50/60 p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight"><AudioLines className="size-7 text-emerald-600" /> Projects</h1>
            <p className="mt-1 text-neutral-500">{projects.length} projects · pick one up or start something new.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage('buy')} className={cx(btn, 'h-11 border border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900')}><Coin /> <b>{tokens.toLocaleString()}</b> <Plus className="size-3.5 text-neutral-400" /></button>
            <button onClick={() => setModal('new')} className={cx(btn, 'h-11 bg-emerald-600 px-5 text-white hover:bg-emerald-500')}><Plus className="size-4" /> New project</button>
          </div>
        </div>

        {/* quick start */}
        <div className="mb-8">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Start new</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <button onClick={() => { const id = createProject(defaultTitle()); open(id) }}
              className="flex flex-col items-start gap-2 rounded-2xl border-2 border-dashed border-emerald-300 p-4 text-left text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
              <FilePlus2 className="size-6" /><span className="font-semibold">Blank project</span><span className="text-xs text-neutral-500">Empty script</span>
            </button>
            {TEMPLATES.map((t) => {
              const cast = [...new Set(t.lines.map((l) => l.voice))]
              return (
                <button key={t.id} onClick={() => fromTemplate(t.id)} className="flex flex-col items-start gap-2 rounded-2xl border border-neutral-200 bg-white p-4 text-left hover:border-emerald-500 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex -space-x-2">
                    {cast.map((n) => { const v = voices.find((x) => x.name.toLowerCase() === n.toLowerCase()); return <span key={n} className="rounded-lg ring-2 ring-white dark:ring-neutral-900"><Avatar name={n} color={v?.color ?? 'bg-neutral-500'} size="sm" /></span> })}
                  </div>
                  <span className="font-semibold">{t.title.split(' · ')[1]}</span>
                  <span className="text-xs text-neutral-500">{t.title.split(' · ')[0]} · {t.lines.length} lines</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPageNo(1) }} placeholder="Search projects…"
              className="khmer h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-emerald-500 dark:border-neutral-800 dark:bg-neutral-900" />
            {q && <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400"><X className="size-4" /></button>}
          </div>
          <div className="flex rounded-xl border border-neutral-200 bg-white p-0.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            {([['all', 'All'], ['queued', 'Needs generation'], ['ready', 'Ready']] as const).map(([k, l]) => (
              <button key={k} onClick={() => { setFilter(k); setPageNo(1) }} className={cx('rounded-lg px-3 py-1.5', filter === k ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500')}>{l}</button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <option value="recent">Recently edited</option><option value="name">Name</option><option value="lines">Most lines</option>
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const cast = [...new Set(p.lines.map((l) => l.voiceId))]
            const dur = durationOf(p)
            const queued = queuedOf(p)
            return (
              <div key={p.id} onClick={() => open(p.id)} className="group relative cursor-pointer rounded-2xl border border-neutral-200 bg-white p-4 transition-shadow hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="khmer truncate font-semibold">{p.title}</div>
                    <div className="truncate text-sm text-neutral-500">{p.description || 'No description'}</div>
                  </div>
                  {queued ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{queued} queued</span>
                  ) : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Ready</span>}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMenu(menu === p.id ? null : p.id)} className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><MoreHorizontal className="size-4" /></button>
                    {menu === p.id && (
                      <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-neutral-200 bg-white p-1 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-900" onMouseLeave={() => setMenu(null)}>
                        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => { setModal(p); setMenu(null) }}><Pencil className="size-4" /> Rename</button>
                        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => { duplicateProject(p.id); toast('Duplicated'); setMenu(null) }}><Copy className="size-4" /> Duplicate</button>
                        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => { setDel(p); setMenu(null) }}><Trash2 className="size-4" /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* mini timeline coloured by voice */}
                <div className="mt-4 flex h-8 gap-0.5 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  {p.lines.map((l) => (
                    <span key={l.id} style={{ flexGrow: l.activeVersion >= 0 ? l.versions[l.activeVersion].duration : Math.max(1, l.text.length / 14) }}
                      className={cx('basis-0', voice(l.voiceId)?.color ?? 'bg-neutral-400', l.activeVersion >= 0 ? 'opacity-80' : 'opacity-25')} />
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
                  <div className="flex -space-x-1.5">
                    {cast.slice(0, 4).map((id) => { const v = voice(id); return v ? <span key={id} className="rounded-lg ring-2 ring-white dark:ring-neutral-900"><Avatar name={v.name} color={v.color} size="sm" /></span> : null })}
                    {cast.length > 4 && <span className="grid size-8 place-items-center rounded-lg bg-neutral-200 text-[11px] font-semibold ring-2 ring-white dark:bg-neutral-700 dark:ring-neutral-900">+{cast.length - 4}</span>}
                  </div>
                  <span>{p.lines.length} lines · {versionsOf(p)} ver · {fmt(dur)}</span>
                  <span className="ml-auto">{ago(p.updatedAt)}</span>
                </div>
                <span className="absolute bottom-4 right-4 hidden size-9 place-items-center rounded-full bg-emerald-600 text-white shadow group-hover:grid"><Play className="size-4 fill-current" /></span>
              </div>
            )
          })}
        </div>
        {!list.length && <p className="py-16 text-center text-neutral-400">No projects match.</p>}
        <Pager page={pg} pages={pages} setPage={setPageNo} total={list.length} perPage={perPage} />
      </div>

      <ProjectModal key={modal === 'new' ? 'new' : modal?.id} open={!!modal} project={modal === 'new' ? undefined : modal ?? undefined} onClose={() => setModal(null)}
        onSave={(t, d) => {
          if (modal === 'new') { const id = createProject(t, d); setModal(null); open(id) }
          else if (modal) { patchProject(modal.id, { title: t, description: d }); toast('Renamed'); setModal(null) }
        }} />
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete project?"
        footer={<>
          <button className={cx(btn, 'border border-neutral-200 dark:border-neutral-800')} onClick={() => setDel(null)}>Cancel</button>
          <button className={cx(btn, 'bg-red-600 text-white hover:bg-red-700')} onClick={() => { deleteProject(del!.id); toast(`Deleted "${del!.title}"`); setDel(null) }}>Delete</button>
        </>}>
        <p className="text-neutral-600 dark:text-neutral-400">“{del?.title}” will be deleted. (Mock only.)</p>
      </Modal>
    </div>
  )
}
