// Токены темы, перенесённые из web-версии (src/style.css). CSS-переменные
// стали полями объекта; светлая и тёмная палитры выбираются в ThemeProvider.

export interface ThemeColors {
  bg: string
  surface: string
  surface2: string
  text: string
  textSoft: string
  border: string
  primary: string
  primarySoft: string
  onPrimary: string
  header: string
  headerText: string
  sleep: string
  sleepSoft: string
  walk: string
  walkSoft: string
  bath: string
  bathSoft: string
  medicine: string
  medicineSoft: string
  warn: string
  warnSoft: string
  urgent: string
  urgentSoft: string
  info: string
  infoSoft: string
  nightBar: string
  dayBar: string
  wwFrom: string
  wwTo: string
}

export const lightColors: ThemeColors = {
  bg: '#f4f5fb',
  surface: '#ffffff',
  surface2: '#eef0f9',
  text: '#1c1f2e',
  textSoft: '#6b7086',
  border: '#e3e6f0',
  primary: '#4f46e5',
  primarySoft: '#eef0ff',
  onPrimary: '#ffffff',
  header: '#4f46e5',
  headerText: '#ffffff',
  sleep: '#7c6ff0',
  sleepSoft: '#efedff',
  walk: '#2f9e6e',
  walkSoft: '#e5f6ee',
  bath: '#2492c9',
  bathSoft: '#e3f3fb',
  medicine: '#d9598b',
  medicineSoft: '#fceef4',
  warn: '#d97706',
  warnSoft: '#fdf1df',
  urgent: '#dc2626',
  urgentSoft: '#fdeaea',
  info: '#4f46e5',
  infoSoft: '#eef0ff',
  nightBar: '#5b54c7',
  dayBar: '#a5b4fc',
  wwFrom: '#b6efc9',
  wwTo: '#16a34a'
}

export const darkColors: ThemeColors = {
  bg: '#11131f',
  surface: '#1b1e30',
  surface2: '#242840',
  text: '#eceef8',
  textSoft: '#9aa0bb',
  border: '#2c3049',
  primary: '#818cf8',
  primarySoft: '#262a4a',
  onPrimary: '#11131f',
  header: '#312e81',
  headerText: '#ffffff',
  sleep: '#9a8ff5',
  sleepSoft: '#2a2750',
  walk: '#4cc492',
  walkSoft: '#1c3a2e',
  bath: '#53b4e0',
  bathSoft: '#1a3345',
  medicine: '#ec7fab',
  medicineSoft: '#3d2233',
  warn: '#f0a441',
  warnSoft: '#3b2d16',
  urgent: '#f37272',
  urgentSoft: '#3f1f1f',
  info: '#818cf8',
  infoSoft: '#262a4a',
  nightBar: '#6f68d8',
  dayBar: '#4a4f8c',
  wwFrom: '#2f6f4e',
  wwTo: '#34d17f'
}

export const radius = 16
export const radiusSm = 10
