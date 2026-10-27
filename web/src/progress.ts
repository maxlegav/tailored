const KEY = 'tailored-progress-v1'
type DB = { lessons: Record<string, number>; habits: Record<string, number> }
export function loadDB(): DB {
  try { return { lessons: {}, habits: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { lessons: {}, habits: {} } }
}
export function mark(kind: keyof DB, id: string, done: boolean) {
  const db = loadDB()
  if (done) db[kind][id] = Date.now(); else delete db[kind][id]
  localStorage.setItem(KEY, JSON.stringify(db)); return db
}
/** done and not seen again in a game played after it was ticked */
export function isClosed(at: number | undefined, dates: number[]) {
  return !!at && !dates.some(d => d * 1000 > at)
}
