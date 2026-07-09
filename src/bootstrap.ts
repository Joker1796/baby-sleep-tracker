import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { initDb } from './db'
import { loadTimeOffset } from './time/now'
import { useSettingsStore } from './store/settings'
import { useSettlingStore } from './store/settling'
import { useChildrenStore, selectActiveChild } from './store/children'
import { useEventsStore } from './store/events'
import { initNapReminders } from './notifications/napReminder'

// Инициализация приложения при старте. В web всё грузилось синхронно из
// localStorage; здесь SQLite и AsyncStorage асинхронны, поэтому bootstrap
// выполняется под сплэшем/лоадером до первого рендера контента.
export async function bootstrap(): Promise<void> {
  dayjs.locale('ru')

  await initDb()
  await loadTimeOffset()
  await Promise.all([useSettingsStore.getState().load(), useSettlingStore.getState().load()])

  await useChildrenStore.getState().load()
  const active = selectActiveChild(useChildrenStore.getState())
  if (active) await useEventsStore.getState().load(active.id)

  // После загрузки сторов: подписки на изменения + первичное планирование.
  initNapReminders()
}
