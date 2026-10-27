import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Data } from '../types'
import { Md } from '../md'
import Board from '../Board'
import AnalysisBoard from '../AnalysisBoard'
import { BookConceptCard, conceptsFor } from '../BookBox'

export default function Lessons({ data }: { data: Data }) {
  const [open, setOpen] = useState<string | null>(data.lessons?.[0]?.id ?? null)
  const book = data.book
  const core = useMemo(() => data.mistakes.filter(m => m.kind === 'habitude' || m.kind === 'comprehension'), [data])
  const chapters = useMemo(() => {
    if (!book) return []
    const by: Record<string, string[]> = {}
    for (const m of core) for (const k of conceptsFor(m, book, 3)) (by[k] ||= []).push(m.id)
    return Object.keys(book.concepts).map(k => ({ k, ids: by[k] || [], ex: (data.book_ex || []).filter(e => e.concept === k).length }))
      .filter(c => c.ids.length || c.ex).sort((a, b) => b.ids.length - a.ids.length)
  }, [book, core, data.book_ex])
  return (
    <div className="page">
      <h1>Cours</h1>
      {(data.lessons || []).map(l => (
        <div key={l.id} className="lesson">
          <h2 onClick={() => setOpen(open === l.id ? null : l.id)}>{l.title}</h2>
          {open === l.id && <><Md text={l.body} />
            {(l.mistakes || []).map(id => data.mistakes.find(m => m.id === id)).filter(m => !!m).map(m => (
              <div key={m!.id} className="item"><AnalysisBoard fen={m!.fen} line={m!.best_pv} orientation={m!.color} engineReply arrows={[{ from: m!.uci.slice(0, 2), to: m!.uci.slice(2, 4), color: 'rgba(200,60,60,0.8)' }]} />
                <div><Md text={m!.text} /><p className="muted">Flèche rouge : ton coup dans la partie. ▶ Jouer : la bonne suite. <a href={m!.url} target="_blank">Partie</a></p></div></div>))}
            {l.tag && <Link className="btn" to={`/entrainement?tag=${encodeURIComponent(l.tag)}`}>S'entraîner sur ce thème</Link>}</>}
        </div>))}
      {book && <div className="bk-list">
        <h1 style={{ marginTop: 28 }}>Le livre : {book.book.title}</h1>
        <p className="muted">{book.book.author}. Chaque thème du livre est relié à tes positions d'entraînement, classé selon le nombre de tes erreurs d'habitude ou de compréhension qui le concernent. {book.book.note}</p>
        {!!data.book_guide?.length && <div className="guide">
          <h2>Ton plan de lecture</h2>
          <p className="muted">Pas besoin de lire tout le livre : voici les passages qui comptent pour toi, dans l'ordre, selon tes parties.</p>
          {data.book_guide.map((g, i) => {
            const c = chapters.find(x => x.k === g.concept)
            const tagN = g.tags.reduce((s, t) => s + (data.tags.find(x => x.tag === t)?.core_n || 0), 0)
            return (
              <div key={g.concept + i} className="guide-item">
                <div className="guide-n">{i + 1}</div>
                <div>
                  <div className="bk-t">{g.title} <span className="bk-ref">p. {g.pages} · ~{g.minutes} min</span></div>
                  <p>{g.why}</p>
                  <p className="small muted">Dans tes parties : {c?.ids.length || 0} positions d'erreur liées à ce thème{tagN ? ` (et ${tagN} erreurs « ${g.tags.map(t => data.tags.find(x => x.tag === t)?.label || t).join(' / ')} »)` : ''}.</p>
                  <div className="goal-h">Ce que tu changes dans ton jeu</div>
                  <ul>{g.change.map(x => <li key={x}>{x}</li>)}</ul>
                  <div className="row">
                    {!!c?.ids.length && <Link className="btn" to={`/entrainement?silman=${g.concept}&kind=prio`}>Tes positions ({c.ids.length})</Link>}
                    {!!c?.ex && <Link className="btn" to={`/entrainement?silman=${g.concept}&kind=livre`}>Exercices du livre ({c.ex})</Link>}
                  </div>
                </div>
              </div>)
          })}
          <h2 style={{ marginTop: 22 }}>Tous les thèmes du livre</h2>
        </div>}
        {chapters.map(({ k, ids, ex }) => {
          const c = book.concepts[k]; const id = 'bk-' + k
          const sample = ids.slice(0, 2).map(i => data.mistakes.find(m => m.id === i)!).filter(Boolean)
          return (
            <div key={k} className="lesson">
              <h2 onClick={() => setOpen(open === id ? null : id)}>{c.title} <span className="cnt">{ids.length} de tes positions · ch. {c.ch}</span></h2>
              {open === id && <>
                <BookConceptCard k={k} book={book} />
                {sample.map(m => (
                  <div key={m.id} className="item"><Board fen={m.fen} orientation={m.color} arrows={[{ from: m.best.slice(0, 2), to: m.best.slice(2, 4) }, { from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), color: 'rgba(200,60,60,0.8)' }]} />
                    <div>{!!m.silman?.length && <ul>{m.silman.map(([kk, d]) => <li key={kk}>{d}</li>)}</ul>}
                      {m.goal && <Md text={m.goal} />}
                      <p className="muted">Tu as joué {m.san} (flèche rouge), le bon coup était {m.best_san} (flèche verte). <a href={m.url} target="_blank">Partie</a></p></div></div>))}
                <div className="row">
                  {!!ids.length && <Link className="btn" to={`/entrainement?silman=${k}&kind=prio`}>S'entraîner sur tes positions ({ids.length})</Link>}
                  {!!ex && <Link className="btn" to={`/entrainement?silman=${k}&kind=livre`}>Exercices du livre ({ex})</Link>}
                </div>
              </>}
            </div>)
        })}
      </div>}
    </div>
  )
}
