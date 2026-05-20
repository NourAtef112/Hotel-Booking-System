import { Navigate, Route, Routes } from 'react-router-dom'
import { NotificationProvider } from './contexts/NotificationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PrivateRoute from './components/PrivateRoute'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/admin/Login'
import Bookings from './pages/admin/Bookings'
import Calendar from './pages/admin/Calendar'
import Guests from './pages/admin/Guests'
import Housekeeping from './pages/admin/Housekeeping'
import Overview from './pages/admin/Overview'
import Rooms from './pages/admin/Rooms'

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/overview" element={<Overview />} />
              <Route path="/admin/bookings" element={<Bookings />} />
              <Route path="/admin/rooms" element={<Rooms />} />
              <Route path="/admin/calendar" element={<Calendar />} />
              <Route path="/admin/guests" element={<Guests />} />
              <Route path="/admin/housekeeping" element={<Housekeeping />} />
              <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/admin/overview" replace />} />
        </Routes>
      </NotificationProvider>
    </ThemeProvider>
  )
}
