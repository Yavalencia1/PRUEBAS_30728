// This is a basic Flutter widget test.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/main.dart';

void main() {
  testWidgets('Smoke test para RouteKidsApp', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    // Lo envolvemos en ProviderScope por si algún widget usa Riverpod.
    await tester.pumpWidget(const ProviderScope(child: RouteKidsApp()));

    // El inicio de la aplicación muestra la pantalla de Login
    // Verificamos que se muestre el texto de "Iniciar Sesión"
    expect(find.text('Iniciar Sesión'), findsWidgets);
  });
}
