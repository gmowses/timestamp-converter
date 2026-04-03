import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Clock, Sun, Moon, Languages, RefreshCw } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'Timestamp Converter',
    subtitle: 'Convert Unix timestamps to human-readable dates and vice versa. Everything runs client-side.',
    currentTs: 'Current Timestamp',
    currentTsDesc: 'Live Unix timestamp (updates every second)',
    seconds: 'Seconds',
    milliseconds: 'Milliseconds',
    tsToDate: 'Timestamp to Date',
    tsToDateDesc: 'Enter a Unix timestamp to convert',
    inputPlaceholder: 'Unix timestamp (e.g. 1700000000)',
    now: 'Now',
    convert: 'Convert',
    autoDetect: 'Auto-detected:',
    dateToTs: 'Date to Timestamp',
    dateToTsDesc: 'Pick a date and time to convert to Unix timestamp',
    results: 'Conversion Results',
    resultsDesc: 'Formatted in multiple common standards',
    timezone: 'Timezone',
    copyAll: 'Copy all',
    copied: 'Copied!',
    copy: 'Copy',
    invalidTs: 'Invalid timestamp. Please enter a valid number.',
    formats: {
      iso8601: 'ISO 8601',
      utc: 'UTC',
      local: 'Local time',
      relative: 'Relative',
      rfc2822: 'RFC 2822',
      unixSec: 'Unix seconds',
      unixMs: 'Unix milliseconds',
    },
    timezones: {
      utc: 'UTC',
      local: 'Local',
      eastern: 'US/Eastern',
      pacific: 'US/Pacific',
      london: 'Europe/London',
      saoPaulo: 'America/Sao Paulo',
      tokyo: 'Asia/Tokyo',
    },
    builtBy: 'Built by',
  },
  pt: {
    title: 'Conversor de Timestamp',
    subtitle: 'Converta timestamps Unix para datas e vice-versa. Tudo roda no navegador.',
    currentTs: 'Timestamp Atual',
    currentTsDesc: 'Timestamp Unix em tempo real (atualiza a cada segundo)',
    seconds: 'Segundos',
    milliseconds: 'Milissegundos',
    tsToDate: 'Timestamp para Data',
    tsToDateDesc: 'Insira um timestamp Unix para converter',
    inputPlaceholder: 'Timestamp Unix (ex: 1700000000)',
    now: 'Agora',
    convert: 'Converter',
    autoDetect: 'Detectado automaticamente:',
    dateToTs: 'Data para Timestamp',
    dateToTsDesc: 'Escolha data e hora para converter para timestamp Unix',
    results: 'Resultados da Conversao',
    resultsDesc: 'Formatado em varios padroes comuns',
    timezone: 'Fuso horario',
    copyAll: 'Copiar tudo',
    copied: 'Copiado!',
    copy: 'Copiar',
    invalidTs: 'Timestamp invalido. Insira um numero valido.',
    formats: {
      iso8601: 'ISO 8601',
      utc: 'UTC',
      local: 'Hora local',
      relative: 'Relativo',
      rfc2822: 'RFC 2822',
      unixSec: 'Unix segundos',
      unixMs: 'Unix milissegundos',
    },
    timezones: {
      utc: 'UTC',
      local: 'Local',
      eastern: 'US/Leste',
      pacific: 'US/Pacifico',
      london: 'Europa/Londres',
      saoPaulo: 'America/Sao Paulo',
      tokyo: 'Asia/Toquio',
    },
    builtBy: 'Criado por',
  },
} as const

type Lang = keyof typeof translations

// ── Timezone config ───────────────────────────────────────────────────────────
const TIMEZONE_MAP = {
  utc: 'UTC',
  local: undefined, // use browser local
  eastern: 'America/New_York',
  pacific: 'America/Los_Angeles',
  london: 'Europe/London',
  saoPaulo: 'America/Sao_Paulo',
  tokyo: 'Asia/Tokyo',
} as const

type TzKey = keyof typeof TIMEZONE_MAP

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectUnit(raw: string): 'seconds' | 'milliseconds' {
  const n = raw.trim().replace(/^-/, '')
  // timestamps >= 13 digits are very likely milliseconds
  return n.length >= 13 ? 'milliseconds' : 'seconds'
}

function toMs(raw: string): number {
  const n = Number(raw.trim())
  return detectUnit(raw) === 'milliseconds' ? n : n * 1000
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms
  const abs = Math.abs(diff)
  const future = diff < 0

  const sec = Math.round(abs / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  const mon = Math.round(day / 30.44)
  const yr = Math.round(mon / 12)

  let label: string
  if (sec < 5) label = 'just now'
  else if (sec < 60) label = `${sec} seconds`
  else if (min < 60) label = `${min} minute${min !== 1 ? 's' : ''}`
  else if (hr < 24) label = `${hr} hour${hr !== 1 ? 's' : ''}`
  else if (day < 30) label = `${day} day${day !== 1 ? 's' : ''}`
  else if (mon < 12) label = `${mon} month${mon !== 1 ? 's' : ''}`
  else label = `${yr} year${yr !== 1 ? 's' : ''}`

  if (sec < 5) return label
  return future ? `in ${label}` : `${label} ago`
}

function toISO8601(date: Date, tzKey: TzKey): string {
  if (tzKey === 'utc') return date.toISOString()
  const tz = TIMEZONE_MAP[tzKey]
  if (!tz) return date.toISOString().replace('Z', getLocalOffset(date))
  // format with explicit timezone offset
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: tz, timeZoneName: 'shortOffset',
  }
  const parts = new Intl.DateTimeFormat('en-CA', opts).formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const offset = get('timeZoneName').replace('GMT', '')
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${offset || '+00:00'}`
}

function getLocalOffset(date: Date): string {
  const off = -date.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const m = String(Math.abs(off) % 60).padStart(2, '0')
  return `${sign}${h}:${m}`
}

function toRFC2822(date: Date, tzKey: TzKey): string {
  const tz = TIMEZONE_MAP[tzKey]
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZoneName: 'shortOffset',
    ...(tz ? { timeZone: tz } : {}),
  }
  return date.toLocaleString('en-US', opts)
    .replace(',', '')
    .replace(' at ', ' ')
}

function toUTCString(date: Date): string {
  return date.toUTCString()
}

function toLocalString(date: Date, tzKey: TzKey): string {
  const tz = TIMEZONE_MAP[tzKey]
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZoneName: 'long',
    ...(tz ? { timeZone: tz } : {}),
  }
  return date.toLocaleString('en-US', opts)
}

function nowDatetimeLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function getConversions(ms: number, tzKey: TzKey) {
  const date = new Date(ms)
  return {
    iso8601: toISO8601(date, tzKey),
    utc: toUTCString(date),
    local: toLocalString(date, tzKey),
    relative: formatRelative(ms),
    rfc2822: toRFC2822(date, tzKey),
    unixSec: String(Math.floor(ms / 1000)),
    unixMs: String(ms),
  }
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ text, label, small = false }: { text: string; label: string; small?: boolean }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handle}
      title={label}
      className={`flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 ${small ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs font-medium'}`}
    >
      {copied ? <Check size={12} className="text-sky-500" /> : <Copy size={12} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TimestampConverter() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [tzKey, setTzKey] = useState<TzKey>('local')

  // live clock
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // timestamp -> date
  const [tsInput, setTsInput] = useState('')
  const [tsError, setTsError] = useState('')
  const [tsMs, setTsMs] = useState<number | null>(null)
  const detectedUnit = tsInput ? detectUnit(tsInput) : null

  // date -> timestamp
  const [dateInput, setDateInput] = useState(nowDatetimeLocal)
  const dateMs = dateInput ? new Date(dateInput).getTime() : null

  // which result set to show: 'ts' or 'date'
  const [activePanel, setActivePanel] = useState<'ts' | 'date'>('ts')
  const resultMs = activePanel === 'ts' ? tsMs : dateMs
  const conversions = resultMs != null ? getConversions(resultMs, tzKey) : null

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const t = translations[lang]

  const handleConvert = useCallback(() => {
    if (!tsInput.trim()) { setTsError(t.invalidTs); return }
    const n = Number(tsInput.trim())
    if (isNaN(n)) { setTsError(t.invalidTs); return }
    setTsError('')
    const ms = toMs(tsInput)
    setTsMs(ms)
    setActivePanel('ts')
  }, [tsInput, t])

  const handleNow = () => {
    const now = String(Math.floor(Date.now() / 1000))
    setTsInput(now)
    const ms = Number(now) * 1000
    setTsMs(ms)
    setActivePanel('ts')
    setTsError('')
  }

  const handleDateChange = (v: string) => {
    setDateInput(v)
    setActivePanel('date')
  }

  const buildCopyAll = () => {
    if (!conversions) return ''
    const entries = Object.entries(conversions) as [keyof typeof conversions, string][]
    return entries.map(([k, v]) => `${t.formats[k]}: ${v}`).join('\n')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <Clock size={18} className="text-white" />
            </div>
            <span className="font-semibold">Timestamp Converter</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle language"
            >
              <Languages size={14} />
              {lang.toUpperCase()}
            </button>
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle theme"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a
              href="https://github.com/gmowses/timestamp-converter"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Live clock */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                  </span>
                  {t.currentTs}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{t.currentTsDesc}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">{t.seconds}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-lg tabular-nums text-sky-500">
                      {Math.floor(nowMs / 1000)}
                    </span>
                    <CopyButton text={String(Math.floor(nowMs / 1000))} label={t.copy} small />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">{t.milliseconds}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-lg tabular-nums text-sky-500">
                      {nowMs}
                    </span>
                    <CopyButton text={String(nowMs)} label={t.copy} small />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Timestamp -> Date */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
              <div>
                <h2 className="font-semibold">{t.tsToDate}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.tsToDateDesc}</p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tsInput}
                    onChange={e => { setTsInput(e.target.value); setTsError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleConvert()}
                    placeholder={t.inputPlaceholder}
                    className="flex-1 min-w-0 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-zinc-400"
                  />
                  <button
                    onClick={handleNow}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title={t.now}
                  >
                    <RefreshCw size={14} />
                    {t.now}
                  </button>
                </div>

                {detectedUnit && tsInput && (
                  <p className="text-xs text-zinc-400">
                    {t.autoDetect} <span className="text-sky-500 font-medium">{detectedUnit === 'seconds' ? t.seconds : t.milliseconds}</span>
                  </p>
                )}

                {tsError && (
                  <p className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                    {tsError}
                  </p>
                )}

                <button
                  onClick={handleConvert}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
                >
                  <Clock size={15} />
                  {t.convert}
                </button>
              </div>
            </div>

            {/* Date -> Timestamp */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
              <div>
                <h2 className="font-semibold">{t.dateToTs}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.dateToTsDesc}</p>
              </div>

              <div className="space-y-3">
                <input
                  type="datetime-local"
                  value={dateInput}
                  onChange={e => handleDateChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent [color-scheme:light] dark:[color-scheme:dark]"
                />

                {dateMs != null && !isNaN(dateMs) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{t.seconds}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold tabular-nums truncate">{Math.floor(dateMs / 1000)}</span>
                        <CopyButton text={String(Math.floor(dateMs / 1000))} label={t.copy} small />
                      </div>
                    </div>
                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{t.milliseconds}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold tabular-nums truncate">{dateMs}</span>
                        <CopyButton text={String(dateMs)} label={t.copy} small />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setActivePanel('date')}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
                >
                  <Clock size={15} />
                  {t.convert}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {conversions && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-semibold">{t.results}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.resultsDesc}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Timezone selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">{t.timezone}:</label>
                    <select
                      value={tzKey}
                      onChange={e => setTzKey(e.target.value as TzKey)}
                      className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {(Object.keys(TIMEZONE_MAP) as TzKey[]).map(k => (
                        <option key={k} value={k}>{t.timezones[k]}</option>
                      ))}
                    </select>
                  </div>
                  <CopyButton text={buildCopyAll()} label={t.copyAll} />
                </div>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(Object.entries(conversions) as [keyof typeof conversions, string][]).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">{t.formats[key]}</p>
                      <p className="font-mono text-sm break-all text-zinc-800 dark:text-zinc-200">{value}</p>
                    </div>
                    <CopyButton text={value} label={t.copy} small />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>
            {t.builtBy}{' '}
            <a
              href="https://github.com/gmowses"
              className="text-zinc-600 dark:text-zinc-300 hover:text-sky-500 transition-colors"
            >
              Gabriel Mowses
            </a>
          </span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
