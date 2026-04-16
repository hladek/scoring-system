import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Competitions from './pages/Competitions'
import MyCompetitions from './pages/MyCompetitions'
import Admin from './pages/Admin'
import CompetitionsManagement from './pages/CompetitionsManagement'
import MatchManagement from './pages/MatchManagement'
import Statistics from './pages/Statistics'
import TeamManagement from './pages/TeamManagement'
import Scoreboard from './pages/Scoreboard'
import { getToken } from './services/api'
import './App.css'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const hideNavbar = ['/admin', '/competitions-management', '/match', '/team-management', '/statistics', '/scoreboard'].some(path => location.pathname.startsWith(path))

  return (
    <div className="App">
      {!hideNavbar && <Navbar navigate={navigate} />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/my-competitions" element={<MyCompetitions />} />
          <Route path="/login" element={<Login navigate={navigate} />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/competitions-management" element={<CompetitionsManagement />} />
          <Route path="/team-management" element={<TeamManagement />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/match/:matchId" element={<MatchManagement />} />
          <Route path="/scoreboard/:matchId" element={<Scoreboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App


