// Сигнатуры guidance.js для TS-потребителей — движок пока остаётся на JS.
// Сами типы живут в ./types; этот файл будет удалён при переводе guidance на TS.
import type { Child, DaySleepSummary, Guidance, Milestone, SleepEvent, SleepNorms, BuildGuidanceArgs } from './types'

export type * from './types'

export function buildGuidance(args: BuildGuidanceArgs): Guidance

export function nightBedtimeStart(events: SleepEvent[], now?: number): number | null

export function milestoneToday(child: Child | null | undefined, now?: number): Milestone | null

export function metNorms(
  summary: Pick<DaySleepSummary, 'daySleepMin' | 'totalSleepMin'>,
  norms: SleepNorms
): { dayOk: boolean; totalOk: boolean; all: boolean }
