import { useEffect, useState } from 'react'
import type { Book, Mistake } from './types'

const SEEN = 'tailored-seen-concepts'
const seen = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(SEEN) || '{}') } catch { return {} } }

export function conceptsFor(m: Mistake, book: Book, max = 2): string[] {
  const keys: string[] = []
  for (const t of m.tags) for (const k of book.tags[t] || []) if (!keys.includes(k)) keys.push(k)
  const detected = (m.silman || []).map(s => s[0]).filter(k => book.concepts[k])
  const mainTag = keys.slice(0, 1)
  const direct = m.tags.filter(t => book.concepts[t])
  return [...new Set([...direct, ...mainTag, ...detected, ...keys])].filter(k => book.concepts[k]).slice(0, max)
}

export function BookConceptCard({ k, book }: { k: string; book: Book }) {
  const c = book.concepts[k]
  if (!c) return null
  return (
    <div className="bk-c">
      <div className="bk-t">{c.title} <span className="bk-ref">ch. {c.ch}, p. {c.pages}</span></div>
      <p>{c.advice}</p>
      <p className="bk-q">La question à te poser : « {c.question} »</p>
      {c.exercises && <p className="small muted">Dans le livre : {c.exercises.label}, p. {c.exercises.pages} (solutions à partir de la p. {c.exercises.solutions}).</p>}
    </div>
  )
}

export default function BookBox({ m, book }: { m: Mistake; book?: Book }) {
  if (!book) return null
  const ks = conceptsFor(m, book)
  const [old] = useState(seen)
  useEffect(() => { const s = seen(); for (const k of ks) s[k] ||= Date.now(); localStorage.setItem(SEEN, JSON.stringify(s)) }, [ks.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!ks.length && !m.silman?.length) return null
  const fresh = ks.filter(k => !old[k]); const known = ks.filter(k => old[k])
  return (
    <div className="book">
      <div className="goal-h">Ce que dit {book.book.short}</div>
      {!!m.silman?.length && <div className="bk-imb"><span className="small muted">Les déséquilibres de la position :</span>
        <ul>{m.silman.map(([k, d]) => <li key={k}>{d}</li>)}</ul></div>}
      {fresh.map(k => <BookConceptCard key={k} k={k} book={book} />)}
      {!!known.length && <details className="bk-known"><summary>Déjà lu : {known.map(k => book.concepts[k].title).join(', ')}</summary>{known.map(k => <BookConceptCard key={k} k={k} book={book} />)}</details>}
    </div>
  )
}
