import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CUSTOM_VOICES, EXTRA_VOICES, PRESET_VOICES, initialProjects, uid, costOf, type Line, type Project, type Voice } from './data'
import { api, type Health } from './api'

// turn ISO strings back into Dates after loading saved state
const revive = <T,>(xs: T[] | undefined, keys: string[]): T[] | undefined =>
  xs?.map((x) => { const o = { ...x } as Record<string, unknown>; keys.forEach((k) => { if (typeof o[k] === 'string') o[k] = new Date(o[k] as string) }); return o as T })

export type BasePage = 'projects' | 'studio' | 'voices' | 'dashboard' | 'transcribe' | 'subscriptions' | 'redeem' | 'api' | 'mcp' | 'somlengpit' | 'buy' | 'history'
export type Page = BasePage | `${BasePage}-new`
export type Toast = { id: string; text: string; tone?: 'ok' | 'err' }
export type HistoryItem = { id: string; date: Date; label: string; delta: number; type?: 'Usage' | 'Purchase' | 'Refund' | 'Bonus' | 'Gift' }
export type TFile = { id: string; name: string; duration: number; size: number; status: 'Processing' | 'Completed' | 'Failed'; date: Date; transcript: string }
export type PlanId = 'free' | 'basic' | 'api' | 'pro'
export const PLAN_LIMIT: Record<PlanId, number> = { free: 1, basic: 10, api: 20, pro: 100 }
export const PLAN_NAME: Record<PlanId, string> = { free: 'Free', basic: 'Basic', api: 'API Starter', pro: 'Pro' }
const KM_TRANSCRIPT = 'Okay, សួស្តីអ្នកទាំងអស់គ្នា! អញ្ចឹង រឿងអូនេះដែរ ខ្ញុំចេញពីឡេប តឡូរហ្នឹងដើរលេងអញ្ចឹងហើយណា។ ហ៎! ខ្ញុំឃើញ ចុះ! សួស្តីបង! ខ្មែរ! ខ្ញុំ! ខ្មែរ! អូ! ចុះមកលានហ្នឹងយូរនៅ? ខ្ញុំមកបានមួយខែ មកបានមួយខែ។ ចង់បានយូរៀនហើយ។ ថៃដន្យជួបគ្នា! ថៃដន្យអត់ដែលស្គាល់គ្នាទេ ហ្នឹងហើយ!'

type PlayState = { key: string; duration: number; progress: number } | null

function useStoreValue() {
  const [page, setPageState] = useState<Page>(() => (location.hash.slice(1) as Page) || 'projects')
  const [dark, setDark] = useState(false)
  const [khmer, setKhmer] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tokens, setTokens] = useState(16491)
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const amounts = [50, 74, 70, 44, 72, 76, 85, 72, 44, 51, 66, 32, 68, 47, 47, 25, 60, 68, 54]
    const nums = [1565, 1564, 1563, 1562, 1561, 1560, 1535, 1534, 1533, 1532, 1531, 1530, 1529, 1528, 1527, 1526, 1525, 1524, 1523]
    const t0 = new Date('2026-11-04T22:16:14').getTime()
    const usage: HistoryItem[] = amounts.map((a, i) => ({ id: uid('h'), type: 'Usage', date: new Date(t0 - (i < 6 ? i * 700 : 8e6 + i * 1000)), label: `TTS generation #${nums[i]}`, delta: -a }))
    return [
      ...usage,
      { id: uid('h'), type: 'Usage', date: new Date('2026-11-02T10:00:00'), label: 'Voice clone ASR · womanvoice', delta: -20 },
      { id: uid('h'), type: 'Gift', date: new Date('2026-10-30T09:00:00'), label: 'Gift code GIFT-NNKB9-R54JT', delta: 30000 },
    ]
  })
  const [plan, setPlan] = useState<PlanId>('free')
  const [files, setFiles] = useState<TFile[]>([
    { id: 'f1', name: 'lv_0_20260820183931.mp3', duration: 58, size: 1.7e6, status: 'Completed', date: new Date('2026-08-21T10:00:00'), transcript: KM_TRANSCRIPT },
  ])
  const dailyUsed = files.filter((f) => f.date.toDateString() === new Date().toDateString()).length
  const [voices, setVoices] = useState<Voice[]>([...PRESET_VOICES, ...CUSTOM_VOICES])
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [currentId, setCurrentId] = useState('p-main')
  const currentRef = useRef(currentId)
  currentRef.current = currentId
  const current = projects.find((p) => p.id === currentId) ?? projects[0]
  const lines = current?.lines ?? []
  const title = current?.title ?? ''
  const description = current?.description ?? ''
  const patchProject = (id: string, patch: Partial<Project> | ((p: Project) => Partial<Project>)) =>
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch), updatedAt: new Date() } : p)))
  const setLinesFor = (pid: string, u: Line[] | ((ls: Line[]) => Line[])) =>
    patchProject(pid, (p) => ({ lines: typeof u === 'function' ? u(p.lines) : u }))
  const setLines = (u: Line[] | ((ls: Line[]) => Line[])) => setLinesFor(currentRef.current, u)
  const setTitle = (t: string) => patchProject(currentRef.current, { title: t })
  const setDescription = (d: string) => patchProject(currentRef.current, { description: d })
  const createProject = (t: string, d = '', ls: Line[] = []) => {
    const p: Project = { id: uid('p'), title: t, description: d, createdAt: new Date(), updatedAt: new Date(), lines: ls }
    setProjects((ps) => [p, ...ps])
    return p.id
  }
  const deleteProject = (id: string) => setProjects((ps) => ps.filter((p) => p.id !== id))
  const duplicateProject = (id: string) => {
    const src = projects.find((p) => p.id === id)
    if (!src) return
    const copy: Project = { ...src, id: uid('p'), title: `${src.title} (copy)`, createdAt: new Date(), updatedAt: new Date(), lines: src.lines.map((l) => ({ ...l, id: uid('line') })) }
    setProjects((ps) => [copy, ...ps])
  }
  const [toasts, setToasts] = useState<Toast[]>([])
  const [play, setPlay] = useState<PlayState>(null)
  const [sequential, setSequential] = useState(true)
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['chingchang', 'female-1']))
  const toggleFav = (id: string) =>
    setFavorites((f) => {
      const n = new Set(f)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const bigLibrary = voices.some((v) => v.id.startsWith('lib-'))
  const setBigLibrary = (on: boolean) =>
    setVoices((vs) => (on ? [...vs.filter((v) => !v.id.startsWith('lib-')), ...EXTRA_VOICES] : vs.filter((v) => !v.id.startsWith('lib-'))))
  const design: 'classic' | 'new' = page.endsWith('-new') ? 'new' : 'classic'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const setPage = (p: Page) => {
    // stay in the same design when navigating
    if (page.endsWith('-new') && !p.endsWith('-new')) p = `${p}-new` as Page
    location.hash = p
    setPageState(p)
  }
  const setPageExact = (p: Page) => {
    location.hash = p
    setPageState(p)
  }
  useEffect(() => {
    const h = () => setPageState((location.hash.slice(1) as Page) || 'projects')
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  const setDesign = (d: 'classic' | 'new') => {
    const base = page.replace('-new', '') as BasePage
    setPageExact(d === 'new' ? `${base}-new` : base)
  }

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = uid('t')
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  const spend = (amount: number, label: string) => {
    setTokens((t) => t - amount)
    setHistory((h) => [{ id: uid('h'), type: 'Usage', date: new Date(), label, delta: -amount }, ...h])
  }
  const addTokens = (amount: number, label: string, type: HistoryItem['type'] = 'Purchase') => {
    setTokens((t) => t + amount)
    setHistory((h) => [{ id: uid('h'), type, date: new Date(), label, delta: amount }, ...h])
  }

  // ---------- backend: health, load + autosave ----------
  const [backend, setBackend] = useState<Health | null>(null)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    let alive = true
    const check = () => api.health().then((h) => alive && setBackend(h)).catch(() => alive && setBackend(null))
    api.loadState()
      .then((s) => {
        if (!s) return
        if (typeof s.tokens === 'number') setTokens(s.tokens)
        if (s.plan) setPlan(s.plan as PlanId)
        const h = revive(s.history as HistoryItem[], ['date']); if (h) setHistory(h)
        const f = revive(s.files as TFile[], ['date']); if (f) setFiles(f)
        const p = revive(s.projects as Project[], ['createdAt', 'updatedAt']); if (p?.length) setProjects(p)
        if (Array.isArray(s.voices)) setVoices(s.voices as Voice[])
        if (Array.isArray(s.favorites)) setFavorites(new Set(s.favorites as string[]))
        if (typeof s.currentId === 'string') setCurrentId(s.currentId)
      })
      .catch(() => {}) // no backend -> mock data
      .finally(() => alive && setHydrated(true))
    check()
    const t = setInterval(check, 15000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  useEffect(() => {
    if (!hydrated) return
    const t = setTimeout(() => {
      api.saveState({ tokens, plan, history, files, projects, voices, favorites: [...favorites], currentId }).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [hydrated, tokens, plan, history, files, projects, voices, favorites, currentId])
  const resetData = async () => {
    await api.resetState().catch(() => {})
    location.reload()
  }

  // ---------- audio player (real audio when a clip has a url, else a fake timer) ----------
  const linesRef = useRef(lines)
  linesRef.current = lines
  const seqRef = useRef(sequential)
  seqRef.current = sequential
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const lineVersion = (key: string) => {
    const l = linesRef.current.find((x) => `line:${x.id}` === key)
    return l && l.activeVersion >= 0 ? l.versions[l.activeVersion] : undefined
  }
  const nextAfter = (key: string): PlayState => {
    if (seqRef.current && key.startsWith('line:')) {
      const ls = linesRef.current.filter((l) => l.activeVersion >= 0)
      const next = ls[ls.findIndex((l) => `line:${l.id}` === key) + 1]
      if (next) return { key: `line:${next.id}`, duration: next.versions[next.activeVersion].duration, progress: 0 }
    }
    return null
  }

  const startPlay = useCallback((key: string, duration: number) => {
    setPlay((p) => (p?.key === key ? null : { key, duration, progress: 0 }))
  }, [])
  const stopPlay = useCallback(() => setPlay(null), [])
  const seek = useCallback((progress: number) => {
    const a = audioRef.current
    if (a && isFinite(a.duration)) a.currentTime = progress * a.duration
    setPlay((p) => (p ? { ...p, progress } : p))
  }, [])

  useEffect(() => {
    if (!play) return
    const url = lineVersion(play.key)?.url
    if (url) {
      const a = new Audio(url)
      audioRef.current = a
      const key = play.key
      a.ontimeupdate = () => setPlay((p) => (p?.key === key && isFinite(a.duration) ? { ...p, progress: a.currentTime / a.duration } : p))
      a.onended = () => setPlay((p) => (p?.key === key ? nextAfter(key) : p))
      a.onerror = () => { toast('Could not play this clip', 'err'); setPlay(null) }
      a.play().catch(() => {})
      return () => { a.pause(); a.src = ''; audioRef.current = null }
    }
    const tick = 100
    const t = setInterval(() => {
      setPlay((p) => {
        if (!p) return p
        const progress = p.progress + tick / 1000 / p.duration
        return progress < 1 ? { ...p, progress } : nextAfter(p.key)
      })
    }, tick)
    return () => clearInterval(t)
  }, [play?.key])

  // ---------- script actions ----------
  const updateLine = (id: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))

  const addLine = (afterId?: string, base?: Partial<Line>) => {
    const lastVoice = lines[lines.length - 1]?.voiceId ?? 'chingchang'
    const line: Line = { id: uid('line'), voiceId: lastVoice, styleHint: '', text: '', versions: [], activeVersion: -1, dirty: true, ...base }
    setLines((ls) => {
      if (!afterId) return [...ls, line]
      const i = ls.findIndex((l) => l.id === afterId)
      return [...ls.slice(0, i + 1), line, ...ls.slice(i + 1)]
    })
    return line.id
  }

  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id))

  const generate = (ids: string[]) => {
    const targets = lines.filter((l) => ids.includes(l.id) && l.text.trim())
    const cost = targets.reduce((s, l) => s + costOf(l.text), 0)
    if (!targets.length) return toast('Nothing to generate — add some text first', 'err')
    if (cost > tokens) return toast('Not enough tokens', 'err')
    setGenerating((g) => new Set([...g, ...targets.map((t) => t.id)]))
    const pid = currentRef.current
    const done = (id: string) => setGenerating((g) => { const n = new Set(g); n.delete(id); return n })
    const addVersion = (id: string, extra: { duration: number; url?: string; how?: string; speed?: number }) =>
      setLinesFor(pid, (ls) => ls.map((x) => {
        if (x.id !== id) return x
        const v = { id: uid('v'), n: (x.versions.at(-1)?.n ?? 0) + 1, ...extra }
        return { ...x, versions: [...x.versions, v], activeVersion: x.versions.length, dirty: false }
      }))

    if (backend?.tts) {
      // real speech, one line at a time (one GPU); only pay for lines that worked
      toast(`Generating ${targets.length} line(s) with ${backend.model ?? 'VoxPocket'}…`)
      ;(async () => {
        let ok = 0
        for (const l of targets) {
          try {
            const r = await api.tts(l.text, voices.find((v) => v.id === l.voiceId), l.styleHint)
            addVersion(l.id, { duration: r.duration, url: r.url, how: r.how, speed: r.speed })
            spend(costOf(l.text), `TTS generation · ${r.how} · ${r.duration.toFixed(1)}s`)
            ok++
          } catch (e) {
            toast(`Line failed: ${(e as Error).message}`, 'err')
          }
          done(l.id)
        }
        if (ok) toast(`${ok}/${targets.length} line(s) ready — real audio`)
      })()
      return
    }

    spend(cost, `Studio · ${targets.length} line(s) generated`)
    targets.forEach((l, i) => {
      setTimeout(() => {
        setLinesFor(pid, (ls) =>
          ls.map((x) => {
            if (x.id !== l.id) return x
            const v = { id: uid('v'), n: (x.versions.at(-1)?.n ?? 0) + 1, duration: Math.max(2, x.text.length / 14) }
            return { ...x, versions: [...x.versions, v], activeVersion: x.versions.length, dirty: false }
          }),
        )
        setGenerating((g) => {
          const n = new Set(g)
          n.delete(l.id)
          return n
        })
      }, 900 + i * 600)
    })
    toast(`Generating ${targets.length} line(s) · ${cost} tokens`)
  }

  return {
    page, setPage, dark, setDark, khmer, setKhmer, sidebarOpen, setSidebarOpen,
    tokens, addTokens, spend, history,
    voices, setVoices, lines, setLines, updateLine, addLine, removeLine, generate, generating,
    title, setTitle, description, setDescription,
    toasts, toast,
    play, startPlay, stopPlay, seek, sequential, setSequential,
    plan, setPlan, files, setFiles, dailyUsed, KM_TRANSCRIPT,
    projects, currentId, setCurrentId, createProject, deleteProject, duplicateProject, patchProject,
    favorites, toggleFav, bigLibrary, setBigLibrary, design, setDesign,
    backend, resetData,
  }
}

type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)
export function StoreProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useStoreValue()}>{children}</Ctx.Provider>
}
export const useStore = () => useContext(Ctx)!
