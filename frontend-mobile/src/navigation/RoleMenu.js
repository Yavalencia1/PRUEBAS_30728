/**
 * RoleMenu.js
 * Define qué módulos puede ver cada rol en la navegación.
 * Roles: admin | dueno | conductor | padre
 *
 * Cada ítem: { name, label, icon (Ionicons), primary }
 *  - primary: true  => barra inferior (BottomTabs, máx ~4)
 *  - primary: false => Drawer (módulos secundarios)
 * Notificaciones y Perfil se manejan aparte (campana en header y drawer respectivamente).
 */

const withDefaults = (items) =>
  items.map((i) => ({ primary: false, ...i }));

export const getRoleMenu = (rol) => {
  const roleMenus = {
    padre: withDefaults([
      { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', primary: true },
      { name: 'MapaTracking', label: 'Mapa', icon: 'map-outline', primary: true },
      { name: 'Asistencia', label: 'Asistencia', icon: 'checkmark-circle-outline', primary: true },
      { name: 'Pagos', label: 'Pagos', icon: 'card-outline', primary: true },
    ]),
    conductor: withDefaults([
      { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', primary: true },
      { name: 'Conductor', label: 'Mi Ruta', icon: 'bus-outline', primary: true },
    ]),
    dueno: withDefaults([
      { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', primary: true },
      { name: 'GestionRutas', label: 'Gestión de Rutas', icon: 'trail-sign-outline', tabContainer: true },
      { name: 'MapaTracking', label: 'Mapa', icon: 'map-outline', primary: true },
      { name: 'Alumnos', label: 'Alumnos', icon: 'people-outline' },
      { name: 'Pagos', label: 'Pagos', icon: 'card-outline', primary: true },
    ]),
    admin: withDefaults([
      { name: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', primary: true },
      { name: 'MapaTracking', label: 'Mapa', icon: 'map-outline', primary: true },
      { name: 'Asistencia', label: 'Asistencia', icon: 'checkmark-circle-outline', primary: true },
      { name: 'GestionRutas', label: 'Gestión de Rutas', icon: 'trail-sign-outline', tabContainer: true },
      { name: 'Alumnos', label: 'Alumnos', icon: 'people-outline' },
      { name: 'Conductores', label: 'Conductores', icon: 'bus-outline' },
      { name: 'Pagos', label: 'Pagos', icon: 'card-outline' },
    ]),
  };

  const menu = roleMenus[rol?.toLowerCase()] || [];
  return menu;
};

/** Módulos de primer nivel (barra inferior). */
export const getPrimaryMenu = (rol) => getRoleMenu(rol).filter((i) => i.primary);

/** Módulos secundarios (drawer). */
export const getSecondaryMenu = (rol) => getRoleMenu(rol).filter((i) => !i.primary);

/** Verifica si un rol tiene acceso a un módulo específico. */
export const hasAccessToModule = (rol, moduleName) =>
  getRoleMenu(rol).some((i) => i.name === moduleName);
