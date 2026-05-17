import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/apiClient'
import type { Booking, BookingStatus, ManualBookingCreate, Room, RoomCreate } from '../types/admin'

const ROOMS_KEY = ['admin', 'rooms'] as const
const BOOKINGS_KEY = ['admin', 'bookings'] as const

export function useAdminRooms() {
  return useQuery({
    queryKey: ROOMS_KEY,
    queryFn: () => adminApi.getRooms().then((r) => r.data),
  })
}

export function useAdminBookings() {
  return useQuery({
    queryKey: BOOKINGS_KEY,
    queryFn: () => adminApi.getBookings().then((r) => r.data),
  })
}

export function useCreateRoom() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: RoomCreate) => adminApi.createRoom(data).then((r) => r.data),

    onMutate: async (newRoom) => {
      await qc.cancelQueries({ queryKey: ROOMS_KEY })
      const snapshot = qc.getQueryData<Room[]>(ROOMS_KEY) ?? []
      const tempId = -Date.now()

      qc.setQueryData<Room[]>(ROOMS_KEY, [...snapshot, { id: tempId, ...newRoom }])
      return { snapshot, tempId }
    },

    onSuccess: (serverRoom, _vars, ctx) => {
      qc.setQueryData<Room[]>(ROOMS_KEY, (old = []) =>
        old.map((r) => (r.id === ctx?.tempId ? serverRoom : r)),
      )
    },

    onError: (_err, _vars, ctx) => {
      qc.setQueryData(ROOMS_KEY, ctx?.snapshot ?? [])
    },
  })
}

export function useCreateManualBooking() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: ManualBookingCreate) =>
      adminApi.createManualBooking(data).then((r) => r.data),

    onMutate: async (newBooking) => {
      await qc.cancelQueries({ queryKey: BOOKINGS_KEY })
      const snapshot = qc.getQueryData<Booking[]>(BOOKINGS_KEY) ?? []
      const tempId = -Date.now()

      qc.setQueryData<Booking[]>(BOOKINGS_KEY, [
        ...snapshot,
        { id: tempId, ...newBooking, status: 'confirmed' as const },
      ])
      return { snapshot, tempId }
    },

    onSuccess: (serverBooking, _vars, ctx) => {
      qc.setQueryData<Booking[]>(BOOKINGS_KEY, (old = []) =>
        old.map((b) => (b.id === ctx?.tempId ? serverBooking : b)),
      )
    },

    onError: (_err, _vars, ctx) => {
      qc.setQueryData(BOOKINGS_KEY, ctx?.snapshot ?? [])
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY })
    },
  })
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: BookingStatus }) =>
      adminApi.updateBookingStatus(id, status).then((r) => r.data),

    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: BOOKINGS_KEY })
      const snapshot = qc.getQueryData<Booking[]>(BOOKINGS_KEY)
      qc.setQueryData<Booking[]>(BOOKINGS_KEY, (old = []) =>
        old.map((b) => (b.id === id ? { ...b, status } : b)),
      )
      return { snapshot }
    },

    onError: (_err, _vars, ctx) => {
      qc.setQueryData(BOOKINGS_KEY, ctx?.snapshot)
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY })
    },
  })
}
