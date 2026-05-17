export type NotificationType =
  | 'new_booking'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'new_room'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
}
