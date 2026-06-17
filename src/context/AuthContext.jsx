import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');

    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        // Corrupted localStorage value — clear it instead of crashing.
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }

    setLoading(false);
  }, []);

  // PERF FIX: login/logout are now memoized with useCallback. Previously they
  // were re-created as brand-new functions on every render, which meant the
  // context value object below was also brand-new every render — forcing
  // every consumer (Navbar, ProtectedRoute, all three dashboard layouts) to
  // re-render even when `user` hadn't actually changed.
  const login = useCallback((userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  // PERF FIX: memoize the context value itself. Without this, even with
  // stable login/logout references, a new `{ user, loading, login, logout }`
  // object is created on every AuthProvider render, which still triggers
  // re-renders in all consumers (useContext compares by reference).
  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}