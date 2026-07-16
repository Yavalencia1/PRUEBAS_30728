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

// ─── Header compartido (estilo premium consistente con AppNavigator) ─────────
function HamburgerButton({ navigation }) {
  return (
    <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.drawerToggle}>
      <Ionicons name="menu" size={22} color="#185FA5" />
    </TouchableOpacity>
  );
}

function BellButton({ navigation }) {
  const { unreadCount } = useNotificationCount();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Notificaciones')} style={styles.bell}>
      <Ionicons name="notifications" size={15} color="#185FA5" />
      {unreadCount > 0 && (
        <View style={styles.badge} />
      )}
    </TouchableOpacity>
  );
}

const stackHeader = (drawerNav) => ({
  headerShown: true,
  headerLeft: () => <HamburgerButton navigation={drawerNav} />,
  headerRight: () => <BellButton navigation={drawerNav} />,
  headerStyle: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E6F1FB',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitleAlign: 'center',
  headerTintColor: '#2C2C2A',
  headerTitleStyle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C2C2A',
  },
});

export default function GestionRutasScreen() {
  const insets = useSafeAreaInsets();
  const drawerNav = useNavigation();

  return (
    <Tab.Navigator
      screenOptions={{
        ...stackHeader(drawerNav),
        tabBarActiveTintColor: '#185FA5',
        tabBarInactiveTintColor: '#888780',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#E6F1FB',
          borderTopWidth: 0.5,
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 8,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="RecorridosTab"
        options={{
          title: 'Recorridos',
          tabBarLabel: 'Recorridos',
          tabBarIcon: ({ color }) => (
            <Ionicons name="trail-sign-outline" color={color} size={20} />
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
          tabBarIcon: ({ color }) => (
            <Ionicons name="navigate-outline" color={color} size={20} />
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
          tabBarIcon: ({ color }) => (
            <Ionicons name="location-outline" color={color} size={20} />
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
  drawerToggle: {
    marginLeft: 12,
  },
  bell: {
    marginRight: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e24b4a',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
