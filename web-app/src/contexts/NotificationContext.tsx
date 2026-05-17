import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { adminApi } from '../lib/apiClient'
import type { Booking, BookingStatus, Room } from '../types/admin'
import type { AppNotification, NotificationType } from '../types/notifications'

interface NotificationContextValue {
  notifications: AppNotification[]
  toasts: AppNotification[]
  unreadCount: number
  markAllRead: () => void
  dismiss: (id: string) => void
  dismissToast: (id: string) => void
  // Instant triggers called directly from mutations
  notifyNewBooking: (booking: Booking) => void
  notifyStatusChange: (booking: Booking) => void
  notifyNewRoom: (room: Room) => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  toasts: [],
  unreadCount: 0,
  markAllRead: () => {},
  dismiss: () => {},
  dismissToast: () => {},
  notifyNewBooking: () => {},
  notifyStatusChange: () => {},
  notifyNewRoom: () => {},
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<AppNotification[]>([])

  // Lifted to component scope so both the poller and instant triggers share the same state
  const knownBookings = useRef<Map<number, BookingStatus>>(new Map())
  const knownRooms = useRef<Set<number>>(new Set())
  const initialized = useRef(false)

  const push = useCallback((type: NotificationType, title: string, message: string) => {
    const item: AppNotification = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    }
    setNotifications((prev) => [item, ...prev].slice(0, 50))
    setToasts((prev) => [item, ...prev].slice(0, 5))
  }, [])

  // ── Instant triggers (called from mutation onSuccess) ──────────────────────

  const notifyNewBooking = useCallback(
    (booking: Booking) => {
      knownBookings.current.set(booking.id, booking.status)
      push('new_booking', 'New Booking', `Booking #${booking.id} created for ${booking.guest_name}`)
    },
    [push],
  )

  const notifyStatusChange = useCallback(
    (booking: Booking) => {
      knownBookings.current.set(booking.id, booking.status)
      if (booking.status === 'confirmed') {
        push('booking_confirmed', 'Booking Confirmed', `Booking #${booking.id} (${booking.guest_name}) confirmed`)
      } else if (booking.status === 'completed') {
        push('booking_completed', 'Payment Received', `Booking #${booking.id} (${booking.guest_name}) marked as completed`)
      } else if (booking.status === 'cancelled') {
        push('booking_cancelled', 'Booking Cancelled', `Booking #${booking.id} (${booking.guest_name}) cancelled`)
      }
    },
    [push],
  )

  const notifyNewRoom = useCallback(
    (room: Room) => {
      knownRooms.current.add(room.id)
      push('new_room', 'New Room Added', `Room ${room.room_number} (${room.type}) added to the system`)
    },
    [push],
  )

  // ── Background poller (catches changes from other clients) ─────────────────

  useEffect(() => {
    async function poll() {
      try {
        const [bookingsRes, roomsRes] = await Promise.all([
          adminApi.getBookings(),
          adminApi.getRooms(),
        ])

        const bookings = bookingsRes.data
        const rooms = roomsRes.data

        if (!initialized.current) {
          for (const b of bookings) knownBookings.current.set(b.id, b.status)
          for (const r of rooms) knownRooms.current.add(r.id)
          initialized.current = true
          return
        }

        for (const b of bookings) {
          const prev = knownBookings.current.get(b.id)
          if (prev === undefined) {
            push('new_booking', 'New Booking', `Booking #${b.id} received from ${b.guest_name}`)
            knownBookings.current.set(b.id, b.status)
          } else if (prev !== b.status) {
            if (b.status === 'confirmed') {
              push('booking_confirmed', 'Booking Confirmed', `Booking #${b.id} (${b.guest_name}) confirmed`)
            } else if (b.status === 'completed') {
              push('booking_completed', 'Payment Received', `Booking #${b.id} (${b.guest_name}) completed`)
            } else if (b.status === 'cancelled') {
              push('booking_cancelled', 'Booking Cancelled', `Booking #${b.id} (${b.guest_name}) cancelled`)
            }
            knownBookings.current.set(b.id, b.status)
          }
        }

        for (const r of rooms) {
          if (!knownRooms.current.has(r.id)) {
            push('new_room', 'New Room Added', `Room ${r.room_number} (${r.type}) added to the system`)
            knownRooms.current.add(r.id)
          }
        }
      } catch {
        // Silently ignore network errors
      }
    }

    poll()
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [push])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        unreadCount,
        markAllRead,
        dismiss,
        dismissToast,
        notifyNewBooking,
        notifyStatusChange,
        notifyNewRoom,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
