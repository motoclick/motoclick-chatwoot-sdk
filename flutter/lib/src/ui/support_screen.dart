import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../../motoclick_support.dart';

/// Colores del widget, derivados del color principal de la config.
class _Tokens {
  final Color o, o2, deep, tint;
  static const ink = Color(0xFF1E1B3A);
  static const muted = Color(0xFF6E6A85);
  static const line = Color(0xFFE4E2EC);
  static const field = Color(0xFFFBFAFD);
  static const chip = Color(0xFFF3F2F7);

  _Tokens(Color c)
      : o = c,
        o2 = Color.lerp(c, const Color(0xFFFFB067), .38)!,
        deep = Color.lerp(c, const Color(0xFFB33A00), .15)!,
        tint = Color.lerp(c, Colors.white, .90)!;

  LinearGradient get gradient => LinearGradient(colors: [o2, o, deep], stops: const [0, .5, 1]);
}

/// Pantalla completa de soporte: "Nuevo reporte", "Mis reportes" y chat.
class SupportScreen extends StatefulWidget {
  final Map<String, Object>? context;
  final int initialTab;
  const SupportScreen({super.key, this.context, this.initialTab = 0});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  late int _tab = widget.initialTab;
  int? _chatId;

  @override
  Widget build(BuildContext ctx) {
    final cfg = MotoclickSupport.config;
    final t = SupportTexts.of(cfg.locale);
    final k = _Tokens(cfg.color);
    final base = Theme.of(ctx);
    final theme = cfg.useBrandFont
        ? base.copyWith(textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme))
        : base;
    final top = MediaQuery.of(ctx).padding.top;
    const headerH = 104.0;

    return Theme(
      data: theme,
      child: DefaultTextStyle.merge(
        style: const TextStyle(color: _Tokens.ink),
        child: Scaffold(
          backgroundColor: Colors.white,
          body: Stack(children: [
            _Header(k: k, t: t, brand: cfg.brandName, height: headerH + top, topPad: top),
            Padding(
              padding: EdgeInsets.only(top: headerH + top - 26),
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: Column(children: [
                  _Tabs(
                    k: k,
                    t: t,
                    index: _tab,
                    onChanged: (i) => setState(() {
                      _tab = i;
                      _chatId = null;
                    }),
                  ),
                  Expanded(
                    child: _chatId != null
                        ? _Chat(
                            key: ValueKey(_chatId),
                            id: _chatId!,
                            k: k,
                            t: t,
                            onBack: () => setState(() => _chatId = null),
                          )
                        : _tab == 0
                            ? _NewReport(k: k, t: t, screenContext: widget.context)
                            : _MyReports(
                                k: k,
                                t: t,
                                onOpen: (id) => setState(() => _chatId = id),
                                onNew: () => setState(() => _tab = 0),
                              ),
                  ),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------

class _Header extends StatelessWidget {
  final _Tokens k;
  final SupportTexts t;
  final String brand;
  final double height, topPad;
  const _Header({required this.k, required this.t, required this.brand, required this.height, required this.topPad});

  @override
  Widget build(BuildContext ctx) {
    final narrow = MediaQuery.of(ctx).size.width < 400;
    return Container(
      height: height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [k.deep, k.o, k.o2],
          stops: const [0, .45, 1],
        ),
      ),
      child: CustomPaint(
        painter: _SheenPainter(),
        child: Padding(
          padding: EdgeInsets.fromLTRB(narrow ? 16 : 20, topPad + 14, 4, 40),
          child: Row(children: [
            if (brand.isNotEmpty) ...[
              Text(brand,
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: narrow ? 19 : 22,
                      fontWeight: FontWeight.w800,
                      fontStyle: FontStyle.italic,
                      letterSpacing: -.4)),
              Container(
                  width: 1.5,
                  height: 32,
                  margin: EdgeInsets.symmetric(horizontal: narrow ? 10 : 12),
                  color: Colors.white54),
            ],
            Icon(Icons.headset_mic_outlined, color: Colors.white, size: narrow ? 25 : 28),
            SizedBox(width: narrow ? 8 : 10),
            Expanded(
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(t.title,
                    style: TextStyle(color: Colors.white, fontSize: narrow ? 17 : 18, fontWeight: FontWeight.w700)),
                Text(t.subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: const Color(0xE6FFFFFF), fontSize: narrow ? 11.5 : 12.5, fontWeight: FontWeight.w500)),
              ]),
            ),
            IconButton(
              onPressed: () => Navigator.of(ctx).maybePop(),
              icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
              tooltip: MaterialLocalizations.of(ctx).closeButtonTooltip,
            ),
          ]),
        ),
      ),
    );
  }
}

/// Franja diagonal clara del encabezado.
class _SheenPainter extends CustomPainter {
  @override
  void paint(Canvas c, Size s) {
    final p = Path()
      ..moveTo(s.width * .55, 0)
      ..lineTo(s.width * .82, 0)
      ..lineTo(s.width * .66, s.height)
      ..lineTo(s.width * .39, s.height)
      ..close();
    c.drawPath(p, Paint()..color = const Color(0x1AFFFFFF));
  }

  @override
  bool shouldRepaint(_SheenPainter old) => false;
}

class _Tabs extends StatelessWidget {
  final _Tokens k;
  final SupportTexts t;
  final int index;
  final ValueChanged<int> onChanged;
  const _Tabs({required this.k, required this.t, required this.index, required this.onChanged});

  @override
  Widget build(BuildContext ctx) {
    Widget tab(int i, IconData icon, String label) {
      final on = index == i;
      return Expanded(
        child: Semantics(
          selected: on,
          button: true,
          child: Material(
            color: on ? k.tint : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => onChanged(i),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: on ? k.o : Colors.transparent, width: 3)),
                ),
                child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(icon, size: 21, color: on ? k.o : _Tokens.muted),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(label,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: on ? k.o : _Tokens.muted)),
                  ),
                ]),
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(18, 16, 18, 4),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: _Tokens.field, borderRadius: BorderRadius.circular(16)),
      child: Row(children: [
        tab(0, Icons.sms_rounded, t.newReport),
        const SizedBox(width: 4),
        tab(1, Icons.history_rounded, t.myReports),
      ]),
    );
  }
}

class _IconBox extends StatelessWidget {
  final _Tokens k;
  final IconData icon;
  final double size;
  const _IconBox(this.k, this.icon, {this.size = 38});

  @override
  Widget build(BuildContext ctx) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: k.tint, borderRadius: BorderRadius.circular(size * .32)),
        child: Icon(icon, color: k.o, size: size * .55),
      );
}

InputDecoration _fieldDeco(_Tokens k, {String? hint, double radius = 16, EdgeInsets? pad}) {
  OutlineInputBorder b(Color c, [double w = 1.5]) =>
      OutlineInputBorder(borderRadius: BorderRadius.circular(radius), borderSide: BorderSide(color: c, width: w));
  return InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(color: Color(0xFF8D89A3), fontWeight: FontWeight.w400),
    filled: true,
    fillColor: Colors.white,
    contentPadding: pad ?? const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
    enabledBorder: b(_Tokens.line),
    border: b(_Tokens.line),
    focusedBorder: b(k.o, 1.8),
    errorBorder: b(const Color(0xFFE5484D)),
    focusedErrorBorder: b(const Color(0xFFE5484D), 1.8),
  );
}

// ---------------------------------------------------------------

class _NewReport extends StatefulWidget {
  final _Tokens k;
  final SupportTexts t;
  final Map<String, Object>? screenContext;
  const _NewReport({required this.k, required this.t, this.screenContext});
  @override
  State<_NewReport> createState() => _NewReportState();
}

class _NewReportState extends State<_NewReport> {
  final _text = TextEditingController();
  final _files = <SupportFile>[];
  String? _category;
  bool _sending = false;
  bool _invalid = false;
  String? _note;
  bool _ok = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _pickGallery() async {
    final picked = await ImagePicker().pickMultiImage(imageQuality: 75, maxWidth: 1600);
    for (final x in picked) {
      _files.add(SupportFile(x.name, await x.readAsBytes()));
    }
    if (mounted) setState(() {});
  }

  Future<void> _pickCamera() async {
    final x = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 75, maxWidth: 1600);
    if (x == null) return;
    _files.add(SupportFile(x.name, await x.readAsBytes()));
    if (mounted) setState(() {});
  }

  Future<void> _send() async {
    final t = widget.t;
    if (_text.text.trim().isEmpty) {
      setState(() => _invalid = true);
      return;
    }
    setState(() {
      _sending = true;
      _note = null;
    });
    try {
      await MotoclickSupport.report(
        message: _text.text,
        category: _category,
        files: List.of(_files),
        context: widget.screenContext ?? const {},
      );
      _text.clear();
      _files.clear();
      setState(() {
        _ok = true;
        _note = t.sent;
      });
    } catch (_) {
      setState(() {
        _ok = false;
        _note = t.error;
      });
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext ctx) {
    final k = widget.k, t = widget.t;
    final cats = MotoclickSupport.config.categories ?? t.categories;
    _category ??= cats.first;

    Widget label(IconData icon, String text) => Row(children: [
          _IconBox(k, icon),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _Tokens.ink)),
        ]);

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 24),
      children: [
        if (_note != null) _Note(ok: _ok, text: _note!),
        label(Icons.warning_amber_rounded, t.category),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          value: _category,
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: _Tokens.ink),
          borderRadius: BorderRadius.circular(16),
          decoration: _fieldDeco(k),
          style: Theme.of(ctx)
              .textTheme
              .bodyLarge!
              .copyWith(fontSize: 15, fontWeight: FontWeight.w500, color: _Tokens.ink),
          items: cats.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          onChanged: (v) => setState(() => _category = v),
        ),
        const SizedBox(height: 18),
        label(Icons.sms_rounded, t.message),
        const SizedBox(height: 10),
        TextField(
          controller: _text,
          minLines: 4,
          maxLines: 8,
          onChanged: (_) => _invalid ? setState(() => _invalid = false) : null,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, height: 1.45, color: _Tokens.ink),
          decoration: _fieldDeco(k, hint: t.messageHint).copyWith(errorText: _invalid ? '' : null, errorStyle: const TextStyle(height: 0)),
        ),
        const SizedBox(height: 18),
        _AttachArea(k: k, t: t, onPick: _sending ? null : _pickGallery, onCamera: _sending ? null : _pickCamera),
        if (_files.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (var i = 0; i < _files.length; i++)
              InputChip(
                label: Text(_files[i].name, overflow: TextOverflow.ellipsis),
                backgroundColor: _Tokens.chip,
                side: BorderSide.none,
                shape: const StadiumBorder(),
                onDeleted: () => setState(() => _files.removeAt(i)),
              ),
          ]),
        ],
        const SizedBox(height: 22),
        _GradientButton(
          k: k,
          onPressed: _sending ? null : _send,
          icon: Icons.near_me_rounded,
          label: _sending ? t.sending : t.send,
        ),
      ],
    );
  }
}

class _Note extends StatelessWidget {
  final bool ok;
  final String text;
  const _Note({required this.ok, required this.text});

  @override
  Widget build(BuildContext ctx) {
    final fg = ok ? const Color(0xFF136C3E) : const Color(0xFFA7262C);
    return Container(
      margin: const EdgeInsets.only(bottom: 18),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: ok ? const Color(0xFFE8F6EE) : const Color(0xFFFDECED),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(ok ? Icons.check_circle_outline_rounded : Icons.error_outline_rounded, color: fg, size: 19),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: TextStyle(color: fg, fontSize: 13.5, fontWeight: FontWeight.w500, height: 1.4))),
      ]),
    );
  }
}

class _AttachArea extends StatelessWidget {
  final _Tokens k;
  final SupportTexts t;
  final VoidCallback? onPick, onCamera;
  const _AttachArea({required this.k, required this.t, this.onPick, this.onCamera});

  @override
  Widget build(BuildContext ctx) {
    return CustomPaint(
      painter: _DashedBorder(color: const Color(0xFFD9D6E3), radius: 18),
      child: Material(
        color: _Tokens.field,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onPick,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
            child: Row(children: [
              Transform.rotate(angle: -.6, child: Icon(Icons.attach_file_rounded, color: k.o, size: 28)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(t.attach, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _Tokens.ink)),
                  const SizedBox(height: 3),
                  Text(t.attachHint, style: const TextStyle(fontSize: 12.5, color: _Tokens.muted, height: 1.35)),
                ]),
              ),
              const SizedBox(width: 8),
              Tooltip(
                message: t.camera,
                child: Material(
                  color: const Color(0xFFEEEDF3),
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: onCamera,
                    child: const SizedBox(
                      width: 48,
                      height: 48,
                      child: Icon(Icons.photo_camera_outlined, color: Color(0xFF4B4766), size: 24),
                    ),
                  ),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

class _DashedBorder extends CustomPainter {
  final Color color;
  final double radius;
  _DashedBorder({required this.color, required this.radius});

  @override
  void paint(Canvas c, Size s) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final path = Path()..addRRect(RRect.fromRectAndRadius(Offset.zero & s, Radius.circular(radius)));
    for (final m in path.computeMetrics()) {
      for (double d = 0; d < m.length; d += 9) {
        c.drawPath(m.extractPath(d, d + 5), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder old) => old.color != color;
}

class _GradientButton extends StatelessWidget {
  final _Tokens k;
  final VoidCallback? onPressed;
  final IconData icon;
  final String label;
  const _GradientButton({required this.k, required this.onPressed, required this.icon, required this.label});

  @override
  Widget build(BuildContext ctx) {
    return Opacity(
      opacity: onPressed == null ? .65 : 1,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: k.gradient,
          borderRadius: BorderRadius.circular(999),
          boxShadow: [BoxShadow(color: k.o.withAlpha(90), blurRadius: 22, offset: const Offset(0, 10), spreadRadius: -8)],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(999),
            onTap: onPressed,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 17),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(icon, color: Colors.white, size: 24),
                const SizedBox(width: 12),
                Text(label, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700)),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------

class _MyReports extends StatefulWidget {
  final _Tokens k;
  final SupportTexts t;
  final ValueChanged<int> onOpen;
  final VoidCallback onNew;
  const _MyReports({required this.k, required this.t, required this.onOpen, required this.onNew});
  @override
  State<_MyReports> createState() => _MyReportsState();
}

class _MyReportsState extends State<_MyReports> {
  late Future<List<SupportConversation>> _future;
  StreamSubscription? _sub;

  @override
  void initState() {
    super.initState();
    _load();
    _sub = MotoclickSupport.messages.listen((_) => setState(_load));
  }

  void _load() {
    MotoclickSupport.unread.value = 0;
    _future = MotoclickSupport.client.conversations();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext ctx) {
    final k = widget.k, t = widget.t;
    return RefreshIndicator(
      color: k.o,
      onRefresh: () async {
        setState(_load);
        await _future;
      },
      child: FutureBuilder<List<SupportConversation>>(
        future: _future,
        builder: (_, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return Center(child: CircularProgressIndicator(color: k.o, strokeWidth: 2.5));
          }
          if (snap.hasError) {
            return ListView(padding: const EdgeInsets.all(18), children: [_Note(ok: false, text: t.error)]);
          }
          final list = snap.data ?? [];
          if (list.isEmpty) {
            return ListView(padding: const EdgeInsets.fromLTRB(32, 40, 32, 20), children: [
              Center(child: _IconBox(k, Icons.history_rounded, size: 56)),
              const SizedBox(height: 14),
              Text(t.empty, textAlign: TextAlign.center, style: const TextStyle(color: _Tokens.muted, height: 1.5)),
              const SizedBox(height: 14),
              Center(
                child: OutlinedButton.icon(
                  onPressed: widget.onNew,
                  icon: Icon(Icons.sms_rounded, color: k.o, size: 18),
                  label: Text(t.newReport, style: TextStyle(color: k.o, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    shape: const StadiumBorder(),
                    side: const BorderSide(color: _Tokens.line, width: 1.5),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  ),
                ),
              ),
            ]);
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 24),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _ReportTile(k: k, t: t, c: list[i], onTap: () => widget.onOpen(list[i].id)),
          );
        },
      ),
    );
  }
}

class _ReportTile extends StatelessWidget {
  final _Tokens k;
  final SupportTexts t;
  final SupportConversation c;
  final VoidCallback onTap;
  const _ReportTile({required this.k, required this.t, required this.c, required this.onTap});

  @override
  Widget build(BuildContext ctx) {
    final last = c.lastMessage;
    final (bg, fg) = switch (c.status) {
      'resolved' => (const Color(0xFFE8F6EE), const Color(0xFF136C3E)),
      'pending' => (const Color(0xFFFFF4DE), const Color(0xFF8A5300)),
      _ => (k.tint, k.deep),
    };
    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: _Tokens.line, width: 1.5),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _IconBox(k, Icons.sms_rounded),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(
                    child: Text(c.title,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: _Tokens.ink)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
                    child: Text(t.status(c.status), style: TextStyle(color: fg, fontSize: 11.5, fontWeight: FontWeight.w600)),
                  ),
                ]),
                if (last != null) ...[
                  const SizedBox(height: 3),
                  Text('${last.fromUser ? t.you : t.agent}: ${_plain(last.content)}',
                      maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _Tokens.muted, fontSize: 13.5)),
                ],
                const SizedBox(height: 3),
                Text(_fmt(c.createdAt), style: const TextStyle(color: Color(0xFF9A97AD), fontSize: 12)),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------

class _Chat extends StatefulWidget {
  final int id;
  final _Tokens k;
  final SupportTexts t;
  final VoidCallback onBack;
  const _Chat({super.key, required this.id, required this.k, required this.t, required this.onBack});
  @override
  State<_Chat> createState() => _ChatState();
}

class _ChatState extends State<_Chat> {
  final _text = TextEditingController();
  final _scroll = ScrollController();
  List<SupportMessage> _msgs = [];
  bool _loading = true;
  StreamSubscription? _sub;

  @override
  void initState() {
    super.initState();
    MotoclickSupport.client.messages(widget.id).then((m) {
      if (!mounted) return;
      setState(() {
        _msgs = m;
        _loading = false;
      });
      _toBottom();
      MotoclickSupport.client.markSeen(widget.id);
    }).catchError((_) {
      if (mounted) setState(() => _loading = false);
    });
    _sub = MotoclickSupport.messages.where((m) => m.conversationId == widget.id).listen(_add);
  }

  void _add(SupportMessage m) {
    if (_msgs.any((x) => x.id == m.id)) return;
    setState(() => _msgs.add(m));
    _toBottom();
    if (!m.fromUser) MotoclickSupport.client.markSeen(widget.id);
  }

  void _toBottom() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
      });

  Future<void> _send({List<SupportFile> files = const []}) async {
    final text = _text.text.trim();
    if (text.isEmpty && files.isEmpty) return;
    _text.clear();
    try {
      _add(await MotoclickSupport.client.sendMessage(widget.id, text, files: files));
    } catch (_) {
      _text.text = text;
    }
  }

  Future<void> _pick() async {
    final x = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 75, maxWidth: 1600);
    if (x != null) await _send(files: [SupportFile(x.name, await x.readAsBytes())]);
  }

  @override
  void dispose() {
    _sub?.cancel();
    _text.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext ctx) {
    final k = widget.k, t = widget.t;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      TextButton.icon(
        onPressed: widget.onBack,
        icon: const Icon(Icons.chevron_left_rounded, size: 20),
        label: Text(t.myReports),
        style: TextButton.styleFrom(
          foregroundColor: _Tokens.muted,
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
          padding: const EdgeInsets.fromLTRB(10, 8, 14, 4),
        ),
      ),
      Expanded(
        child: _loading
            ? Center(child: CircularProgressIndicator(color: k.o, strokeWidth: 2.5))
            : ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(18, 4, 18, 14),
                itemCount: _msgs.length,
                itemBuilder: (_, i) => _Bubble(_msgs[i], k, t),
              ),
      ),
      Container(
        decoration: const BoxDecoration(border: Border(top: BorderSide(color: _Tokens.line))),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(6, 10, 12, 10),
            child: Row(children: [
              IconButton(
                onPressed: _pick,
                icon: Transform.rotate(angle: -.6, child: const Icon(Icons.attach_file_rounded)),
                color: _Tokens.muted,
                tooltip: t.attach,
              ),
              Expanded(
                child: TextField(
                  controller: _text,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _send(),
                  decoration: _fieldDeco(k,
                      hint: t.reply, radius: 999, pad: const EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
                ),
              ),
              const SizedBox(width: 8),
              Tooltip(
                message: t.send,
                child: Material(
                  shape: const CircleBorder(),
                  clipBehavior: Clip.antiAlias,
                  child: Ink(
                    decoration: BoxDecoration(gradient: k.gradient),
                    child: InkWell(
                      onTap: _send,
                      child: const SizedBox(width: 46, height: 46, child: Icon(Icons.near_me_rounded, color: Colors.white)),
                    ),
                  ),
                ),
              ),
            ]),
          ),
        ),
      ),
    ]);
  }
}

class _Bubble extends StatelessWidget {
  final SupportMessage m;
  final _Tokens k;
  final SupportTexts t;
  const _Bubble(this.m, this.k, this.t);

  @override
  Widget build(BuildContext ctx) {
    final me = m.fromUser;
    final fg = me ? Colors.white : _Tokens.ink;
    const r = Radius.circular(18);
    return Align(
      alignment: me ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(ctx).size.width * .8),
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          gradient: me ? LinearGradient(colors: [k.o, k.deep]) : null,
          color: me ? null : _Tokens.chip,
          borderRadius: BorderRadius.only(
            topLeft: r,
            topRight: r,
            bottomLeft: me ? r : const Radius.circular(6),
            bottomRight: me ? const Radius.circular(6) : r,
          ),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (!me)
            Padding(
              padding: const EdgeInsets.only(bottom: 3),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.headset_mic_outlined, size: 14, color: k.deep),
                const SizedBox(width: 6),
                Text(m.senderName ?? t.agent, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: k.deep)),
              ]),
            ),
          if (m.content.isNotEmpty) _RichText(m.content, color: fg),
          for (final a in m.attachments)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: a.type == 'image'
                  ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(a.url))
                  : Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.attach_file_rounded, size: 16, color: fg),
                      const SizedBox(width: 6),
                      Text(a.type, style: TextStyle(color: fg, fontWeight: FontWeight.w600)),
                    ]),
            ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: Text(_fmt(m.createdAt), style: TextStyle(fontSize: 11, color: fg.withAlpha(180))),
          ),
        ]),
      ),
    );
  }
}

/// Muestra **negrita** y _cursiva_ como en Chatwoot.
class _RichText extends StatelessWidget {
  final String text;
  final Color color;
  const _RichText(this.text, {required this.color});

  @override
  Widget build(BuildContext ctx) {
    final spans = <TextSpan>[];
    final re = RegExp(r'\*\*(.+?)\*\*|(?<=^|\s)_(.+?)_(?=\s|$)', multiLine: true);
    var i = 0;
    for (final m in re.allMatches(text)) {
      if (m.start > i) spans.add(TextSpan(text: text.substring(i, m.start)));
      spans.add(m.group(1) != null
          ? TextSpan(text: m.group(1), style: const TextStyle(fontWeight: FontWeight.w700))
          : TextSpan(text: m.group(2), style: const TextStyle(fontStyle: FontStyle.italic)));
      i = m.end;
    }
    if (i < text.length) spans.add(TextSpan(text: text.substring(i)));
    return Text.rich(TextSpan(style: TextStyle(color: color, fontSize: 14, height: 1.45), children: spans));
  }
}

String _plain(String s, {int max = 90}) {
  final out = s.replaceAll('**', '').replaceAllMapped(RegExp(r'(^|\s)_(.+?)_(?=\s|$)'), (m) => '${m[1]}${m[2]}');
  final flat = out.replaceAll(RegExp(r'\s+'), ' ');
  return flat.length > max ? '${flat.substring(0, max)}…' : flat;
}

String _fmt(DateTime d) {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  String two(int n) => n.toString().padLeft(2, '0');
  return '${d.day} ${months[d.month - 1]}, ${two(d.hour)}:${two(d.minute)}';
}
