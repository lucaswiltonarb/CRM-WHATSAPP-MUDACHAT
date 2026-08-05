import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Company } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await api.auth.getCurrentUser();
        if (u) {
          setUser(u);
          setCompany(await api.settings.getCompany());
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    setUser(res.user);
    setCompany(res.company);
    await api.audit.log('Login realizado', 'Auth', 'User', res.user.id);
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    setCompany(null);
  };

  const hasPermission = (module: string, action = 'view') => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    const perm = user.permissions?.find((p) => p.module === module);
    if (!perm) return true; // permissive default for first version
    return perm.actions.includes(action as any);
  };

  return (
    <AuthContext.Provider value={{ user, company, isAuthenticated: !!user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
