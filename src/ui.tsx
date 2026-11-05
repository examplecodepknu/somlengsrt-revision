import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { MoreVertical, Pause, Play, Volume2, X } from 'lucide-react'
import { useStore } from './store'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'outline' | 'solid' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'icon' }
export function Button({ variant = 'outline', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' && 'h-10 px-4 text-[15px]',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'icon' && 'size-10',
        variant === 'outline' && 'border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800',
        variant === 'solid' && 'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200',
        variant === 'ghost' && 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white',
        variant === 'danger' && 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40',
        className,
      )}
    />
  )
}

export function Coin({ className = 'size-4' }: { className?: string }) {
  return (
    <span
      className={cx('inline-block shrink-0 rounded-full shadow-inner', className)}
      style={{ background: 'radial-gradient(circle at 35% 30%, #f3d38a, #c08a2e 60%, #8a5a17)' }}
    />
  )
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex h-7 items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400', className)}>
      {children}
    </span>
  )
}

export function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-lg font-semibold text-white', color, size === 'md' ? 'size-10 text-sm' : 'size-8 text-xs')}>
      {name[0].toUpperCase()}
    </span>
  )
}

export function SectionTitle({ icon, children, extra }: { icon?: ReactNode; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon && <span className="text-neutral-500">{icon}</span>}
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">{children}</h2>
      {extra}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900', className)}>{children}</div>
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" size="icon" className="size-8 rounded-md" onClick={onClose}><X className="size-4" /></Button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="fixed bottom-24 right-6 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cx('toast-in rounded-lg px-4 py-3 text-sm shadow-lg', t.tone === 'err' ? 'bg-red-600 text-white' : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900')}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Pill-shaped player that mimics the browser's native <audio> controls */
export function NativePlayer({ playKey, duration }: { playKey: string; duration: number }) {
  const { play, startPlay, seek } = useStore()
  const active = play?.key === playKey
  const progress = active ? play.progress : 0
  return (
    <div className="flex h-11 items-center gap-3 rounded-full bg-neutral-100 px-4 dark:bg-neutral-800">
      <button onClick={() => startPlay(playKey, duration)} className="text-neutral-900 dark:text-white">
        {active ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
      </button>
      <span className="w-[86px] shrink-0 text-sm tabular-nums">
        {fmt(progress * duration)} / {fmt(active || progress ? duration : 0)}
      </span>
      <div
        className="relative h-1 flex-1 cursor-pointer rounded-full bg-neutral-300 dark:bg-neutral-600"
        onClick={(e) => {
          if (!active) startPlay(playKey, duration)
          const r = e.currentTarget.getBoundingClientRect()
          seek((e.clientX - r.left) / r.width)
        }}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-neutral-700 dark:bg-neutral-200" style={{ width: `${progress * 100}%` }} />
      </div>
      <Volume2 className="size-4 text-neutral-500" />
      <MoreVertical className="size-4 text-neutral-700 dark:text-neutral-300" />
    </div>
  )
}
