import React, { createContext, useState, useEffect, useCallback } from 'react';
import { api, setUnauthorizedHandler } from '../services/api';
import { tokenStorage } from '../services/secureStore';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Verificar sesión persistida al arrancar la app
  useEffect(() => {
    bootstrapAsync();
    setUnauthorizedHandler(() => {
      setUsuario(null);
      setToken(null);
      setIsLoggedIn(false);
    });
  }, []);

  const bootstrapAsync = async () => {
    try {
      setIsLoading(true);
      const accessToken = await tokenStorage.getAccessToken();
      const usuarioData = await tokenStorage.getUser();

      if (accessToken && usuarioData) {
        setUsuario(usuarioData);
        setToken(accessToken);
        setIsLoggedIn(true);
      } else {
        await tokenStorage.clear();
      }
    } catch (error) {
      console.error('[AuthContext] Error al verificar sesión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login con email y password.
   * Devuelve { success, usuario } o { success: false, error }.
   */
  const login = useCallback(async (email, password) => {
    try {
      setIsLoading(true);
      const result = await api.auth.login(email.trim().toLowerCase(), password);

      if (result.ok && result.data) {
        setUsuario(result.data.usuario);
        setToken(result.data.tokens.access_token);
        setIsLoggedIn(true);
        return { success: true, usuario: result.data.usuario };
      } else {
        return {
          success: false,
          error: result.mensaje || 'Credenciales inválidas',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error de conexión',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Registro de nuevo usuario.
   * Devuelve { success, mensaje } o { success: false, error }.
   */
  const registro = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      const payload = {
        nombre:             userData.nombre.trim(),
        apellido:           userData.apellido.trim(),
        email:              userData.email.trim().toLowerCase(),
        telefono:           userData.telefono.trim(),
        password:           userData.password,
        confirmar_password: userData.confirmar_password,
        rol:                userData.rol || 'padre',
      };

      const result = await api.auth.registro(payload);

      if (result.ok) {
        return { success: true, mensaje: result.mensaje || 'Registro exitoso' };
      } else {
        return {
          success: false,
          error: result.mensaje || 'No se pudo crear la cuenta',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error de conexión',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cerrar sesión: limpia secure-store y resetea el estado.
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await api.auth.logout();
      setUsuario(null);
      setToken(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('[AuthContext] Error al hacer logout:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    usuario,      // Objeto del usuario autenticado (nombre, email, rol, id, …)
    token,        // JWT de acceso (para WebSocket del conductor, etc.)
    isLoading,    // true mientras se verifica sesión o se procesa login/logout
    isLoggedIn,   // true cuando hay sesión válida
    login,
    registro,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para consumir el contexto de autenticación.
 * Úsalo en cualquier pantalla: const { usuario, login, logout } = useAuth();
 */
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
