import { useState } from 'react';

/**
 * useBooking hook — Manages room booking state and submission.
 * TODO: Implement createBooking, cancelBooking, and fetchMyBookings logic.
 */
export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createBooking = async (data: any) => {
    setLoading(true);
    try {
      // TODO: call bookingService.createBooking(data)
    } finally {
      setLoading(false);
    }
  };

  return { createBooking, loading, error };
};
