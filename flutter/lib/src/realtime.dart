import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:web_socket_channel/web_socket_channel.dart';

import 'models.dart';

/// Conexión en tiempo real con Chatwoot (ActionCable en /cable).
class Realtime {
  final String chatwootUrl;
  final String pubsubToken;
  final void Function(SupportMessage) onMessage;

  WebSocketChannel? _ch;
  StreamSubscription? _sub;
  Timer? _timer;
  int _retry = 0;
  bool _stopped = false;

  Realtime(this.chatwootUrl, this.pubsubToken, this.onMessage);

  void start() {
    _stopped = false;
    _connect();
  }

  void stop() {
    _stopped = true;
    _timer?.cancel();
    _sub?.cancel();
    _ch?.sink.close();
    _ch = null;
  }

  void _connect() {
    final url = '${chatwootUrl.replaceAll(RegExp(r'/+$'), '').replaceFirst(RegExp('^http'), 'ws')}/cable';
    final identifier = jsonEncode({'channel': 'RoomChannel', 'pubsub_token': pubsubToken});
    try {
      _ch = WebSocketChannel.connect(Uri.parse(url));
    } catch (_) {
      _scheduleReconnect();
      return;
    }
    _ch!.sink.add(jsonEncode({'command': 'subscribe', 'identifier': identifier}));
    _sub = _ch!.stream.listen(
      (raw) {
        _retry = 0;
        Map<String, dynamic> data;
        try {
          data = jsonDecode(raw as String) as Map<String, dynamic>;
        } catch (_) {
          return;
        }
        if (data['type'] != null) return; // ping, welcome, confirm_subscription
        final msg = data['message'];
        if (msg is! Map) return;
        final evt = msg['event'];
        final m = msg['data'];
        if (m is! Map<String, dynamic>) return;
        if (evt != 'message.created') return;
        if (!SupportMessage.isVisible(m) || m['conversation_id'] == null) return;
        onMessage(SupportMessage.fromJson(m, m['conversation_id'] as int));
      },
      onDone: _scheduleReconnect,
      onError: (_) => _scheduleReconnect(),
      cancelOnError: true,
    );
  }

  void _scheduleReconnect() {
    if (_stopped) return;
    _sub?.cancel();
    _timer?.cancel();
    final wait = Duration(milliseconds: min(30000, 1000 * pow(2, _retry++).toInt()));
    _timer = Timer(wait, _connect);
  }
}
