import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

class _Contact {
  final String sourceId;
  final String pubsubToken;
  final String userId;
  _Contact(this.sourceId, this.pubsubToken, this.userId);

  Map<String, String> toJson() => {'sourceId': sourceId, 'pubsubToken': pubsubToken, 'userId': userId};
  static _Contact? fromJson(String? raw) {
    if (raw == null) return null;
    try {
      final m = jsonDecode(raw) as Map<String, dynamic>;
      return _Contact('${m['sourceId']}', '${m['pubsubToken']}', '${m['userId']}');
    } catch (_) {
      return null;
    }
  }
}

/// Habla con la Client API pública de Chatwoot. No usa claves secretas.
class ChatwootClient {
  final SupportConfig cfg;
  final String _base;
  SupportUser? _user;
  _Contact? _contact;
  Future<_Contact>? _pending;
  String? _anonId;

  ChatwootClient(this.cfg)
      : _base = '${cfg.chatwootUrl.replaceAll(RegExp(r'/+$'), '')}'
            '/public/api/v1/inboxes/${Uri.encodeComponent(cfg.inboxId)}';

  String? get pubsubToken => _contact?.pubsubToken;

  Future<bool> hasContact() async => _contact != null || await _readStored() != null;

  Future<void> identify(SupportUser user) async {
    if (_user?.id != user.id) {
      _contact = null;
      _pending = null;
    }
    _user = user;
    final stored = await _readStored();
    if (stored != null) {
      _contact = stored;
      _request('PATCH', '/contacts/${stored.sourceId}', await _contactBody()).catchError((_) => null);
    }
  }

  Future<void> reset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(await _storageKey());
    _user = null;
    _contact = null;
    _pending = null;
  }

  Future<_Contact> ensureContact() async {
    if (_contact != null) return _contact!;
    final stored = await _readStored();
    if (stored != null) return _contact = stored;
    return _pending ??= () async {
      try {
        final res = await _request('POST', '/contacts', await _contactBody()) as Map<String, dynamic>;
        final c = _Contact('${res['source_id']}', '${res['pubsub_token']}', await _userId());
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(await _storageKey(), jsonEncode(c.toJson()));
        return _contact = c;
      } finally {
        _pending = null;
      }
    }();
  }

  Future<int> report({
    required String message,
    String? category,
    List<SupportFile> files = const [],
    Map<String, Object> context = const {},
    Map<String, Object> globalContext = const {},
  }) async {
    final text = message.trim();
    if (text.isEmpty) throw ArgumentError('El mensaje del reporte está vacío');
    final c = await ensureContact();

    final attrs = <String, Object>{
      ..._clean(globalContext),
      ..._clean(context),
      if (category != null && category.isNotEmpty) 'categoria': category,
      if (cfg.app != null) 'app': cfg.app!,
      if (cfg.appVersion != null) 'app_version': cfg.appVersion!,
      'dispositivo': _device(),
    };
    final conv = await _request('POST', '/contacts/${c.sourceId}/conversations', {'custom_attributes': attrs})
        as Map<String, dynamic>;
    final id = conv['id'] as int;

    final header = (category != null && category.isNotEmpty) ? '**$category**\n' : '';
    final ctx = {..._clean(globalContext), ..._clean(context)}.entries.map((e) => '${e.key}: ${e.value}').join(' · ');
    await sendMessage(id, '$header$text${ctx.isNotEmpty ? '\n\n_${ctx}_' : ''}', files: files);
    return id;
  }

  Future<SupportMessage> sendMessage(int conversationId, String content, {List<SupportFile> files = const []}) async {
    final c = await ensureContact();
    final path = '/contacts/${c.sourceId}/conversations/$conversationId/messages';
    dynamic raw;
    if (files.isEmpty) {
      raw = await _request('POST', path, {'content': content, 'echo_id': _randomId()});
    } else {
      final req = http.MultipartRequest('POST', Uri.parse('$_base$path'))
        ..fields['content'] = content
        ..fields['echo_id'] = _randomId();
      for (final f in files) {
        req.files.add(http.MultipartFile.fromBytes('attachments[]', f.bytes, filename: f.name));
      }
      final res = await http.Response.fromStream(await req.send());
      _check(res);
      raw = jsonDecode(res.body);
    }
    return SupportMessage.fromJson(raw as Map<String, dynamic>, conversationId);
  }

  Future<List<SupportConversation>> conversations() async {
    if (!await hasContact()) return [];
    final c = await ensureContact();
    final list = (await _request('GET', '/contacts/${c.sourceId}/conversations') as List).cast<Map<String, dynamic>>();
    final out = list.map((r) {
      final id = r['id'] as int;
      final msgs = (r['messages'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .where(SupportMessage.isVisible)
          .map((m) => SupportMessage.fromJson(m, id))
          .toList();
      return SupportConversation(
        id: id,
        status: '${r['status']}',
        createdAt: parseDate(r['created_at'] ?? r['timestamp'] ?? msgs.firstOrNull?.createdAt.millisecondsSinceEpoch),
        lastMessage: msgs.isEmpty ? null : msgs.last,
        attributes: _withCategory(
          (r['custom_attributes'] as Map?)?.cast<String, dynamic>() ?? {},
          msgs.firstOrNull?.content,
        ),
      );
    }).toList();
    out.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return out;
  }

  Future<List<SupportMessage>> messages(int conversationId) async {
    final c = await ensureContact();
    final list = (await _request('GET', '/contacts/${c.sourceId}/conversations/$conversationId/messages') as List)
        .cast<Map<String, dynamic>>();
    return list.where(SupportMessage.isVisible).map((m) => SupportMessage.fromJson(m, conversationId)).toList();
  }

  Future<void> markSeen(int conversationId) async {
    final c = await ensureContact();
    await _request('POST', '/contacts/${c.sourceId}/conversations/$conversationId/update_last_seen')
        .catchError((_) => null);
  }

  // ---------------------------------------------------------------

  Future<Map<String, Object>> _contactBody() async {
    final u = _user;
    return {
      'identifier': await _userId(),
      if (u?.identifierHash != null) 'identifier_hash': u!.identifierHash!,
      if (u?.name != null) 'name': u!.name!,
      if (u?.email != null && u!.email!.isNotEmpty) 'email': u.email!,
      if (_phone(u?.phone) != null) 'phone_number': _phone(u?.phone)!,
      'custom_attributes': _clean({...?u?.attributes, if (cfg.app != null) 'app': cfg.app!}),
    };
  }

  Future<String> _userId() async {
    if (_user != null) return _user!.id;
    if (_anonId != null) return _anonId!;
    final prefs = await SharedPreferences.getInstance();
    final k = 'mcs:anon:${cfg.inboxId}';
    var id = prefs.getString(k);
    if (id == null) {
      id = 'anon_${_randomId()}';
      await prefs.setString(k, id);
    }
    return _anonId = id;
  }

  Future<String> _storageKey() async => 'mcs:${cfg.inboxId}:${await _userId()}';

  Future<_Contact?> _readStored() async {
    final prefs = await SharedPreferences.getInstance();
    final c = _Contact.fromJson(prefs.getString(await _storageKey()));
    return (c != null && c.userId == await _userId()) ? c : null;
  }

  Future<dynamic> _request(String method, String path, [Object? body, bool retried = false]) async {
    final uri = Uri.parse('$_base$path');
    final headers = {'Content-Type': 'application/json'};
    final encoded = body == null ? null : jsonEncode(body);
    late http.Response res;
    switch (method) {
      case 'GET':
        res = await http.get(uri);
      case 'PATCH':
        res = await http.patch(uri, headers: headers, body: encoded);
      default:
        res = await http.post(uri, headers: headers, body: encoded);
    }
    if (res.statusCode == 404 && !retried && path.startsWith('/contacts/') && _contact != null) {
      // El contacto guardado ya no existe en Chatwoot: lo recreamos una vez.
      final old = _contact!.sourceId;
      await reset();
      final c = await ensureContact();
      return _request(method, path.replaceFirst(old, c.sourceId), body, true);
    }
    _check(res);
    return res.body.isEmpty ? {} : jsonDecode(res.body);
  }

  void _check(http.Response res) {
    if (res.statusCode >= 400) {
      final b = res.body;
      throw Exception('Chatwoot ${res.statusCode}: ${b.length > 200 ? b.substring(0, 200) : b}');
    }
  }
}

/// La API pública no siempre devuelve los atributos: la categoría va en negrita al inicio del primer mensaje.
Map<String, dynamic> _withCategory(Map<String, dynamic> attrs, String? first) {
  if (attrs['categoria'] != null || first == null) return attrs;
  final m = RegExp(r'^\*\*(.+?)\*\*').firstMatch(first);
  return m == null ? attrs : {...attrs, 'categoria': m.group(1)};
}

Map<String, Object> _clean(Map<String, Object?> m) => {
      for (final e in m.entries)
        if (e.value != null && '${e.value}'.isNotEmpty)
          e.key: (e.value is num || e.value is bool) ? e.value! : '${e.value}',
    };

String? _phone(String? p) {
  if (p == null) return null;
  final d = p.replaceAll(RegExp(r'[^\d+]'), '');
  if (d.isEmpty) return null;
  if (d.startsWith('+')) return d;
  return d.length == 10 ? '+1$d' : '+$d';
}

String _device() => kIsWeb ? 'flutter-web' : 'flutter-${defaultTargetPlatform.name}';

String _randomId() {
  final r = Random.secure();
  return List.generate(16, (_) => r.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
}
