import { StyleSheet } from 'react-native'
import { useMemo } from 'react'
import { ThemeColors, radius, radiusSm } from './colors'
import { useTheme } from './ThemeProvider'

// Общие стили-утилиты, повторяющие классы из web-версии (.card, .btn, .chip, …).
// Строятся из активной палитры, чтобы одинаково работать в светлой/тёмной теме.
export function makeCommonStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    page: { padding: 16, paddingBottom: 32 },
    pageTitle: { fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 8 },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: c.textSoft,
      marginBottom: 8
    },

    btn: {
      minHeight: 44,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: radiusSm,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    },
    btnText: { color: c.onPrimary, fontWeight: '600', fontSize: 15 },
    btnSecondary: {
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border
    },
    btnSecondaryText: { color: c.text },
    btnDanger: { backgroundColor: c.urgentSoft },
    btnDangerText: { color: c.urgent },
    btnBlock: { alignSelf: 'stretch' },

    chip: {
      minHeight: 36,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    },
    chipText: { fontSize: 14, fontWeight: '500', color: c.text },
    chipActive: { backgroundColor: c.primarySoft, borderColor: c.primary },
    chipActiveText: { color: c.primary },

    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    grow: { flex: 1, minWidth: 0 },
    muted: { color: c.textSoft },
    small: { fontSize: 13 },

    h2: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 8 },
    h3: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 8 },
    text: { color: c.text, fontSize: 15, lineHeight: 22 },

    label: { fontSize: 13, color: c.textSoft, marginBottom: 4 },
    input: {
      color: c.text,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radiusSm,
      paddingVertical: 10,
      paddingHorizontal: 12,
      minHeight: 44
    }
  })
}

export type CommonStyles = ReturnType<typeof makeCommonStyles>

export function useCommonStyles(): CommonStyles {
  const { colors } = useTheme()
  return useMemo(() => makeCommonStyles(colors), [colors])
}
