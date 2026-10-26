import { useEffect, useRef, useState } from 'react'
import { ask, getSettings, type Msg } from './lib/coach'

type Props = { context: string; fen: string; pov: 'w' | 'b'; suggestions?: string[] }

export default function Coach({ context, fen, pov, suggestions = [] }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const hasKey = !!getSettings().key
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs, busy])

  const send = async (q: string) => {
    if (!q.trim() || busy) return
    const h: Msg[] = [...msgs, { role: 'user', content: q }]
    setMsgs(h); setText(''); setBusy(true); setErr('')
    try { setMsgs([...h, { role: 'assistant', content: await ask(context, fen, pov, h) }]) }
    catch (e) { setErr(String((e as Error).message)) }
    setBusy(false)
  }

  if (!hasKey) return (
    <div className="coach"><div className="coach-h">Coach</div>
      <p className="small">Pour poser tes questions au coach, ajoute ta clé OpenAI dans les <a href="#/reglages">Réglages</a>. Elle reste sur cet appareil.</p></div>)
  return (
    <div className="coach">
      <div className="coach-h">Coach</div>
      <div className="coach-msgs">
        {msgs.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.content}</div>)}
        {busy && <div className="bubble assistant typing">Le coach réfléchit…</div>}
        {err && <div className="bubble err">{err}</div>}
        <div ref={end} />
      </div>
      {msgs.length === 0 && <div className="chips">{suggestions.map(s => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>}
      <form className="coach-in" onSubmit={e => { e.preventDefault(); send(text) }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Pose ta question… (ex. et si je joue Nf3 ?)" />
        <button className="btn primary" disabled={busy}>Envoyer</button>
      </form>
    </div>
  )
}
