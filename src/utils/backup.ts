import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import dayjs from 'dayjs'
import { listChildren, listAllEvents, replaceAll, mergeAll } from '../db'

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

// Импорт: выбираем файл через системный пикер, читаем и заливаем в SQLite.
// Возвращает null, если пользователь отменил выбор.
export async function importBackup({ replace }: { replace: boolean }): Promise<{ children: number; events: number } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })
  if (result.canceled || !result.assets?.length) return null

  const picked = new File(result.assets[0].uri)
  const text = await picked.text()
  const data = JSON.parse(text)

  if (data.app !== APP_ID || !Array.isArray(data.children) || !Array.isArray(data.events)) {
    throw new Error('Файл не похож на резервную копию этого приложения')
  }

  if (replace) await replaceAll(data.children, data.events)
  else await mergeAll(data.children, data.events)

  return { children: data.children.length, events: data.events.length }
}
