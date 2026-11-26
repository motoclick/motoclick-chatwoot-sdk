import 'package:flutter/material.dart';

import '../../motoclick_support.dart';

/// Botón flotante de soporte. Úsalo como `floatingActionButton` o donde quieras.
class SupportButton extends StatelessWidget {
  /// Datos de esta pantalla que se adjuntan al reporte (ej. {'orden': '4394378'}).
  final Map<String, Object>? context;

  /// Si quieres otro aspecto, pasa tu propio hijo; el toque abre el soporte igual.
  final Widget? child;

  const SupportButton({super.key, this.context, this.child});

  static Future<void> open(BuildContext ctx, {Map<String, Object>? context, int initialTab = 0}) {
    return Navigator.of(ctx).push(MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => SupportScreen(context: context, initialTab: initialTab),
    ));
  }

  @override
  Widget build(BuildContext ctx) {
    if (child != null) {
      return GestureDetector(onTap: () => open(ctx, context: context), child: child);
    }
    final color = MotoclickSupport.isReady ? MotoclickSupport.config.color : Theme.of(ctx).colorScheme.primary;
    final light = Color.lerp(color, const Color(0xFFFFB067), .38)!;
    final deep = Color.lerp(color, const Color(0xFFB33A00), .15)!;
    final label = MotoclickSupport.isReady ? SupportTexts.of(MotoclickSupport.config.locale).title : 'Soporte';

    return ValueListenableBuilder<int>(
      valueListenable: MotoclickSupport.unread,
      builder: (_, n, __) => Badge(
        isLabelVisible: n > 0,
        label: Text('$n'),
        backgroundColor: const Color(0xFF1E1B3A),
        child: Semantics(
          button: true,
          label: label,
          child: Material(
            shape: const CircleBorder(),
            clipBehavior: Clip.antiAlias,
            elevation: 0,
            child: Ink(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [light, color, deep],
                  stops: const [0, .55, 1],
                ),
                boxShadow: [BoxShadow(color: color.withAlpha(110), blurRadius: 24, offset: const Offset(0, 10), spreadRadius: -6)],
              ),
              child: InkWell(
                onTap: () => open(ctx, context: context, initialTab: n > 0 ? 1 : 0),
                child: const Icon(Icons.sms_rounded, color: Colors.white, size: 28),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
