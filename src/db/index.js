import * as SQLite from 'expo-sqlite'
import { randomUUID } from 'expo-crypto'

// Реляционное хранилище на expo-sqlite — замена Dexie/IndexedDB из web-версии.
// Схема повторяет прежнюю: свободные объекты children/events хранятся как JSON
// в колонке `data`, а поля, по которым идут выборки (childId, startedAt), вынесены
// в отдельные проиндексированные колонки.

const DB_NAME = 'babySleepTracker.db'

let database = null

// Открывает БД и создаёт таблицы. Вызывается один раз при старте приложения
// (bootstrap) до загрузки сторов. Повторные вызовы возвращают уже открытую БД.
export async function initDb() {
  if (database) return database
  const db = await SQLite.openDatabaseAsync(DB_NAME)
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      childId TEXT,
      startedAt INTEGER,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_child_started ON events (childId, startedAt);
  `)
  database = db
  return db
}

function requireDb() {
  if (!database) throw new Error('DB не инициализирована: вызовите initDb() при старте')
  return database
}

export function uid() {
  try {
    return randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

// --- children ---

export async function listChildren() {
  const rows = await requireDb().getAllAsync('SELECT data FROM children')
  return rows.map(r => JSON.parse(r.data))
}

export async function putChild(child) {
  await requireDb().runAsync(
    'INSERT OR REPLACE INTO children (id, data) VALUES (?, ?)',
    child.id,
    JSON.stringify(child)
  )
}

export async function deleteChild(id) {
  await requireDb().runAsync('DELETE FROM children WHERE id = ?', id)
}

// --- events ---

export async function listEvents(childId) {
  const rows = await requireDb().getAllAsync(
    'SELECT data FROM events WHERE childId = ? ORDER BY startedAt',
    childId
  )
  return rows.map(r => JSON.parse(r.data))
}

export async function listAllEvents() {
  const rows = await requireDb().getAllAsync('SELECT data FROM events')
  return rows.map(r => JSON.parse(r.data))
}

export async function putEvent(event) {
  await requireDb().runAsync(
    'INSERT OR REPLACE INTO events (id, childId, startedAt, data) VALUES (?, ?, ?, ?)',
    event.id,
    event.childId ?? null,
    event.startedAt ?? null,
    JSON.stringify(event)
  )
}

export async function deleteEvent(id) {
  await requireDb().runAsync('DELETE FROM events WHERE id = ?', id)
}

export async function deleteEventsForChild(childId) {
  await requireDb().runAsync('DELETE FROM events WHERE childId = ?', childId)
}

// --- bulk / backup ---

export async function replaceAll(children, events) {
  const db = requireDb()
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM events; DELETE FROM children;')
    for (const child of children) await putChild(child)
    for (const event of events) await putEvent(event)
  })
}

export async function mergeAll(children, events) {
  const db = requireDb()
  await db.withTransactionAsync(async () => {
    for (const child of children) await putChild(child)
    for (const event of events) await putEvent(event)
  })
}
