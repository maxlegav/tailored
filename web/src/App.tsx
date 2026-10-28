import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import type { Data } from './types'
import Profile from './pages/Profile'
import Repertoire from './pages/Repertoire'
import Train from './pages/Train'
import Lessons from './pages/Lessons'
import MyRep from './pages/MyRep'
import Settings from './pages/Settings'
import Note from './Note'

const I = (d: string) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d={d} /></svg>
const NAV = [
  { to: '/', label: 'Profil', ic: I('M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-9 2.2-9 5v3h18v-3c0-2.8-4.6-5-9-5Z') },
  { to: '/cours', label: 'Cours', ic: I('M12 3 1 9l11 6 9-4.9V17h2V9L12 3ZM5 13.2v4L12 21l7-3.8v-4L12 17l-7-3.8Z') },
  { to: '/entrainement', label: 'Entraînement', ic: I('M19 22H5v-2h14v2ZM13 2c-1.3 0-2.3.8-2.7 2H8l1 3-3 4 2 2 2-1v2l-3 5h10c0-4 1-7 3-9 .6-3.5-1.6-8-5-8Z') },
  { to: '/repertoire', label: 'Répertoire', ic: I('M6 2h11a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm1 3v2h9V5H7Zm0 4v2h9V9H7Zm0 4v2h6v-2H7Z') },
  { to: '/mon-repertoire', label: 'Mon répertoire', ic: I('M12 2a3.5 3.5 0 0 0-2 6.4L8 14h8l-2-5.6A3.5 3.5 0 0 0 12 2ZM7 16l-1 3h12l-1-3H7Zm-2 4v2h14v-2H5Z') },
]

const Brand = () => <NavLink to="/" className="brand"><img src="./icon.svg?v=2" alt="" />Tailored</NavLink>

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  useEffect(() => { fetch('./data.json', { cache: 'no-cache' }).then(r => r.json()).then(setData) }, [])
  return (
    <div className="app">
      <aside className="side">
        <Brand />
        {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} className="nav"><span className="ic">{n.ic}</span>{n.label}</NavLink>)}
        <Note />
      </aside>
      <main>
        <header className="topbar"><Brand /><Note /><NavLink to="/reglages" className="gear" aria-label="Réglages">⚙</NavLink></header>
        {!data ? <div className="loading">Chargement de ton coach…</div> : (
          <Routes>
            <Route path="/" element={<Profile data={data} />} />
            <Route path="/cours" element={<Lessons data={data} />} />
            <Route path="/entrainement" element={<Train data={data} />} />
            <Route path="/repertoire" element={<Repertoire data={data} />} />
            <Route path="/mon-repertoire" element={<MyRep data={data} />} />
                 <Route path="/reglages" element={<Settings />} />
          </Routes>
        )}
      </main>
      <nav className="tabs">
        {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}><span className="ic">{n.ic}</span>{n.label}</NavLink>)}
      </nav>
    </div>
  )
}
