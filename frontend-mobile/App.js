import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator    from './src/navigation/AppNavigator';

/**
 * App.js — Punto de entrada de RouteKids Mobile
 *
 * Envuelve toda la app en AuthProvider para que cualquier pantalla
 * pueda consumir useAuth() y obtener usuario, token e isLoggedIn.
 *
 * La navegación se inicializa en AppNavigator, que decide entre
 * el flujo de autenticación (Login/Register) y el tab navigator
 * principal según el estado isLoggedIn del contexto.
 */
export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
