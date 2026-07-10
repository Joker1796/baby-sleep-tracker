// Доменные типы движка подсказок и анализа сна. Единственный источник правды
// для logic/ и data/; UI может импортировать их отсюда или через реэкспорты.
import type { SleepEvent } from '../store/events'
import type { Child } from '../store/children'

// Доменные сущности живут в сторе (персистентность — их контракт),
// здесь — реэкспорт, чтобы logic/ не зависел от стора в каждом файле.
export type { SleepEvent } from '../store/events'
export type { Child, ChildRegime, MainButton } from '../store/children'

// Запись реестра типов событий (data/eventTypes). Реестр индексируется
// произвольными строковыми id (бэкапы могут содержать неизвестные типы),
// поэтому EVENT_TYPES — Record<string, EventTypeDef>, а не узкий объект.
export interface EventTypeDef {
  id: string
  label: string
  kind: 'interval' | 'point'
  icon: string
  color?: string
  softColor?: string
  btnLabel?: string
  activeLabel?: string
  startLabel?: string
  endLabel?: string
  canTime?: boolean
  hasNote?: boolean
  notePlaceholder?: string
  amountUnit?: string
  amountAgg?: 'sum' | 'last'
  minAgeM?: number
}

// Элемент SLEEP_NORMS / результат regimeToNorms.
export interface SleepNorms {
  fromM: number
  toM: number
  label: string
  wakeWindow: [number, number]
  naps: [number, number]
  daySleep: [number, number]
  nightSleep: [number, number]
  totalSleep: [number, number]
  bedtime: [string, string]
  note: string
}

// Результат sleepAnalyzer.currentState.
export interface SleepState {
  sleeping: SleepEvent | null
  lastCompleted: SleepEvent | null
  lastWakeAt: number | null
  awakeMin: number | null
  sleepingMin: number | null
}

// Результат sleepAnalyzer.analyzeDay.
export interface DaySleepSummary {
  sessions: SleepEvent[]
  naps: SleepEvent[]
  napCount: number
  daySleepMin: number
  nightSleepMin: number
  totalSleepMin: number
  awakeMin: number
  wakeWindowMin: number
}

// Персональная подсказка движка-советника (advisorRules).
export interface Advice {
  id: string
  priority: number
  text: string
  tipId: string | null
  general: boolean
  profile: boolean
}

// Результат advisor.buildAdvice.
export interface AdvisorResult {
  ageM: number
  norms: SleepNorms
  state: SleepState
  today: DaySleepSummary
  wakeWindowMin: number
  windDownMin: number
  wakeProgress: number | null
  nextNapAt: number | null
  wakeWindowLeft: number | null
  bedtimeAt: number
  nextIsNight: boolean
  advices: Advice[]
}

// Контекст правил советника: собирается в advisor.buildAdvice и передаётся
// в when/text каждого правила (см. комментарий в data/advisorRules).
export interface AdvisorCtx extends SleepState {
  now: number
  hour: number
  child: Child
  ageM: number
  norms: SleepNorms
  today: DaySleepSummary
  todayEvents: SleepEvent[]
  feeding: string | null
  aids: string[]
  usesAid: (id: string) => boolean
  lastNap: SleepEvent | null
  lastNapMin: number | null
  shortLastNap: boolean
  wakeWindowMin: number
  nextNapAt: number | null
  wakeWindowLeft: number | null
  bedtimeAt: number
  nextIsNight: boolean
  daySleepDeficit: boolean
  hasToday: (type: string) => boolean
  t: (ts: number) => string
  dur: (min: number) => string
}

// Правило советника. when — условие показа, text — текст подсказки;
// оба получают AdvisorCtx. tipId — ссылка на статью базы знаний.
export interface AdvisorRule {
  id: string
  priority: number
  when: (ctx: AdvisorCtx) => boolean
  text: (ctx: AdvisorCtx) => string
  tipId?: string
  general?: boolean
  profile?: boolean
}

export type GuidancePhase =
  'no-data' | 'active' | 'wind-down' | 'time-to-sleep' | 'night-waking' | 'settling' | 'nap-extension' | 'sleeping'

export interface ActivityIdea {
  title: string
  text: string
}

export interface ChecklistItem {
  id: string
  type: string
  label: string
  scope: string
}

export interface SettlingLocation {
  id: string
  icon: string
  label: string
}

export interface Milestone {
  months: number
  years?: number
  isYear: boolean
  text: string
}

export interface Greeting {
  line: string
  achievements: string[]
  attention: string[]
  // null, когда для возраста нет этапа (stageProgressFor); .d.ts объявлял
  // string и расходился с реальностью — тип исправлен при миграции на TS.
  progress: string | null
}

export interface Guidance {
  phase: GuidancePhase
  advisor: AdvisorResult
  nextNapAt: number | null
  bedtimeAt: number
  nextIsNight: boolean
  hasBathToday: boolean
  isNight: boolean
  isNightWaking: boolean
  wakeSince: number | null
  headline: string
  lines: string[]
  activities: ActivityIdea[]
  suggestBath: boolean
  showStartSettling: boolean
  wakeChecklist: ChecklistItem[]
  steps: string[]
  locationOptions: SettlingLocation[]
  location: string | null
  settlingMin: number
  showExtendNap: boolean
  extensionMin: number
  achievement: { text: string } | null
  encouragement: { text: string } | null
  greeting: Greeting | null
  milestone: Milestone | null
}

// Аргументы buildGuidance (вынесены в тип: их используют и .d.ts, и экраны).
export interface BuildGuidanceArgs {
  child: Child
  events: SleepEvent[]
  now?: number
  settling?: { startedAt: number; location?: string | null } | null
  extension?: { startedAt: number } | null
}
