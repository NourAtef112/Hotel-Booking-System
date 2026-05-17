import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import Bookings from './pages/admin/Bookings'
import Overview from './pages/admin/Overview'
import Rooms from './pages/admin/Rooms'

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/admin/overview" element={<Overview />} />
        <Route path="/admin/bookings" element={<Bookings />} />
        <Route path="/admin/rooms" element={<Rooms />} />
        <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/overview" replace />} />
    </Routes>
  )
}
