/// Botón de soporte que manda los reportes directo a Chatwoot.
///
/// ```dart
/// MotoclickSupport.init(const SupportConfig(
///   chatwootUrl: 'https://chatwoot.motoclickapp.com',
///   inboxId: 'TU_INBOX_ID',
///   app: 'driver',
/// ));
/// MotoclickSupport.identify(const SupportUser(id: 'driver_76871', name: 'Luis'));
/// // En cualquier pantalla:
/// floatingActionButton: const SupportButton(),
/// ```
library motoclick_support;

import 'dart:async';

import 'package:flutter/foundation.dart';

import 'src/client.dart';
import 'src/models.dart';
import 'src/realtime.dart';

export 'src/models.dart';
export 'src/i18n.dart' show SupportTexts;
export 'src/ui/support_button.dart';
export 'src/ui/support_screen.dart';

class MotoclickSupport {
  MotoclickSupport._();

  static SupportConfig? _cfg;
  static ChatwootClient? _client;
  static Realtime? _rt;
  static final Map<String, Object> _context = {};
  static final _messages = StreamController<SupportMessage>.broadcast();

  /// Cantidad de respuestas del agente sin leer (para el globo del botón).
  static final unread = ValueNotifier<int>(0);

  static SupportConfig get config {
    final c = _cfg;
    if (c == null) throw StateError('MotoclickSupport: llama a init() primero');
    return c;
  }

  static ChatwootClient get client {
    final c = _client;
    if (c == null) throw StateError('MotoclickSupport: llama a init() primero');
    return c;
  }

  static bool get isReady => _client != null;

  /// Mensajes nuevos en tiempo real (del usuario y del agente).
  static Stream<SupportMessage> get messages => _messages.stream;

  /// Solo las respuestas del agente.
  static Stream<SupportMessage> get replies => _messages.stream.where((m) => !m.fromUser);

  /// Configura el SDK. Es lo único obligatorio.
  static void init(SupportConfig config) {
    _stopRealtime();
    _cfg = config;
    _client = ChatwootClient(config);
    _client!.hasContact().then((has) {
      if (has) _client!.ensureContact().then((_) => _startRealtime()).catchError((_) {});
    });
  }

  /// Dice quién es el usuario (después del login).
  static Future<void> identify(SupportUser user) async {
    _stopRealtime();
    await client.identify(user);
    if (await client.hasContact()) {
      await client.ensureContact();
      _startRealtime();
    }
  }

  /// Datos que se adjuntan a todos los reportes (ej. orden activa). null borra la clave.
  static void setContext(Map<String, Object?> data) {
    data.forEach((k, v) => v == null ? _context.remove(k) : _context[k] = v);
  }

  /// Envía un reporte sin abrir la interfaz. Devuelve el id de la conversación.
  static Future<int> report({
    required String message,
    String? category,
    List<SupportFile> files = const [],
    Map<String, Object> context = const {},
  }) async {
    final id = await client.report(
      message: message,
      category: category,
      files: files,
      context: context,
      globalContext: Map.of(_context),
    );
    _startRealtime();
    return id;
  }

  /// Llamar al cerrar sesión: olvida al usuario en este dispositivo.
  static Future<void> reset() async {
    _stopRealtime();
    _context.clear();
    unread.value = 0;
    await _client?.reset();
  }

  static void _startRealtime() {
    final token = _client?.pubsubToken;
    if (_cfg == null || token == null || _rt != null) return;
    _rt = Realtime(_cfg!.chatwootUrl, token, (m) {
      if (!m.fromUser) unread.value++;
      _messages.add(m);
    })
      ..start();
  }

  static void _stopRealtime() {
    _rt?.stop();
    _rt = null;
  }
}

