import axios from 'axios'
import { clearToken, getToken } from './auth'
import type { Booking, BookingStatus, BookingUpdate, ManualBookingCreate, Room, RoomCreate, RoomUpdate } from '../types/admin'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
})

// Every /api/admin route requires an admin JWT.
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Expired, revoked, or non-admin token: drop it and send the user to login.
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    if (status === 401 || status === 403) {
      clearToken()
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(err)
  },
)

export const adminApi = {
  getRooms: (skip = 0, limit = 200) =>
    http.get<Room[]>('/api/admin/rooms', { params: { skip, limit } }),

  getBookings: (skip = 0, limit = 100) =>
    http.get<Booking[]>('/api/admin/bookings', { params: { skip, limit } }),

  createRoom: (data: RoomCreate) =>
    http.post<Room>('/api/admin/rooms', data),

  createManualBooking: (data: ManualBookingCreate) =>
    http.post<Booking>('/api/admin/bookings/manual', data),

  updateBookingStatus: (id: number, status: BookingStatus) =>
    http.patch<Booking>(`/api/admin/bookings/${id}/status`, { status }),

  updateBooking: (id: number, data: BookingUpdate) =>
    http.patch<Booking>(`/api/admin/bookings/${id}`, data),

  updateRoom: (id: number, data: RoomUpdate) =>
    http.patch<Room>(`/api/admin/rooms/${id}`, data),

  deleteRoom: (id: number) =>
    http.delete(`/api/admin/rooms/${id}`),
}
