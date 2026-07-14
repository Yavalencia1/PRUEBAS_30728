import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getRoleMenu } from './RoleMenu';
import { Colors } from '../theme/theme';

// ─── Pantallas Auth ───────────────────────────────────────────────────────────
import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// ─── Pantallas Principales ────────────────────────────────────────────────────
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen   from '../screens/ProfileScreen';

// ─── Pantalla del Conductor (Dev 4 - Voncho) ──────────────────────────────────
// No modificar la lógica de ConductorScreen.
// Recibe el token real desde AuthContext gracias a la integración en Fase 5.
import ConductorScreen from '../screens/ConductorScreen';

// ─── Módulos adicionales (stubs temporales hasta implementación completa) ──────
// Reemplazar cada import por la pantalla real cuando el módulo esté listo.
import NotificacionesScreen from '../screens/notificaciones/NotificacionesScreen';
import MapaTrackingScreen   from '../screens/mapa/MapaTrackingScreen';
import AlumnosScreen        from '../screens/alumnos/AlumnosScreen';
import AsistenciaScreen     from '../screens/asistencia/AsistenciaScreen';
import RecorridosScreen     from '../screens/recorridos/RecorridosScreen';
import RutasScreen          from '../screens/rutas/RutasScreen';
import PagosScreen          from '../screens/pagos/PagosScreen';
import ParadasScreen        from '../screens/paradas/ParadasScreen';

// ─────────────────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ─── Auth Stack (pantallas sin sesión) ───────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#f8f9fa' },
      }}
    >
      <Stack.Screen name="Login"    component={LoginScreen}    />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ─── Tab Navigator principal (post-login) ────────────────────────────────────

function MainTabNavigator({ usuario }) {
  const menu = getRoleMenu(usuario?.rol);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarLabel:      getTabLabel(route.name),
        tabBarIcon:       ({ color }) => (
          <Text style={{ fontSize: 18 }}>{getTabIcon(route.name)}</Text>
        ),
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: '#a0aec0',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor:  '#e2e8f0',
          borderTopWidth:  1,
          height:          60,
          paddingBottom:   8,
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomColor: '#e2e8f0',
          borderBottomWidth: 1,
        },
        headerTintColor:      '#1a202c',
        headerTitleStyle:     { fontWeight: '600' },
      })}
    >
      {/* Dashboard — siempre visible */}
      <Tab.Screen name="Dashboard" component={DashboardScreen} />

      {/* Mapa — padres y admin */}
      {menu.some((m) => m.name === 'MapaTracking') && (
        <Tab.Screen
          name="MapaTracking"
          component={MapaTrackingScreen}
          options={{ title: 'Mapa' }}
        />
      )}

      {/* Conductor — solo rol 'conductor' (pantalla del Dev 4) */}
      {menu.some((m) => m.name === 'Conductor') && (
        <Tab.Screen
          name="Conductor"
          component={ConductorScreen}
          options={{ title: 'Mi Ruta', headerShown: false }}
        />
      )}

      {/* Asistencia — conductor, padre, admin */}
      {menu.some((m) => m.name === 'Asistencia') && (
        <Tab.Screen
          name="Asistencia"
          component={AsistenciaScreen}
          options={{ title: 'Asistencia' }}
        />
      )}

      {/* Pagos — padre, dueño, admin */}
      {menu.some((m) => m.name === 'Pagos') && (
        <Tab.Screen
          name="Pagos"
          component={PagosScreen}
          options={{ title: 'Pagos' }}
        />
      )}

      {/* Alumnos — dueño, admin */}
      {menu.some((m) => m.name === 'Alumnos') && (
        <Tab.Screen
          name="Alumnos"
          component={AlumnosScreen}
          options={{ title: 'Alumnos' }}
        />
      )}

      {/* Recorridos — dueño, admin */}
      {menu.some((m) => m.name === 'Recorridos') && (
        <Tab.Screen
          name="Recorridos"
          component={RecorridosScreen}
          options={{ title: 'Recorridos' }}
        />
      )}

      {/* Rutas — dueño, admin */}
      {menu.some((m) => m.name === 'Rutas') && (
        <Tab.Screen
          name="Rutas"
          component={RutasScreen}
          options={{ title: 'Rutas' }}
        />
      )}

      {/* Paradas — dueño, admin */}
      {menu.some((m) => m.name === 'Paradas') && (
        <Tab.Screen
          name="Paradas"
          component={ParadasScreen}
          options={{ title: 'Paradas' }}
        />
      )}

      {/* Notificaciones — todos los roles */}
      <Tab.Screen
        name="Notificaciones"
        component={NotificacionesScreen}
        options={{ title: 'Notificaciones' }}
      />

      {/* Perfil — todos los roles */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

function RootStack({ usuario }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen
        name="MainApp"
        component={() => <MainTabNavigator usuario={usuario} />}
      />
    </Stack.Navigator>
  );
}

// ─── Punto de entrada de navegación ──────────────────────────────────────────

export default function AppNavigator() {
  const { isLoading, usuario, isLoggedIn } = useAuth();

  // Splash de carga mientras se verifica la sesión
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ marginTop: 12, color: '#718096', fontSize: 14 }}>Verificando sesión…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isLoggedIn ? (
        // Sin sesión → flujo de autenticación
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
          <Stack.Screen name="Auth" component={AuthStack} options={{ animation: 'none' }} />
        </Stack.Navigator>
      ) : (
        // Con sesión → app principal con tabs por rol
        <RootStack usuario={usuario} />
      )}
    </NavigationContainer>
  );
}

// ─── Helpers de etiquetas e iconos ────────────────────────────────────────────

function getTabLabel(routeName) {
  const labels = {
    Dashboard:      'Dashboard',
    MapaTracking:   'Mapa',
    Conductor:      'Mi Ruta',
    Asistencia:     'Asistencia',
    Pagos:          'Pagos',
    Alumnos:        'Alumnos',
    Recorridos:     'Recorridos',
    Rutas:          'Rutas',
    Paradas:        'Paradas',
    Notificaciones: 'Avisos',
    Profile:        'Perfil',
  };
  return labels[routeName] || routeName;
}

function getTabIcon(routeName) {
  const icons = {
    Dashboard:      '📊',
    MapaTracking:   '🗺️',
    Conductor:      '🚌',
    Asistencia:     '✅',
    Pagos:          '💳',
    Alumnos:        '👥',
    Recorridos:     '🚌',
    Rutas:          '🛣️',
    Paradas:        '📍',
    Notificaciones: '🔔',
    Profile:        '👤',
  };
  return icons[routeName] || '📱';
}
