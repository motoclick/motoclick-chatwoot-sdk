# MotoClick Chatwoot SDK

Botón de **Soporte** listo para poner en cualquier app (web o Flutter). El usuario reporta un problema, el reporte llega a **Chatwoot** y la respuesta del agente vuelve a la app en tiempo real.

- **Sin backend**: la app habla directo con Chatwoot. Solo necesitas la URL de Chatwoot y el identificador de un inbox API.
- **Web**: React, Angular, Vue, Next.js o HTML simple. Sin dependencias, ~37 KB.
- **Flutter**: Android, iOS y Flutter web.

```
Usuario toca "Soporte" → elige el tipo de problema, escribe y adjunta una foto → llega a Chatwoot
                                                                                      ↓
                        el usuario ve la respuesta en "Mis reportes" ←  el agente responde en Chatwoot
```

| Carpeta | Contenido |
|---|---|
| `web/` | SDK web (código en `web/src`, compilado en `web/dist`) y página de prueba en `web/example` |
| `flutter/` | Paquete Dart `motoclick_support` y app de ejemplo en `flutter/example` |

---

## 1. Preparar Chatwoot (una sola vez)

1. Chatwoot → **Ajustes → Entradas → Agregar bandeja de entrada → API**.
2. Nombre, por ejemplo `Soporte Apps`. Deja vacía la *URL de Webhook*.
3. Agrega los agentes que van a responder.
4. Abre el inbox → pestaña **Configuración** → copia el **Identificador de bandeja de entrada**.

Ese identificador es el `inboxId` del SDK. **No es secreto**: puede ir dentro de la app.

Inbox actual de MotoClick: **Soporte Apps** → `qqaafBw54s4jqXnySGkjEgTh`.

Opcional:
- **Ajustes → Atributos personalizados → Conversación**: crea `categoria`, `app` y `orden` (texto) para verlos ordenados en el panel derecho de cada conversación.
- **Ajustes → Automatización**: por ejemplo "Conversación creada" + `categoria` = `Pagos` → etiqueta `pagos` o asignar a un equipo.

> Todas las apps pueden usar el mismo inbox (se distinguen por el atributo `app`) o tener uno propio cada una.

---

## 2. Web

### Instalar

El repositorio es privado: instala con una cuenta que tenga acceso.

```bash
npm install github:motoclick/motoclick-chatwoot-sdk#v0.1.0
# o por SSH
npm install git+ssh://git@github.com/motoclick/motoclick-chatwoot-sdk.git#v0.1.0
```

Queda como `@motoclick/chatwoot-sdk` en tu `package.json`.

### Usar (3 pasos)

```ts
import { MotoclickSupport } from '@motoclick/chatwoot-sdk';

// 1. Configurar una vez, al arrancar la app
MotoclickSupport.init({
  chatwootUrl: 'https://chatwoot.motoclickapp.com',
  inboxId: 'qqaafBw54s4jqXnySGkjEgTh',
  app: 'panel-comercios',
  appVersion: '2.3.0',
});

// 2. Después del login: decir quién es el usuario
MotoclickSupport.identify({
  id: 'merchant_45',          // id estable en tu sistema (obligatorio)
  name: 'Holy Pita',
  email: 'pedidos@holypita.com',
  phone: '3475550000',
});

// 3. Al cerrar sesión
MotoclickSupport.reset();
```

Con eso aparece el botón flotante abajo a la derecha. Opcionalmente:

```ts
// Datos de la pantalla actual: se adjuntan a los reportes
MotoclickSupport.setContext({ orden: 4394378 });
MotoclickSupport.setContext({ orden: null }); // quitarlo

// Avisar cuando responde soporte
MotoclickSupport.on('reply', (m) => toast(`Soporte: ${m.content}`));

// Abrir desde tu propio botón o menú (con showButton: false en init para ocultar el flotante)
MotoclickSupport.open();        // "Nuevo reporte"
MotoclickSupport.open('list');  // "Mis reportes"
```

### React

```tsx
// main.tsx
import { MotoclickSupport } from '@motoclick/chatwoot-sdk';
MotoclickSupport.init({ chatwootUrl: 'https://chatwoot.motoclickapp.com', inboxId: 'qqaafBw54s4jqXnySGkjEgTh', app: 'panel-comercios' });

// donde ya tienes al usuario logueado
useEffect(() => {
  if (user) MotoclickSupport.identify({ id: `merchant_${user.id}`, name: user.name, email: user.email });
  else MotoclickSupport.reset();
}, [user]);
```

### Next.js / SSR

El SDK no toca el DOM al importarse, pero el botón solo existe en el navegador: llama a `init` dentro de un componente cliente.

```tsx
'use client';
import { useEffect } from 'react';
import { MotoclickSupport } from '@motoclick/chatwoot-sdk';

export function Support({ user }) {
  useEffect(() => {
    MotoclickSupport.init({ chatwootUrl: 'https://chatwoot.motoclickapp.com', inboxId: 'qqaafBw54s4jqXnySGkjEgTh', app: 'web' });
    return () => MotoclickSupport.destroy();
  }, []);
  useEffect(() => {
    if (user) MotoclickSupport.identify({ id: `merchant_${user.id}`, name: user.name });
  }, [user]);
  return null;
}
```

### Angular

```ts
// main.ts (antes de bootstrapApplication)
import { MotoclickSupport } from '@motoclick/chatwoot-sdk';
MotoclickSupport.init({ chatwootUrl: 'https://chatwoot.motoclickapp.com', inboxId: 'qqaafBw54s4jqXnySGkjEgTh', app: 'admin' });

// auth.service.ts
login(user: User) { MotoclickSupport.identify({ id: `admin_${user.id}`, name: user.name }); }
logout() { MotoclickSupport.reset(); }
```

### Vue

```ts
// main.ts
import { MotoclickSupport } from '@motoclick/chatwoot-sdk';
MotoclickSupport.init({ chatwootUrl: 'https://chatwoot.motoclickapp.com', inboxId: 'qqaafBw54s4jqXnySGkjEgTh', app: 'web' });
// después del login: MotoclickSupport.identify({...})
```

### HTML simple (sin npm ni build)

Copia `web/dist/motoclick-support.js` a tu proyecto o servidor y agrégalo con una línea:

```html
<script src="/js/motoclick-support.js"
        data-chatwoot-url="https://chatwoot.motoclickapp.com"
        data-inbox-id="qqaafBw54s4jqXnySGkjEgTh"
        data-app="landing"></script>

<script>
  // cuando sepas quién es el usuario
  MotoclickSupport.identify({ id: 'cliente_123', name: 'Ana' });
</script>
```

Atributos opcionales del tag: `data-app-version`, `data-locale` (`es`/`en`), `data-color`, `data-position` (`right`/`left`).

### Referencia web

| Función | Qué hace |
|---|---|
| `init(config)` | Configura el SDK y pinta el botón flotante |
| `identify(user)` | Quién es el usuario (`id` obligatorio; `name`, `email`, `phone`, `attributes` opcionales) |
| `setContext({...})` | Datos que se adjuntan a todos los reportes. `null` borra una clave |
| `open('new' \| 'list')` / `close()` | Abre o cierra el panel |
| `showButton()` / `hideButton()` | Muestra u oculta el botón flotante |
| `report({ category, message, files, context })` | Manda un reporte sin abrir el panel. Devuelve el id de la conversación |
| `conversations()` | Lista los reportes del usuario |
| `on(evento, fn)` | Eventos: `reply`, `message`, `reported`, `error`, `open`, `close`. Devuelve una función para quitar el listener |
| `reset()` | Olvida al usuario en este navegador (cerrar sesión) |
| `destroy()` | Quita el botón y desconecta todo |

Opciones de `init`:

| Opción | Por defecto | |
|---|---|---|
| `chatwootUrl` | — | Obligatoria |
| `inboxId` | — | Obligatoria |
| `app` | — | Nombre de la app que reporta |
| `appVersion` | — | Se adjunta a cada reporte |
| `locale` | `'es'` | `'es'` o `'en'` |
| `color` | `'#ff6a13'` | Color principal; el gradiente sale de ahí |
| `position` | `'right'` | `'right'` o `'left'` |
| `showButton` | `true` | `false` para abrirlo solo desde tu propio botón |
| `categories` | 5 de ejemplo | Tipos de problema del formulario |
| `brandName` | `'Motoclick'` | Marca del encabezado; `''` la oculta |
| `loadFont` | `true` | Carga Plus Jakarta Sans de Google Fonts; `false` usa la fuente de tu página |

El widget vive en un Shadow DOM: sus estilos no afectan a tu página ni al revés.

---

## 3. Flutter

### Instalar

En el `pubspec.yaml` de tu app (necesita acceso al repositorio):

```yaml
dependencies:
  motoclick_support:
    git:
      url: https://github.com/motoclick/motoclick-chatwoot-sdk.git   # o git@github.com:motoclick/motoclick-chatwoot-sdk.git
      path: flutter
      ref: v0.1.0
```

```bash
flutter pub get
```

### Usar (3 pasos)

```dart
import 'package:motoclick_support/motoclick_support.dart';

// 1. En main(), antes de runApp
void main() {
  MotoclickSupport.init(const SupportConfig(
    chatwootUrl: 'https://chatwoot.motoclickapp.com',
    inboxId: 'qqaafBw54s4jqXnySGkjEgTh',
    app: 'driver',
    appVersion: '4.2.0',
  ));
  runApp(const MyApp());
}

// 2. Después del login
await MotoclickSupport.identify(SupportUser(
  id: 'driver_${driver.id}',
  name: driver.name,
  phone: driver.phone,
));

// 3. Al cerrar sesión
await MotoclickSupport.reset();
```

Poner el botón:

```dart
// Botón flotante, con los datos de esta pantalla
Scaffold(
  floatingActionButton: SupportButton(context: {'orden': order.id}),
);

// O desde tu propio botón / menú
ListTile(title: const Text('Soporte'), onTap: () => SupportButton.open(context));
```

Opcional:

```dart
// Datos que se pegan a todos los reportes
MotoclickSupport.setContext({'zona': 'Bronx'});

// Avisar cuando responde soporte
MotoclickSupport.replies.listen((m) => showSnack('Soporte: ${m.content}'));

// Respuestas sin leer (para un globo propio)
ValueListenableBuilder(valueListenable: MotoclickSupport.unread, builder: (_, n, __) => Text('$n'));

// Reporte sin abrir la pantalla
await MotoclickSupport.report(message: 'No carga el mapa', category: 'Problema con la app');
```

`SupportConfig` también acepta `locale`, `color`, `categories`, `brandName` y `useBrandFont` (`false` usa la fuente de tu app).

### Permisos

Para adjuntar fotos y usar la cámara (usa `image_picker`):

- **iOS** (`ios/Runner/Info.plist`):
  ```xml
  <key>NSPhotoLibraryUsageDescription</key><string>Para adjuntar fotos a tus reportes de soporte</string>
  <key>NSCameraUsageDescription</key><string>Para tomar fotos de tus reportes de soporte</string>
  ```
- **Android**: nada extra en Android 13 o superior.

---

## Qué le llega a Chatwoot

- **Contacto**: nombre, correo, teléfono e `identifier` = el `id` de `identify`. El mismo usuario no se duplica entre dispositivos.
- **Una conversación por reporte**, con atributos `categoria`, `app`, `app_version`, `dispositivo`, `pagina` (en web) y todo lo de `setContext` / `context`.
- **Mensaje**: la categoría en negrita, el texto, una línea con el contexto (ej. `orden: 4394378`) y las fotos adjuntas.
- Lo que responde el agente aparece en **Mis reportes**, en tiempo real.

## Seguridad

- El `inboxId` es público por diseño de Chatwoot: solo permite crear contactos y conversaciones en **ese** inbox y leer las conversaciones del propio contacto. No da acceso al resto de Chatwoot.
- **Nunca** pongas en una app el *Access Token* de un usuario de Chatwoot ni la clave de *Validación de identidad* del inbox.
- Alguien que copie el `inboxId` podría mandar reportes falsos. Si pasa, activa la **Validación de identidad (HMAC)** en el inbox y pasa `identifierHash` en `identify`; ese hash lo tiene que calcular un servidor tuyo.

## Desarrollo

```bash
# Web: compila web/dist (súbelo junto con el código, es lo que se instala)
cd web && npm install && npm run build

# Página de prueba: sirve la carpeta web/ y abre /example/index.html
npx http-server web -p 5195
#   ?abrir=1      abre el panel directo
#   ?abrir=lista  abre "Mis reportes"

# Flutter
cd flutter && flutter pub get && flutter analyze
cd flutter/example && flutter run
```

Para sacar una versión nueva: sube `version` en `package.json`, `web/package.json` y `flutter/pubspec.yaml`, compila `web/dist` y crea un tag `vX.Y.Z`.
