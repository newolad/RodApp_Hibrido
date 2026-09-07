# RodApp — Inventario de vistas

Listado completo de pantallas que debe cubrir la app híbrida.

> **Estado de este documento:** reconstruido a partir de la app Android
> `rodApp-santiago` (que replica el diseño de Figma), del frontend web previo
> (`rodapp-frontend`) y de las notas de alcance de `AVANCES.md`.
> **Pendiente de validar contra el archivo original de Figma "RodApp" (31 frames)**
> — falta el enlace de ese archivo.

## Leyenda de estado

| Símbolo | Significado |
|---|---|
| ✅ | Mockup creado en Figma (`RodApp Híbrido — Mockups`) **y** vista en código |
| 🟨 | Vista en código como *placeholder* (sin contenido real ni mockup detallado) |
| ⬜ | Pendiente (no existe ni mockup ni código) |

**Resumen:** 7 vistas abordadas (2 completas, 5 placeholder) · ~33 vistas pendientes.

---

## 1. Onboarding y acceso

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 1.1 | Splash / Arranque | Logo RodApp centrado mientras carga la app y se resuelve la sesión. | ⬜ | `/` (SplashScreen de Capacitor + guard) | `activity_start.xml`, `splash.html` |
| 1.2 | Bienvenida / Onboarding 1 | Presentación de la app (ilustración + texto + "Siguiente"). | ⬜ | `/onboarding` | `activity_first.xml`, `fragment_first.xml` |
| 1.3 | Onboarding 2 | Segundo slide de introducción de funciones. | ⬜ | `/onboarding` (slide 2) | `fragment_second.xml` |
| 1.4 | **Login** | Correo + contraseña, mostrar/ocultar contraseña, acceso con Google, enlace a registro y a recuperar contraseña. | ✅ | `/login` | `activity_login.xml`, `login.kt`, `login.html` |
| 1.5 | **Registro / Crear cuenta** | Nombre, apellido, correo, contraseña + confirmación, alta con Google. | ✅ | `/registro` | `activity_register_user.xml`, `register_user.kt` |
| 1.6 | Registro exitoso | Confirmación tras crear la cuenta ("¡Cuenta creada!" + CTA a Inicio). | ⬜ | (paso post-registro) | `fragment_registro_exitoso.xml` |
| 1.7 | Recuperar contraseña | Campo de correo para enviar enlace de restablecimiento (Supabase `resetPasswordForEmail`). | ⬜ | `/recuperar-password` | `AVANCES.md`, `auth.js` |
| 1.8 | Nueva contraseña | Formulario para definir la contraseña nueva (retorno del enlace de correo). | ⬜ | `/auth/callback` (modo recovery) | Supabase Auth |
| 1.9 | Desbloqueo biométrico | Pantalla de acceso rápido con huella / Face ID. | ⬜ | (nativo, al abrir) | `AVANCES.md` (biometría) |
| 1.10 | Callback OAuth | Pantalla puente ("Conectando con Google…") mientras se canjea el código. | ✅ | `/auth/callback` | (solo código, sin mockup) |

## 2. Inicio / Dashboard

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 2.1 | **Inicio — sin datos** | Saludo al usuario + estado vacío invitando a registrar la primera moto. | ✅ | `/app/inicio` | `fragment_inicio.xml`, `home.html` |
| 2.2 | Inicio — con datos | Resumen: tarjeta de moto activa, alertas de vencimiento (SOAT/RTM), gasto del mes, accesos rápidos, actividad reciente. | ⬜ | `/app/inicio` (estado lleno) | `fragment_inicio_lleno.xml`, `row_actividad_lleno.xml` |
| 2.3 | Gráfico de tendencia de gastos | Tarjeta/pantalla con gráfico mensual de combustible + mantenimiento. | ⬜ | `/app/inicio` o `/app/historial` | `AVANCES.md` |

## 3. Garaje (motos)

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 3.1 | **Garaje — vacío** | Estado vacío con CTA "Registrar moto". | ✅ | `/app/garaje` | `fragment_garaje.xml`, `garage.html` |
| 3.2 | Garaje — con motos | Lista/galería de motos (foto, marca-modelo, placa, km) + botón añadir. | ⬜ | `/app/garaje` (estado lleno) | `fragment_garaje.xml`, `garage.html` |
| 3.3 | Registrar moto | Formulario: marca, modelo, cilindrada, placa, color, odómetro inicial, foto. | ⬜ | `/app/garaje/nueva` | `fragment_registro_moto.xml`, `moto-register.html` |
| 3.4 | Detalle de moto | Ficha de la moto: datos, documentos, mantenimientos, combustible, editar/eliminar. | ⬜ | `/app/garaje/:id` | `moto-detail.html` |
| 3.5 | Documentos de la moto | Sección dentro del detalle: SOAT, tecnomecánica y otros con su vigencia. | ⬜ | `/app/garaje/:id/documentos` | `fragment_garaje_documentos.xml` |
| 3.6 | Editar moto | Formulario de edición de una moto existente. | ⬜ | `/app/garaje/:id/editar` | `RegistroMotoFragment.kt` (reutilizado) |

## 4. Documentos legales

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 4.1 | Registrar SOAT | Nº de póliza, aseguradora, fecha de inicio y de vencimiento. | ⬜ | `/app/garaje/:id/soat/nuevo` | `fragment_registro_soat.xml`, `RegistroSOATFragment.kt` |
| 4.2 | Registrar RTM (tecnomecánica) | Nº de certificado, CDA, fecha de expedición y vencimiento. | ⬜ | `/app/garaje/:id/rtm/nuevo` | `fragment_registro_rtm.xml`, `RegistroRTMFragment.kt` |
| 4.3 | Nuevo documento | Alta genérica de documento legal (tipo, nombre, entidad, vencimiento, recordatorio). | ⬜ | `/app/garaje/:id/documentos/nuevo` | `fragment_nuevo_documento.xml`, `NuevoDocumentoFragment.kt` |
| 4.4 | Detalle de documento | Vista de un documento con sus datos, estado de vigencia y acciones. | ⬜ | `/app/documentos/:id` | `fragment_documento_detalle.xml`, `documents.html` |
| 4.5 | Documentos adicionales | Lista de otros documentos no obligatorios asociados a la moto. | ⬜ | `/app/garaje/:id/documentos` | `fragment_documentos_adicionales.xml` |
| 4.6 | Documento personalizado | Crear un tipo de documento propio del usuario. | ⬜ | `/app/documentos/personalizado` | `custom-document.html` |

## 5. Registros de operación

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 5.1 | Registro de combustible / tanqueada | Tipo de gasolina, costo, kilometraje, ubicación; selector de moto si hay varias. | ⬜ | `/app/combustible/nuevo` | `fragment_combustible.xml`, `fuel-register.html` |
| 5.2 | Registro de mantenimiento | Tipo de servicio, fecha, kilometraje, costo, notas, "repetir cada X km". | ⬜ | `/app/mantenimiento/nuevo` | `fragment_mantenimiento.xml`, `maintenance.html` |
| 5.3 | Selector de tipo de registro | Hoja/pantalla intermedia para elegir entre tanqueada o mantenimiento. | ⬜ | (modal desde FAB) | `AVANCES.md` (MEMORY, próximos pasos) |
| 5.4 | Progreso de mantenimiento | Indicador de vida útil ("60% vida útil") por componente/servicio. | ⬜ | `/app/mantenimiento` | `AVANCES.md` |

## 6. Historial

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 6.1 | **Historial — vacío** | Estado vacío ("Sin movimientos"). | ✅ | `/app/historial` | `fragment_historial.xml`, `history.html` |
| 6.2 | Historial — con movimientos | Lista unificada de combustible + mantenimiento, ordenada por fecha, con importe. | ⬜ | `/app/historial` (estado lleno) | `HistorialFragment.kt`, `history.html` |
| 6.3 | Historial — filtros | Filtro por moto, por tipo (combustible/mantenimiento) y por rango de fechas. | ⬜ | `/app/historial` (filtros) | `history.html` |

## 7. Mapa

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 7.1 | **Mapa — base** | Mapa con la ubicación actual (placeholder actual). | 🟨 | `/app/mapa` | `fragment_mapa.xml`, `map.html` |
| 7.2 | Mapa — búsqueda de lugares | Buscador de gasolineras / talleres cercanos con resultados y marcadores. | ⬜ | `/app/mapa` (búsqueda) | `AVANCES.md`, `map.html` |
| 7.3 | Mapa — ruta seleccionada | Trazado de ruta hasta un lugar, con panel de indicaciones/resumen. | ⬜ | `/app/mapa` (ruta) | `AVANCES.md` (fondo `#1a1c1e`) |
| 7.4 | Detalle de lugar | Ficha de un punto de interés (nombre, dirección, distancia, acciones). | ⬜ | `/app/mapa` (bottom sheet) | `AVANCES.md` |

## 8. Notificaciones

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 8.1 | Notificaciones — lista | Alertas de vencimiento de SOAT/RTM, recordatorios de mantenimiento, avisos; leídas/no leídas. | ⬜ | `/app/notificaciones` | `notifications.html`, `AVANCES.md` (tabla `notificaciones`) |
| 8.2 | Notificaciones — vacío | Estado sin notificaciones. | ⬜ | `/app/notificaciones` | `notifications.html` |

## 9. Consejos para moteros

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 9.1 | Consejos — lista | Contenido tipo blog: categorías, tarjetas con título y tiempo de lectura. | ⬜ | `/app/consejos` | `tips.html`, `AVANCES.md` (tabla `consejos`) |
| 9.2 | Consejo — detalle / artículo | Lectura del artículo completo. | ⬜ | `/app/consejos/:id` | `tips.html`, `AVANCES.md` |

## 10. Perfil y configuración

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 10.1 | **Perfil** | Tarjeta de identidad (avatar, nombre, correo), accesos a ajustes y **cerrar sesión**. | ✅ | `/app/perfil` | `fragment_perfil.xml`, `profile.html` |
| 10.2 | Editar datos personales | Formulario de edición de nombre, apellido, correo, foto de perfil. | ⬜ | `/app/perfil/editar` | `PerfilFragment.kt`, `profile.html` |
| 10.3 | Configuración / Ajustes | Preferencias: notificaciones, biometría, tema, unidades, idioma. | ⬜ | `/app/perfil/ajustes` | `nav_header_main.xml`, `AVANCES.md` (fondo `#1e2124`) |
| 10.4 | Seguridad | Cambio de contraseña, activar biometría, cerrar sesión en todos los dispositivos. | ⬜ | `/app/perfil/seguridad` | `profile.html` |
| 10.5 | Acerca de / Ayuda | Versión, términos, soporte. | ⬜ | `/app/perfil/acerca` | `nav_header_main.xml` |

## 11. Administración (rol admin)

| # | Vista | Descripción | Estado | Ruta Ionic | Fuente |
|---|---|---|---|---|---|
| 11.1 | Admin — lista de usuarios | Tabla de usuarios registrados (solo rol admin). | ⬜ | `/app/admin/usuarios` | `activity_admin.xml`, `fragment_admin_users.xml`, `AdminUsersFragment.kt` |
| 11.2 | Admin — detalle de usuario | Ficha de un usuario con sus motos y acciones (activar/desactivar). | ⬜ | `/app/admin/usuarios/:id` | `item_admin_user.xml` |

## 12. Componentes / elementos globales (no son "vistas" pero se diseñan en Figma)

| # | Elemento | Descripción | Estado |
|---|---|---|---|
| 12.1 | Barra inferior de tabs | 5 tabs: Inicio · Garaje · Mapa · Historial · Perfil. | ✅ |
| 12.2 | Menú lateral (side nav) | Navegación retráctil usada en la versión web previa (evaluar si se mantiene en híbrido). | ⬜ |
| 12.3 | Encabezado de sección | Header reutilizable con título grande colapsable. | ✅ (parcial) |
| 12.4 | Estado vacío | Componente compartido (icono + título + texto). | ✅ |
| 12.5 | Toasts / alertas | Feedback de éxito/error/confirmación. | ✅ (código) |
| 12.6 | FAB de registro rápido | Botón flotante para añadir tanqueada/mantenimiento. | ⬜ |

---

## Notas de reconciliación con Figma (pendiente)

- El archivo original de Figma "RodApp" tiene **31 frames**; este inventario lista
  ~50 entradas porque separa **estados** (vacío/lleno) y **componentes**. Al abrir
  Figma hay que:
  1. Confirmar nombres exactos de cada frame.
  2. Marcar cuáles estados ya están dibujados y cuáles no.
  3. Detectar vistas de Figma que no estén en esta lista (p. ej. pantallas de
     error, permisos de ubicación, cámara para foto de moto, etc.).
- Fuentes cruzadas usadas: `rodApp-santiago/app/src/main/res/layout/*.xml`,
  `rodApp-santiago/.../fragments/*.kt`, `rodapp-frontend/public_html/pages/*.html`,
  `AVANCES.md`.
