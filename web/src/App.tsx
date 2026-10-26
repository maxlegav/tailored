import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import type { Data } from './types'
import Profile from './pages/Profile'
import Repertoire from './pages/Repertoire'
import Train from './pages/Train'
import Lessons from './pages/Lessons'
import Games from './pages/Games'

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  useEffect(() => { fetch('./data.json').then(r => r.json()).then(setData) }, [])
  if (!data) return <div className="loading">Chargement de ton coach…</div>
  return (
    <div className="app">
      <main>
        <Routes>
          <Route path="/" element={<Profile data={data} />} />
          <Route path="/cours" element={<Lessons data={data} />} />
          <Route path="/entrainement" element={<Train data={data} />} />
          <Route path="/repertoire" element={<Repertoire data={data} />} />
          <Route path="/parties" element={<Games data={data} />} />
        </Routes>
      </main>
      <nav className="tabs">
        <NavLink to="/" end>Profil</NavLink>
        <NavLink to="/cours">Cours</NavLink>
        <NavLink to="/entrainement">Entraînement</NavLink>
        <NavLink to="/repertoire">Répertoire</NavLink>
        <NavLink to="/parties">Parties</NavLink>
      </nav>
    </div>
  )
}
