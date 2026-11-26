import 'dart:ui' show Color;

class SupportConfig {
  /// URL de Chatwoot, ej. https://chatwoot.motoclickapp.com
  final String chatwootUrl;

  /// Identificador público del inbox API de Chatwoot.
  final String inboxId;

  /// Nombre de la app que reporta, ej. "driver".
  final String? app;
  final String? appVersion;

  /// 'es' o 'en'
  final String locale;
  final Color color;

  /// Tipos de problema del formulario. Si es null se usan los de por defecto.
  final List<String>? categories;

  /// Marca del encabezado. '' para ocultarla.
  final String brandName;

  /// Usar Plus Jakarta Sans (google_fonts). false = la fuente de tu app.
  final bool useBrandFont;

  const SupportConfig({
    required this.chatwootUrl,
    required this.inboxId,
    this.app,
    this.appVersion,
    this.locale = 'es',
    this.color = const Color(0xFFFF6A13),
    this.categories,
    this.brandName = 'Motoclick',
    this.useBrandFont = true,
  });
}

class SupportUser {
  /// Id estable del usuario en tu sistema, ej. "driver_76871".
  final String id;
  final String? name;
  final String? email;
  final String? phone;
  final Map<String, Object>? attributes;

  /// Solo si activas la verificación de identidad (HMAC) en el inbox.
  final String? identifierHash;

  const SupportUser({
    required this.id,
    this.name,
    this.email,
    this.phone,
    this.attributes,
    this.identifierHash,
  });
}

class SupportFile {
  final String name;
  final List<int> bytes;
  const SupportFile(this.name, this.bytes);
}

class SupportAttachment {
  final String url;
  final String type;
  const SupportAttachment(this.url, this.type);
}

class SupportMessage {
  final int id;
  final int conversationId;
  final String content;

  /// true = lo escribió el usuario; false = respuesta del agente.
  final bool fromUser;
  final DateTime createdAt;
  final List<SupportAttachment> attachments;
  final String? senderName;

  const SupportMessage({
    required this.id,
    required this.conversationId,
    required this.content,
    required this.fromUser,
    required this.createdAt,
    required this.attachments,
    this.senderName,
  });

  static int _type(dynamic t) {
    if (t is int) return t;
    return const {'incoming': 0, 'outgoing': 1, 'activity': 2, 'template': 3}[t] ?? 2;
  }

  static bool isVisible(Map<String, dynamic> m) {
    final t = _type(m['message_type']);
    return m['private'] != true && (t == 0 || t == 1 || t == 3);
  }

  factory SupportMessage.fromJson(Map<String, dynamic> m, int conversationId) {
    final atts = (m['attachments'] as List? ?? [])
        .cast<Map<String, dynamic>>()
        .map((a) => SupportAttachment('${a['data_url']}', '${a['file_type']}'))
        .toList();
    return SupportMessage(
      id: m['id'] as int,
      conversationId: (m['conversation_id'] as int?) ?? conversationId,
      content: (m['content'] as String?) ?? '',
      fromUser: _type(m['message_type']) == 0,
      createdAt: parseDate(m['created_at']),
      attachments: atts,
      senderName: (m['sender'] is Map) ? m['sender']['name'] as String? : null,
    );
  }
}

class SupportConversation {
  final int id;
  final String status;
  final DateTime createdAt;
  final SupportMessage? lastMessage;
  final Map<String, dynamic> attributes;

  const SupportConversation({
    required this.id,
    required this.status,
    required this.createdAt,
    required this.attributes,
    this.lastMessage,
  });

  String get title => '${attributes['categoria'] ?? '#$id'}';
}

DateTime parseDate(dynamic v) {
  if (v is int) return DateTime.fromMillisecondsSinceEpoch(v < 1000000000000 ? v * 1000 : v);
  if (v is String) return DateTime.tryParse(v)?.toLocal() ?? DateTime.now();
  return DateTime.now();
}
