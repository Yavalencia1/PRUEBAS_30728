import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/theme';
import { useNotificationCount } from '../../context/NotificationCountContext';
import RecorridosScreen from '../recorridos/RecorridosScreen';
import RutasScreen from '../rutas/RutasScreen';
import ParadasScreen from '../paradas/ParadasScreen';

const Tab = createBottomTabNavigator();

// ─── Header compartido (hamburguesa + campana) ────────────────────────────────
function HamburgerButton({ navigation }) {
  return (
    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.drawerToggle}>
      <Ionicons name="menu-outline" size={24} color="#1a202c" />
    </TouchableOpacity>
  );
}

function BellButton({ navigation }) {
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

const stackHeader = (drawerNav) => ({
  headerShown: true,
  headerLeft: () => <HamburgerButton navigation={drawerNav} />,
  headerRight: () => <BellButton navigation={drawerNav} />,
  headerStyle: { backgroundColor: '#ffffff', borderBottomColor: '#e2e8f0', borderBottomWidth: 1 },
  headerTintColor: '#1a202c',
  headerTitleStyle: { fontWeight: '600' },
});

// ─── Pantalla agrupada: tabs inferiores + navegación entre tabs con filtros ───
export default function GestionRutasScreen() {
  const insets = useSafeAreaInsets();
  const drawerNav = useNavigation();

  return (
    <Tab.Navigator
      screenOptions={{
        ...stackHeader(drawerNav),
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#a0aec0',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tab.Screen
        name="RecorridosTab"
        options={{
          title: 'Recorridos',
          tabBarLabel: 'Recorridos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trail-sign-outline" color={color} size={size} />
          ),
        }}
      >
        {() => <RecorridosScreen />}
      </Tab.Screen>

      <Tab.Screen
        name="RutasTab"
        options={{
          title: 'Rutas',
          tabBarLabel: 'Rutas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" color={color} size={size} />
          ),
        }}
      >
        {({ route }) => (
          <RutasScreen recorridoId={route.params?.recorridoId} />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="ParadasTab"
        options={{
          title: 'Paradas',
          tabBarLabel: 'Paradas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" color={color} size={size} />
          ),
        }}
      >
        {({ route }) => (
          <ParadasScreen
            rutaId={route.params?.rutaId}
            recorridoId={route.params?.recorridoId}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerToggle: { marginLeft: 14 },
  bell: { marginRight: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
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
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
});
