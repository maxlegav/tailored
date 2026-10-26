type Card = { box: number; due: number; seen: number; ok: number }
const KEY = 'coach-srs-v1'
const DAYS = [0, 1, 3, 7, 16, 35]
export function load(): Record<string, Card> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
export function grade(id: string, ok: boolean) {
  const all = load(); const c = all[id] || { box: 0, due: 0, seen: 0, ok: 0 }
  c.seen++; if (ok) c.ok++
  c.box = ok ? Math.min(c.box + 1, DAYS.length - 1) : 0
  c.due = Date.now() + DAYS[c.box] * 86400000
  all[id] = c; localStorage.setItem(KEY, JSON.stringify(all))
}
export function dueIds(ids: string[], limit = 10): string[] {
  const all = load(); const now = Date.now()
  const due = ids.filter(id => all[id] && all[id].due <= now)
  const fresh = ids.filter(id => !all[id])
  return [...due, ...fresh].slice(0, limit)
}
export function stats() {
  const all = Object.values(load())
  return { seen: all.length, mastered: all.filter(c => c.box >= 3).length, ok: all.reduce((a, c) => a + c.ok, 0), tries: all.reduce((a, c) => a + c.seen, 0) }
}
