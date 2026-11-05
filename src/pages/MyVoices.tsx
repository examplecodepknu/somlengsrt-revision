import { useState } from 'react'
import { VoiceModal } from './VoiceModal'
export { VoiceModal }
import { Loader2, Mic, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Avatar, Button, Coin, Modal, NativePlayer, cx } from '../ui'
import type { Voice } from '../data'

export function MyVoices() {
  const { voices, setVoices, tokens, setPage, toast, lines, setLines } = useStore()
  const [editing, setEditing] = useState<Voice | 'new' | null>(null)
  const [confirmDel, setConfirmDel] = useState<Voice | null>(null)
  const custom = voices.filter((v) => v.kind === 'custom')
  const presets = voices.filter((v) => v.kind === 'preset')

  return (
    <div className="p-5">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Mic className="size-6" /> My Voices</h1>
          <p className="mt-1 text-lg text-neutral-500">Upload a 15s sample (max 10MB), trim it, and clone your voice.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-11 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-lg font-semibold dark:border-neutral-800"><Coin /> {tokens.toLocaleString()}</span>
          <Button onClick={() => setPage('buy')}>Buy Tokens</Button>
          <Button variant="solid" onClick={() => setEditing('new')}><Plus className="size-4" /> Create voice</Button>
        </div>
      </div>

      <section className="mb-6 border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="font-display text-xl">My voice clones</h2>
        <p className="mb-5 text-neutral-500">Voice cloning is free — only the ASR transcription costs 20 tokens.</p>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {custom.map((v) => (
            <VoiceCard key={v.id} v={v}>
              {v.transcript && <p className="mt-4 rounded-md bg-neutral-50 p-3 text-[15px] leading-relaxed text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400">{v.transcript}</p>}
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="h-10" onClick={() => setEditing(v)}><Pencil className="size-4" /> Edit</Button>
                <Button size="sm" variant="danger" className="h-10" onClick={() => setConfirmDel(v)}><Trash2 className="size-4" /> Delete voice</Button>
              </div>
            </VoiceCard>
          ))}
          <button onClick={() => setEditing('new')} className="grid min-h-[200px] place-items-center border border-dashed border-neutral-300 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900">
            <span className="flex flex-col items-center gap-2"><Plus className="size-6" /> Create a new voice</span>
          </button>
        </div>
      </section>

      <section className="border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 className="font-display text-xl">Preset voices</h2>
        <p className="mb-5 text-neutral-500">Ready-to-use voices available to everyone.</p>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {presets.map((v) => <VoiceCard key={v.id} v={v} />)}
        </div>
      </section>

      <VoiceModal
        key={editing === 'new' ? 'new' : editing?.id}
        voice={editing}
        onClose={() => setEditing(null)}
        onSave={(v, isNew) => {
          setVoices((vs) => (isNew ? [...vs, v] : vs.map((x) => (x.id === v.id ? v : x))))
          toast(isNew ? `Voice "${v.name}" created` : `Voice "${v.name}" updated`)
          setEditing(null)
        }}
      />

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete voice?"
        footer={<>
          <Button onClick={() => setConfirmDel(null)}>Cancel</Button>
          <Button className="border-red-600 bg-red-600 text-white hover:bg-red-700" onClick={() => {
            const v = confirmDel!
            setVoices((vs) => vs.filter((x) => x.id !== v.id))
            setLines(lines.map((l) => (l.voiceId === v.id ? { ...l, voiceId: 'chingchang', dirty: true } : l)))
            toast(`Deleted "${v.name}"`)
            setConfirmDel(null)
          }}>Delete</Button>
        </>}>
        <p className="text-neutral-600 dark:text-neutral-400">
          “{confirmDel?.name}” will be removed. Script lines using it will switch to ChingChang. (Mock — nothing is really deleted.)
        </p>
      </Modal>
    </div>
  )
}

function VoiceCard({ v, children }: { v: Voice; children?: React.ReactNode }) {
  return (
    <div className="border border-neutral-200 p-6 dark:border-neutral-800">
      <div className="flex items-center gap-3">
        <Avatar name={v.name} color={v.color} />
        <span className="font-display flex-1 truncate text-2xl">{v.name}</span>
        <span className={cx('rounded px-3 py-1 text-sm', v.status === 'Ready' ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-amber-100 text-amber-800')}>
          {v.status === 'Processing' ? <span className="flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Processing</span> : 'Ready'}
        </span>
      </div>
      <p className="mt-2 text-neutral-500">{v.sampleSec.toFixed(1)}s sample{v.samples ? ` · ${v.samples}/20 samples` : ''}</p>
      <div className="mt-5"><NativePlayer playKey={`voice:${v.id}`} duration={v.sampleSec} /></div>
      {children}
    </div>
  )
}

