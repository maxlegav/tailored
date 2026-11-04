const KEY = 'tailored-progress-v1'
type DB = { lessons: Record<string, number>; habits: Record<string, number>; reps: Record<string, number>; series: Record<string, number> }
export function loadDB(): DB {
  try { return { lessons: {}, habits: {}, reps: {}, series: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { lessons: {}, habits: {}, reps: {}, series: {} } }
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
export const dayKey = (d = new Date()) => d.toLocaleDateString('sv')
export const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }
