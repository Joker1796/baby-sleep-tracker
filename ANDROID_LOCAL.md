# Локальный запуск на Android (`expo run:android`)

Expo Go не подходит (проект на SDK 57 — новее публичного Expo Go), поэтому собираем
собственный dev-клиент. Всё нативное (SQLite, date-picker) при этом работает по-настоящему.

Шаги 1–4 делаются один раз. Дальше — только `npx expo run:android`.

---

## 1. Установить Android Studio (даёт Android SDK)

```bash
brew install --cask android-studio
```
Открой Android Studio → пройди **Setup Wizard** (Standard). Он поставит:
- Android SDK,
- Platform-Tools (`adb`),
- SDK Platform (последний, напр. Android 15 / API 35),
- Emulator + системный образ.

Проверь в **Settings → Languages & Frameworks → Android SDK → SDK Tools**, что стоят:
`Android SDK Platform-Tools`, `Android SDK Build-Tools`, `Android Emulator`.

## 2. Прописать переменные окружения

Добавь в `~/.zshrc` (Android Studio ставит JDK внутрь себя — берём его, т.к. система на Java 24, а Gradle нужен JDK 17):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```
Применить: `source ~/.zshrc` (или новое окно терминала).
Проверка: `adb version` и `java -version` (должно быть 17 или 21, не 24).

## 3. Подготовить устройство — один из вариантов

**А) Твой телефон по USB (рекомендую — быстрее эмулятора):**
1. Настройки → «О телефоне» → 7 раз тапни по «Номер сборки» → включатся «Для разработчиков».
2. Настройки → Система → Для разработчиков → включи **Отладка по USB**.
3. Подключи телефон кабелем, на телефоне подтверди «Разрешить отладку».
4. Проверь: `adb devices` — телефон должен быть в списке как `device`.

**Б) Эмулятор:**
Android Studio → **Device Manager** → Create Device → выбери телефон + образ → запусти (▶).
Либо из терминала: `emulator -list-avds`, затем `emulator -avd <имя>`.

## 4. Собрать и запустить

Из папки `BabyApp/`:
```bash
npx expo run:android
```
- Первый прогон долгий: генерируется папка `android/` (prebuild) и Gradle качает зависимости (5–15 мин).
- В конце приложение установится на телефон/эмулятор, запустится и подключится к Metro.

## Дальше (повседневно)

Приложение уже установлено — достаточно поднять Metro и открыть его:
```bash
npx expo start --dev-client
```
Пересобирать нативно (`run:android`) нужно только при добавлении новых нативных модулей.

---

## Возможные проблемы

- **`JAVA_HOME`/Gradle ругается на версию Java** → убедись, что `JAVA_HOME` указывает на JBR из Android Studio (шаг 2), а не на системную Java 24.
- **`adb: command not found`** → не применились переменные из шага 2 (`source ~/.zshrc`).
- **`No connected devices`** → телефон не в режиме отладки / не подтверждён (`adb devices` пуст), или эмулятор не запущен.
- **`SDK location not found`** → нет `ANDROID_HOME` или не установлен SDK (шаг 1).
- **`android/` в гите** → это артефакт prebuild; можно не коммитить (Expo умеет регенерировать из `app.json`).

После установки SDK и подключения устройства скажи — запущу `npx expo run:android` отсюда.
