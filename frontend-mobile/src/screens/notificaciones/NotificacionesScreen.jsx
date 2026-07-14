import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useNotificationCount } from '../../context/NotificationCountContext';

export default function NotificacionesScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const navigation = useNavigation();
  const { refresh } = useNotificationCount();

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarcarTodasLeidas = useCallback(async () => {
    try {
      setMarkingAll(true);
      const result = await api.notificaciones.marcarTodasLeidas();
      if (result && result.ok === false) {
        Alert.alert('Error', result.mensaje || 'No se pudieron marcar como leídas');
        return;
      }
      await loadNotifications();
      if (refresh) await refresh();
      Alert.alert('Listo', 'Todas las notificaciones han sido marcadas como leídas');
    } catch (err) {
      Alert.alert('Error', 'No se pudieron marcar como leídas');
    } finally {
      setMarkingAll(false);
    }
  }, [refresh]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleMarcarTodasLeidas}
          disabled={markingAll || notifications.length === 0}
          style={styles.headerButton}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={22}
            color={markingAll || notifications.length === 0 ? '#a0aec0' : '#6366f1'}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleMarcarTodasLeidas, markingAll, notifications.length]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.notificaciones.list();
      const payload = data?.ok !== false ? (data?.data || data || []) : [];
      setNotifications(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarcarLeida = async (notif) => {
    try {
      const result = await api.notificaciones.marcarLeida(notif.id);
      if (result && result.ok === false) {
        Alert.alert('Error', result.mensaje || 'No se pudo marcar como leída');
        return;
      }
      loadNotifications();
      if (refresh) await refresh();
    } catch (err) {
      Alert.alert('Error', 'No se pudo marcar como leída');
    }
  };

  const handleDelete = async (notif) => {
    Alert.alert('Eliminar', '¿Estás seguro que deseas eliminar esta notificación?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await api.notificaciones.delete(notif.id);
            if (result && result.ok === false) {
              Alert.alert('Error', result.mensaje || 'No se pudo eliminar la notificación');
              return;
            }
            loadNotifications();
          } catch (err) {
            Alert.alert('Error', 'No se pudo eliminar la notificación');
          }
        },
      },
    ]);
  };

  if (loading && !notifications.length) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No hay notificaciones</Text>
          <Text style={styles.emptySubtext}>
            Tus notificaciones aparecerán aquí
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onMarcarLeida={handleMarcarLeida}
              onDelete={handleDelete}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function NotificationItem({ notification, onMarcarLeida, onDelete }) {
  const getTypeColor = (tipo) => {
    const colors = {
      llegada: '#10b981',
      salida: '#06b6d4',
      pago: '#f59e0b',
      alerta: '#ef4444',
    };
    return colors[tipo?.toLowerCase()] || '#6366f1';
  };

  const getTypeIcon = (tipo) => {
    const icons = {
      llegada: '📍',
      salida: '🚌',
      pago: '💳',
      alerta: '⚠️',
    };
    return icons[tipo?.toLowerCase()] || '📬';
  };

  return (
    <View style={styles.notificationCard}>
      <View
        style={[
          styles.notificationIconContainer,
          { backgroundColor: getTypeColor(notification.tipo) + '20' },
        ]}
      >
        <Text style={styles.notificationIcon}>{getTypeIcon(notification.tipo)}</Text>
      </View>

      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{notification.titulo}</Text>
        <Text style={styles.notificationMessage}>{notification.mensaje}</Text>
        {notification.fecha && (
          <Text style={styles.notificationDate}>
            {formatDate(notification.fecha)}
          </Text>
        )}
      </View>

      <View style={styles.notificationActions}>
        {!notification.leida && (
          <TouchableOpacity
            onPress={() => onMarcarLeida(notification)}
            style={styles.actionButton}
          >
            <Text style={styles.actionIcon}>✓</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete(notification)}
          style={[styles.actionButton, { backgroundColor: '#fee2e2' }]}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDate(dateString) {
  if (!dateString) return '';
  
  // Calcular tiempo relativo
  try {
    const diffMs = new Date() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 1000 / 60);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffMins < 1) return 'Hace unos segundos';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHrs < 24) return `Hace ${diffHrs}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return new Date(dateString).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#e2e8f0',
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 11,
    color: '#a0aec0',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },
});
