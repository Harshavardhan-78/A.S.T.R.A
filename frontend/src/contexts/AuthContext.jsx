import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setUser({
        id: res.data.user_id,
        full_name: res.data.full_name,
        email: res.data.email,
        role: res.data.role,
      });
    } catch (err) {
      setUser(null);
      localStorage.clear();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (emailOrData, password, role = 'RESIDENT') => {
    let payload;
    if (typeof emailOrData === 'object' && emailOrData !== null) {
      payload = {
        email: emailOrData.email,
        password: emailOrData.password,
        role: emailOrData.role || 'RESIDENT',
      };
    } else {
      payload = {
        email: emailOrData,
        password,
        role: role || 'RESIDENT',
      };
    }

    const res = await apiClient.post('/auth/login', payload);
    const { access_token, refresh_token } = res.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    const meRes = await apiClient.get('/auth/me');
    const userData = {
      id: meRes.data.user_id,
      full_name: meRes.data.full_name,
      email: meRes.data.email,
      role: meRes.data.role,
    };
    setUser(userData);
    return userData;
  };

  const register = async (fullNameOrData, email, password, role = 'RESIDENT', adminCode = null) => {
    let payload;
    if (typeof fullNameOrData === 'object' && fullNameOrData !== null) {
      payload = {
        full_name: fullNameOrData.full_name || fullNameOrData.fullName,
        email: fullNameOrData.email,
        password: fullNameOrData.password,
        role: fullNameOrData.role || 'RESIDENT',
        admin_code: fullNameOrData.admin_code || fullNameOrData.adminCode || null,
      };
    } else {
      payload = {
        full_name: fullNameOrData,
        email,
        password,
        role,
        admin_code: adminCode,
      };
    }

    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    } catch (err) {
      // Ignore errors on logout
    } finally {
      localStorage.clear();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
