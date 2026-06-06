import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export function useAuthState() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('accessToken')
      .then((token) => setIsAuthenticated(!!token))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  const setAuthenticated = (value: boolean) => setIsAuthenticated(value);

  return { loading, isAuthenticated, setAuthenticated };
}
