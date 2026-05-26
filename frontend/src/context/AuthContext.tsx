"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_CONFIG } from '../../app/config';
import { useTenant } from '../../app/TenantContext';

interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  department?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  setUser: () => {},
  logout: () => {},
  checkAuth: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { getTenantId } = useTenant();

  const checkAuth = async () => {
    try {
      const headers: any = {
        'x-tenant-id': getTenantId()
      };

      const res = await fetch(`${API_CONFIG.ENDPOINTS.AUTH}/me`, {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUser({ id: data._id, ...data });
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const logout = async () => {
    try {
      await fetch(`${API_CONFIG.ENDPOINTS.AUTH}/logout`, { 
        method: 'POST', 
        headers: { 'x-tenant-id': getTenantId() },
        credentials: 'include' 
      });
    } catch (err) {}
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
