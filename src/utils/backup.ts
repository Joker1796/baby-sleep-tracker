import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import dayjs from 'dayjs'
import { listChildren, listAllEvents, replaceAll, mergeAll } from '../db'
import { useChildrenStore, selectActiveChild } from '../store/children'
import { useEventsStore } from '../store/events'

const APP_ID = 'babySleepTracker'

// Экспорт: собираем JSON (та же структура, что в web-версии) во временный файл
// и открываем системный диалог «Поделиться». Заменяет Blob + <a download>.
export async function exportBackup(): Promise<void> {
  const data = {
    app: APP_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    children: await listChildren(),
    events: await listAllEvents()
  }
  const file = new File(Paths.cache, `baby-tracker-${dayjs().format('YYYY-MM-DD')}.json`)
  try {
    file.create({ overwrite: true })
  } catch {
    /* уже существует */
  }
  file.write(JSON.stringify(data, null, 2))

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Сохранить резервную копию' })
  }
}

// Минимальная валидация записей из бэкапа: без id/type/startedAt запись
// уронит вставку или сломает расчёты — такие пропускаем и считаем.
function isValidChild(c: any): boolean {
  return !!c && typeof c === 'object' && typeof c.id === 'string' && c.id.length > 0 && typeof c.birthDate === 'string'
}

function isValidEvent(e: any): boolean {
  return (
    !!e &&
    typeof e === 'object' &&
    typeof e.id === 'string' &&
    e.id.length > 0 &&
    typeof e.type === 'string' &&
    typeof e.startedAt === 'number' &&
    Number.isFinite(e.startedAt)
  )
}

export interface ImportResult {
  children: number
  events: number
  skipped: number
}

// Импорт: выбираем файл через системный пикер, читаем и заливаем в SQLite.
// Возвращает null, если пользователь отменил выбор.
export async function importBackup({ replace }: { replace: boolean }): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })
  if (result.canceled || !result.assets?.length) return null

  const picked = new File(result.assets[0].uri)
  const text = await picked.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Файл повреждён — это не корректный JSON')
  }

  if (data?.app !== APP_ID || !Array.isArray(data.children) || !Array.isArray(data.events)) {
    throw new Error('Файл не похож на резервную копию этого приложения')
  }

  const children = data.children.filter(isValidChild)
  const events = data.events.filter(isValidEvent)
  const skipped = data.children.length - children.length + (data.events.length - events.length)
  if (!children.length && !events.length) {
    throw new Error('В файле нет ни одной корректной записи')
  }

  if (replace) await replaceAll(children, events)
  else await mergeAll(children, events)

  return { children: children.length, events: events.length, skipped }
}

// После импорта (или удаления профиля) перечитываем сторы из БД и события
// актуального активного ребёнка. Общий шаг для онбординга и настроек.
export async function reloadStores(): Promise<void> {
  const children = useChildrenStore.getState()
  await children.load()
  const active = selectActiveChild(useChildrenStore.getState())
  if (!active) return
  if (useChildrenStore.getState().activeChildId !== active.id) children.setActive(active.id)
  await useEventsStore.getState().load(active.id)
}
