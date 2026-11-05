// ---------- Mock data (no backend) ----------

export type Voice = {
  id: string
  name: string
  kind: 'preset' | 'custom'
  lang: string
  color: string // avatar color class
  tint: string // card background tint class
  sampleSec: number
  samples?: number
  transcript?: string
  status: 'Ready' | 'Processing'
  gender?: 'female' | 'male'
  tags?: string[]
  ref?: string // VoxPocket voice file (real clone)
}

export type Version = { id: string; n: number; duration: number; url?: string; how?: string; speed?: number }

export type Line = {
  id: string
  voiceId: string
  styleHint: string
  text: string
  versions: Version[]
  activeVersion: number // index into versions, -1 = none
  dirty: boolean // needs (re)generation
}

let seq = 1000

export const uid = (p = 'id') => `${p}-${++seq}`

const blue = { color: 'bg-[#1f63a8]', tint: 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/40' }
const red = { color: 'bg-[#be123c]', tint: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40' }
const purple = { color: 'bg-[#4f2bd6]', tint: 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40' }
const dark = { color: 'bg-neutral-700', tint: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800' }

export const PRESET_VOICES: Voice[] = [
  { id: 'chingchang', name: 'ChingChang', ...dark, sampleSec: 10 },
  { id: 'female-1', name: 'female-1', ...red, sampleSec: 10 },
  { id: 'female-2', name: 'female-2', ...red, sampleSec: 12 },
  { id: 'female-3', name: 'female-3', ...blue, sampleSec: 9 },
  { id: 'male-1', name: 'male-1', ...blue, sampleSec: 10 },
  { id: 'male-2', name: 'male-2', ...blue, sampleSec: 9 },
  { id: 'male-3', name: 'male-3', ...blue, sampleSec: 10 },
  { id: 'male-4', name: 'male-4', ...blue, sampleSec: 10 },
  { id: 'male-5', name: 'male-5', ...blue, sampleSec: 10 },
  { id: 'male-6', name: 'male-6', ...purple, sampleSec: 10 },
  { id: 'male-7', name: 'male-7', ...blue, sampleSec: 10 },
  { id: 'male-8', name: 'male-8', ...blue, sampleSec: 10 },
].map((v) => ({
  ...v,
  kind: 'preset' as const,
  lang: 'km-KH',
  status: 'Ready' as const,
  gender: (v.name.startsWith('female') ? 'female' : 'male') as Voice['gender'],
  tags: v.name.startsWith('female') ? ['narration', 'calm'] : v.id === 'chingchang' ? ['story', 'warm'] : ['news', 'clear'],
}))

export const CUSTOM_VOICES: Voice[] = [
  {
    id: 'womanvoice',
    name: 'womanvoice',
    kind: 'custom',
    lang: 'km-KH',
    ...blue,
    sampleSec: 11,
    samples: 1,
    status: 'Ready',
    gender: 'female',
    tags: ['cloned', 'english'],
    transcript:
      'American accent in 10 seconds. Instead of saying, "Is he nice?" say, "Easy nice?" Easy nice? Easy nice? Is he nice? Follow me here to learn more English.',
  },
]

const SCRIPT = [
  'អាស្កា និង យូណូ ធំឡើងជាមួយគ្នា តែមានម្នាក់ប៉ុណ្ណោះដែលអាចក្លាយជាស្តេចវេទមន្ត!',
  'ពួកគេទាំងពីរជាក្មេងកំព្រា ធំឡើងនៅព្រះវិហារតែមួយ ហើយសន្យាថានឹងប្រជែងគ្នា។',
  'យូណូទទួលបានសៀវភៅវេទមន្តដ៏កម្រ ចំណែកអាស្កាគ្មានអ្វីសោះ។',
  'ប៉ុន្តែអាស្កាមិនដែលបោះបង់ទេ គាត់ហ្វឹកហាត់រាងកាយរៀងរាល់ថ្ងៃ។',
  'ថ្ងៃមួយ សៀវភៅប្រាំស្លឹកដ៏អាថ៌កំបាំងបានលេចឡើងនៅចំពោះមុខគាត់។',
  'ចាប់ពីពេលនោះមក ដំណើរផ្សងព្រេងរបស់ពួកគេទើបតែចាប់ផ្តើម!',
]

export const initialLines = (): Line[] =>
  SCRIPT.map((text, i) => ({
    id: uid('line'),
    voiceId: 'chingchang',
    styleHint: '',
    text,
    versions: [{ id: uid('v'), n: 1, duration: 3 + (text.length % 4) + i * 0.3 }],
    activeVersion: 0,
    dirty: false,
  }))

export const MAX_CHARS = 500
// mock pricing: 1 token per character
export const costOf = (text: string) => text.trim().length

// ---------- Example cases / templates ----------
export type TemplateLine = { voice: string; text: string; style?: string }
export type Template = { id: string; title: string; desc: string; lines: TemplateLine[] }

export const TEMPLATES: Template[] = [
  {
    id: 'case-1',
    title: 'Case 1 · Story narration',
    desc: 'One narrator voice reading a short story.',
    lines: SCRIPT.slice(0, 4).map((text) => ({ voice: 'ChingChang', text })),
  },
  {
    id: 'case-2',
    title: 'Case 2 · Two-person dialogue',
    desc: 'A conversation between a female and male speaker.',
    lines: [
      { voice: 'female-1', text: 'សួស្តីបង! ថ្ងៃនេះបងសុខសប្បាយទេ?', style: 'cheerful' },
      { voice: 'male-1', text: 'សុខសប្បាយ អរគុណ! ចុះអូនវិញ?' },
      { voice: 'female-1', text: 'ខ្ញុំក៏សុខសប្បាយដែរ។ ថ្ងៃនេះយើងទៅញ៉ាំកាហ្វេទេ?' },
      { voice: 'male-1', text: 'បាទ ល្អណាស់! ចាំជួបគ្នាម៉ោងប្រាំ។', style: 'calm' },
    ],
  },
  {
    id: 'case-3',
    title: 'Case 3 · Advertisement',
    desc: 'Short radio-style ad with an announcer and a customer.',
    lines: [
      { voice: 'male-6', text: 'តើអ្នកចង់បានសំឡេងអានអត្ថបទជាភាសាខ្មែរដែលស្តាប់ទៅដូចមនុស្សពិតមែនទេ?', style: 'energetic' },
      { voice: 'female-2', text: 'ខ្ញុំប្រើ សំឡេងពិត រាល់ថ្ងៃ សម្រាប់វីដេអូរបស់ខ្ញុំ!' },
      { voice: 'male-6', text: 'សាកល្បងថ្ងៃនេះ ដោយឥតគិតថ្លៃ នៅ somlengsrt.com', style: 'energetic' },
    ],
  },
  {
    id: 'case-4',
    title: 'Case 4 · Podcast intro',
    desc: 'Three hosts introducing an episode.',
    lines: [
      { voice: 'male-2', text: 'ស្វាគមន៍មកកាន់កម្មវិធីផតខាស់ "និយាយគ្នាលេង" វគ្គទី១២!' },
      { voice: 'female-3', text: 'ថ្ងៃនេះ យើងនឹងនិយាយអំពីបច្ចេកវិទ្យា AI នៅកម្ពុជា។' },
      { voice: 'womanvoice', text: 'ហើយខ្ញុំមានរឿងគួរឱ្យចាប់អារម្មណ៍ជាច្រើនចង់ចែករំលែក។', style: 'whisper' },
    ],
  },
]

/** "Speaker: text" (one per line) → template lines. Lines without a speaker use fallback. */
export function parsePaste(raw: string, fallbackVoice: string): TemplateLine[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([^:：]{1,30})[:：]\s*(.+)$/)
      return m ? { voice: m[1].trim(), text: m[2].trim() } : { voice: fallbackVoice, text: l }
    })
}

export function toPaste(lines: TemplateLine[]) {
  return lines.map((l) => `${l.voice}: ${l.text}`).join('\n')
}

/** Accepts {lines:[...]} or [...]; each item {voice|speaker, text, style?} */
export function parseJson(raw: string): TemplateLine[] {
  const data = JSON.parse(raw)
  const arr = Array.isArray(data) ? data : data.lines
  if (!Array.isArray(arr)) throw new Error('JSON must be an array or { "lines": [...] }')
  return arr.map((x: Record<string, string>) => {
    if (!x.text) throw new Error('Each line needs a "text" field')
    return { voice: x.voice ?? x.speaker ?? 'ChingChang', text: String(x.text), style: x.style }
  })
}

// ---------- big mock library (to test "lots of voices") ----------
const F_NAMES = ['Sreypov', 'Bopha', 'Chanthy', 'Sokha', 'Malis', 'Rachana', 'Kanha', 'Sophea', 'Davy', 'Nary', 'Leakena', 'Pisey', 'Emma', 'Olivia', 'Mai', 'Linh', 'Ploy', 'Mei', 'Yuna', 'Sara', 'Nita', 'Thida', 'Vanna', 'Kalliyan', 'Sreyneang', 'Chenda', 'Lina', 'Rita', 'Monika', 'Sopheap']
const M_NAMES = ['Dara', 'Vibol', 'Sokun', 'Rithy', 'Piseth', 'Visal', 'Chamroeun', 'Kosal', 'Sambath', 'Narith', 'Bunthoeun', 'Liam', 'Noah', 'Minh', 'Somchai', 'Wei', 'Kenji', 'Arun', 'Rotha', 'Panha', 'Seyha', 'Vuthy', 'Makara', 'Chhay', 'Heng', 'Phalla', 'Tola', 'Samnang', 'Ratanak', 'Kimhong']
const LANGS = ['km-KH', 'km-KH', 'km-KH', 'en-US', 'th-TH', 'vi-VN', 'zh-CN']
const TAGS = ['narration', 'news', 'calm', 'energetic', 'kids', 'podcast', 'ads', 'audiobook', 'warm', 'deep', 'young', 'elder']
const PALETTE = [
  { color: 'bg-[#1f63a8]', tint: 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/40' },
  { color: 'bg-[#be123c]', tint: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40' },
  { color: 'bg-[#4f2bd6]', tint: 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40' },
  { color: 'bg-emerald-700', tint: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40' },
  { color: 'bg-amber-600', tint: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40' },
]

export const EXTRA_VOICES: Voice[] = [...F_NAMES.map((n) => [n, 'female'] as const), ...M_NAMES.map((n) => [n, 'male'] as const)].map(([name, gender], i) => ({
  id: `lib-${name.toLowerCase()}`,
  name,
  kind: i % 9 === 4 ? 'custom' : 'preset',
  lang: LANGS[i % LANGS.length],
  ...PALETTE[(i * 7) % PALETTE.length],
  sampleSec: 8 + (i % 8),
  samples: i % 9 === 4 ? 1 + (i % 5) : undefined,
  status: i % 17 === 5 ? 'Processing' : 'Ready',
  gender,
  tags: [TAGS[i % TAGS.length], TAGS[(i * 5 + 3) % TAGS.length]].filter((t, k, a) => a.indexOf(t) === k),
}))

// ---------- projects ----------
export type Project = { id: string; title: string; description: string; updatedAt: Date; createdAt: Date; lines: Line[] }

const fromTemplate = (t: TemplateLine[], voiceIds: Record<string, string>): Line[] =>
  t.map((x, i) => ({
    id: uid('line'),
    voiceId: voiceIds[x.voice] ?? x.voice.toLowerCase(),
    styleHint: x.style ?? '',
    text: x.text,
    versions: [{ id: uid('v'), n: 1, duration: Math.max(2, x.text.length / 14) + (i % 3) * 0.4 }],
    activeVersion: 0,
    dirty: false,
  }))

export function initialProjects(): Project[] {
  const ids = { ChingChang: 'chingchang', womanvoice: 'womanvoice' }
  const day = 864e5
  const base = new Date('2026-11-04T13:16:09').getTime()
  const stamp = (t: number) => {
    const d = new Date(t)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  }
  const list: Project[] = [
    { id: 'p-main', title: 'talk-20261104T131609', description: '', createdAt: new Date(base), updatedAt: new Date(base), lines: initialLines() },
  ]
  const kinds = ['meme', 'meme', 'meme', 'talk', 'rolork-demo', 'probe', 'សួស្តី', 'voice-test', 'ads', 'story']
  for (let i = 1; i < 70; i++) {
    const t = base - i * 3.1 * 36e5 - Math.floor(i / 12) * day
    const k = kinds[(i * 7) % kinds.length]
    const tpl = TEMPLATES[i % TEMPLATES.length].lines
    const n = k === 'probe' || k === 'សួស្តី' || k === 'voice-test' ? 1 : 1 + ((i * 5) % 10)
    const lines = fromTemplate(Array.from({ length: n }, (_, j) => tpl[j % tpl.length]), ids)
    if (i % 6 === 0) lines.forEach((l) => ((l.dirty = true), (l.versions = []), (l.activeVersion = -1)))
    list.push({
      id: `p-${i}`,
      title: k === 'meme' || k === 'talk' ? `${k}-${stamp(t)}` : k,
      description: i % 8 === 3 ? 'Khmer dialogue for TikTok video' : '',
      createdAt: new Date(t),
      updatedAt: new Date(t),
      lines,
    })
  }
  return list
}
