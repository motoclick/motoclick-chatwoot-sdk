import 'package:flutter/material.dart';
import 'package:motoclick_support/motoclick_support.dart';

void main() {
  // 1) Configurar una vez al arrancar la app.
  MotoclickSupport.init(const SupportConfig(
    chatwootUrl: 'https://chatwoot.motoclickapp.com',
    inboxId: 'qqaafBw54s4jqXnySGkjEgTh', // inbox "Soporte Apps" (público, no es secreto)
    app: 'driver',
    appVersion: '1.0.0',
  ));
  runApp(const DemoApp());
}

class DemoApp extends StatelessWidget {
  const DemoApp({super.key});

  @override
  Widget build(BuildContext context) => const MaterialApp(home: HomePage());
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    // 2) Después del login: decir quién es el usuario.
    MotoclickSupport.identify(const SupportUser(id: 'driver_prueba_1', name: 'Driver de prueba', phone: '3475550000'));
    // Opcional: avisar cuando responde soporte.
    MotoclickSupport.replies.listen((m) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Soporte: ${m.content}')));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orden #4394378')),
      body: const Center(child: Text('Pantalla de la orden')),
      // 3) El botón, con los datos de esta pantalla.
      floatingActionButton: const SupportButton(context: {'orden': '4394378'}),
    );
  }
}
