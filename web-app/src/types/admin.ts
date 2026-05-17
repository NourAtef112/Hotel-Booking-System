export type RoomType = 'single' | 'double' | 'suite' | 'family'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Room {
  id: number
  room_number: string
  type: RoomType
  price_per_night: number
}

export interface RoomCreate {
  room_number: string
  type: RoomType
  price_per_night: number
}

export interface Booking {
  id: number
  guest_name: string
  room_id: number
  start_date: string
  end_date: string
  status: BookingStatus
}

export interface ManualBookingCreate {
  guest_name: string
  room_id: number
  start_date: string
  end_date: string
}
