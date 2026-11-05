import { AudioLines, Mic, Construction } from 'lucide-react'
import { useStore, type Page } from '../store'
import { Button } from '../ui'
import { pageLabel } from '../Layout'

export function Placeholder({ page }: { page: Page }) {
  const { setPage, khmer } = useStore()
  return (
    <div className="grid h-full place-items-center p-10 text-center">
      <div>
        <Construction className="mx-auto mb-3 size-10 text-neutral-400" />
        <h1 className="text-xl font-semibold">{pageLabel(page, khmer)}</h1>
        <p className="mb-5 text-neutral-500">Not part of this mock. Try the SomlengPit pages:</p>
        <div className="flex justify-center gap-2">
          <Button variant="solid" onClick={() => setPage('studio')}><AudioLines className="size-4" /> Studio</Button>
          <Button onClick={() => setPage('voices')}><Mic className="size-4" /> My Voices</Button>
        </div>
      </div>
    </div>
  )
}
