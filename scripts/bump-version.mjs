#!/usr/bin/env node
// Поднимает версию приложения в app.json (source of truth для CNG) и package.json.
//
//   node scripts/bump-version.mjs patch   → 1.0.1 → 1.0.2   (третье число)
//   node scripts/bump-version.mjs minor   → 1.0.7 → 1.1.0   (второе число, patch → 0)
//   node scripts/bump-version.mjs major   → 1.4.2 → 2.0.0   (первое число)
//   …добавь --dry, чтобы только показать следующие значения, ничего не записывая.
//
// Номера сборки (ios.buildNumber / android.versionCode) увеличиваются ВСЕГДА и
// монотонно — независимо от marketing-версии. Это требование App Store / Google
// Play (каждая загрузка — строго больший build), и именно по ним видно, что на
// устройство доехало обновление.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const level = process.argv[2] || 'patch'
const dry = process.argv.includes('--dry')
if (!['patch', 'minor', 'major'].includes(level)) {
  console.error(`Неизвестный уровень: ${level}. Ожидается patch | minor | major.`)
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const appPath = join(root, 'app.json')
const pkgPath = join(root, 'package.json')

const appRaw = readFileSync(appPath, 'utf8')
const pkgRaw = readFileSync(pkgPath, 'utf8')
const app = JSON.parse(appRaw)

const [major, minor, patch] = String(app.expo.version)
  .split('.')
  .map(n => parseInt(n, 10) || 0)

const next =
  level === 'major' ? [major + 1, 0, 0] : level === 'minor' ? [major, minor + 1, 0] : [major, minor, patch + 1]
const version = next.join('.')

const buildNumber = String((parseInt(app.expo.ios?.buildNumber, 10) || 0) + 1)
const versionCode = (app.expo.android?.versionCode || 0) + 1

console.log(`${level}: версия ${app.expo.version} → ${version} · сборка iOS ${buildNumber} · versionCode ${versionCode}`)
if (dry) process.exit(0)

// Точечные замены, чтобы не переформатировать файлы целиком (минимальный diff).
// Первое вхождение "version" в app.json — это expo.version; в package.json — версия пакета.
const appOut = appRaw
  .replace(/("version":\s*")[^"]*(")/, `$1${version}$2`)
  .replace(/("buildNumber":\s*")[^"]*(")/, `$1${buildNumber}$2`)
  .replace(/("versionCode":\s*)\d+/, `$1${versionCode}`)
const pkgOut = pkgRaw.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`)

writeFileSync(appPath, appOut)
writeFileSync(pkgPath, pkgOut)

// Стейджим сами, чтобы новая версия попала ровно в текущий коммит: и при вызове
// из pre-commit хука, и при ручном `npm run bump:minor|major` (тогда guard в
// хуке увидит уже поднятую версию и не добавит сверху лишний патч).
try {
  execFileSync('git', ['add', appPath, pkgPath], { stdio: 'ignore' })
} catch {
  // не git-окружение — просто оставляем файлы изменёнными
}
