# Локальный запуск на iOS-симуляторе (`expo run:ios`)

Expo Go не подходит (проект на SDK 57 новее публичного Expo Go), поэтому собираем
собственный dev-клиент. Для симулятора Apple ID и подпись **не нужны**.

Что уже готово в системе:
- ✅ CocoaPods 1.17.0 (`brew`)
- ✅ Command Line Tools
- ❌ **Полный Xcode** — главный недостающий компонент (ставится из App Store)

---

## 1. Установить Xcode (из App Store)

Открой App Store → Xcode → **Get / Install** (~7–15 ГБ, ~30+ ГБ на диске).
Прямая ссылка: `macappstore://apps.apple.com/app/xcode/id497799835`.

## 2. Первый запуск Xcode

Открой **Xcode** один раз:
- согласись установить **additional components** (спросит пароль),
- прими лицензию.

Эквивалент в терминале (если не хочешь через GUI):
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

## 3. iOS Simulator runtime

Современный Xcode ставит iOS-runtime сразу. Проверить:
```bash
xcrun simctl list runtimes | grep iOS
```
Если пусто — доустановить:
```bash
xcodebuild -downloadPlatform iOS
```
(или Xcode → Settings → Components → iOS Simulator).

## 4. Собрать и запустить

Из папки `BabyApp/`:
```bash
npx expo run:ios
```
- Первый прогон долгий: `pod install` (CocoaPods качает нативные поды) + компиляция.
- В конце запустится iOS-симулятор, приложение установится и откроется.
- Конкретный симулятор: `npx expo run:ios --device "iPhone 16 Pro"`.

## Дальше (повседневно)

Приложение уже установлено в симуляторе — достаточно:
```bash
npx expo start --dev-client
```
и нажать `i` (открыть на iOS). Пересобирать нативно (`run:ios`) нужно только при
добавлении новых нативных модулей.

> Проброс порта (как `adb reverse` на Android) на симуляторе **не нужен** —
> симулятор делит localhost с Mac.

---

## Возможные проблемы

- **`xcodebuild requires Xcode`** → активны Command Line Tools, а не Xcode: выполни шаг 2 (`xcode-select -s`).
- **`pod install` падает** → `cd ios && pod repo update && pod install`, либо удалить `ios/Pods` и `ios/Podfile.lock` и пересобрать.
- **Нет симуляторов в списке** → шаг 3 (`xcodebuild -downloadPlatform iOS`).
- **`ios/` в гите** → это артефакт prebuild; можно не коммитить (Expo регенерирует из `app.json`).
- **`osascript … "System Events" … exited with non-zero code: 1`** в конце `expo run:ios` →
  сборка на самом деле прошла и приложение установилось; падает лишь финальный шаг, который
  через AppleScript выводит окно симулятора на передний план (нет разрешения Automation).
  Побочно вместе с CLI гасится Metro. Обход — поднять Metro и запустить приложение вручную:
  ```bash
  npx expo start --dev-client            # Metro (в отдельном терминале/фоне)
  xcrun simctl launch booted com.anonymous.reginaapp
  ```
  Либо выдать разрешение: System Settings → Privacy & Security → Automation → терминалу разрешить «System Events».
