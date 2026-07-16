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
            size={20}
            color={markingAll || notifications.length === 0 ? '#a0aec0' : '#185FA5'}
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#185FA5" />
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
          <Ionicons name="notifications-off-outline" size={28} color="#B4B2A9" style={{ marginBottom: 6 }} />
          <Text style={styles.emptyText}>No hay notificaciones</Text>
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
  const getTheme = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'llegada':
        return { bg: '#E6F1FB', icon: 'bus-outline', color: '#378ADD' };
      case 'pago':
        return { bg: '#FAEEDA', icon: 'card-outline', color: '#EF9F27' };
      case 'alerta':
        return { bg: '#FCEBEB', icon: 'warning-outline', color: '#E24B4A' };
      default:
        return { bg: '#F4F8FD', icon: 'notifications-outline', color: '#185FA5' };
    }
  };

  const theme = getTheme(notification.tipo);

  return (
    <View
      style={[
        styles.notificationCard,
        !notification.leida && { borderLeftWidth: 3, borderLeftColor: theme.color },
        notification.leida && { opacity: 0.75 },
      ]}
    >
      <View style={[styles.notificationIconContainer, { backgroundColor: theme.bg }]}>
        <Ionicons name={theme.icon} size={16} color={theme.color} />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          <View style={styles.titleWithDot}>
            {!notification.leida && <View style={styles.unreadDot} />}
            <Text style={styles.notificationTitle} numberOfLines={1} ellipsizeMode="tail">
              {notification.titulo}
            </Text>
          </View>
          {notification.fecha && (
            <Text style={styles.notificationDate}>
              {formatDate(notification.fecha)}
            </Text>
          )}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2} ellipsizeMode="tail">
          {notification.mensaje}
        </Text>
      </View>

      <View style={styles.notificationActions}>
        {!notification.leida && (
          <TouchableOpacity
            onPress={() => onMarcarLeida(notification)}
            style={styles.actionButton}
          >
            <Ionicons name="checkmark" size={14} color="#0F6E56" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete(notification)}
          style={[styles.actionButton, { backgroundColor: '#FCEBEB', borderColor: '#fca5a5' }]}
        >
          <Ionicons name="trash-outline" size={14} color="#A32D2D" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const diffMs = new Date() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 1000 / 60);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHrs < 24) return `${diffHrs}h`;
    if (diffDays < 7) return `${diffDays}d`;

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
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 7,
  },
  errorContainer: {
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#FCEBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
  },
  errorText: {
    color: '#A32D2D',
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 11,
    color: '#888780',
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.75,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#185FA5',
    marginRight: 6,
  },
  notificationTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2C2C2A',
    flex: 1,
  },
  notificationDate: {
    fontSize: 9,
    color: '#888780',
    flex: 0.25,
    textAlign: 'right',
  },
  notificationMessage: {
    fontSize: 11,
    color: '#888780',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E1F5EE',
    borderWidth: 0.5,
    borderColor: '#a7f3d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
