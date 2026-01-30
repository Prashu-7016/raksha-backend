import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSeedHash, storeSeedHash, clearAuth, getDeviceSalt, hashSeedPhrase } from '../utils/seedPhrase';
import { api } from '../utils/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  seedHash: string | null;
  login: (seedPhrase: string) => Promise<void>;
  register: (seedHash: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [seedHash, setSeedHash] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const hash = await getSeedHash();
      if (hash) {
        setSeedHash(hash);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (seedPhrase: string) => {
    try {
      const deviceSalt = await getDeviceSalt();
      const hash = await hashSeedPhrase(seedPhrase, deviceSalt);
      
      await api.login({ seed_hash: hash, device_salt: deviceSalt });
      
      await storeSeedHash(hash);
      setSeedHash(hash);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (hash: string) => {
    await storeSeedHash(hash);
    setSeedHash(hash);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await clearAuth();
    setSeedHash(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, seedHash, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};