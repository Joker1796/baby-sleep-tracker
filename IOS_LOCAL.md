# Локальный запуск на iOS-симуляторе (`expo run:ios`)

Expo Go не подходит (проект на SDK 57 новее публичного Expo Go), поэтому собираем
собственный dev-клиент. Для симулятора Apple ID и подпись **не нужны**.

> Ставишь на **реальный iPhone**? См. раздел
> [«Установка на реальный iPhone»](#установка-на-реальный-iphone-release-бесплатный-apple-id)
> ниже — там про подпись, UDID и обязательное удаление push-entitlement.

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

## Установка на реальный iPhone (Release, бесплатный Apple ID)

Цель — автономная сборка: JS зашит в приложение, работает **без Mac и без Metro**
(офлайн-first). Подписываем бесплатным Apple ID («Personal Team»).

**Что нужно заранее:**
- iPhone подключён кабелем, разблокирован, на нём подтверждено «Доверять» этому Mac.
- В Xcode один раз добавлен Apple ID и включён Automatically manage signing для
  target `reginaapp` (Signing & Capabilities → Team = свой «(Personal Team)»).

**Шаги:**

1. **Узнать UDID устройства:**
   ```bash
   xcrun devicectl list devices        # колонка Identifier у строки с iPhone
   ```

2. **Убрать push-entitlement** (обязательно на бесплатном аккаунте). Бесплатный
   personal team не поддерживает capability Push Notifications, а prebuild кладёт
   в `ios/reginaapp/reginaapp.entitlements` ключ `aps-environment` → подпись падает
   с `Personal development teams … do not support the Push Notifications capability`.
   Приложению нужны только **локальные напоминания**, которым этот entitlement не
   нужен. Приводим файл к пустому словарю:
   ```xml
   <plist version="1.0">
     <dict>
     </dict>
   </plist>
   ```

3. **Собрать Release и поставить на телефон** (из `BabyApp/`):
   ```bash
   npx expo run:ios --device "<UDID>" --configuration Release
   ```
   - `--device` без UDID в неинтерактивном режиме падает с «Input is required».
   - Первый прогон долгий: `pod install` + компиляция. В конце — `Build Succeeded`
     и `Installing … reginaapp.app ✔ Complete 100%`.
   - Metro в конце может запуститься по инерции — для Release он не нужен, терминал
     можно закрыть.

4. **Доверить разработчика на телефоне** (при первом запуске, если появится
   «Ненадёжный разработчик»): iPhone → **Настройки → Основные → VPN и управление
   устройством** → профиль своего Apple ID → **Доверять**.

**Ограничения бесплатного Apple ID (помнить):**
- Сертификат живёт **~7 дней** — потом приложение перестаёт открываться, надо
  повторить шаг 3. Максимум 3 своих приложения.
- `ios/` — артефакт `expo prebuild`; после каждой регенерации `aps-environment`
  возвращается, шаг 2 придётся повторять.
- Долгоиграющее решение — платный **Apple Developer** ($99/год): снимает и
  7-дневный лимит, и запрет на push.

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
