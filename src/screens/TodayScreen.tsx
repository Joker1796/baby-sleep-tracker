import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { useActiveChild, useChildrenStore } from '../store/children'
import { useSorted, useCurrentSleep } from '../store/events'
import { useSettlingStore } from '../store/settling'
import { useNow } from '../time/now'
import { buildGuidance } from '../logic/guidance'
import { formatDurationMin, plural } from '../logic/age'
import ChildSwitcher from '../components/ChildSwitcher'
import SleepButton from '../components/SleepButton'
import SettlingFlow from '../components/SettlingFlow'
import DayGreeting from '../components/DayGreeting'
import EventButtons from '../components/EventButtons'
import AdviceCard from '../components/AdviceCard'
import QuickTopics from '../components/QuickTopics'
import { Card, Btn } from '../components/ui'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export default function TodayScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const child = useActiveChild()
  const events = useSorted()
  const currentSleep = useCurrentSleep()
  const now = useNow()

  // Подписываемся на весь стор укладывания, чтобы пересчитывать guidance при его изменениях.
  const settlingState = useSettlingStore()
  const settling = useSettlingStore.getState

  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  const guidance = useMemo<any>(() => {
    if (!child) return null
    return buildGuidance({
      child,
      events,
      now,
      settling: settlingState.sessions[child.id] || null,
      extension: settlingState.extensions[child.id] || null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child, events, now, settlingState])

  const advice = guidance?.advisor || null
  const isNightWaking = !!guidance?.isNightWaking

  // Если малыш заснул — закрываем сессии укладывания и продления.
  useEffect(() => {
    const id = child?.id
    if (currentSleep && id) {
      if (settling().sessions[id]) settling().clear(id)
      if (settling().extensions[id]) settling().clearExtension(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSleep?.id])

  if (!child || !advice) {
    return <View style={[s.screen]} />
  }

  const st = advice.state
  let status: { icon: string; title: string; sub: string | null }
  if (st.sleeping) {
    status = { icon: '😴', title: `Спит ${formatDurationMin(st.sleepingMin)}`, sub: `уснул(а) в ${dayjs(st.sleeping.startedAt).format('HH:mm')}` }
  } else if (isNightWaking && st.lastWakeAt != null) {
    status = { icon: '🌙', title: 'Ночное пробуждение', sub: `проснулся(ась) в ${dayjs(st.lastWakeAt).format('HH:mm')} · уложите обратно` }
  } else if (st.awakeMin != null) {
    status = { icon: '🙂', title: `Бодрствует ${formatDurationMin(st.awakeMin)}`, sub: null }
  } else {
    status = { icon: '🍼', title: 'Нет данных о сне', sub: 'отметьте засыпание и пробуждение' }
  }

  const wokeAtLabel = st.lastWakeAt != null ? `проснулся(ась) в ${dayjs(st.lastWakeAt).format('HH:mm')}` : ''
  const rawProgress = advice.wakeProgress
  const progress = rawProgress == null ? null : Math.min(rawProgress, 1.15)
  const left = advice.wakeWindowLeft
  const timeToSleepLabel = left == null ? '' : left > 0 ? `время до сна ~${formatDurationMin(left)}` : 'пора укладывать'

  const showSleepButton = guidance && !['settling', 'nap-extension'].includes(guidance.phase)
  const showGreeting = guidance?.greeting && !settling().isGreetingDismissed(child.id)
  const showMilestone = guidance?.milestone && !settling().isMilestoneDismissed(child.id)
  const showEncouragement = guidance?.encouragement && !settling().isEncouragementDismissed(child.id)

  const secondaryAdvices = (advice.advices || []).filter((a: any) => !a.general).slice(0, 4)
  const visibleAdvices = secondaryAdvices.filter((a: any) => !a.profile || !settling().isAdviceDismissed(child.id, a.id))

  const regimeMode = child.regime?.mode || 'auto'
  function toggleRegime() {
    if (child) useChildrenStore.getState().setRegimeMode(child.id, regimeMode === 'custom' ? 'auto' : 'custom')
  }

  const showWwBar = progress != null && !st.sleeping && !isNightWaking

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        <ChildSwitcher />

        {showMilestone && (
          <Card style={[styles.milestone, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Pressable style={styles.cardClose} hitSlop={8} onPress={() => settling().dismissMilestone(child.id)}>
              <Ionicons name="close" size={22} color={colors.textSoft} />
            </Pressable>
            <Text style={{ fontSize: 30 }}>{guidance!.milestone.isYear ? '🎂' : '🎉'}</Text>
            <Text style={[styles.milestoneText, { color: colors.text }]}>{guidance!.milestone.text}</Text>
          </Card>
        )}

        {showGreeting && (
          <DayGreeting greeting={guidance!.greeting} onDismiss={() => settling().dismissGreeting(child.id)} />
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
                { borderColor: regimeMode === 'custom' ? colors.primary : colors.border, backgroundColor: regimeMode === 'custom' ? colors.primarySoft : colors.surface2 }
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

        {guidance?.achievement && (
          <Card style={[styles.trophy, { borderColor: colors.warn }]}>
            <Text style={{ fontSize: 26 }}>🏆</Text>
            <Text style={[styles.rowText, { color: colors.text }]}>{guidance.achievement.text}</Text>
          </Card>
        )}

        {showEncouragement && (
          <Card style={[styles.support, { backgroundColor: colors.medicineSoft }]}>
            <Pressable style={styles.cardClose} hitSlop={8} onPress={() => settling().dismissEncouragement(child.id)}>
              <Ionicons name="close" size={22} color={colors.textSoft} />
            </Pressable>
            <Text style={{ fontSize: 26 }}>💛</Text>
            <Text style={[styles.rowText, { color: colors.text, paddingRight: 24 }]}>{guidance!.encouragement.text}</Text>
          </Card>
        )}

        {guidance && guidance.phase !== 'active' && (
          <SettlingFlow guidance={guidance} onSlept={() => showToast('Сладких снов 💤')} />
        )}

        {guidance?.showExtendNap && (
          <Btn title="🔁 Продлить сон" block onPress={() => settling().startExtension(child.id)} style={{ marginBottom: 12 }} />
        )}

        {showSleepButton && <SleepButton />}
        <EventButtons onLogged={showToast} />

        {guidance && guidance.phase === 'active' && (
          <SettlingFlow guidance={guidance} onSlept={() => showToast('Сладких снов 💤')} />
        )}

        {visibleAdvices.length > 0 && (
          <>
            <Text style={[s.cardTitle, { marginBottom: 6 }]}>Ещё подсказки</Text>
            {visibleAdvices.map((a: any) => (
              <AdviceCard key={a.id} advice={a} dismissible={a.profile} onDismiss={() => settling().dismissAdvice(child.id, a.id)} />
            ))}
          </>
        )}

        <Text style={[s.cardTitle, { marginTop: 4 }]}>Быстрые темы</Text>
        <QuickTopics />
      </ScrollView>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: colors.text, bottom: insets.bottom + 12 }]}>
          <Text style={{ color: colors.bg, fontWeight: '600', fontSize: 14 }}>{toast}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  cardClose: { position: 'absolute', top: 6, right: 10, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  milestoneText: { flex: 1, fontSize: 16, fontWeight: '700' },
  statusTitle: { fontSize: 19, fontWeight: '700' },
  regimeToggle: { paddingVertical: 6, paddingHorizontal: 10, minHeight: 30, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start', justifyContent: 'center' },
  ww: { marginTop: 12 },
  wwBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  wwFill: { height: '100%', borderRadius: 4 },
  wwLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  forecast: { marginTop: 12, borderTopWidth: 1, paddingTop: 10 },
  forecastItem: { flexDirection: 'row', justifyContent: 'space-between' },
  trophy: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1 },
  support: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', position: 'relative' },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20 },
  toast: { position: 'absolute', alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 }
})
