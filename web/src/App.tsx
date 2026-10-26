import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import type { Data } from './types'
import Profile from './pages/Profile'
import Repertoire from './pages/Repertoire'
import Train from './pages/Train'
import Lessons from './pages/Lessons'
import Games from './pages/Games'

const NAV = [
  { to: '/', label: 'Profil', ic: '◉' },
  { to: '/cours', label: 'Cours', ic: '🎓' },
  { to: '/entrainement', label: 'Entraînement', ic: '♞' },
  { to: '/repertoire', label: 'Répertoire', ic: '📖' },
  { to: '/parties', label: 'Parties', ic: '♟' },
]

const Brand = () => <NavLink to="/" className="brand"><img src="./icon.svg" alt="" />Tailored</NavLink>

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  useEffect(() => { fetch('./data.json').then(r => r.json()).then(setData) }, [])
  return (
    <div className="app">
      <aside className="side">
        <Brand />
        {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} className="nav"><span className="ic">{n.ic}</span>{n.label}</NavLink>)}
      </aside>
      <main>
        <header className="topbar"><Brand /></header>
        {!data ? <div className="loading">Chargement de ton coach…</div> : (
          <Routes>
            <Route path="/" element={<Profile data={data} />} />
            <Route path="/cours" element={<Lessons data={data} />} />
            <Route path="/entrainement" element={<Train data={data} />} />
            <Route path="/repertoire" element={<Repertoire data={data} />} />
            <Route path="/parties" element={<Games data={data} />} />
          </Routes>
        )}
      </main>
      <nav className="tabs">
        {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}><span className="ic">{n.ic}</span>{n.label}</NavLink>)}
      </nav>
    </div>
  )
}
