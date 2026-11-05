import { Fragment, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle, ArrowRight, Bot, Check, CheckCircle2, ChevronsUpDown, CircleCheck, CloudUpload, Copy, Crown, Download, ExternalLink, FileText,
  Files, Gift, History, KeyRound, Loader2, Pencil, Plus, Rocket, Search, Sparkles, Terminal, Trash2, Wallet, Zap,
} from 'lucide-react'
import { PLAN_LIMIT, PLAN_NAME, useStore, type PlanId, type TFile } from '../store'
import { Button, Coin, Modal, NativePlayer, cx } from '../ui'
import { uid } from '../data'
import { download } from './Studio'

// ---------- shared bits (classic style: square borders, black buttons) ----------
const Box = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx('border border-neutral-200 p-6 dark:border-neutral-800', className)}>{children}</div>
const H1 = ({ children, sub, right }: { children: ReactNode; sub?: string; right?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div><h1 className="text-2xl font-bold">{children}</h1>{sub && <p className="mt-1 text-lg text-neutral-500">{sub}</p>}</div>
    {right && <div className="flex items-center gap-2">{right}</div>}
  </div>
)
const Black = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className={cx('inline-flex h-10 items-center justify-center gap-2 bg-neutral-900 px-4 font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900', p.className)} />
const TokenPill = () => { const { tokens } = useStore(); return <span className="flex h-11 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-lg font-medium dark:border-neutral-800"><Coin /> {tokens.toLocaleString()}</span> }
export const ago = (d: Date) => { const days = Math.floor((Date.now() - d.getTime()) / 864e5); return days < 1 ? 'today' : `${days}d ago` }
export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
export function useCopy() {
  const { toast } = useStore()
  return (text: string, what = 'Copied') => { navigator.clipboard?.writeText(text); toast(what) }
}
export const Status = ({ s }: { s: TFile['status'] }) => (
  <span className={cx('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium', s === 'Completed' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : s === 'Failed' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800')}>
    {s === 'Processing' && <Loader2 className="size-3 animate-spin" />}{s}
  </span>
)
export const FileIcon = ({ s }: { s: TFile['status'] }) => s === 'Processing' ? <Loader2 className="size-4 animate-spin text-amber-500" /> : <CheckCircle2 className="size-4 text-green-600" />

// ---------- Dashboard ----------
export function Dashboard() {
  const { files, dailyUsed, plan, setPage } = useStore()
  const limit = PLAN_LIMIT[plan]
  return (
    <div className="p-5">
      <H1 right={<Black onClick={() => setPage('transcribe')}><CloudUpload className="size-4" /> Transcribe</Black>}>Dashboard</H1>
      <div className="grid gap-4 md:grid-cols-3">
        <Box><div className="flex items-center gap-2 text-neutral-500"><Zap className="size-4" /> Daily Usage</div><div className="mt-3 text-2xl font-bold">{dailyUsed}/{limit}</div>
          <div className="mt-3 h-2 bg-neutral-100 dark:bg-neutral-800"><div className="h-full bg-neutral-900 dark:bg-white" style={{ width: `${Math.min(100, (dailyUsed / limit) * 100)}%` }} /></div></Box>
        <Box><div className="flex items-center gap-2 text-neutral-500"><FileText className="size-4" /> files processed</div><div className="mt-3 text-2xl font-bold">{files.filter((f) => f.status === 'Completed').length}</div></Box>
        <Box><div className="text-neutral-500">Plan</div><div className="mt-3 text-2xl font-bold">{PLAN_NAME[plan]}</div><button onClick={() => setPage('subscriptions')} className="mt-1 underline">Upgrade</button></Box>
      </div>
      <div className="my-4 flex gap-2">
        <Black onClick={() => setPage('transcribe')}><CloudUpload className="size-4" /> Upload audio</Black>
        <Button onClick={() => setPage('transcribe')}><Files className="size-4" /> View all files</Button>
      </div>
      <Box className="mb-4">
        <div className="flex items-center gap-2 text-lg font-medium"><Bot className="size-5" /> Use SomlengSrt from your AI assistant</div>
        <button onClick={() => setPage('mcp')} className="mt-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">Open MCP setup →</button>
        <p className="mt-4 text-neutral-500">Connect an MCP client to generate speech, subtitles, and captions from chat. Setup instructions, endpoint, and configuration live on the MCP page.</p>
      </Box>
      <Box>
        <div className="text-lg font-medium">Recent Files</div>
        <button onClick={() => setPage('transcribe')} className="mt-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">View all →</button>
        <div className="mt-4">
          {files.slice(0, 5).map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-3 py-3"><FileIcon s={f.status} /><span className="flex-1 truncate">{f.name}</span><Status s={f.status} /><span className="w-20 text-right text-sm text-neutral-400">{ago(f.date)}</span></div>
          ))}
        </div>
      </Box>
    </div>
  )
}

// ---------- Transcribe ----------
export function Transcribe() {
  const { files, setFiles, dailyUsed, plan, toast, KM_TRANSCRIPT, setPage } = useStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All')
  const [open, setOpen] = useState<string | null>(null)
  const [edit, setEdit] = useState<TFile | null>(null)
  const [caption, setCaption] = useState<TFile | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const limit = PLAN_LIMIT[plan]
  const shown = files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()) && (status === 'All' || f.status === status))

  const add = (list: FileList | null) => {
    if (!list?.length) return
    const room = limit - dailyUsed
    if (room <= 0) { toast(`Daily limit reached (${limit}/day on ${PLAN_NAME[plan]})`, 'err'); setPage('subscriptions'); return }
    const picked = [...list].slice(0, room).map((f) => ({ id: uid('f'), name: f.name, duration: 30 + Math.round(Math.random() * 90), size: f.size, status: 'Processing' as const, date: new Date(), transcript: '' }))
    setFiles((fs) => [...picked, ...fs])
    picked.forEach((p, i) => setTimeout(() => setFiles((fs) => fs.map((f) => (f.id === p.id ? { ...f, status: 'Completed', transcript: KM_TRANSCRIPT } : f))), 2500 + i * 1200))
    toast(`Uploading ${picked.length} file(s)…`)
  }
  const srt = (f: TFile) => {
    const parts = f.transcript.split(/(?<=[។!?])\s*/).filter(Boolean)
    const step = f.duration / Math.max(1, parts.length)
    const ts = (s: number) => new Date(s * 1000).toISOString().slice(11, 23).replace('.', ',')
    download(f.name.replace(/\.[^.]+$/, '.srt'), parts.map((p, i) => `${i + 1}\n${ts(i * step)} --> ${ts((i + 1) * step)}\n${p}\n`).join('\n'))
  }

  return (
    <div className="p-5">
      <H1>Transcribe</H1>
      <div onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files) }}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-8 text-lg text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900">
        <CloudUpload className="size-6" /> Drop files or click to browse
      </div>
      <input ref={ref} type="file" accept="audio/*,video/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      <p className="my-3 text-right text-neutral-500">{dailyUsed}/{limit} files used today</p>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files..." className="h-12 w-full border border-neutral-200 bg-transparent pl-10 outline-none dark:border-neutral-800" /></div>
        <label className="relative flex h-12 w-40 items-center justify-between border border-neutral-200 px-3 dark:border-neutral-800">{status}<ChevronsUpDown className="size-4" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="absolute inset-0 opacity-0">{['All', 'Completed', 'Processing', 'Failed'].map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <table className="w-full text-left">
        <thead><tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">{['', 'File', 'Duration', 'Size', 'Status', 'Date'].map((h) => <th key={h} className="py-3 font-medium">{h}</th>)}<th className="py-3 text-right font-medium">Actions</th></tr></thead>
        <tbody>
          {shown.map((f) => (
            <Fragment key={f.id}>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <td className="w-8"><button onClick={() => setOpen(open === f.id ? null : f.id)} className="text-neutral-500">{open === f.id ? '▼' : '▶'}</button></td>
                <td className="py-4"><span className="flex items-center gap-2"><FileIcon s={f.status} />{f.name}</span></td>
                <td className="text-neutral-500">{fmtDur(f.duration)}</td>
                <td className="text-neutral-500">{(f.size / 1e6).toFixed(1)} MB</td>
                <td><Status s={f.status} /></td>
                <td className="text-neutral-500">{ago(f.date)}</td>
                <td className="text-right">
                  <span className="inline-flex gap-1">
                    {([[Pencil, 'Edit', () => setEdit(f)], [Sparkles, 'Caption', () => setCaption(f)], [Download, 'SRT', () => srt(f)]] as const).map(([I, l, fn]) => (
                      <Button key={l} variant="ghost" size="sm" disabled={f.status !== 'Completed'} className="text-neutral-900 dark:text-white" onClick={fn}><I className="size-4" /> {l}</Button>
                    ))}
                  </span>
                </td>
              </tr>
              {open === f.id && (
                <tr className="border-b border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/50"><td colSpan={7} className="p-6">
                  <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"><NativePlayer playKey={`file:${f.id}`} duration={f.duration} /></div>
                  <div className="mb-2 mt-5 text-neutral-500">Transcription</div>
                  <p className="khmer rounded-lg border border-neutral-200 bg-white p-4 leading-relaxed dark:border-neutral-800 dark:bg-neutral-900">{f.transcript || 'Processing…'}</p>
                  <Button className="mt-4" onClick={() => setCaption(f)}><Sparkles className="size-4" /> Captions</Button>
                </td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {!shown.length && <p className="py-10 text-center text-neutral-400">No files.</p>}

      <EditTranscript file={edit} onClose={() => setEdit(null)} onSave={(t) => { setFiles((fs) => fs.map((x) => (x.id === edit!.id ? { ...x, transcript: t } : x))); toast('Transcript saved'); setEdit(null) }} />
      <CaptionModal file={caption} onClose={() => setCaption(null)} />
    </div>
  )
}
export function EditTranscript({ file, onClose, onSave }: { file: TFile | null; onClose: () => void; onSave: (t: string) => void }) {
  const [t, setT] = useState('')
  const [key, setKey] = useState<string | null>(null)
  if (file && key !== file.id) { setKey(file.id); setT(file.transcript) }
  return (
    <Modal open={!!file} onClose={onClose} title={`Edit · ${file?.name}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Black onClick={() => onSave(t)}>Save</Black></>}>
      <textarea value={t} onChange={(e) => setT(e.target.value)} rows={10} className="khmer w-full border border-neutral-200 bg-transparent p-3 outline-none dark:border-neutral-800" />
    </Modal>
  )
}
export function CaptionModal({ file, onClose }: { file: TFile | null; onClose: () => void }) {
  const { spend, tokens, toast } = useStore()
  const copy = useCopy()
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)
  const [platform, setPlatform] = useState('TikTok')
  const gen = () => {
    if (tokens < 20) return toast('Not enough tokens', 'err')
    setBusy(true)
    setTimeout(() => {
      spend(20, `Caption generation · ${file?.name}`)
      setOut(`ជួបគ្នាដោយចៃដន្យ នៅលើផ្លូវដើរលេង 🇰🇭✨\nអ្នកណាធ្លាប់ជួបរឿងបែបនេះដែរ? 😂\n\n#Cambodia #ខ្មែរ #${platform} #fyp #somlengsrt`)
      setBusy(false)
    }, 1200)
  }
  return (
    <Modal open={!!file} onClose={() => { setOut(''); onClose() }} title="Social caption"
      footer={<><Button variant="ghost" onClick={() => { setOut(''); onClose() }}>Close</Button>{out ? <Black onClick={() => copy(out, 'Caption copied')}><Copy className="size-4" /> Copy</Black> : <Black onClick={gen} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generate · 20 tokens</Black>}</>}>
      <div className="mb-3 flex gap-2">{['TikTok', 'Facebook', 'YouTube', 'Instagram'].map((p) => <button key={p} onClick={() => setPlatform(p)} className={cx('border px-3 py-1 text-sm', platform === p ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'border-neutral-200 dark:border-neutral-800')}>{p}</button>)}</div>
      {out ? <pre className="khmer whitespace-pre-wrap border border-neutral-200 bg-neutral-50 p-4 font-sans dark:border-neutral-800 dark:bg-neutral-800/50">{out}</pre> : <p className="text-neutral-500">Generate a {platform} caption with hashtags from the transcript of <b>{file?.name}</b>.</p>}
    </Modal>
  )
}

// ---------- Subscriptions ----------
export const PLANS: { id: PlanId; name: string; per: string; price: string; features: string[]; rec?: boolean }[] = [
  { id: 'free', name: 'Free', per: '1/day', price: 'Free', features: ['1 file(s) per day', 'Up to 2 min per file', 'Up to 10 MB per file', 'SRT subtitle output', 'File history'] },
  { id: 'basic', name: 'Basic', per: '10/day', price: '1.99', features: ['10 file(s) per day', 'Up to 5 min per file', 'Up to 20 MB per file', 'SRT subtitle output', 'File history'] },
  { id: 'api', name: 'API Starter', per: '20/day + API', price: '4.99', rec: true, features: ['20 file(s) per day', 'Up to 10 min per file', 'Up to 50 MB per file', 'API access', 'Sanctum API tokens', 'SRT subtitle output', 'File history', 'Transcript editor', 'Social caption generation'] },
  { id: 'pro', name: 'Pro', per: '100/day + API', price: '14.99', features: ['100 file(s) per day', 'Up to 20 min per file', 'Up to 200 MB per file', 'API access', 'Sanctum API tokens', 'SRT subtitle output', 'File history', 'Transcript editor', 'Social caption generation', 'Priority processing'] },
]
export function Subscriptions() {
  const { plan, setPlan, dailyUsed, toast } = useStore()
  const [tab, setTab] = useState<'plans' | 'tx'>('plans')
  const [checkout, setCheckout] = useState<(typeof PLANS)[number] | null>(null)
  const [tx, setTx] = useState<{ id: string; date: Date; plan: string; amount: string }[]>([])
  const [busy, setBusy] = useState(false)
  const limit = PLAN_LIMIT[plan]
  return (
    <div className="p-5">
      <H1>Subscriptions</H1>
      <Box className="mb-4">
        <div className="flex items-center gap-2 text-lg"><Crown className="size-5" /> {PLAN_NAME[plan]}</div>
        <div className="mt-5 flex items-center gap-2 text-neutral-500"><Zap className="size-4" /> Daily usage</div>
        <div className="mt-1 text-lg font-bold">{dailyUsed}/{limit} files</div>
        <div className="mt-3 h-2 bg-neutral-100 dark:bg-neutral-800"><div className="h-full bg-neutral-900 dark:bg-white" style={{ width: `${(dailyUsed / limit) * 100}%` }} /></div>
      </Box>
      <div className="mb-3 inline-flex bg-neutral-100 p-1 dark:bg-neutral-800">
        {([['plans', 'Plans'], ['tx', 'Transaction History']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx('px-3 py-1.5', tab === k ? 'bg-white font-medium dark:bg-neutral-950' : 'text-neutral-500')}>{l}</button>)}
      </div>
      {tab === 'plans' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => {
            const active = p.id === plan
            return (
              <div key={p.id} className={cx('flex flex-col border', active ? 'border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900' : p.rec ? 'border-neutral-400' : 'border-neutral-200 dark:border-neutral-800')}>
                <div className="flex-1 p-6">
                  <div className="flex items-center gap-2 text-lg">
                    {p.rec && <span className="flex items-center gap-1 border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs font-semibold dark:bg-neutral-800"><Sparkles className="size-3" /> Recommended</span>}
                    {p.name}
                    {active && <span className="ml-auto flex items-center gap-1 border border-neutral-300 bg-neutral-200 px-2 py-0.5 text-xs font-semibold dark:bg-neutral-700"><CircleCheck className="size-3.5" /> Active</span>}
                  </div>
                  <div className="mt-3 text-neutral-500">{p.per}</div>
                  <div className="mt-5 text-xl">{p.price === 'Free' ? <b className="text-2xl">Free</b> : <><b>{p.price} USD /</b> 1 month</>}</div>
                  <ul className="mt-5 space-y-2">{p.features.map((f) => <li key={f} className="flex items-center gap-3"><span className={cx('grid size-5 place-items-center rounded-full', active ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-green-50 text-green-600 dark:bg-green-950/40')}><Check className="size-3" /></span>{f}</li>)}</ul>
                </div>
                <div className="border-t border-neutral-200 p-6 dark:border-neutral-800">
                  {active ? <button className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"><Crown className="size-4" /> Current Plan</button>
                    : p.rec ? <Black className="h-11 w-full" onClick={() => setCheckout(p)}>Choose {p.name} <ArrowRight className="size-4" /></Black>
                    : <Button className="h-11 w-full" onClick={() => p.id === 'free' ? (setPlan('free'), toast('Switched to Free')) : setCheckout(p)}>Choose {p.name} <ArrowRight className="size-4" /></Button>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Box>{tx.length ? tx.map((t) => <div key={t.id} className="flex justify-between border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-800"><span>{t.plan} · 1 month</span><span className="text-neutral-500">{t.amount} USD · {t.date.toLocaleString()}</span></div>) : <p className="text-neutral-500">No transactions yet.</p>}</Box>
      )}
      <Modal open={!!checkout} onClose={() => setCheckout(null)} title={`Subscribe to ${checkout?.name}`}
        footer={<><Button variant="ghost" onClick={() => setCheckout(null)}>Cancel</Button><Black disabled={busy} onClick={() => {
          setBusy(true)
          setTimeout(() => { setPlan(checkout!.id); setTx((t) => [{ id: uid('tx'), date: new Date(), plan: checkout!.name, amount: checkout!.price }, ...t]); toast(`You're on ${checkout!.name} (mock payment)`); setBusy(false); setCheckout(null) }, 1000)
        }}>{busy && <Loader2 className="size-4 animate-spin" />} Pay {checkout?.price} USD</Black></>}>
        <p className="text-neutral-600 dark:text-neutral-400">Demo checkout — no real payment. You'll get <b>{checkout?.per}</b> for 1 month.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">{['ABA Pay', 'KHQR', 'Card'].map((m, i) => <label key={m} className="flex cursor-pointer items-center gap-2 border border-neutral-200 p-3 text-sm dark:border-neutral-800"><input type="radio" name="pay" defaultChecked={i === 0} className="accent-neutral-900" />{m}</label>)}</div>
      </Modal>
    </div>
  )
}

// ---------- Redeem ----------
export function Redeem() {
  const { plan, tokens, addTokens, toast } = useStore()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState([{ date: new Date('2026-10-30'), code: 'GIFT-NNKB9-R54JT', reward: 30000 }])
  const redeem = () => {
    const n = code.toUpperCase().replace(/[\s-]/g, '')
    setErr('')
    if (!/^GIFT[A-Z0-9]{10}$/.test(n)) return setErr('Invalid code format. Codes look like GIFT-XXXXX-XXXXX.')
    const pretty = `GIFT-${n.slice(4, 9)}-${n.slice(9)}`
    if (rows.some((r) => r.code === pretty)) return setErr('This code has already been redeemed.')
    setBusy(true)
    setTimeout(() => {
      const reward = [5000, 10000, 30000][n.charCodeAt(13) % 3]
      addTokens(reward, `Gift code ${pretty}`, 'Gift')
      setRows((r) => [{ date: new Date(), code: pretty, reward }, ...r])
      toast(`🎁 +${reward.toLocaleString()} tokens`)
      setCode(''); setBusy(false)
    }, 800)
  }
  return (
    <div className="p-5">
      <H1 sub="Enter a gift code to add tokens or subscription time to your account.">Redeem gift code</H1>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Box><div className="text-neutral-500">Current plan</div><div className="mt-2 text-2xl">{PLAN_NAME[plan]} plan</div></Box>
        <Box><div className="text-neutral-500">Token balance</div><div className="mt-2 text-2xl">{tokens.toLocaleString()}</div></Box>
      </div>
      <Box className="mb-4">
        <div className="flex items-center gap-2 text-xl"><Gift className="size-5" /> Gift code</div>
        <p className="mt-2 text-neutral-500">Case, spaces and dashes are ignored. <span className="text-neutral-400">(Demo: try GIFT-DEMO1-23456)</span></p>
        <label className="mt-5 block">Gift code</label>
        <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && redeem()} placeholder="GIFT-XXXXX-XXXXX"
          className={cx('mt-2 h-12 w-full border bg-transparent px-4 font-mono uppercase outline-none', err ? 'border-red-500' : 'border-neutral-300 focus:border-neutral-600 dark:border-neutral-700')} />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <Black className="mt-6" disabled={!code.trim() || busy} onClick={redeem}>{busy && <Loader2 className="size-4 animate-spin" />} Redeem</Black>
      </Box>
      <Box>
        <div className="flex items-center gap-2 text-xl"><History className="size-5" /> Redemption history</div>
        <p className="mt-2 text-neutral-500">Gift codes you have redeemed on this account.</p>
        <table className="mt-6 w-full text-left">
          <thead><tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800"><th className="py-3 font-medium">Redeemed</th><th className="font-medium">Code</th><th className="font-medium">Reward</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.code}><td className="py-4 text-neutral-500">{r.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td><td className="font-mono">{r.code}</td><td>{r.reward.toLocaleString()} tokens</td></tr>)}</tbody>
        </table>
      </Box>
    </div>
  )
}

// ---------- API Tokens ----------
export function ApiTokens() {
  const { plan, setPage, toast } = useStore()
  const copy = useCopy()
  const [tab, setTab] = useState<'tokens' | 'quick'>('tokens')
  const [list, setList] = useState([{ id: 't1', name: 'a', last: '11/5/2026', created: '11/2/2026' }])
  const [create, setCreate] = useState(false)
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const hasApi = plan === 'api' || plan === 'pro'
  const base = 'https://somlengsrt.com/api/v1'
  const curl = `curl -X POST ${base}/transcribe \\\n  -H "Authorization: Bearer YOUR_API_TOKEN" \\\n  -F "file=@audio.mp3"`
  return (
    <div className="p-5">
      <H1 right={<Black onClick={() => { setCreate(true); setSecret(''); setName('') }}><Plus className="size-4" /> Create</Black>}>API Tokens</H1>
      <Box className="mb-4">
        <div className="flex items-center gap-2 text-xl"><KeyRound className="size-5" /> API Access
          <span className={cx('ml-auto flex items-center gap-1 border px-2 py-1 text-sm font-medium', hasApi ? 'border-green-200 text-green-700' : 'border-neutral-200 dark:border-neutral-800')}>
            {hasApi ? <><CircleCheck className="size-4" /> Enabled</> : <><AlertTriangle className="size-4 text-amber-500" /> Requires subscription</>}</span>
        </div>
        <p className="mt-2 text-neutral-500">API calls require an API Starter or Pro subscription.</p>
        <div className="mt-5 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono dark:border-neutral-800 dark:bg-neutral-900"><Terminal className="size-4 text-neutral-400" />{base}
          <button onClick={() => copy(base)} className="ml-auto flex items-center gap-1 font-sans font-medium"><Copy className="size-4" /> Copy</button></div>
        {!hasApi && <Button className="mt-5" onClick={() => setPage('subscriptions')}><Rocket className="size-4" /> View plans to enable API access</Button>}
      </Box>
      <div className="mb-3 inline-flex bg-neutral-100 p-1 dark:bg-neutral-800">{([['tokens', 'Tokens'], ['quick', 'Quick Start']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx('px-3 py-1.5', tab === k ? 'bg-white font-medium dark:bg-neutral-950' : 'text-neutral-500')}>{l}</button>)}</div>
      {tab === 'tokens' ? (
        <Box className="px-0 pb-2">
          <div className="px-6"><div className="text-xl">Your Tokens</div><p className="mt-2 text-neutral-500">Personal access tokens authenticate your API requests.</p></div>
          <table className="mt-6 w-full text-left">
            <thead><tr className="border-b border-neutral-200 dark:border-neutral-800">{['Name', 'Last Used', 'Created'].map((h) => <th key={h} className="px-3 py-3 font-medium first:pl-4">{h}</th>)}<th className="px-4 text-right font-medium">Actions</th></tr></thead>
            <tbody>{list.map((t) => <tr key={t.id}><td className="py-4 pl-4"><span className="flex items-center gap-2"><KeyRound className="size-4 text-neutral-400" />{t.name}</span></td><td className="px-3 text-neutral-500">{t.last}</td><td className="px-3 text-neutral-500">{t.created}</td>
              <td className="px-4 text-right"><button onClick={() => { setList((l) => l.filter((x) => x.id !== t.id)); toast('Token revoked') }} className="text-red-600"><Trash2 className="size-4" /></button></td></tr>)}</tbody>
          </table>
          {!list.length && <p className="p-6 text-center text-neutral-400">No tokens yet.</p>}
        </Box>
      ) : (
        <Box>
          <div className="mb-2 flex items-center justify-between"><span className="font-medium">Transcribe a file</span><button onClick={() => copy(curl)} className="flex items-center gap-1 text-sm text-neutral-500"><Copy className="size-4" /> Copy</button></div>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-200">{curl}</pre>
        </Box>
      )}
      <Modal open={create} onClose={() => setCreate(false)} title={secret ? 'Token created' : 'Create API token'}
        footer={secret ? <Black onClick={() => setCreate(false)}>Done</Black> : <><Button variant="ghost" onClick={() => setCreate(false)}>Cancel</Button><Black disabled={!name.trim()} onClick={() => {
          const s = `${list.length + 2}|${Array.from({ length: 40 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('')}`
          setSecret(s); setList((l) => [...l, { id: uid('t'), name: name.trim(), last: 'Never', created: new Date().toLocaleDateString('en-US') }])
        }}>Create</Black></>}>
        {secret ? <>
          <p className="mb-3 text-sm text-amber-700">Copy this token now — you won't see it again. (Mock token, not real.)</p>
          <div className="flex items-center gap-2 border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm dark:border-neutral-800 dark:bg-neutral-800"><span className="flex-1 break-all">{secret}</span><button onClick={() => copy(secret, 'Token copied')}><Copy className="size-4" /></button></div>
        </> : <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Token name, e.g. my-server" className="h-11 w-full border border-neutral-300 bg-transparent px-3 outline-none dark:border-neutral-700" />}
      </Modal>
    </div>
  )
}

// ---------- MCP ----------
export const TOOLS = [
  { name: 'list_voices', desc: 'List preset and cloned voices you can use.', params: ['language?', 'kind?'] },
  { name: 'generate_speech', desc: 'Start a text-to-speech job. Billed 1 token per character.', params: ['text', 'voice_id', 'style?'] },
  { name: 'create_srt', desc: 'Create SRT subtitles from an audio URL or a finished speech job.', params: ['source', 'mode?'] },
  { name: 'write_caption', desc: 'Write a social caption with hashtags (20 tokens).', params: ['text', 'platform?'] },
  { name: 'get_job', desc: 'Poll a background job and get the result URL.', params: ['job_id'] },
]
export function Mcp() {
  const { tokens, setPage } = useStore()
  const copy = useCopy()
  const endpoint = 'https://somlengsrt.com/mcp/somlengpit'
  const config = JSON.stringify({ mcpServers: { somlengpit: { type: 'http', url: endpoint } } }, null, 2)
  const curl = `curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer YOUR_API_TOKEN" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`
  const Code = ({ label, icon, text, btn }: { label: string; icon?: ReactNode; text: string; btn: string }) => (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-neutral-600 dark:text-neutral-400">{icon}{label}</span>
        <button onClick={() => copy(text)} className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Copy className="size-4" /> {btn}</button></div>
      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-5 text-[15px] leading-relaxed text-slate-200">{text}</pre>
    </div>
  )
  return (
    <div className="p-5">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Bot className="size-6" /><h1 className="text-2xl font-bold">MCP Server</h1><span className="border border-neutral-200 px-2 py-1 text-sm font-medium dark:border-neutral-800">Model Context Protocol</span>
        <div className="ml-auto flex gap-2"><Button onClick={() => setPage('api')}><KeyRound className="size-4" /> API Tokens</Button><Black onClick={() => setPage('projects')}>Open Studio <ArrowRight className="size-4" /></Black></div>
      </div>
      <p className="mb-6 max-w-4xl text-neutral-500">Connect Claude, Cursor, VS Code, or any MCP-compatible client to SomlengPit. Your assistant can list voices, generate speech, create SRT subtitles, and write social captions — billed from your SomlengPit token wallet.</p>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Box>
          <div className="text-xl">Connect an AI assistant</div>
          <p className="mt-2 text-neutral-500">Three steps. OAuth is the easiest path; API tokens still work as a fallback. The client must support streamable HTTP MCP servers.</p>
          {[['Connect with OAuth', 'Add the endpoint URL in your MCP client (Claude, Cursor, VS Code). Sign in and approve access when the consent page opens — no token to copy.'],
            ['Add the server to your client', 'Paste the configuration below into your MCP client config and restart the client.'],
            ['Ask for audio, subtitles, or captions', 'Speech and subtitle jobs run in the background; the assistant starts a job and polls for the result.']].map(([t, d], i) => (
            <div key={t} className="mt-5 flex gap-4"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-neutral-200 text-sm font-semibold dark:border-neutral-700">{i + 1}</span><div><div className="font-medium">{t}</div><p className="mt-1 text-neutral-500">{d}</p></div></div>
          ))}
          <div className="mt-6 text-sm font-medium uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Endpoint</div>
          <div className="mt-2 flex items-center rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono dark:border-neutral-800 dark:bg-neutral-900">{endpoint}<button onClick={() => copy(endpoint)} className="ml-auto flex items-center gap-1 font-sans text-neutral-500"><Copy className="size-4" /> Copy</button></div>
          <Code label="Client config" text={config} btn="Copy config" />
          <p className="mt-3 text-sm text-neutral-500">Clients without OAuth can still use an API token: add an Authorization header with Bearer YOUR_API_TOKEN, and keep the token secret — anyone with it can spend your wallet.</p>
          <Code label="Test with an API token" icon={<Terminal className="size-4" />} text={curl} btn="Copy command" />
        </Box>
        <div className="space-y-4">
          <Box>
            <div className="flex items-center gap-2 text-xl"><Wallet className="size-5" /> Billing</div>
            <dl className="mt-5 space-y-4 text-neutral-500">
              {[['Wallet balance', <b className="text-neutral-900 dark:text-white">{tokens} tokens</b>], ['Speech price', '1 character(s) = 1 token'], ['Minimum charge', '20 tokens'], ['Max 500 chars/line', ''], ['Caption price', '20 tokens']].map(([k, v], i) => (
                <div key={i} className="flex justify-between"><dt>{k}</dt><dd className="text-neutral-900 dark:text-white">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-neutral-500">Every generation reserves tokens up front. Failed generations are refunded automatically.</p>
            <Button className="mt-4 w-full" onClick={() => setPage('buy')}>Buy Tokens</Button>
          </Box>
          <Box>
            <div className="flex items-center gap-2 text-xl"><CircleCheck className="size-5" /> Requirements</div>
            <p className="mt-4 text-neutral-500">Text-to-speech is enabled.</p>
            <p className="mt-3 text-neutral-500">Caption generation is synchronous and can take up to a minute.</p>
            <a href="#mcp" className="mt-3 inline-flex items-center gap-1 text-blue-600 underline">Open the endpoint page <ExternalLink className="size-4" /></a>
          </Box>
        </div>
      </div>
      <Box className="mt-4">
        <div className="text-xl">Available tools</div>
        <p className="mt-2 text-neutral-500">These are the tools your AI client will see. Required parameters are highlighted; optional ones end with ?.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {TOOLS.map((t) => (
            <div key={t.name} className="border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="font-mono font-semibold">{t.name}</div><p className="mt-1 text-sm text-neutral-500">{t.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{t.params.map((p) => <span key={p} className={cx('px-2 py-0.5 font-mono text-xs', p.endsWith('?') ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800' : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900')}>{p}</span>)}</div>
            </div>
          ))}
        </div>
      </Box>
    </div>
  )
}

// ---------- Buy Tokens ----------
export const PACKS = [
  { tokens: 10000, name: 'Starter', price: '0.99', days: 30 },
  { tokens: 22000, name: 'Standard', price: '1.99', days: 30 },
  { tokens: 58000, name: 'Plus', price: '4.99', days: 30 },
  { tokens: 120000, name: 'Pro', price: '9.99', days: 45 },
]
export function BuyTokens() {
  const { addTokens, toast } = useStore()
  const [pick, setPick] = useState<(typeof PACKS)[number] | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <div className="p-5">
      <H1 sub="Tokens are a separate wallet and never touch your subscription credits." right={<TokenPill />}>Buy SomlengPit Tokens</H1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PACKS.map((p) => (
          <Box key={p.name}>
            <div className="text-lg font-medium">{p.tokens.toLocaleString()} tokens</div>
            <div className="mt-2 text-neutral-500">{p.name}</div>
            <div className="mt-6"><b className="text-3xl">{p.price}</b> <span className="text-lg text-neutral-500">USD</span></div>
            <div className="mt-4 text-neutral-500">Expires in {p.days} days</div>
            <Black className="mt-5 w-full" onClick={() => setPick(p)}>Buy</Black>
          </Box>
        ))}
      </div>
      <Modal open={!!pick} onClose={() => setPick(null)} title={`Buy ${pick?.tokens.toLocaleString()} tokens`}
        footer={<><Button variant="ghost" onClick={() => setPick(null)}>Cancel</Button><Black disabled={busy} onClick={() => {
          setBusy(true)
          setTimeout(() => { addTokens(pick!.tokens, `Purchase · ${pick!.name} pack`); toast(`+${pick!.tokens.toLocaleString()} tokens (mock payment)`); setBusy(false); setPick(null) }, 900)
        }}>{busy && <Loader2 className="size-4 animate-spin" />} Pay {pick?.price} USD</Black></>}>
        <p className="text-neutral-600 dark:text-neutral-400">Demo checkout — no real payment. Tokens expire in {pick?.days} days.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">{['ABA Pay', 'KHQR', 'Card'].map((m, i) => <label key={m} className="flex cursor-pointer items-center gap-2 border border-neutral-200 p-3 text-sm dark:border-neutral-800"><input type="radio" name="pay2" defaultChecked={i === 0} className="accent-neutral-900" />{m}</label>)}</div>
      </Modal>
    </div>
  )
}

// ---------- Token History ----------
export function TokenHistory() {
  const { history, tokens, setPage } = useStore()
  const [type, setType] = useState('All')
  let bal = tokens
  const rows = history.map((h) => { const r = { ...h, after: bal }; bal -= h.delta; return r })
  const shown = rows.filter((r) => type === 'All' || r.type === type)
  return (
    <div className="p-5">
      <H1 sub="Every purchase, usage, refund and expiration." right={<><TokenPill /><Black onClick={() => setPage('buy')}>Buy Tokens</Black></>}>SomlengPit Token History</H1>
      <Box>
        <div className="flex items-center justify-between">
          <div className="text-xl">Token transactions</div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800">{['All', 'Usage', 'Purchase', 'Gift', 'Refund'].map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <table className="mt-6 w-full text-left">
          <thead><tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">{['Type', 'tokens', 'Balance after', 'Description', 'Date'].map((h) => <th key={h} className="py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-800">
              <td className="py-3"><span className={cx('px-3 py-1 text-sm font-medium', r.delta < 0 ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-green-50 text-green-700 dark:bg-green-950/40')}>{r.type ?? (r.delta < 0 ? 'Usage' : 'Purchase')}</span></td>
              <td className={cx('text-lg', r.delta < 0 ? 'text-red-600' : 'text-green-600')}>{r.delta > 0 ? '+' : ''}{r.delta.toLocaleString()}</td>
              <td className="text-lg">{r.after.toLocaleString()}</td>
              <td className="text-neutral-500">{r.label}</td>
              <td className="text-sm text-neutral-500">{r.date.toLocaleString('en-US')}</td>
            </tr>
          ))}</tbody>
        </table>
      </Box>
    </div>
  )
}
