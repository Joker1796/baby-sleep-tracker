import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

// Схема 20 молочных зубов: верхний и нижний ряд по 10. Тап отмечает
// прорезавшийся зуб; value — массив id выбранных зубов.
const ROWS = [
  { key: 'upper', label: 'Верхние', y: 20, capY: 12, ids: ['ur5', 'ur4', 'ur3', 'ur2', 'ur1', 'ul1', 'ul2', 'ul3', 'ul4', 'ul5'] },
  { key: 'lower', label: 'Нижние', y: 100, capY: 92, ids: ['lr5', 'lr4', 'lr3', 'lr2', 'lr1', 'll1', 'll2', 'll3', 'll4', 'll5'] }
]

const N = 10
const VW = 300
const TW = 24
const GAP = (VW - N * TW) / (N + 1)
const xOf = (i: number) => GAP + i * (TW + GAP)

export default function ToothChart({
  value,
  onChange
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const selected = new Set(value)

  function toggle(id: string) {
    const next = new Set(value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }

  return (
    <View>
      <Svg viewBox="0 0 300 150" width="100%" height={150}>
        {ROWS.map(row => (
          <React.Fragment key={row.key}>
            <SvgText x={150} y={row.capY} fill={colors.textSoft} fontSize={10} fontWeight="700" textAnchor="middle">
              {row.label}
            </SvgText>
            {row.ids.map((id, i) => {
              const on = selected.has(id)
              return (
                <Rect
                  key={id}
                  x={xOf(i)}
                  y={row.y}
                  width={TW}
                  height={34}
                  rx={8}
                  fill={on ? colors.info : colors.surface2}
                  stroke={on ? colors.info : colors.border}
                  strokeWidth={1.5}
                  onPress={() => toggle(id)}
                />
              )
            })}
          </React.Fragment>
        ))}
      </Svg>
      <Text style={[s.muted, s.small, { marginTop: 6 }]}>Тапните по зубу, который прорезался.</Text>
    </View>
  )
}

const styles = StyleSheet.create({})
