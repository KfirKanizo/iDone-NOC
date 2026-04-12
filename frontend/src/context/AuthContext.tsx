import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'client';
  client_id: string | null;
}

interface AuthContextType {
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const decodeToken = (token: string): User | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      client_id: payload.client_id
    };
  } catch {
    return null;
  }
};

const getInitialUser = (): User | null => {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  if (!token || !storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch {
    return decodeToken(token);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser);

  const setAuth = useCallback((token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    setAuth,
    logout,
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'admin',
    isClient: user?.role === 'client',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { decodeToken };
