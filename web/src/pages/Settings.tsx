import { useState } from 'react'
import { getSettings, saveSettings } from '../lib/coach'

export default function Settings() {
  const [s, setS] = useState(getSettings())
  const [saved, setSaved] = useState(false)
  return (
    <div className="page">
      <h1>Réglages</h1>
      <div className="card">
        <h3>Coach (chat)</h3>
        <p className="small">Le chat utilise ta clé OpenAI. Elle est enregistrée uniquement dans ce navigateur (à refaire sur chaque appareil) et n'est envoyée qu'à OpenAI.
          Les analyses de coups sont faites par Stockfish directement dans ton navigateur.</p>
        <label className="field">Clé API OpenAI<input type="password" value={s.key} placeholder="sk-…" onChange={e => { setS({ ...s, key: e.target.value.trim() }); setSaved(false) }} /></label>
        <label className="field">Modèle<input value={s.model} onChange={e => { setS({ ...s, model: e.target.value.trim() }); setSaved(false) }} /></label>
        <div className="row"><button className="btn primary" onClick={() => { saveSettings(s); setSaved(true) }}>Enregistrer</button>
          {s.key && <button onClick={() => { const n = { ...s, key: '' }; setS(n); saveSettings(n); setSaved(true) }}>Supprimer la clé</button>}
          {saved && <span className="good">Enregistré</span>}</div>
      </div>
    </div>
  )
}
