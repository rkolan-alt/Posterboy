import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import CallbackPage from './pages/CallbackPage'
import ModeSelectPage from './pages/ModeSelectPage'
import DashboardPage from './pages/DashboardPage'
import ColorSyncPage from './pages/ColorSyncPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/modes" element={<ModeSelectPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/colorsync" element={<ColorSyncPage />} />
      </Routes>
    </Router>
  )
}

export default App
