import { Chess } from 'chess.js'
import { analyse, winPct } from './engine'
import { sanLine } from './chess'

const KEY = 'tailored-openai'
export type Settings = { key: string; model: string }
export const getSettings = (): Settings => ({ key: '', model: 'gpt-5-mini', ...JSON.parse(localStorage.getItem(KEY) || '{}') })
export const saveSettings = (s: Settings) => localStorage.setItem(KEY, JSON.stringify(s))

export type Msg = { role: 'user' | 'assistant'; content: string }

const SYSTEM = `Tu es le coach d'échecs personnel de Max (≈1900 en blitz 3+0 sur chess.com, objectif 2200). Tu parles français, en tutoyant, comme un vrai entraîneur humain.
Règles absolues :
- Tu ne calcules JAMAIS les variantes toi-même. Tu t'appuies uniquement sur les faits fournis (moteur, liste des pièces) et sur l'outil evaluer_coups. Dès qu'on te demande "et si je joue X ?", ou dès que tu veux affirmer qu'un coup gagne/perd quelque chose, appelle evaluer_coups d'abord.
- Explique toujours le BUT de la position : qui est mieux et pourquoi, quel est le plan, pourquoi ce coup sert ce plan (ex. « il fallait échanger parce que… ton but ensuite, c'est… »).
- Privilégie des idées qu'un joueur de 1900 peut reproduire en blitz : principes, plans, schémas récurrents. Pas de coups de moteur incompréhensibles ; si le meilleur coup du moteur est trop difficile, dis-le et propose l'idée humaine équivalente.
- Les pièces laissées en prise et les coups joués avec moins de 20 s sont surtout de l'inattention ou du temps : ne fais pas la morale, donne un réflexe simple. Insiste davantage sur les erreurs de compréhension ou d'habitude.
- Réponses courtes (4 à 8 phrases), concrètes, avec les coups en notation algébrique (Nf3, Bxe5…).`

const TOOLS = [{
  type: 'function',
  function: {
    name: 'evaluer_coups',
    description: "Joue une suite de coups (SAN, à partir de la position étudiée) puis renvoie l'évaluation Stockfish et les 3 meilleures suites. Suite vide = évaluer la position étudiée.",
    parameters: { type: 'object', properties: { coups: { type: 'array', items: { type: 'string' }, description: 'Coups en SAN, ex. ["Nf3", "Nc6"]' } }, required: ['coups'] },
  },
}]

async function evaluer(fen: string, coups: string[], pov: 'w' | 'b') {
  const c = new Chess(fen)
  for (const s of coups) { try { c.move(s) } catch { return `Coup illégal : ${s} (après ${coups.slice(0, coups.indexOf(s)).join(' ') || 'la position de départ'}).` } }
  if (c.isCheckmate()) return 'Échec et mat.'
  if (c.isDraw()) return 'Nulle.'
  const lines = await analyse(c.fen(), { movetime: 900, multipv: 3 })
  const sign = c.turn() === pov ? 1 : -1
  return lines.map((l, i) => {
    const w = winPct(l); const me = sign === 1 ? w : 100 - w
    const ev = l.mate != null ? `mat en ${Math.abs(l.mate)} pour ${(l.mate > 0) === (sign === 1) ? 'Max' : "l'adversaire"}` : `${(sign * (l.cp || 0) / 100).toFixed(1)} pions pour Max`
    return `${i + 1}. ${sanLine(c.fen(), l.pv, 8)} → ${ev} (chances de gain de Max ≈ ${Math.round(me)}%)`
  }).join('\n')
}

export async function ask(context: string, fen: string, pov: 'w' | 'b', history: Msg[]): Promise<string> {
  const s = getSettings()
  if (!s.key) throw new Error('no-key')
  const messages: unknown[] = [{ role: 'system', content: SYSTEM }, { role: 'system', content: context }, ...history]
  for (let i = 0; i < 5; i++) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.key}` },
      body: JSON.stringify({ model: s.model, messages, tools: TOOLS }),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(j.error?.message || `Erreur ${r.status}`)
    const msg = j.choices[0].message
    messages.push(msg)
    if (!msg.tool_calls?.length) return msg.content
    for (const tc of msg.tool_calls) {
      let out: string
      try { out = await evaluer(fen, JSON.parse(tc.function.arguments).coups || [], pov) } catch (e) { out = String(e) }
      messages.push({ role: 'tool', tool_call_id: tc.id, content: out })
    }
  }
  return "Je n'ai pas réussi à conclure, repose la question autrement."
}
