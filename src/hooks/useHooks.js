import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(url);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line
  }, [url, ...deps]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useForm(initial) {
  const [form, setForm] = useState(initial);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const reset = () => setForm(initial);

  return { form, setForm, onChange, reset };
}

/**
 * useDebouncedValue — returns a copy of `value` that only updates after
 * `delayMs` of no further changes. Use this to wrap live search/filter
 * inputs so expensive filter/sort work (and re-renders of large lists)
 * only happens once the user pauses typing, instead of on every keystroke.
 *
 * Usage:
 *   const [searchQ, setSearchQ] = useState('');
 *   const debouncedSearchQ = useDebouncedValue(searchQ, 250);
 *   // filter using debouncedSearchQ, not searchQ
 */
export function useDebouncedValue(value, delayMs = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}