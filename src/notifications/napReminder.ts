import * as Notifications from 'expo-notifications'
import { AppState, Platform } from 'react-native'
import { useEventsStore } from '../store/events'
import { useChildrenStore, selectActiveChild } from '../store/children'
import { useSettingsStore } from '../store/settings'
import { buildAdvice } from '../logic/advisor'
import { simNow } from '../time/now'

// Локальное напоминание «пора укладывать»: планируется на конец окна
// бодрствования активного ребёнка и перепланируется при каждом изменении
// событий/настроек. Работает офлайн — пуш-сервер не нужен.

const REMINDER_ID = 'nap-reminder'
const CHANNEL_ID = 'nap-reminders'

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false }
  })
  return requested.granted
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Напоминания об укладывании',
    importance: Notifications.AndroidImportance.HIGH
  })
}

async function syncNapReminder(): Promise<void> {
  // Старое напоминание в любом случае неактуально.
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {})

  if (!useSettingsStore.getState().napReminder) return
  const child = selectActiveChild(useChildrenStore.getState())
  if (!child) return
  const { events, loadedFor } = useEventsStore.getState()
  if (loadedFor !== child.id) return

  const now = simNow()
  const advice = buildAdvice({ child, events, now })
  if (advice.state.sleeping) return
  const at = advice.nextNapAt
  // Не планируем в прошлое и на ближайшую минуту — пользователь и так в приложении.
  if (at == null || at <= now + 60000) return

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: '⏰ Пора укладывать',
      body: `${child.name}: окно бодрствования заканчивается.`,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {})
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) }
  })
}

// События меняются пачками (тап → put → touchNow) — пересинхронизация с дебаунсом.
let syncTimer: ReturnType<typeof setTimeout> | null = null
export function requestReminderSync(): void {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncNapReminder().catch(() => {})
  }, 500)
}

// Вызывается из bootstrap после загрузки сторов. Идемпотентно: bootstrap
// может перезапускаться после ошибки, подписки не должны дублироваться.
let initialized = false
export function initNapReminders(): void {
  if (initialized) return
  initialized = true
  // В форграунде баннер не показываем — состояние и так на экране.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false
    })
  })
  ensureAndroidChannel().catch(() => {})

  useEventsStore.subscribe(requestReminderSync)
  useChildrenStore.subscribe(requestReminderSync)
  useSettingsStore.subscribe(requestReminderSync)
  AppState.addEventListener('change', state => {
    if (state === 'active') requestReminderSync()
  })
  requestReminderSync()
}
