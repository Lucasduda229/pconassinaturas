import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  pix_key: string | null;
  status: string;
}

interface AffiliateAuthContextType {
  affiliate: Affiliate | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    phone?: string;
    pix_key?: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const AffiliateAuthContext = createContext<AffiliateAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'affiliate_session_token';

export const AffiliateAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifySession = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-auth?action=verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ token }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAffiliate(data.affiliate);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Session verification error:', error);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifySession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-auth?action=login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Erro ao fazer login' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setAffiliate(data.affiliate);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-auth?action=logout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ token }),
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setAffiliate(null);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    phone?: string;
    pix_key?: string;
    password: string;
  }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-auth?action=register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Erro ao cadastrar' };
      }

      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Erro de conexão' };
    }
  };

  return (
    <AffiliateAuthContext.Provider
      value={{
        affiliate,
        isLoading,
        isAuthenticated: !!affiliate,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AffiliateAuthContext.Provider>
  );
};

export const useAffiliateAuth = () => {
  const context = useContext(AffiliateAuthContext);
  if (!context) {
    throw new Error('useAffiliateAuth must be used within an AffiliateAuthProvider');
  }
  return context;
};
