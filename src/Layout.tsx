import type { ReactNode } from 'react'
import {
  AudioLines, Bot, ChevronRight, ChevronsUpDown, CloudUpload, CreditCard, Gift, History, KeyRound, Languages, LayoutGrid, Mic, Moon, PanelLeft, Sun,
} from 'lucide-react'
import { PLAN_NAME, useStore, type Page } from './store'
import { Coin, cx } from './ui'

const NAV: { group: string; items: { id: Page; label: string; km: string; icon: ReactNode }[] }[] = [
  {
    group: 'Platform',
    items: [
      { id: 'dashboard', label: 'Dashboard', km: 'ផ្ទាំងគ្រប់គ្រង', icon: <LayoutGrid className="size-[18px]" /> },
      { id: 'transcribe', label: 'Transcribe', km: 'បំលែងសំឡេង', icon: <CloudUpload className="size-[18px]" /> },
      { id: 'subscriptions', label: 'Subscriptions', km: 'ការជាវ', icon: <CreditCard className="size-[18px]" /> },
      { id: 'redeem', label: 'Redeem Code', km: 'ប្តូរកូដ', icon: <Gift className="size-[18px]" /> },
      { id: 'api', label: 'API Tokens', km: 'API Tokens', icon: <KeyRound className="size-[18px]" /> },
      { id: 'mcp', label: 'MCP', km: 'MCP', icon: <Bot className="size-[18px]" /> },
    ],
  },
  {
    group: 'SomlengPit',
    items: [
      { id: 'projects', label: 'SomlengPit', km: 'សំឡេងពិត', icon: <AudioLines className="size-[18px]" /> },
      { id: 'buy', label: 'Buy Tokens', km: 'ទិញថូខឹន', icon: <Coin className="size-[18px]" /> },
      { id: 'voices', label: 'My Voices', km: 'សំឡេងរបស់ខ្ញុំ', icon: <Mic className="size-[18px]" /> },
      { id: 'history', label: 'Token History', km: 'ប្រវត្តិថូខឹន', icon: <History className="size-[18px]" /> },
    ],
  },
]

export const pageLabel = (p: Page, km: boolean) => {
  p = p.replace('-new', '') as Page
  if (p === 'studio') return km ? 'ស្ទូឌីយោ' : 'Studio'
  if (p === 'projects') return km ? 'គម្រោង' : 'Projects'
  const item = NAV.flatMap((g) => g.items).find((i) => i.id === p)
  return item ? (km ? item.km : item.label) : p
}

export function Layout({ children }: { children: ReactNode }) {
  const { page, setPage, sidebarOpen, setSidebarOpen, dark, setDark, khmer, setKhmer, tokens, plan, design, setDesign, bigLibrary, setBigLibrary, voices, backend, resetData } = useStore()
  const basePage = page.replace('-new', '')
  const go = (id: Page) => setPage(design === 'new' && !id.endsWith('-new') ? (`${id}-new` as Page) : id)
  return (
    <div className="flex h-full bg-neutral-50 dark:bg-neutral-950">
      <aside className={cx('flex shrink-0 flex-col overflow-hidden transition-[width] duration-200', sidebarOpen ? 'w-[260px]' : 'w-0')}>
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-700 text-[9px] font-bold leading-none text-white">
            Srt
          </div>
          <span className="text-[17px] font-semibold">SomlengSrt</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2">
          {NAV.map((g) => (
            <div key={g.group} className="mb-4">
              <div className="px-3 py-2 text-sm text-neutral-500">{g.group}</div>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => go(it.id)}
                  className={cx(
                    'flex w-full items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-[15px] transition-colors',
                    (basePage === it.id || (it.id === 'projects' && basePage === 'studio')) ? 'bg-neutral-200/70 font-medium dark:bg-neutral-800' : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-900',
                  )}
                >
                  {it.icon}
                  <span className={khmer ? 'khmer' : ''}>{khmer ? it.km : it.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button className="m-2 flex items-center gap-3 rounded-lg p-2 text-left hover:bg-neutral-200/50 dark:hover:bg-neutral-900">
          <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-sky-300 font-semibold text-neutral-800">M</div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">muyleang ing</div>
            <div className="truncate text-xs text-neutral-500">{PLAN_NAME[plan]} · {tokens.toLocaleString()} tokens</div>
          </div>
          <ChevronsUpDown className="size-4 text-neutral-500" />
        </button>
      </aside>

      <main className="m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-100 px-5 dark:border-neutral-900">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <PanelLeft className="size-[18px]" />
          </button>
          <span className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
          {['projects', 'studio', 'buy', 'voices', 'history'].includes(basePage) && <>
            <button onClick={() => go('projects')} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">SomlengPit</button>
            <ChevronRight className="size-4 text-neutral-400" />
          </>}
          <span className={khmer ? 'khmer' : ''}>{pageLabel(page, khmer)}</span>
          <div className="ml-auto flex items-center gap-2">
            <span
              title={backend ? `Backend on · data is saved${backend.tts ? ` · real speech: ${backend.model} (${backend.device})` : ' · VoxPocket is off, so speech is mock'}` : 'Backend off · mock data, nothing is saved'}
              className={cx('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                backend?.tts ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : backend ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'border-neutral-200 text-neutral-500 dark:border-neutral-800')}>
              <span className={cx('size-1.5 rounded-full', backend?.tts ? 'bg-emerald-500' : backend ? 'bg-amber-500' : 'bg-neutral-400')} />
              {backend?.tts ? `Live · ${backend.model}` : backend ? 'Saved · TTS off' : 'Mock data'}
            </span>
            {backend && (
              <button onClick={() => confirm('Delete all saved data and go back to the demo data?') && resetData()} className="hidden rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100 sm:block dark:border-neutral-800 dark:hover:bg-neutral-800" title="Reset saved data">
                Reset data
              </button>
            )}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400" title="Load 60 extra mock voices">
              <input type="checkbox" checked={bigLibrary} onChange={(e) => setBigLibrary(e.target.checked)} className="accent-emerald-600" />
              Many voices ({voices.length})
            </label>
            <button onClick={() => setDark(!dark)} className="rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Toggle theme">
              {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>
            <button onClick={() => setKhmer(!khmer)} className="flex items-center gap-1 rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Language">
              <Languages className="size-[18px]" />
              <span className="khmer text-sm">{khmer ? 'EN' : 'ខ្មែរ'}</span>
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>

      {/* floating design switcher */}
      <div className={cx('fixed left-1/2 z-40 -translate-x-1/2 transition-all', basePage === 'studio' ? 'bottom-28' : 'bottom-6')}>
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 p-1 shadow-lg shadow-black/10 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/90">
          <span className="hidden pl-3 pr-1 text-xs font-medium text-neutral-500 sm:inline">Design</span>
          {(['classic', 'new'] as const).map((d) => (
            <button key={d} onClick={() => setDesign(d)}
              className={cx('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', design === d ? (d === 'new' ? 'bg-emerald-600 text-white' : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900') : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white')}>
              {d === 'new' ? '✨ New' : 'Classic'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
