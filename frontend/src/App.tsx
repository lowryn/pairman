import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import DeviceList from './pages/DeviceList'
import DeviceDetail from './pages/DeviceDetail'
import AddDevice from './pages/AddDevice'
import Labels from './pages/Labels'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/devices" replace />} />
        <Route path="/devices" element={<DeviceList />} />
        <Route path="/devices/new" element={<AddDevice />} />
        <Route path="/devices/:id" element={<DeviceDetail />} />
        <Route path="/labels" element={<Labels />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
