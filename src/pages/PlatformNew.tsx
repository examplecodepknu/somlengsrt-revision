import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight, AudioLines, Bot, Check, ChevronDown, CloudUpload, Copy, Crown, Download, FileAudio, Gift, KeyRound, Loader2, Mic, Pencil,
  Plus, Search, ShieldCheck, Sparkles, Terminal, Trash2, TrendingDown, TrendingUp, Wallet, Zap,
} from 'lucide-react'
import { PLAN_LIMIT, PLAN_NAME, useStore, type TFile } from '../store'
import { Coin, Modal, NativePlayer, cx } from '../ui'
import { uid } from '../data'
import { download } from './Studio'
import { CaptionModal, EditTranscript, PACKS, PLANS, TOOLS, ago, fmtDur, useCopy } from './Platform'

// ---------- new-design primitives ----------
const btn = 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const primary = `${btn} bg-emerald-600 text-white hover:bg-emerald-500`
const soft = `${btn} border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800`
const Card = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx('rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900', className)}>{children}</div>
const Page = ({ children }: { children: ReactNode }) => <div className="min-h-full bg-neutral-50/60 p-6 dark:bg-neutral-950"><div className="mx-auto max-w-7xl">{children}</div></div>
const Head = ({ icon, title, sub, right }: { icon: ReactNode; title: string; sub?: string; right?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight"><span className="text-emerald-600">{icon}</span>{title}</h1>
      {sub && <p className="mt-1 text-neutral-500">{sub}</p>}
    </div>
    {right && <div className="flex items-center gap-2">{right}</div>}
  </div>
)
const Ring = ({ value, size = 64, label }: { value: number; size?: number; label: ReactNode }) => {
  const r = size / 2 - 5, c = 2 * Math.PI * r
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} strokeWidth="6" className="fill-none stroke-neutral-100 dark:stroke-neutral-800" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} className="fill-none stroke-emerald-500 transition-all" /></svg>
      <span className="absolute text-sm font-semibold">{label}</span>
    </div>
  )
}
const Pill = ({ tone, children }: { tone: 'ok' | 'warn' | 'err' | 'mute'; children: ReactNode }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', {
    ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    warn: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    err: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    mute: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  }[tone])}>{children}</span>
)
const fileTone = (s: TFile['status']) => (s === 'Completed' ? 'ok' : s === 'Failed' ? 'err' : 'warn')

// ---------- Dashboard ----------
export function DashboardNew() {
  const { files, dailyUsed, plan, tokens, setPage, projects, voices, history, setCurrentId } = useStore()
  const limit = PLAN_LIMIT[plan]
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  // last 7 days token usage
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const used = history.filter((h) => h.delta < 0 && h.date.toDateString() === d.toDateString()).reduce((s, h) => s - h.delta, 0)
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), used: used || [120, 340, 80, 260, 410, 190, 0][i] }
  }), [history])
  const max = Math.max(...days.map((d) => d.used), 1)
  const actions = [
    { icon: <CloudUpload className="size-5" />, t: 'Transcribe audio', d: 'Audio → Khmer text & SRT', go: 'transcribe' as const },
    { icon: <AudioLines className="size-5" />, t: 'Open Studio', d: 'Text → speech with many voices', go: 'projects' as const },
    { icon: <Mic className="size-5" />, t: 'Clone a voice', d: '15s sample, free', go: 'voices' as const },
    { icon: <Bot className="size-5" />, t: 'Connect AI assistant', d: 'MCP for Claude, Cursor…', go: 'mcp' as const },
  ]
  return (
    <Page>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{greet}, muyleang 👋</h1>
        <p className="mt-1 text-neutral-500">Here's what's happening with your account today.</p>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4"><Ring value={dailyUsed / limit} label={`${dailyUsed}/${limit}`} /><div><div className="text-sm text-neutral-500">Files today</div><div className="text-lg font-semibold">{limit - dailyUsed} left</div></div></Card>
        <Card><div className="flex items-center gap-2 text-sm text-neutral-500"><Coin className="size-4" /> Token wallet</div><div className="mt-2 text-2xl font-semibold tabular-nums">{tokens.toLocaleString()}</div><button onClick={() => setPage('buy')} className="mt-1 text-sm text-emerald-600 hover:underline">Top up →</button></Card>
        <Card><div className="text-sm text-neutral-500">Projects · Voices</div><div className="mt-2 text-2xl font-semibold">{projects.length} · {voices.length}</div><div className="mt-1 text-sm text-neutral-400">{files.length} transcribed file(s)</div></Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white dark:border-emerald-900">
          <div className="flex items-center gap-2 text-sm text-emerald-100"><Crown className="size-4" /> Plan</div><div className="mt-2 text-2xl font-semibold">{PLAN_NAME[plan]}</div>
          <button onClick={() => setPage('subscriptions')} className="mt-1 text-sm text-white/90 hover:underline">{plan === 'pro' ? 'Manage plan' : 'Upgrade for more files →'}</button>
        </Card>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a) => (
          <button key={a.t} onClick={() => setPage(a.go)} className="group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-emerald-500 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{a.icon}</span>
            <span className="min-w-0 flex-1"><span className="block font-semibold">{a.t}</span><span className="block truncate text-xs text-neutral-500">{a.d}</span></span>
            <ArrowRight className="size-4 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <div className="flex items-center justify-between"><div className="font-semibold">Token usage · last 7 days</div><span className="text-sm text-neutral-500">{days.reduce((s, d) => s + d.used, 0).toLocaleString()} tokens</span></div>
          <div className="mt-6 flex h-40 items-end gap-3">
            {days.map((d, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] text-neutral-400 opacity-0 group-hover:opacity-100">{d.used}</span>
                <div className={cx('w-full rounded-t-lg transition-all', i === 6 ? 'bg-emerald-500' : 'bg-emerald-200 group-hover:bg-emerald-400 dark:bg-emerald-900')} style={{ height: `${(d.used / max) * 100}%`, minHeight: 4 }} />
                <span className="text-xs text-neutral-500">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><div className="font-semibold">Recent activity</div><button onClick={() => setPage('projects')} className="text-sm text-emerald-600 hover:underline">All projects</button></div>
          {projects.slice(0, 3).map((p) => (
            <button key={p.id} onClick={() => { setCurrentId(p.id); setPage('studio') }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <span className="grid size-9 place-items-center rounded-lg bg-neutral-100 dark:bg-neutral-800"><AudioLines className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="khmer block truncate text-sm font-medium">{p.title}</span><span className="text-xs text-neutral-500">{p.lines.length} lines · Studio</span></span>
            </button>
          ))}
          {files.slice(0, 2).map((f) => (
            <button key={f.id} onClick={() => setPage('transcribe')} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <span className="grid size-9 place-items-center rounded-lg bg-neutral-100 dark:bg-neutral-800"><FileAudio className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{f.name}</span><span className="text-xs text-neutral-500">{fmtDur(f.duration)} · Transcribe · {ago(f.date)}</span></span>
              <Pill tone={fileTone(f.status)}>{f.status}</Pill>
            </button>
          ))}
        </Card>
      </div>
    </Page>
  )
}

// ---------- Transcribe ----------
export function TranscribeNew() {
  const { files, setFiles, dailyUsed, plan, toast, KM_TRANSCRIPT, setPage } = useStore()
  const copy = useCopy()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'All' | TFile['status']>('All')
  const [open, setOpen] = useState<string | null>(files[0]?.id ?? null)
  const [edit, setEdit] = useState<TFile | null>(null)
  const [caption, setCaption] = useState<TFile | null>(null)
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const limit = PLAN_LIMIT[plan]
  const shown = files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()) && (status === 'All' || f.status === status))

  const add = (list: FileList | null) => {
    if (!list?.length) return
    const room = limit - dailyUsed
    if (room <= 0) { toast(`Daily limit reached — upgrade for more`, 'err'); return }
    const picked = [...list].slice(0, room).map((f) => ({ id: uid('f'), name: f.name, duration: 30 + Math.round(Math.random() * 90), size: f.size, status: 'Processing' as const, date: new Date(), transcript: '' }))
    setFiles((fs) => [...picked, ...fs])
    setOpen(picked[0].id)
    picked.forEach((p, i) => setTimeout(() => setFiles((fs) => fs.map((f) => (f.id === p.id ? { ...f, status: 'Completed', transcript: KM_TRANSCRIPT } : f))), 2500 + i * 1200))
  }
  const srt = (f: TFile) => {
    const parts = f.transcript.split(/(?<=[។!?])\s*/).filter(Boolean)
    const step = f.duration / Math.max(1, parts.length)
    const ts = (s: number) => new Date(s * 1000).toISOString().slice(11, 23).replace('.', ',')
    download(f.name.replace(/\.[^.]+$/, '.srt'), parts.map((p, i) => `${i + 1}\n${ts(i * step)} --> ${ts((i + 1) * step)}\n${p}\n`).join('\n'))
    toast('SRT downloaded')
  }

  return (
    <Page>
      <Head icon={<CloudUpload className="size-7" />} title="Transcribe" sub="Turn Khmer audio or video into text, subtitles and captions." />
      <div
        onClick={() => ref.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
        className={cx('mb-6 flex cursor-pointer flex-wrap items-center gap-6 rounded-2xl border-2 border-dashed p-6 transition-colors', drag ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-neutral-300 bg-white hover:border-emerald-400 dark:border-neutral-700 dark:bg-neutral-900')}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><CloudUpload className="size-7" /></span>
        <div className="flex-1">
          <div className="text-lg font-semibold">Drop audio or video here</div>
          <div className="text-sm text-neutral-500">or click to browse · up to {plan === 'free' ? '2 min / 10 MB' : plan === 'basic' ? '5 min / 20 MB' : plan === 'api' ? '10 min / 50 MB' : '20 min / 200 MB'} per file</div>
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <Ring value={dailyUsed / limit} size={56} label={`${dailyUsed}/${limit}`} />
          <div className="text-sm"><div className="font-medium">files today</div><button onClick={() => setPage('subscriptions')} className="text-emerald-600 hover:underline">Need more?</button></div>
        </div>
      </div>
      <input ref={ref} type="file" accept="audio/*,video/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…" className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 text-sm outline-none focus:border-emerald-500 dark:border-neutral-800 dark:bg-neutral-900" /></div>
        <div className="flex rounded-xl border border-neutral-200 bg-white p-0.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          {(['All', 'Completed', 'Processing', 'Failed'] as const).map((s) => <button key={s} onClick={() => setStatus(s)} className={cx('rounded-lg px-3 py-1.5', status === s ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500')}>{s}</button>)}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {shown.map((f) => {
          const isOpen = open === f.id
          const done = f.status === 'Completed'
          return (
            <div key={f.id} className={cx('overflow-hidden rounded-2xl border bg-white transition dark:bg-neutral-900', isOpen ? 'border-emerald-300 shadow-sm dark:border-emerald-900' : 'border-neutral-200 dark:border-neutral-800')}>
              <button onClick={() => setOpen(isOpen ? null : f.id)} className="flex w-full items-center gap-4 p-4 text-left">
                <span className={cx('grid size-10 place-items-center rounded-xl', done ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40')}>
                  {done ? <FileAudio className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
                </span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{f.name}</span><span className="text-xs text-neutral-500">{fmtDur(f.duration)} · {(f.size / 1e6).toFixed(1)} MB · {ago(f.date)}</span></span>
                <Pill tone={fileTone(f.status)}>{f.status === 'Processing' && <Loader2 className="size-3 animate-spin" />}{f.status}</Pill>
                <ChevronDown className={cx('size-4 text-neutral-400 transition', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="border-t border-neutral-100 p-4 dark:border-neutral-800">
                  {done ? <>
                    <NativePlayer playKey={`file:${f.id}`} duration={f.duration} />
                    <div className="mt-4 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Transcript</span>
                      <button onClick={() => copy(f.transcript, 'Transcript copied')} className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Copy className="size-3.5" /> Copy</button></div>
                    <p className="khmer mt-2 rounded-xl bg-neutral-50 p-4 leading-relaxed dark:bg-neutral-800/50">{f.transcript}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className={soft} onClick={() => setEdit(f)}><Pencil className="size-4" /> Edit transcript</button>
                      <button className={soft} onClick={() => setCaption(f)}><Sparkles className="size-4" /> Social caption</button>
                      <button className={primary} onClick={() => srt(f)}><Download className="size-4" /> Download SRT</button>
                      <button className={cx(btn, 'ml-auto text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40')} onClick={() => { setFiles((fs) => fs.filter((x) => x.id !== f.id)); toast('File removed') }}><Trash2 className="size-4" /></button>
                    </div>
                  </> : (
                    <div className="space-y-2 py-2">
                      <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="size-4 animate-spin" /> Transcribing… usually under a minute</div>
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" /></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {!shown.length && <p className="py-16 text-center text-neutral-400">No files yet — drop one above.</p>}
      </div>
      <EditTranscript file={edit} onClose={() => setEdit(null)} onSave={(t) => { setFiles((fs) => fs.map((x) => (x.id === edit!.id ? { ...x, transcript: t } : x))); toast('Transcript saved'); setEdit(null) }} />
      <CaptionModal file={caption} onClose={() => setCaption(null)} />
    </Page>
  )
}

// ---------- shared checkout ----------
function Checkout({ open, title, price, note, onClose, onPaid }: { open: boolean; title: string; price: string; note: string; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState('KHQR')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><button className={soft} onClick={onClose}>Cancel</button><button className={primary} disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); onPaid() }, 900) }}>{busy && <Loader2 className="size-4 animate-spin" />} Pay {price} USD</button></>}>
      <p className="text-sm text-neutral-500">{note} <span className="text-neutral-400">(Demo — no real payment.)</span></p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {['KHQR', 'ABA Pay', 'Card'].map((m) => (
          <button key={m} onClick={() => setMethod(m)} className={cx('rounded-xl border p-3 text-sm font-medium', method === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-neutral-200 dark:border-neutral-800')}>{m}</button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500"><ShieldCheck className="size-4 text-emerald-600" /> Secure checkout · cancel anytime</div>
    </Modal>
  )
}

// ---------- Subscriptions ----------
export function SubscriptionsNew() {
  const { plan, setPlan, dailyUsed, toast } = useStore()
  const [pick, setPick] = useState<(typeof PLANS)[number] | null>(null)
  const limit = PLAN_LIMIT[plan]
  const all = [...new Set(PLANS.flatMap((p) => p.features.filter((f) => !/per (day|file)/.test(f))))]
  return (
    <Page>
      <Head icon={<Crown className="size-7" />} title="Plans" sub="Pick how many files you transcribe each day. Upgrade or downgrade anytime." />
      <Card className="mb-6 flex flex-wrap items-center gap-6">
        <Ring value={dailyUsed / limit} label={`${dailyUsed}/${limit}`} />
        <div className="flex-1"><div className="text-sm text-neutral-500">You're on</div><div className="text-xl font-semibold">{PLAN_NAME[plan]}</div><div className="text-sm text-neutral-500">{limit - dailyUsed} file(s) left today · resets at midnight</div></div>
        {plan !== 'pro' && <button className={primary} onClick={() => setPick(PLANS[PLANS.findIndex((p) => p.id === plan) + 1])}>Upgrade to {PLANS[PLANS.findIndex((p) => p.id === plan) + 1].name} <ArrowRight className="size-4" /></button>}
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const active = p.id === plan
          return (
            <div key={p.id} className={cx('relative flex flex-col rounded-2xl border bg-white p-6 dark:bg-neutral-900', p.rec ? 'border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'border-neutral-200 dark:border-neutral-800')}>
              {p.rec && <span className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white"><Sparkles className="size-3" /> Most popular</span>}
              <div className="flex items-center justify-between"><span className="text-lg font-semibold">{p.name}</span>{active && <Pill tone="ok"><Check className="size-3" /> Current</Pill>}</div>
              <div className="mt-4">{p.price === 'Free' ? <span className="text-4xl font-semibold">Free</span> : <><span className="text-4xl font-semibold">${p.price}</span><span className="text-neutral-500"> /month</span></>}</div>
              <div className="mt-1 text-sm text-neutral-500">{p.features[0]} · {p.features[1].replace('Up to ', '')}</div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">{p.features.slice(2).map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />{f}</li>)}</ul>
              <button disabled={active} onClick={() => (p.id === 'free' ? (setPlan('free'), toast('Switched to Free')) : setPick(p))}
                className={cx('mt-6 w-full', active ? `${soft} opacity-60` : p.rec ? primary : soft)}>{active ? 'Current plan' : `Choose ${p.name}`}</button>
            </div>
          )
        })}
      </div>
      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-200 dark:border-neutral-800"><th className="p-4 text-left font-semibold">Compare features</th>{PLANS.map((p) => <th key={p.id} className={cx('p-4 font-semibold', p.id === plan && 'text-emerald-600')}>{p.name}</th>)}</tr></thead>
          <tbody>{all.map((f) => <tr key={f} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"><td className="p-4 text-neutral-600 dark:text-neutral-300">{f}</td>{PLANS.map((p) => <td key={p.id} className="p-4 text-center">{p.features.includes(f) ? <Check className="mx-auto size-4 text-emerald-600" /> : <span className="text-neutral-300">—</span>}</td>)}</tr>)}</tbody>
        </table>
      </Card>
      <Checkout open={!!pick} title={`Upgrade to ${pick?.name}`} price={pick?.price ?? ''} note={`${pick?.per} for 1 month.`} onClose={() => setPick(null)}
        onPaid={() => { setPlan(pick!.id); toast(`🎉 You're on ${pick!.name}`); setPick(null) }} />
    </Page>
  )
}

// ---------- Redeem ----------
export function RedeemNew() {
  const { addTokens, tokens, plan } = useStore()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [won, setWon] = useState<number | null>(null)
  const [rows, setRows] = useState([{ date: new Date('2026-10-30'), code: 'GIFT-NNKB9-R54JT', reward: 30000 }])
  const raw = code.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^GIFT/, '').slice(0, 10)
  const pretty = `GIFT-${raw.slice(0, 5)}${raw.length > 5 ? '-' + raw.slice(5) : ''}`
  const redeem = () => {
    setErr(''); setWon(null)
    if (raw.length !== 10) return setErr('Codes have 10 characters after GIFT-.')
    if (rows.some((r) => r.code === pretty)) return setErr('This code has already been redeemed.')
    setBusy(true)
    setTimeout(() => {
      const reward = [5000, 10000, 30000][raw.charCodeAt(9) % 3]
      addTokens(reward, `Gift code ${pretty}`, 'Gift')
      setRows((r) => [{ date: new Date(), code: pretty, reward }, ...r])
      setWon(reward); setCode(''); setBusy(false)
    }, 900)
  }
  return (
    <Page>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg"><Gift className="size-8" /></span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Redeem a gift code</h1>
          <p className="mt-1 text-neutral-500">Add tokens or subscription time to your account.</p>
        </div>
        <Card className="p-6">
          {won ? (
            <div className="py-6 text-center">
              <div className="text-5xl">🎉</div>
              <div className="mt-3 text-2xl font-semibold text-emerald-600">+{won.toLocaleString()} tokens</div>
              <div className="mt-1 text-neutral-500">New balance: {tokens.toLocaleString()}</div>
              <button className={cx(soft, 'mt-5')} onClick={() => setWon(null)}>Redeem another</button>
            </div>
          ) : <>
            <input value={code ? pretty : ''} onChange={(e) => { setCode(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && redeem()} placeholder="GIFT-XXXXX-XXXXX"
              className={cx('h-16 w-full rounded-xl border-2 bg-transparent text-center font-mono text-2xl tracking-[0.2em] outline-none', err ? 'border-red-400' : 'border-neutral-200 focus:border-emerald-500 dark:border-neutral-700')} />
            <div className="mt-2 flex justify-between text-xs text-neutral-400"><span>Dashes and spaces are added for you</span><span>{raw.length}/10</span></div>
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <button className={cx(primary, 'mt-4 h-12 w-full text-base')} disabled={busy || !raw} onClick={redeem}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />} Redeem</button>
            <p className="mt-3 text-center text-xs text-neutral-400">Demo: try <button className="font-mono text-emerald-600" onClick={() => setCode('DEMO123456')}>GIFT-DEMO1-23456</button></p>
          </>}
        </Card>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Card><div className="text-sm text-neutral-500">Plan</div><div className="mt-1 text-lg font-semibold">{PLAN_NAME[plan]}</div></Card>
          <Card><div className="text-sm text-neutral-500">Tokens</div><div className="mt-1 flex items-center gap-2 text-lg font-semibold"><Coin className="size-4" />{tokens.toLocaleString()}</div></Card>
        </div>
        <Card className="mt-4">
          <div className="mb-3 font-semibold">History</div>
          {rows.map((r) => (
            <div key={r.code} className="flex items-center gap-3 border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-800">
              <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><Gift className="size-4" /></span>
              <span className="flex-1"><span className="block font-mono text-sm">{r.code}</span><span className="text-xs text-neutral-500">{r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>
              <span className="font-semibold text-emerald-600">+{r.reward.toLocaleString()}</span>
            </div>
          ))}
        </Card>
      </div>
    </Page>
  )
}

// ---------- API Tokens ----------
export function ApiTokensNew() {
  const { plan, setPage, toast } = useStore()
  const copy = useCopy()
  const [list, setList] = useState([{ id: 't1', name: 'a', last: '11/5/2026', created: '11/2/2026', scope: 'Full access' }])
  const [create, setCreate] = useState(false)
  const [name, setName] = useState('')
  const [scope, setScope] = useState('Full access')
  const [secret, setSecret] = useState('')
  const [lang, setLang] = useState<'curl' | 'js' | 'python'>('curl')
  const hasApi = plan === 'api' || plan === 'pro'
  const base = 'https://somlengsrt.com/api/v1'
  const snippets = {
    curl: `curl -X POST ${base}/transcribe \\\n  -H "Authorization: Bearer $SOMLENG_TOKEN" \\\n  -F "file=@audio.mp3"`,
    js: `const form = new FormData()\nform.append('file', file)\n\nconst res = await fetch('${base}/transcribe', {\n  method: 'POST',\n  headers: { Authorization: \`Bearer \${process.env.SOMLENG_TOKEN}\` },\n  body: form,\n})\nconsole.log(await res.json())`,
    python: `import os, requests\n\nres = requests.post(\n    "${base}/transcribe",\n    headers={"Authorization": f"Bearer {os.environ['SOMLENG_TOKEN']}"},\n    files={"file": open("audio.mp3", "rb")},\n)\nprint(res.json())`,
  }
  return (
    <Page>
      <Head icon={<KeyRound className="size-7" />} title="API" sub="Build SomlengSrt into your own apps." right={<button className={primary} onClick={() => { setCreate(true); setSecret(''); setName('') }}><Plus className="size-4" /> New token</button>} />
      {!hasApi && (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <Zap className="size-5 text-amber-600" /><div className="flex-1"><div className="font-semibold text-amber-900 dark:text-amber-200">API access needs API Starter or Pro</div><div className="text-sm text-amber-800/80 dark:text-amber-300/80">You can create tokens now — calls start working once you upgrade.</div></div>
          <button className={primary} onClick={() => setPage('subscriptions')}>See plans</button>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Base URL</div>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 font-mono text-sm dark:bg-neutral-800/50"><Terminal className="size-4 text-neutral-400" />{base}<button onClick={() => copy(base)} className="ml-auto text-neutral-500"><Copy className="size-4" /></button></div>
            <div className="mt-3 flex items-center gap-2 text-sm">{hasApi ? <Pill tone="ok"><Check className="size-3" /> Active</Pill> : <Pill tone="warn">Inactive</Pill>}<span className="text-neutral-500">Rate limit: {hasApi ? (plan === 'pro' ? '100' : '20') : '0'} files/day</span></div>
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between"><span className="font-semibold">Your tokens</span><span className="text-sm text-neutral-500">{list.length}</span></div>
            {list.map((t) => (
              <div key={t.id} className="group flex items-center gap-3 rounded-xl p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <span className="grid size-9 place-items-center rounded-lg bg-neutral-100 dark:bg-neutral-800"><KeyRound className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block font-medium">{t.name}</span><span className="text-xs text-neutral-500">{t.scope} · last used {t.last} · created {t.created}</span></span>
                <button onClick={() => { setList((l) => l.filter((x) => x.id !== t.id)); toast('Token revoked') }} className="rounded-lg p-2 text-neutral-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"><Trash2 className="size-4" /></button>
              </div>
            ))}
            {!list.length && <p className="py-6 text-center text-sm text-neutral-400">No tokens yet.</p>}
          </Card>
        </div>
        <Card className="p-0">
          <div className="flex items-center gap-1 border-b border-neutral-200 p-2 dark:border-neutral-800">
            <span className="px-2 text-sm font-semibold">Quick start</span>
            <div className="ml-auto flex rounded-lg bg-neutral-100 p-0.5 text-xs dark:bg-neutral-800">{(['curl', 'js', 'python'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={cx('rounded-md px-2.5 py-1', lang === l && 'bg-white font-semibold shadow-sm dark:bg-neutral-950')}>{l === 'js' ? 'JavaScript' : l === 'python' ? 'Python' : 'cURL'}</button>)}</div>
            <button onClick={() => copy(snippets[lang])} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"><Copy className="size-4" /></button>
          </div>
          <pre className="overflow-x-auto rounded-b-2xl bg-slate-950 p-5 text-[13px] leading-relaxed text-slate-200">{snippets[lang]}</pre>
        </Card>
      </div>
      <Modal open={create} onClose={() => setCreate(false)} title={secret ? 'Save your token' : 'New API token'}
        footer={secret ? <button className={primary} onClick={() => setCreate(false)}>I've saved it</button> : <><button className={soft} onClick={() => setCreate(false)}>Cancel</button><button className={primary} disabled={!name.trim()} onClick={() => {
          const s = `sk_live_${Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`
          setSecret(s); setList((l) => [...l, { id: uid('t'), name: name.trim(), last: 'never', created: new Date().toLocaleDateString('en-US'), scope }])
        }}>Create token</button></>}>
        {secret ? <>
          <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">You won't be able to see this again. (Mock token — not real.)</div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm dark:border-neutral-800 dark:bg-neutral-800"><span className="flex-1 break-all">{secret}</span><button onClick={() => copy(secret, 'Token copied')} className={soft + ' h-8 px-2'}><Copy className="size-4" /></button></div>
        </> : <div className="space-y-3">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. my-server" className="h-11 w-full rounded-xl border border-neutral-200 bg-transparent px-3 outline-none focus:border-emerald-500 dark:border-neutral-700" />
          <div className="grid grid-cols-2 gap-2">{['Full access', 'Transcribe only'].map((s) => <button key={s} onClick={() => setScope(s)} className={cx('rounded-xl border p-3 text-left text-sm', scope === s ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-neutral-200 dark:border-neutral-800')}><b className="block">{s}</b><span className="text-xs text-neutral-500">{s === 'Full access' ? 'Transcribe, TTS, captions' : 'Upload & read transcripts'}</span></button>)}</div>
        </div>}
      </Modal>
    </Page>
  )
}

// ---------- MCP ----------
const CLIENTS = {
  'Claude Desktop': { file: 'claude_desktop_config.json', json: true },
  'Claude Code': { file: 'terminal', json: false },
  Cursor: { file: '~/.cursor/mcp.json', json: true },
  'VS Code': { file: '.vscode/mcp.json', json: true },
} as const
export function McpNew() {
  const { tokens, setPage } = useStore()
  const copy = useCopy()
  const [client, setClient] = useState<keyof typeof CLIENTS>('Claude Desktop')
  const [done, setDone] = useState<number[]>([])
  const endpoint = 'https://somlengsrt.com/mcp/somlengpit'
  const cfg = CLIENTS[client].json
    ? JSON.stringify(client === 'VS Code' ? { servers: { somlengpit: { type: 'http', url: endpoint } } } : { mcpServers: { somlengpit: { type: 'http', url: endpoint } } }, null, 2)
    : `claude mcp add --transport http somlengpit ${endpoint}`
  const steps = ['Pick your AI client', 'Add the SomlengPit server', 'Sign in & approve (OAuth)', 'Ask: "make Khmer audio for this text"']
  return (
    <Page>
      <Head icon={<Bot className="size-7" />} title="Connect your AI assistant" sub="Let Claude, Cursor or VS Code make Khmer speech, subtitles and captions — billed from your token wallet."
        right={<><button className={soft} onClick={() => setPage('api')}><KeyRound className="size-4" /> API tokens</button><button className={primary} onClick={() => setPage('projects')}>Open Studio <ArrowRight className="size-4" /></button></>} />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <ol className="mb-6 grid gap-2 sm:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s}><button onClick={() => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))} className={cx('flex h-full w-full items-start gap-2 rounded-xl border p-3 text-left text-sm', done.includes(i) ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-neutral-200 dark:border-neutral-800')}>
                <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold', done.includes(i) ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800')}>{done.includes(i) ? <Check className="size-3.5" /> : i + 1}</span>{s}
              </button></li>
            ))}
          </ol>
          <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            {(Object.keys(CLIENTS) as (keyof typeof CLIENTS)[]).map((c) => <button key={c} onClick={() => setClient(c)} className={cx('flex-1 rounded-lg px-3 py-2 text-sm font-medium', client === c ? 'bg-white shadow-sm dark:bg-neutral-950' : 'text-neutral-500')}>{c}</button>)}
          </div>
          <div className="overflow-hidden rounded-xl">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-xs text-slate-400"><span className="font-mono">{CLIENTS[client].file}</span><button onClick={() => copy(cfg, 'Config copied')} className="flex items-center gap-1 text-slate-300 hover:text-white"><Copy className="size-3.5" /> Copy</button></div>
            <pre className="overflow-x-auto bg-slate-950 p-5 text-[14px] leading-relaxed text-emerald-200">{cfg}</pre>
          </div>
          <p className="mt-3 text-sm text-neutral-500">{CLIENTS[client].json ? 'Paste into the file above and restart the client.' : 'Run this in your terminal.'} A browser window opens to sign in — no token to copy. No OAuth? Add header <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">Authorization: Bearer YOUR_API_TOKEN</code>.</p>
          <div className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">Endpoint</div>
          <div className="mt-2 flex items-center rounded-xl bg-neutral-50 px-3 py-2.5 font-mono text-sm dark:bg-neutral-800/50">{endpoint}<button onClick={() => copy(endpoint)} className="ml-auto text-neutral-500"><Copy className="size-4" /></button></div>
        </Card>
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 font-semibold"><Wallet className="size-4" /> Billing</div>
            <div className="mt-3 flex items-baseline gap-2"><Coin className="size-5" /><span className="text-3xl font-semibold tabular-nums">{tokens.toLocaleString()}</span><span className="text-neutral-500">tokens</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {[['Speech', '1 token / char'], ['Minimum', '20 tokens'], ['Caption', '20 tokens'], ['Max line', '500 chars']].map(([k, v]) => <div key={k} className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50"><div className="text-xs text-neutral-500">{k}</div><div className="font-medium">{v}</div></div>)}
            </div>
            <p className="mt-3 text-xs text-neutral-500">Tokens are reserved up front; failed jobs refund automatically.</p>
            <button className={cx(soft, 'mt-3 w-full')} onClick={() => setPage('buy')}>Top up tokens</button>
          </Card>
          <Card>
            <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-emerald-600" /> Status</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span>Text-to-speech</span><Pill tone="ok">Online</Pill></div>
              <div className="flex items-center justify-between"><span>Subtitles (SRT)</span><Pill tone="ok">Online</Pill></div>
              <div className="flex items-center justify-between"><span>Captions</span><Pill tone="mute">~1 min, sync</Pill></div>
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-6 mb-3 font-semibold">Tools your assistant gets</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Card key={t.name}>
            <div className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t.name}</div>
            <p className="mt-1 text-sm text-neutral-500">{t.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{t.params.map((p) => <span key={p} className={cx('rounded-md px-2 py-0.5 font-mono text-[11px]', p.endsWith('?') ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300')}>{p}</span>)}</div>
          </Card>
        ))}
      </div>
    </Page>
  )
}

// ---------- Buy Tokens ----------
export function BuyTokensNew() {
  const { addTokens, toast, tokens } = useStore()
  const [pick, setPick] = useState<(typeof PACKS)[number] | null>(null)
  const [chars, setChars] = useState(20000)
  const best = PACKS.reduce((a, b) => (b.tokens / +b.price > a.tokens / +a.price ? b : a))
  const fit = PACKS.find((p) => p.tokens >= chars) ?? PACKS[PACKS.length - 1]
  const base = 10000 / 0.99
  return (
    <Page>
      <Head icon={<Coin className="size-7" />} title="Top up tokens" sub="Tokens pay for speech, captions and voice cloning ASR. Separate from your subscription." right={<span className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 font-semibold dark:border-neutral-800 dark:bg-neutral-900"><Coin className="size-4" />{tokens.toLocaleString()}</span>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PACKS.map((p) => {
          const save = Math.round((p.tokens / +p.price / base - 1) * 100)
          const isBest = p === best
          return (
            <button key={p.name} onClick={() => setPick(p)} className={cx('relative rounded-2xl border bg-white p-6 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:bg-neutral-900', isBest ? 'border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : p === fit ? 'border-emerald-300 dark:border-emerald-800' : 'border-neutral-200 dark:border-neutral-800')}>
              {isBest && <span className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">Best value</span>}
              <div className="flex items-center justify-between"><span className="text-sm font-medium text-neutral-500">{p.name}</span>{save > 0 && <Pill tone="ok">Save {save}%</Pill>}</div>
              <div className="mt-3 flex items-center gap-2 text-3xl font-semibold"><Coin className="size-6" />{(p.tokens / 1000).toLocaleString()}k</div>
              <div className="mt-1 text-sm text-neutral-500">≈ {Math.round(p.tokens / 70).toLocaleString()} Khmer lines</div>
              <div className="mt-5 flex items-baseline gap-1"><span className="text-2xl font-semibold">${p.price}</span><span className="text-xs text-neutral-400">· ${(+p.price / (p.tokens / 1000)).toFixed(3)}/1k</span></div>
              <div className="mt-1 text-xs text-neutral-400">Valid {p.days} days</div>
              <span className={cx('mt-5 w-full', isBest ? primary : soft)}>Buy</span>
            </button>
          )
        })}
      </div>
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">How many tokens do I need?</span><span className="text-sm text-neutral-500">1 character = 1 token</span></div>
        <input type="range" min={1000} max={150000} step={1000} value={chars} onChange={(e) => setChars(+e.target.value)} className="mt-4 w-full accent-emerald-600" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{chars.toLocaleString()} characters · ~{Math.round(chars / 70).toLocaleString()} lines · ~{Math.round(chars / 14 / 60)} min of audio</span>
          <button className={primary} onClick={() => setPick(fit)}>Get {fit.name} (${fit.price})</button>
        </div>
      </Card>
      <Checkout open={!!pick} title={`${pick?.tokens.toLocaleString()} tokens`} price={pick?.price ?? ''} note={`${pick?.name} pack · valid ${pick?.days} days.`} onClose={() => setPick(null)}
        onPaid={() => { addTokens(pick!.tokens, `Purchase · ${pick!.name} pack`); toast(`+${pick!.tokens.toLocaleString()} tokens`); setPick(null) }} />
    </Page>
  )
}

// ---------- Token History ----------
export function TokenHistoryNew() {
  const { history, tokens, setPage } = useStore()
  const [type, setType] = useState('All')
  const [q, setQ] = useState('')
  let bal = tokens
  const rows = history.map((h) => { const r = { ...h, after: bal }; bal -= h.delta; return r })
  const shown = rows.filter((r) => (type === 'All' || r.type === type) && r.label.toLowerCase().includes(q.toLowerCase()))
  const spent = rows.filter((r) => r.delta < 0).reduce((s, r) => s - r.delta, 0)
  const added = rows.filter((r) => r.delta > 0).reduce((s, r) => s + r.delta, 0)
  const groups = shown.reduce<Record<string, typeof shown>>((g, r) => { const k = r.date.toDateString(); (g[k] ??= []).push(r); return g }, {})
  const label = (k: string) => { const d = new Date(k); const t = new Date(); const y = new Date(); y.setDate(t.getDate() - 1); return k === t.toDateString() ? 'Today' : k === y.toDateString() ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) }
  const icon = (t?: string) => t === 'Gift' ? <Gift className="size-4" /> : t === 'Purchase' ? <Coin className="size-4" /> : <AudioLines className="size-4" />
  return (
    <Page>
      <Head icon={<Wallet className="size-7" />} title="Wallet" sub="Every purchase, usage, refund and expiration." right={<button className={primary} onClick={() => setPage('buy')}><Plus className="size-4" /> Top up</button>} />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card><div className="text-sm text-neutral-500">Balance</div><div className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Coin className="size-5" />{tokens.toLocaleString()}</div></Card>
        <Card><div className="flex items-center gap-1 text-sm text-neutral-500"><TrendingDown className="size-4 text-red-500" /> Spent</div><div className="mt-1 text-2xl font-semibold">{spent.toLocaleString()}</div></Card>
        <Card><div className="flex items-center gap-1 text-sm text-neutral-500"><TrendingUp className="size-4 text-emerald-500" /> Added</div><div className="mt-1 text-2xl font-semibold">{added.toLocaleString()}</div></Card>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions…" className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 text-sm outline-none focus:border-emerald-500 dark:border-neutral-800 dark:bg-neutral-900" /></div>
        <div className="flex rounded-xl border border-neutral-200 bg-white p-0.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          {['All', 'Usage', 'Purchase', 'Gift'].map((t) => <button key={t} onClick={() => setType(t)} className={cx('rounded-lg px-3 py-1.5', type === t ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500')}>{t}</button>)}
        </div>
      </div>
      <div className="space-y-4">
        {Object.entries(groups).map(([k, items]) => (
          <Card key={k} className="p-2">
            <div className="flex justify-between px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"><span>{label(k)}</span><span>{items.reduce((s, r) => s + r.delta, 0).toLocaleString()}</span></div>
            {items.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                <span className={cx('grid size-9 place-items-center rounded-lg', r.delta < 0 ? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40')}>{icon(r.type)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{r.label}</span><span className="text-xs text-neutral-500">{r.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {r.type ?? 'Usage'}</span></span>
                <span className="text-right"><span className={cx('block font-semibold tabular-nums', r.delta < 0 ? 'text-neutral-900 dark:text-white' : 'text-emerald-600')}>{r.delta > 0 ? '+' : ''}{r.delta.toLocaleString()}</span><span className="text-xs tabular-nums text-neutral-400">{r.after.toLocaleString()}</span></span>
              </div>
            ))}
          </Card>
        ))}
        {!shown.length && <p className="py-16 text-center text-neutral-400">No transactions.</p>}
      </div>
    </Page>
  )
}

