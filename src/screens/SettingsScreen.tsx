import React, { useState } from 'react'
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useChildrenStore, useActiveChild, Child } from '../store/children'
import { useEventsStore } from '../store/events'
import { useSettingsStore, ThemePref } from '../store/settings'
import { exportBackup, importBackup } from '../utils/backup'
import ChildForm from '../components/ChildForm'
import { Card, Btn } from '../components/ui'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'auto', label: 'Как в системе' },
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' }
]

export default function SettingsScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const children = useChildrenStore(st => st.children)
  const activeChild = useActiveChild()
  const theme = useSettingsStore(st => st.theme)
  const setTheme = useSettingsStore(st => st.setTheme)

  // Вкладка: child.id | 'new' | null (авто → активный ребёнок)
  const [tab, setTab] = useState<string | null>(() => useChildrenStore.getState().activeChildId)
  const [message, setMessage] = useState('')

  const showNew = tab === 'new' || children.length === 0
  const selectedChild = children.find(c => c.id === tab) || activeChild

  const regimeMode = selectedChild?.regime?.mode || 'auto'
  function toggleRegime() {
    if (selectedChild) useChildrenStore.getState().setRegimeMode(selectedChild.id, regimeMode === 'custom' ? 'auto' : 'custom')
  }

  async function reloadActive() {
    const active = useChildrenStore.getState()
    const act = active.children.find(c => c.id === active.activeChildId) || active.children[0]
    if (act) await useEventsStore.getState().load(act.id)
  }

  function removeChild(child: Child) {
    Alert.alert(`Удалить профиль «${child.name}»?`, 'Все его события будут удалены безвозвратно.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await useChildrenStore.getState().remove(child.id)
          await reloadActive()
          setTab(null)
        }
      }
    ])
  }

  function onImport() {
    Alert.alert('Импорт данных', 'Заменить текущие данные или добавить к существующим?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Добавить', onPress: () => doImport(false) },
      { text: 'Заменить всё', style: 'destructive', onPress: () => doImport(true) }
    ])
  }

  async function doImport(replace: boolean) {
    try {
      const res = await importBackup({ replace })
      if (!res) return
      await useChildrenStore.getState().load()
      await reloadActive()
      setMessage(`Импортировано: детей — ${res.children}, событий — ${res.events}`)
    } catch (err: any) {
      setMessage(`Ошибка импорта: ${err.message}`)
    }
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        <Card>
          <Text style={s.cardTitle}>Дети</Text>
          {/* Цветные вкладки детей + «＋» */}
          <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
            {children.map(child => {
              const active = !showNew && selectedChild?.id === child.id
              return (
                <Pressable
                  key={child.id}
                  onPress={() => setTab(child.id)}
                  style={[
                    styles.tab,
                    { borderColor: colors.border, backgroundColor: colors.surface2 },
                    active && { backgroundColor: child.color, borderColor: child.color }
                  ]}
                >
                  <Text style={{ fontWeight: '600', fontSize: 14, color: active ? '#fff' : colors.textSoft }}>{child.name}</Text>
                </Pressable>
              )
            })}
            <Pressable
              onPress={() => setTab('new')}
              style={[styles.tab, { borderColor: colors.border, backgroundColor: colors.surface2 }, showNew && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={{ fontWeight: '600', fontSize: 16, color: showNew ? '#fff' : colors.textSoft }}>＋</Text>
            </Pressable>
          </View>

          {/* Панель выбранного ребёнка / нового */}
          <View style={{ paddingTop: 12 }}>
            {showNew ? (
              <>
                <Text style={s.h3}>Новый ребёнок</Text>
                <ChildForm onSaved={() => setTab(useChildrenStore.getState().activeChildId)} />
                {children.length > 0 && (
                  <Btn title="Отмена" variant="secondary" block onPress={() => setTab(null)} style={{ marginTop: 8 }} />
                )}
              </>
            ) : selectedChild ? (
              <>
                <View style={styles.panelHead}>
                  <View style={[styles.dot, { backgroundColor: selectedChild.color }]} />
                  <Text style={{ fontWeight: '700', color: colors.text }}>Профиль: {selectedChild.name}</Text>
                </View>
                <ChildForm
                  key={selectedChild.id}
                  child={selectedChild}
                  onSaved={() => {}}
                  onCancel={() => setTab(selectedChild.id)}
                  onDelete={() => removeChild(selectedChild)}
                />
                {/* Режим расчёта — внутри профиля ребёнка */}
                <Text style={[s.cardTitle, { marginTop: 16 }]}>Режим расчёта</Text>
                <Pressable
                  onPress={toggleRegime}
                  style={[
                    s.btn,
                    { minHeight: 52, width: '100%', justifyContent: 'center' },
                    regimeMode === 'custom'
                      ? { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary }
                      : { backgroundColor: colors.primary }
                  ]}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: regimeMode === 'custom' ? colors.primary : colors.onPrimary }}>
                    {regimeMode === 'custom' ? '🎛️ Свой режим' : '✨ Авто'}
                  </Text>
                </Pressable>
                <Text style={[s.muted, s.small, { marginTop: 8 }]}>
                  {regimeMode === 'custom'
                    ? 'Подсказки считаются по вашим параметрам. Настроить — во вкладке «Мой режим».'
                    : 'Подсказки считаются автоматически по возрасту. Нажмите, чтобы задать свои параметры.'}
                </Text>
              </>
            ) : null}
          </View>
        </Card>

        <Card>
          <Text style={s.cardTitle}>Тема</Text>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            {THEMES.map(t => {
              const active = theme === t.id
              return (
                <Pressable key={t.id} onPress={() => setTheme(t.id)} style={[s.chip, active && s.chipActive]}>
                  <Text style={[s.chipText, active && s.chipActiveText]}>{t.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </Card>

        <Card>
          <Text style={s.cardTitle}>Данные</Text>
          <Text style={[s.muted, s.small]}>
            Все данные хранятся только на этом устройстве. Делайте резервные копии, чтобы не потерять историю и
            переносить её между устройствами.
          </Text>
          <View style={[s.row, { marginTop: 10 }]}>
            <Btn title="⬇️ Экспорт" variant="secondary" onPress={exportBackup} style={s.grow} />
            <Btn title="⬆️ Импорт" variant="secondary" onPress={onImport} style={s.grow} />
          </View>
          {message ? <Text style={[s.small, { color: colors.text, marginTop: 8 }]}>{message}</Text> : null}
        </Card>

        <Card>
          <Text style={s.cardTitle}>О приложении</Text>
          <Text style={[s.muted, s.small]}>
            «Режим малыша» — трекер сна и режима ребёнка с подсказками на основе возрастных норм. Подсказки носят
            информационный характер и не заменяют консультацию педиатра.
          </Text>
          <Text style={[s.muted, s.small, { marginTop: 8 }]}>Работает офлайн · данные на устройстве</Text>
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 8, borderBottomWidth: 1 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 }
})
