import 'package:flutter/material.dart';

class NavItem {
  final String label;
  final IconData icon;

  NavItem(this.label, this.icon);
}

class MainLayout extends StatefulWidget {
  final Widget child;
  final String userRole;
  final String userName;
  final int currentIndex;
  final ValueChanged<int> onNavigate;
  final VoidCallback onLogout;

  const MainLayout({
    super.key,
    required this.child,
    required this.userRole,
    required this.userName,
    required this.currentIndex,
    required this.onNavigate,
    required this.onLogout,
  });

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  static const Color _primaryColor = Color(0xFF534AB7);

  List<NavItem> _getNavItems() {
    switch (widget.userRole.toLowerCase()) {
      case 'dueno':
        return [
          NavItem('Dashboard', Icons.dashboard),
          NavItem('Recorridos', Icons.directions_bus),
          NavItem('Paradas', Icons.location_on),
          NavItem('Alumnos', Icons.school),
          NavItem('Pagos', Icons.payment),
          NavItem('Perfil', Icons.person),
        ];
      case 'conductor':
        return [
          NavItem('Mi Ruta de Hoy', Icons.map),
          NavItem('Asistencia', Icons.checklist),
          NavItem('Perfil', Icons.person),
        ];
      case 'padre':
      default:
        return [
          NavItem('Mapa en Vivo', Icons.location_on),
          NavItem('Asistencia de mi Hijo', Icons.child_care),
          NavItem('Pagos', Icons.payment),
          NavItem('Notificaciones', Icons.notifications),
          NavItem('Perfil', Icons.person),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final items = _getNavItems();

    return Scaffold(
      appBar: width < 800
          ? AppBar(
              title: const Text('RouteKids'),
              backgroundColor: _primaryColor,
              foregroundColor: Colors.white,
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout),
                  onPressed: widget.onLogout,
                  tooltip: 'Cerrar Sesión',
                ),
              ],
            )
          : null,
      body: Row(
        children: [
          if (width < 800)
            NavigationRail(
              selectedIndex: widget.currentIndex,
              onDestinationSelected: widget.onNavigate,
              labelType: NavigationRailLabelType.all,
              selectedIconTheme: const IconThemeData(color: _primaryColor),
              selectedLabelTextStyle: const TextStyle(color: _primaryColor, fontWeight: FontWeight.bold),
              destinations: items
                  .map((item) => NavigationRailDestination(
                        icon: Icon(item.icon),
                        label: Text(item.label, style: const TextStyle(fontSize: 10)),
                      ))
                  .toList(),
            )
          else
            _Sidebar(
              userName: widget.userName,
              userRole: widget.userRole,
              items: items,
              currentIndex: widget.currentIndex,
              onNavigate: widget.onNavigate,
              onLogout: widget.onLogout,
              primaryColor: _primaryColor,
            ),
          const VerticalDivider(width: 1, thickness: 1, color: Colors.black12),
          Expanded(child: widget.child),
        ],
      ),
    );
  }
}

class _Sidebar extends StatelessWidget {
  final String userName;
  final String userRole;
  final List<NavItem> items;
  final int currentIndex;
  final ValueChanged<int> onNavigate;
  final VoidCallback onLogout;
  final Color primaryColor;

  const _Sidebar({
    required this.userName,
    required this.userRole,
    required this.items,
    required this.currentIndex,
    required this.onNavigate,
    required this.onLogout,
    required this.primaryColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      color: Colors.white,
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            decoration: BoxDecoration(color: primaryColor),
            accountName: Text(
              userName,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            accountEmail: Text(
              userRole.toUpperCase(),
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                style: TextStyle(
                  color: primaryColor,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.zero,
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                final isSelected = currentIndex == index;

                return ListTile(
                  leading: Icon(
                    item.icon,
                    color: isSelected ? primaryColor : Colors.black54,
                  ),
                  title: Text(
                    item.label,
                    style: TextStyle(
                      color: isSelected ? primaryColor : Colors.black87,
                      fontWeight: isSelected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                  selected: isSelected,
                  selectedTileColor: primaryColor.withOpacity(0.1),
                  onTap: () => onNavigate(index),
                );
              },
            ),
          ),
          const Divider(height: 1, color: Colors.black12),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.redAccent),
            title: const Text(
              'Cerrar Sesión',
              style: TextStyle(
                color: Colors.redAccent,
                fontWeight: FontWeight.bold,
              ),
            ),
            onTap: onLogout,
          ),
          const SizedBox(height: 16), // Padding bottom
        ],
      ),
    );
  }
}
