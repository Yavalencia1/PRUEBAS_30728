import React from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getPrimaryMenu, getSecondaryMenu } from './RoleMenu';
import { Colors } from '../theme/theme';
import { useNotificationCount, NotificationCountProvider } from '../context/NotificationCountContext';

// ─── Pantallas Auth ───────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// ─── Pantallas Principales ────────────────────────────────────────────────────
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';

// ─── Pantalla del Conductor (no modificar la lógica) ──────────────────────────
import ConductorScreen from '../screens/ConductorScreen';

// ─── Módulos ──────────────────────────────────────────────────────────────────
import NotificacionesScreen from '../screens/notificaciones/NotificacionesScreen';
import MapaTrackingScreen from '../screens/mapa/MapaTrackingScreen';
import AlumnosScreen from '../screens/alumnos/AlumnosScreen';
import AsistenciaScreen from '../screens/asistencia/AsistenciaScreen';
import RecorridosScreen from '../screens/recorridos/RecorridosScreen';
import RutasScreen from '../screens/rutas/RutasScreen';
import PagosScreen from '../screens/pagos/PagosScreen';
import ParadasScreen from '../screens/paradas/ParadasScreen';
import GestionRutasScreen from '../screens/gestion/GestionRutasScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const screenRegistry = {
  Dashboard: DashboardScreen,
  MapaTracking: MapaTrackingScreen,
  Asistencia: AsistenciaScreen,
  Pagos: PagosScreen,
  Notificaciones: NotificacionesScreen,
  Conductor: ConductorScreen,
  Recorridos: RecorridosScreen,
  Rutas: RutasScreen,
  Paradas: ParadasScreen,
  GestionRutas: GestionRutasScreen,
  Alumnos: AlumnosScreen,
  Profile: ProfileScreen,
};

// ─── Campana con badge de no leídas (header) ──────────────────────────────────
function BellButton() {
  const navigation = useNavigation();
  const { unreadCount } = useNotificationCount();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Notificaciones')} style={styles.bell}>
      <Ionicons name="notifications-outline" size={24} color="#1a202c" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Auth Stack (sin sesión) ──────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#f8f9fa' } }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ─── Bottom Tabs (módulos primarios del rol) ──────────────────────────────────
function MainTabs() {
  const { usuario } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const primary = getPrimaryMenu(usuario?.rol);

  return (
    <Tab.Navigator
      screenOptions={() => ({
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.drawerToggle}>
            <Ionicons name="menu-outline" size={24} color="#1a202c" />
          </TouchableOpacity>
        ),
        headerRight: () => <BellButton />,
        tabBarIcon: ({ color, size }) => {
          // El ícono se resuelve por nombre de ruta en el render de cada Tab.Screen.
          return <Ionicons name="ellipse-outline" size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#a0aec0',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomColor: '#e2e8f0',
          borderBottomWidth: 1,
        },
        headerTintColor: '#1a202c',
        headerTitleStyle: { fontWeight: '600' },
      })}
    >
      {primary.map((item) => (
        <Tab.Screen
          key={item.name}
          name={item.name}
          component={screenRegistry[item.name]}
          options={{
            title: item.label,
            tabBarLabel: item.label,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={item.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

// ─── Drawer (Inicio = tabs + módulos secundarios + Perfil + Cerrar sesión) ─────
function CustomDrawerContent(props) {
  const { logout } = useAuth();
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Cerrar sesión"
        icon={({ color, size }) => <Ionicons name="log-out-outline" color={color} size={size} />}
        onPress={logout}
      />
    </DrawerContentScrollView>
  );
}

function AppDrawer() {
  const { usuario } = useAuth();
  const secondary = getSecondaryMenu(usuario?.rol);

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerRight: () => <BellButton />,
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.drawerToggle}>
            <Ionicons name="menu-outline" size={24} color="#1a202c" />
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomColor: '#e2e8f0',
          borderBottomWidth: 1,
        },
        headerTintColor: '#1a202c',
        headerTitleStyle: { fontWeight: '600' },
        drawerActiveTintColor: Colors.primary,
        drawerInactiveTintColor: '#4a5568',
      })}
    >
      <Drawer.Screen
        name="Inicio"
        component={MainTabs}
        options={{
          headerShown: false,
          title: 'RouteKids',
          drawerIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      {secondary.map((item) => (
        <Drawer.Screen
          key={item.name}
          name={item.name}
          component={screenRegistry[item.name]}
          options={{
            title: item.label,
            headerShown: item.tabContainer ? false : true,
            drawerIcon: ({ color, size }) => <Ionicons name={item.icon} color={color} size={size} />,
          }}
        />
      ))}
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          drawerIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Drawer.Navigator>
  );
}

// ─── Root Stack autenticado ───────────────────────────────────────────────────
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="Home" component={AppDrawer} />
      <Stack.Screen
        name="Notificaciones"
        component={NotificacionesScreen}
        options={{ title: 'Notificaciones' }}
      />
    </Stack.Navigator>
  );
}

// ─── Punto de entrada de navegación ────────────────────────────────────────────
export default function AppNavigator() {
  const { isLoading, isLoggedIn } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.splashText}>Verificando sesión…</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        {!isLoggedIn ? (
          <AuthStack />
        ) : (
          <NotificationCountProvider>
            <AppStack />
          </NotificationCountProvider>
        )}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  splashText: {
    marginTop: 12,
    color: '#718096',
    fontSize: 14,
  },
  bell: {
    marginRight: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  drawerToggle: {
    marginLeft: 14,
  },
});
