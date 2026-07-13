import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, GlobalStyles, Spacing, FontSizes, Radius } from '../theme/theme';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <View style={GlobalStyles.container}>
      <Text style={GlobalStyles.title}>RouteKids</Text>
      <Text style={[GlobalStyles.subtitle, { marginTop: Spacing.sm }]}>
        Sesión iniciada como {user?.nombre} {user?.apellido}
      </Text>
      <Text style={[GlobalStyles.subtitle, { textTransform: 'capitalize' }]}>Rol: {user?.rol}</Text>

      <TouchableOpacity
        style={[GlobalStyles.buttonSecondary, { marginTop: Spacing.xl }]}
        onPress={logout}
      >
        <Text style={GlobalStyles.buttonSecondaryText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({});
