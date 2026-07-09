import React, { useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useChildrenStore, useActiveChild } from '../store/children'
import { useEventsStore } from '../store/events'
import { useTheme } from '../theme/ThemeProvider'
import TodayScreen from '../screens/TodayScreen'
import HistoryScreen from '../screens/HistoryScreen'
import CalendarScreen from '../screens/CalendarScreen'
import AdviceScreen from '../screens/AdviceScreen'
import RegimeScreen from '../screens/RegimeScreen'
import SettingsScreen from '../screens/SettingsScreen'
import OnboardingScreen from '../screens/OnboardingScreen'

const Tab = createBottomTabNavigator()

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

// Иконка вкладки: заполненный вариант для активной, контурный — для неактивной.
function tabIcon(base: string) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={(focused ? base : `${base}-outline`) as IoniconName} size={size} color={color} />
  )
}

export default function RootNavigator() {
  const { colors, dark } = useTheme()
  const loaded = useChildrenStore(s => s.loaded)
  const childCount = useChildrenStore(s => s.children.length)
  const active = useActiveChild()
  const customRegime = active?.regime?.mode === 'custom'

  // Активный ребёнок сменился — перечитываем его события (замена watch в App.vue).
  const activeId = active?.id
  useEffect(() => {
    if (activeId) useEventsStore.getState().load(activeId)
  }, [activeId])

  if (loaded && childCount === 0) return <OnboardingScreen />

  return (
    <NavigationContainer
      theme={{
        dark,
        colors: {
          primary: colors.primary,
          background: colors.bg,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.urgent
        },
        fonts: DefaultFonts
      }}
    >
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: '700' },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSoft,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }
        }}
      >
        <Tab.Screen
          name="today"
          component={TodayScreen}
          options={{ title: 'Сегодня', tabBarIcon: tabIcon('home') }}
        />
        <Tab.Screen
          name="history"
          component={HistoryScreen}
          options={{ title: 'История', tabBarIcon: tabIcon('time') }}
        />
        <Tab.Screen
          name="calendar"
          component={CalendarScreen}
          options={{ title: 'Календарь', tabBarIcon: tabIcon('calendar') }}
        />
        <Tab.Screen
          name="advice"
          component={AdviceScreen}
          options={{ title: 'Советы', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
        />
        {customRegime && (
          <Tab.Screen
            name="regime"
            component={RegimeScreen}
            options={{ title: 'Мой режим', tabBarIcon: tabIcon('options') }}
          />
        )}
        <Tab.Screen
          name="settings"
          component={SettingsScreen}
          options={{ title: 'Настройки', tabBarIcon: tabIcon('settings') }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  )
}

// React Navigation v7 требует конфигурацию шрифтов в объекте темы.
const DefaultFonts = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium: { fontFamily: 'System', fontWeight: '500' as const },
  bold: { fontFamily: 'System', fontWeight: '700' as const },
  heavy: { fontFamily: 'System', fontWeight: '900' as const }
}
