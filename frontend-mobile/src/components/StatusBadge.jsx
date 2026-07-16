import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function StatusBadge({ estado }) {
  const getStyle = () => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return { bg: '#FAEEDA', text: '#854F0B', label: 'Pendiente' };
      case 'pagado':
        return { bg: '#E1F5EE', text: '#0F6E56', label: 'Pagado' };
      case 'vencido':
        return { bg: '#FCEBEB', text: '#A32D2D', label: 'Vencido' };
      case 'activo':
        return { bg: '#E6F1FB', text: '#0C447C', label: 'Activo' };
      case 'en_bus':
      case 'en_curso':
        return { bg: '#E1F5EE', text: '#0F6E56', label: 'En Bus' };
      case 'ausente':
        return { bg: '#FCEBEB', text: '#A32D2D', label: 'Ausente' };
      default:
        return { bg: '#E6F1FB', text: '#0C447C', label: estado || 'Desconocido' };
    }
  };

  const config = getStyle();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {config.label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 8,
    fontWeight: '500',
  },
});
