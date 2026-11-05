import { useState } from 'react'
import { AudioLines, ChevronLeft, ChevronRight, ChevronsUpDown, Clock, FileText, FolderOpen, LayoutGrid, List, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Button, Coin, Modal, cx } from '../ui'
import type { Project } from '../data'

export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const versionsOf = (p: Project) => p.lines.reduce((s, l) => s + l.versions.length, 0)

/** Create / rename project dialog (shared by both designs) */
export function ProjectModal({ project, open, onClose, onSave }: { project?: Project; open: boolean; onClose: () => void; onSave: (title: string, desc: string) => void }) {
  const [t, setT] = useState(project?.title ?? '')
  const [d, setD] = useState(project?.description ?? '')
  return (
    <Modal open={open} onClose={onClose} title={project ? 'Rename project' : 'New project'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="solid" disabled={!t.trim()} onClick={() => onSave(t.trim(), d.trim())}>{project ? 'Save' : 'Create project'}</Button>
      </>}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">Project name
          <input autoFocus value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && t.trim() && onSave(t.trim(), d.trim())}
            placeholder="e.g. tiktok-episode-1" className="khmer h-11 border border-neutral-300 bg-transparent px-3 font-normal outline-none focus:border-neutral-500 dark:border-neutral-700" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">Description (optional)
          <textarea value={d} onChange={(e) => setD(e.target.value)} rows={2} className="khmer border border-neutral-300 bg-transparent p-3 font-normal outline-none focus:border-neutral-500 dark:border-neutral-700" />
        </label>
      </div>
    </Modal>
  )
}

export const defaultTitle = (prefix = 'talk') => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

export function Projects() {
  const { projects, tokens, setPage, setCurrentId, createProject, deleteProject, patchProject, toast } = useStore()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [perPage, setPerPage] = useState(20)
  const [pageNo, setPageNo] = useState(1)
  const [modal, setModal] = useState<Project | 'new' | null>(null)
  const [del, setDel] = useState<Project | null>(null)
  const pages = Math.max(1, Math.ceil(projects.length / perPage))
  const pg = Math.min(pageNo, pages)
  const shown = projects.slice((pg - 1) * perPage, pg * perPage)
  const open = (id: string) => { setCurrentId(id); setPage('studio') }

  return (
    <div className="p-5">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="grid size-14 place-items-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"><AudioLines className="size-7" /></div>
        <div>
          <h1 className="text-2xl font-semibold">SomlengPit Projects</h1>
          <p className="text-neutral-500">{projects.length} project(s)</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex h-11 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-lg font-semibold dark:border-neutral-800"><Coin /> {tokens.toLocaleString()}</span>
          <Button onClick={() => setPage('buy')}>Buy Tokens</Button>
          <Button variant="solid" onClick={() => setModal('new')}><Plus className="size-4" /> New Project</Button>
        </div>
      </div>

      <div className="mb-4 flex justify-end gap-2">
        <Button size="icon" className={cx(view === 'grid' && 'bg-neutral-100 dark:bg-neutral-800')} onClick={() => setView('grid')}><LayoutGrid className="size-4" /></Button>
        <Button size="icon" className={cx(view === 'list' && 'bg-neutral-100 dark:bg-neutral-800')} onClick={() => setView('list')}><List className="size-4" /></Button>
        <label className="relative flex h-10 items-center gap-2 border border-neutral-200 px-3 text-[15px] dark:border-neutral-800">
          {perPage} / page <ChevronsUpDown className="size-4" />
          <select value={perPage} onChange={(e) => { setPerPage(+e.target.value); setPageNo(1) }} className="absolute inset-0 opacity-0">
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </label>
      </div>

      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((p) => (
            <div key={p.id} className="border border-neutral-200 p-6 dark:border-neutral-800">
              <div className="flex items-start gap-4">
                <span className="khmer grid size-14 shrink-0 place-items-center bg-neutral-100 text-lg font-semibold text-neutral-500 dark:bg-neutral-800">{[...p.title][0]?.toUpperCase()}</span>
                <div className="min-w-0">
                  <div className="khmer truncate text-lg font-medium">{p.title}</div>
                  <div className="truncate text-neutral-500">{p.description || 'No description'}</div>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-4 text-sm text-neutral-500">
                <span className="flex items-center gap-1"><FileText className="size-4" /> {p.lines.length} line(s)</span>
                <span className="flex items-center gap-1"><AudioLines className="size-4" /> {versionsOf(p)} version(s)</span>
                <span className="ml-auto flex items-center gap-1"><Clock className="size-4" /> {fmtDate(p.updatedAt)}</span>
              </div>
              <div className="mt-5 flex items-center border-t border-neutral-200 pt-5 dark:border-neutral-800">
                <Button onClick={() => open(p.id)}><FolderOpen className="size-4" /> Open</Button>
                <Button variant="ghost" size="icon" className="ml-auto text-neutral-800 dark:text-neutral-200" onClick={() => setModal(p)}><Pencil className="size-4" /></Button>
                <Button variant="danger" size="icon" onClick={() => setDel(p)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800">
          {shown.map((p) => (
            <div key={p.id} className="flex items-center gap-4 border-b border-neutral-200 px-4 py-3 last:border-0 dark:border-neutral-800">
              <span className="khmer grid size-10 shrink-0 place-items-center bg-neutral-100 font-semibold text-neutral-500 dark:bg-neutral-800">{[...p.title][0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="khmer truncate font-medium">{p.title}</div>
                <div className="truncate text-sm text-neutral-500">{p.description || 'No description'}</div>
              </div>
              <span className="hidden w-24 text-sm text-neutral-500 md:block">{p.lines.length} line(s)</span>
              <span className="hidden w-28 text-sm text-neutral-500 md:block">{versionsOf(p)} version(s)</span>
              <span className="hidden w-28 text-sm text-neutral-500 sm:block">{fmtDate(p.updatedAt)}</span>
              <Button size="sm" onClick={() => open(p.id)}><FolderOpen className="size-4" /> Open</Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setModal(p)}><Pencil className="size-4" /></Button>
              <Button variant="danger" size="icon" className="size-8" onClick={() => setDel(p)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      )}

      <Pager page={pg} pages={pages} setPage={setPageNo} total={projects.length} perPage={perPage} />

      <ProjectModal key={modal === 'new' ? 'new' : modal?.id} open={!!modal} project={modal === 'new' ? undefined : modal ?? undefined} onClose={() => setModal(null)}
        onSave={(t, d) => {
          if (modal === 'new') { const id = createProject(t, d); toast(`Created "${t}"`); setModal(null); open(id) }
          else if (modal) { patchProject(modal.id, { title: t, description: d }); toast('Project renamed'); setModal(null) }
        }} />
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete project?"
        footer={<>
          <Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button>
          <Button className="border-red-600 bg-red-600 text-white hover:bg-red-700" onClick={() => { deleteProject(del!.id); toast(`Deleted "${del!.title}"`); setDel(null) }}>Delete</Button>
        </>}>
        <p className="text-neutral-600 dark:text-neutral-400">“{del?.title}” and its {del?.lines.length} line(s) will be deleted. (Mock only.)</p>
      </Modal>
    </div>
  )
}

export function Pager({ page, pages, setPage, total, perPage }: { page: number; pages: number; setPage: (n: number) => void; total: number; perPage: number }) {
  if (pages <= 1) return null
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
      <span>Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1">…</span>}
            <Button size="sm" className={cx(n === page && 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900')} onClick={() => setPage(n)}>{n}</Button>
          </span>
        ))}
        <Button size="sm" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  )
}
