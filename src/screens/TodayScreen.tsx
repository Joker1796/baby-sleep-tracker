import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { useActiveChild, useChildrenStore } from '../store/children'
import { useSorted, useCurrentSleep } from '../store/events'
import { useSettlingStore, useSettlingSession, useNapExtension, useDismissedToday, useDismissedAdvice } from '../store/settling'
import { useNow } from '../time/now'
import { buildGuidance, Guidance } from '../logic/guidance'
import { formatDurationMin, plural, ageInMonths } from '../logic/age'
import { sleepVerb, wakeVerb } from '../logic/gender'
import ChildSwitcher from '../components/ChildSwitcher'
import SleepButton from '../components/SleepButton'
import SettlingFlow from '../components/SettlingFlow'
import DayGreeting from '../components/DayGreeting'
import EventButtons from '../components/EventButtons'
import EventEditSheet, { EventModel } from '../components/EventEditSheet'
import AdviceCard from '../components/AdviceCard'
import QuickTopics from '../components/QuickTopics'
import { Card, Btn, Toast } from '../components/ui'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export default function TodayScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const child = useActiveChild()
  const childId = child?.id
  const events = useSorted()
  const currentSleep = useCurrentSleep()
  const now = useNow()

  // Точечные подписки: guidance пересчитывается только от своих входов,
  // а не от любого изменения стора укладывания.
  const settlingSession = useSettlingSession(childId)
  const napExtension = useNapExtension(childId)
  const greetingDismissed = useDismissedToday('greeting', childId)
  const milestoneDismissed = useDismissedToday('milestone', childId)
  const encouragementDismissed = useDismissedToday('encouragement', childId)
  const aidsHintDismissed = useDismissedToday('aidsHint', childId)
  const dismissedAdvice = useDismissedAdvice(childId)
  const settling = useSettlingStore.getState

  const [toast, setToast] = useState('')
  const [sheetModel, setSheetModel] = useState<EventModel>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    []
  )

  const guidance = useMemo<Guidance | null>(() => {
    if (!child) return null
    return buildGuidance({ child, events, now, settling: settlingSession, extension: napExtension })
  }, [child, events, now, settlingSession, napExtension])

  // Если малыш заснул — закрываем сессии укладывания и продления.
  useEffect(() => {
    if (currentSleep && childId) {
      if (settling().sessions[childId]) settling().clear(childId)
      if (settling().extensions[childId]) settling().clearExtension(childId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSleep?.id])

  if (!child || !guidance) {
    return <View style={[s.screen]} />
  }

  const advice = guidance.advisor
  const isNightWaking = guidance.isNightWaking
  const st = advice.state
  const sleptWord = sleepVerb(child?.gender).toLowerCase()
  const wokeWord = wakeVerb(child?.gender).toLowerCase()
  let status: { icon: string; title: string; sub: string | null }
  if (st.sleeping) {
    status = {
      icon: '😴',
      title: `Спит ${formatDurationMin(st.sleepingMin)}`,
      sub: `${sleptWord} в ${dayjs(st.sleeping.startedAt).format('HH:mm')}`
    }
  } else if (isNightWaking && st.lastWakeAt != null) {
    status = { icon: '🌙', title: 'Ночное пробуждение', sub: `${wokeWord} в ${dayjs(st.lastWakeAt).format('HH:mm')} · уложите обратно` }
  } else if (st.awakeMin != null) {
    status = { icon: '🙂', title: `Бодрствует ${formatDurationMin(st.awakeMin)}`, sub: null }
  } else {
    status = { icon: '🍼', title: 'Нет данных о сне', sub: 'отметьте засыпание и пробуждение' }
  }

  const wokeAtLabel = st.lastWakeAt != null ? `${wokeWord} в ${dayjs(st.lastWakeAt).format('HH:mm')}` : ''
  const rawProgress = advice.wakeProgress
  const progress = rawProgress == null ? null : Math.min(rawProgress, 1.15)
  const left = advice.wakeWindowLeft
  const timeToSleepLabel = left == null ? '' : left > 0 ? `время до сна ~${formatDurationMin(left)}` : 'пора укладывать'

  // «Скрывать подсказки» из профиля: приветствие, поддержка и карточки-подсказки.
  // Поздравления (milestone) и кубок дня остаются.
  const hideHints = !!child.hideHints
  const showSleepButton = !['settling', 'nap-extension'].includes(guidance.phase)
  const greeting = !hideHints && !greetingDismissed ? guidance.greeting : null
  const milestone = !milestoneDismissed ? guidance.milestone : null
  const encouragement = !hideHints && !encouragementDismissed ? guidance.encouragement : null

  const dismissedToday = dismissedAdvice && dismissedAdvice.date === new Date(now).toDateString() ? dismissedAdvice.ids : []
  const secondaryAdvices = advice.advices.filter(a => !a.general).slice(0, 4)
  const visibleAdvices = hideHints ? [] : secondaryAdvices.filter(a => !a.profile || !dismissedToday.includes(a.id))

  const regimeMode = child.regime?.mode || 'auto'
  function toggleRegime() {
    if (child) useChildrenStore.getState().toggleRegimeMode(child.id)
  }

  const showWwBar = progress != null && !st.sleeping && !isNightWaking

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        <ChildSwitcher />

        {milestone && (
          <Card style={[styles.milestone, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Pressable
              style={styles.cardClose}
              hitSlop={8}
              onPress={() => settling().dismiss('milestone', child.id)}
              accessibilityRole="button"
              accessibilityLabel="Скрыть поздравление"
            >
              <Ionicons name="close" size={22} color={colors.textSoft} />
            </Pressable>
            <Text style={{ fontSize: 30 }}>{milestone.isYear ? '🎂' : '🎉'}</Text>
            <Text style={[styles.milestoneText, { color: colors.text }]}>{milestone.text}</Text>
          </Card>
        )}

        {greeting && <DayGreeting greeting={greeting} onDismiss={() => settling().dismiss('greeting', child.id)} />}

        {!(child.aids && child.aids.length) && !aidsHintDismissed && (
          <Card style={[styles.aidsHint, { backgroundColor: colors.infoSoft, borderColor: colors.info }]}>
            <Pressable
              style={styles.cardClose}
              hitSlop={8}
              onPress={() => settling().dismiss('aidsHint', child.id)}
              accessibilityRole="button"
              accessibilityLabel="Скрыть подсказку о настройках"
            >
              <Ionicons name="close" size={22} color={colors.textSoft} />
            </Pressable>
            <Text style={{ fontSize: 24 }}>⚙️</Text>
            <View style={s.grow}>
              <Text style={[styles.rowText, { color: colors.text, marginBottom: 6 }]}>
                Настройте под ребёнка: укачивание, соска, блэкаут и другое — подсказки станут точнее.
              </Text>
              <Pressable onPress={() => navigation.navigate('settings')}>
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Открыть настройки →</Text>
              </Pressable>
            </View>
          </Card>
        )}

        <Card>
          <View style={s.row}>
            <Text style={{ fontSize: 34 }}>{status.icon}</Text>
            <View style={s.grow}>
              <Text style={[styles.statusTitle, { color: colors.text }]}>{status.title}</Text>
              {status.sub ? <Text style={[s.muted, s.small]}>{status.sub}</Text> : null}
            </View>
            <Pressable
              onPress={toggleRegime}
              style={[
                styles.regimeToggle,
                {
                  borderColor: regimeMode === 'custom' ? colors.primary : colors.border,
                  backgroundColor: regimeMode === 'custom' ? colors.primarySoft : colors.surface2
                }
              ]}
            >
              <Text style={{ color: regimeMode === 'custom' ? colors.primary : colors.textSoft, fontSize: 12, fontWeight: '600' }}>
                {regimeMode === 'custom' ? '🎛️ Свой' : '✨ Авто'}
              </Text>
            </Pressable>
          </View>

          {showWwBar && (
            <View style={styles.ww}>
              <View style={[styles.wwBar, { backgroundColor: colors.surface2 }]}>
                <View style={[styles.wwFill, { width: `${Math.min(progress!, 1) * 100}%`, backgroundColor: colors.wwTo }]} />
              </View>
              <View style={styles.wwLabels}>
                <Text style={[s.muted, s.small]}>{wokeAtLabel}</Text>
                <Text style={[s.muted, s.small]}>{timeToSleepLabel}</Text>
              </View>
            </View>
          )}

          <View style={[styles.forecast, { borderTopColor: colors.border }]}>
            <View style={styles.forecastItem}>
              <Text style={{ color: colors.textSoft, fontSize: 14 }}>Дневной сон сегодня</Text>
              <Text style={{ fontWeight: '600', color: colors.text, fontSize: 14 }}>
                {formatDurationMin(advice.today.daySleepMin)} · {advice.today.napCount}{' '}
                {plural(advice.today.napCount, 'сон', 'сна', 'снов')}
              </Text>
            </View>
          </View>
        </Card>

        {guidance.achievement && (
          <Card style={[styles.trophy, { borderColor: colors.warn }]}>
            <Text style={{ fontSize: 26 }}>🏆</Text>
            <Text style={[styles.rowText, { color: colors.text }]}>{guidance.achievement.text}</Text>
          </Card>
        )}

        {encouragement && (
          <Card style={[styles.support, { backgroundColor: colors.medicineSoft }]}>
            <Pressable
              style={styles.cardClose}
              hitSlop={8}
              onPress={() => settling().dismiss('encouragement', child.id)}
              accessibilityRole="button"
              accessibilityLabel="Скрыть поддержку"
            >
              <Ionicons name="close" size={22} color={colors.textSoft} />
            </Pressable>
            <Text style={{ fontSize: 26 }}>💛</Text>
            <Text style={[styles.rowText, { color: colors.text, paddingRight: 24 }]}>{encouragement.text}</Text>
          </Card>
        )}

        {guidance.phase !== 'active' && <SettlingFlow guidance={guidance} onSlept={() => showToast('Сладких снов 💤')} />}

        {guidance.showExtendNap && (
          <Btn title="🔁 Продлить сон" block onPress={() => settling().startExtension(child.id)} style={{ marginBottom: 12 }} />
        )}

        {showSleepButton && <SleepButton />}
        <EventButtons onLogged={showToast} onEdit={setSheetModel} />

        {guidance.phase === 'active' && <SettlingFlow guidance={guidance} onSlept={() => showToast('Сладких снов 💤')} />}

        {visibleAdvices.length > 0 && (
          <>
            <Text style={[s.cardTitle, { marginBottom: 6 }]}>Ещё подсказки</Text>
            {visibleAdvices.map(a => (
              <AdviceCard key={a.id} advice={a} dismissible={a.profile} onDismiss={() => settling().dismissAdvice(child.id, a.id)} />
            ))}
          </>
        )}

        {ageInMonths(child.birthDate, now) < 12 && (
          <>
            <Text style={[s.cardTitle, { marginTop: 4 }]}>Быстрые темы</Text>
            <QuickTopics />
          </>
        )}
      </ScrollView>

      <Toast message={toast} bottom={insets.bottom + 12} />

      <EventEditSheet model={sheetModel} onClose={() => setSheetModel(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  cardClose: { position: 'absolute', top: 6, right: 10, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  aidsHint: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1, position: 'relative', paddingRight: 34 },
  milestoneText: { flex: 1, fontSize: 16, fontWeight: '700' },
  statusTitle: { fontSize: 19, fontWeight: '700' },
  regimeToggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center'
  },
  ww: { marginTop: 12 },
  wwBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  wwFill: { height: '100%', borderRadius: 4 },
  wwLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  forecast: { marginTop: 12, borderTopWidth: 1, paddingTop: 10 },
  forecastItem: { flexDirection: 'row', justifyContent: 'space-between' },
  trophy: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1 },
  support: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', position: 'relative' },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20 }
})
