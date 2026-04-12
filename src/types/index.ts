export type UserRole = 'admin' | 'user'
export type ReservationStatus = 'active' | 'cancelled'
export type AuditAction =
  | 'reservation_created'
  | 'reservation_cancelled'
  | 'reservation_modified'

export interface Family {
  id: string
  name: string
  created_at: string
}

export interface User {
  id: string
  clerk_user_id: string | null
  email: string
  first_name: string
  last_name: string
  family_id: string | null
  family?: Family
  role: UserRole
  receive_notifications: boolean
  created_at: string
  updated_at: string
}

export interface AugustAssignment {
  id: string
  year: number
  family_id: string
  family?: Family
  assigned_by: string | null
  created_at: string
}

export interface Reservation {
  id: string
  user_id: string
  user?: User
  check_in: string   // 'YYYY-MM-DD'
  check_out: string  // 'YYYY-MM-DD'
  nights: number
  total_price: number
  status: ReservationStatus
  created_at: string
  updated_at: string
  cancelled_at: string | null
}

export interface AuditLogEntry {
  id: string
  user_id: string | null
  user?: User
  action: AuditAction
  reservation_id: string | null
  reservation?: Reservation
  details: Record<string, unknown>
  created_at: string
}

export interface Photo {
  id: string
  storage_path: string
  url: string
  caption: string | null
  sort_order: number
  uploaded_by: string | null
  created_at: string
}

export interface AccountingSummary {
  family_id: string
  family_name: string
  year: number
  month: number
  total_reservations: number
  total_nights: number
  total_income: number
}

// API request/response types
export interface ApiError {
  error: string
  code?: string
}

export interface CreateReservationRequest {
  check_in: string  // 'YYYY-MM-DD'
  check_out: string // 'YYYY-MM-DD'
}

export interface CreateReservationResponse {
  id: string
  check_in: string
  check_out: string
  nights: number
  total_price: number
}
