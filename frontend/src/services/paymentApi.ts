import axios from 'axios';

export interface CheckoutRequest {
  booking_id: number;
  amount_cents: number;       // EGP × 100 (e.g. EGP 250 → 25000)
  currency: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string;        // format: +201XXXXXXXXX
}

export interface CheckoutResponse {
  client_secret: string;
  payment_url: string;        // this goes into the iframe src
  booking_id: number;
}

export async function generatePaymentUrl(
  data: CheckoutRequest
): Promise<CheckoutResponse> {
  // el secret key mesh hena — el backend biyit3amel maha
  // el frontend bass byakhod el payment_url el safe
  const response = await axios.post<CheckoutResponse>(
    '/api/payments/checkout',
    data
  );
  return response.data;
}
