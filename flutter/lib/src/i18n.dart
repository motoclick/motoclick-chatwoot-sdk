class SupportTexts {
  final String title, subtitle, attachHint, camera, newReport, myReports, category, message, messageHint, attach, send, sending, sent, error,
      empty, reply, agent, you, open, resolved, pending;
  final List<String> categories;

  const SupportTexts({
    required this.title,
    required this.subtitle,
    required this.attachHint,
    required this.camera,
    required this.newReport,
    required this.myReports,
    required this.category,
    required this.message,
    required this.messageHint,
    required this.attach,
    required this.send,
    required this.sending,
    required this.sent,
    required this.error,
    required this.empty,
    required this.reply,
    required this.agent,
    required this.you,
    required this.open,
    required this.resolved,
    required this.pending,
    required this.categories,
  });

  String status(String s) => switch (s) { 'open' => open, 'resolved' => resolved, 'pending' => pending, _ => s };

  static SupportTexts of(String locale) => locale == 'en' ? en : es;

  static const es = SupportTexts(
    title: 'Soporte',
    subtitle: 'Estamos para ayudarte',
    attachHint: 'Puedes subir imágenes, documentos o capturas',
    camera: 'Tomar foto',
    newReport: 'Nuevo reporte',
    myReports: 'Mis reportes',
    category: 'Tipo de problema',
    message: 'Cuéntanos qué pasó',
    messageHint: 'Describe el problema con el mayor detalle posible…',
    attach: 'Adjuntar foto o archivo',
    send: 'Enviar reporte',
    sending: 'Enviando…',
    sent: '¡Listo! Recibimos tu reporte. Te responderemos aquí.',
    error: 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.',
    empty: 'Aún no tienes reportes. Cuando envíes uno, aquí verás la respuesta de soporte.',
    reply: 'Escribe una respuesta…',
    agent: 'Soporte',
    you: 'Tú',
    open: 'Abierto',
    resolved: 'Resuelto',
    pending: 'Pendiente',
    categories: ['Problema con una orden', 'Pagos', 'Problema con la app', 'Cuenta', 'Otro'],
  );

  static const en = SupportTexts(
    title: 'Support',
    subtitle: 'We are here to help',
    attachHint: 'You can upload images, documents or screenshots',
    camera: 'Take photo',
    newReport: 'New report',
    myReports: 'My reports',
    category: 'Issue type',
    message: 'Tell us what happened',
    messageHint: 'Describe the problem in as much detail as possible…',
    attach: 'Attach photo or file',
    send: 'Send report',
    sending: 'Sending…',
    sent: 'Done! We got your report. We will reply here.',
    error: 'Could not send. Check your connection and try again.',
    empty: 'No reports yet. Once you send one, the support reply shows up here.',
    reply: 'Write a reply…',
    agent: 'Support',
    you: 'You',
    open: 'Open',
    resolved: 'Resolved',
    pending: 'Pending',
    categories: ['Order issue', 'Payments', 'App issue', 'Account', 'Other'],
  );
}
