import { useState, useEffect } from 'react';

/**
 * useRooms hook — Manages room listing and detail state.
 * TODO: Implement fetching logic using roomService.
 */
export const useRooms = (filters?: any) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRooms = async () => { /* TODO */ };

  useEffect(() => {
    fetchRooms();
  }, [filters]);

  return { rooms, loading, fetchRooms };
};
