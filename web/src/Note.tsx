import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { ctx } from './ctx'

const REPO = 'https://github.com/maxlegav/tailored/issues/new'
const KEY = 'tailored-notes-v1'
type N = { at: number; text: string; page: string }

export default function Note() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [withPos, setWithPos] = useState(true)
  const loc = useLocation()
  const page = loc.pathname
  const fen = ctx.fen
  const send = () => {
    const t = text.trim()
    if (!t) return
    const list: N[] = JSON.parse(localStorage.getItem(KEY) || '[]')
    list.unshift({ at: Date.now(), text: t, page })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)))
    const body = `${t}\n\n---\nPage : \`#${page}\`${withPos && fen ? `\nPosition : \`${fen}\`` : ''}\nEnvoyé depuis l'app le ${new Date().toLocaleString('fr-FR')}`
    const url = `${REPO}?labels=note&title=${encodeURIComponent('Note : ' + t.split('\n')[0].slice(0, 70))}&body=${encodeURIComponent(body)}`
    window.open(url, '_blank')
    setText(''); setOpen(false)
  }
  return <>
    <button className="notebtn" onClick={() => setOpen(true)} aria-label="Note pour Devin">✎ Note</button>
    {open && createPortal(<div className="modal" onClick={() => setOpen(false)}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h3>Note pour Devin</h3>
        <p className="small muted">Ce que tu veux changer ou ajouter. La note devient une issue GitHub : je la lis à la prochaine mise à jour du lundi, ou dès que tu me dis « regarde mes notes ».</p>
        <textarea autoFocus rows={5} value={text} onChange={e => setText(e.target.value)} placeholder="Ex. : sur cette position, explique-moi pourquoi …c5 et pas …e5" />
        <p className="small muted">Page : #{page}</p>
        {fen && <label className="check small"><input type="checkbox" checked={withPos} onChange={e => setWithPos(e.target.checked)} /> Joindre la position affichée</label>}
        <div className="row"><button className="btn" onClick={() => setOpen(false)}>Annuler</button><button className="btn primary" disabled={!text.trim()} onClick={send}>Envoyer sur GitHub</button></div>
      </div>
    </div>, document.body)}
  </>
}
