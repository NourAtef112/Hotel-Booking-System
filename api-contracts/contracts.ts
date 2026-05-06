/**
 * API Contracts Definition
 * format: TypeScript interfaces for request/response payloads.
 */

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  role: 'student' | 'staff' | 'guest';
  university_id?: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    role: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
}

export interface Room {
  id: number;
  name: string;
  room_type: 'single' | 'double' | 'suite';
  price_per_night: number;
  available: boolean;
}

export interface BookingRequest {
  room_id: number;
  check_in: string; // ISO date
  check_out: string; // ISO date
}

export interface BookingResponse {
  id: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: number;
}
