# 🔔 Sistema de Notificaciones en Tiempo Real - ÉCLAT

## Descripción General

Sistema completo de notificaciones en tiempo real que combina **WebSocket (Socket.IO)** para notificaciones instantáneas con **almacenamiento persistente en PostgreSQL** para garantizar que los usuarios no pierdan ninguna notificación.

## Arquitectura

```
┌─────────────┐           ┌──────────────┐           ┌─────────────┐
│  Angular    │ WebSocket │   Node.js    │   HTTP    │ PostgreSQL  │
│  Frontend   │◄─────────►│   Backend    │◄─────────►│  Database   │
│             │           │  Socket.IO   │           │             │
└─────────────┘           └──────────────┘           └─────────────┘
```

### Flujo de Notificación

1. **Evento del Sistema** → Crear notificación en BD + Emitir por WebSocket
2. **Usuario Conectado** → Recibe notificación instantánea + Notificación browser
3. **Usuario Desconectado** → Notificación almacenada en BD
4. **Al Reconectar** → Cargar notificaciones pendientes desde BD

## Características

### ✅ Implementadas

- **Notificaciones en Tiempo Real**: Socket.IO con autenticación JWT
- **Persistencia**: Todas las notificaciones se almacenan en PostgreSQL
- **Tipos de Notificaciones**:
  - 📅 Reservas (creación, cambio de estado)
  - 💳 Pagos (recibido, fallido, reembolso)
  - ✉️ Invitaciones (confirmación de asistencia)
  - 💬 Mensajes de proveedores
  - 🏢 Proveedores pendientes (admin)
  - ⏰ Recordatorios de eventos
  - 📊 Sistema general
- **Prioridades**: Normal, Alta, Urgente
- **Badge con Contador**: Muestra número de notificaciones no leídas
- **Notificaciones Browser**: Integración con Notification API
- **Filtros Avanzados**: Por tipo, prioridad, estado, búsqueda
- **Gestión Completa**: Marcar como leída, eliminar, marcar todas

## Backend - Estructura

### 1. Base de Datos

**Migración**: `migrations/005_notificaciones.sql`

```sql
CREATE TABLE notificacion (
    id_notificacion SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuario(id_usuario),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    datos JSONB,
    leida BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    url VARCHAR(500),
    icono VARCHAR(50),
    prioridad VARCHAR(20) DEFAULT 'normal'
);
```

**Funciones PostgreSQL**:
- `crear_notificacion()` - Crear nueva notificación
- `marcar_notificacion_leida()` - Marcar como leída
- `marcar_todas_leidas()` - Marcar todas de un usuario
- `obtener_notificaciones_usuario()` - Obtener con filtros
- `limpiar_notificaciones_antiguas()` - Limpieza periódica

**Vistas**:
- `v_notificaciones_no_leidas` - Contador por usuario
- `v_estadisticas_notificaciones` - Métricas de lectura

**Triggers Automáticos**:
- Nueva reserva → Notificación automática
- Pago completado → Notificación automática

### 2. Socket.IO Service

**Archivo**: `src/services/socket.service.js`

```javascript
// Inicializar Socket.IO con autenticación JWT
initializeSocketIO(server)

// Enviar notificaciones
notifyUser(userId, event, data)
notifyAdmins(event, data)
notifyAll(event, data)

// Notificaciones específicas
notifyNewReserva(userId, reservaData)
notifyPagoRecibido(userId, pagoData)
notifyInvitadoConfirmo(userId, invitadoData)
notifyMensajeProveedor(userId, mensajeData)
notifyNuevoProveedorPendiente(proveedorData)
notifyEventoProximo(userId, eventoData)
notifyEstadoReserva(userId, reservaData)
```

**Características del Servicio**:
- Middleware de autenticación JWT en conexión
- Salas de usuario personales (`user:${userId}`)
- Sala de administradores (`admins`)
- Doble persistencia: WebSocket + BD
- Manejo de reconexión automática

### 3. API REST

**Rutas**: `src/routes/notificacion.routes.js`

```
GET    /api/notificaciones              - Listar notificaciones
GET    /api/notificaciones/contador     - Obtener contador no leídas
PUT    /api/notificaciones/:id/leer     - Marcar como leída
PUT    /api/notificaciones/leer-todas   - Marcar todas como leídas
DELETE /api/notificaciones/:id          - Eliminar notificación
POST   /api/notificaciones/crear        - Crear manual (admin)
GET    /api/notificaciones/estadisticas - Estadísticas (admin)
DELETE /api/notificaciones/limpiar      - Limpiar antiguas (admin)
```

### 4. Integración en App

**Archivo**: `index.js`

```javascript
const http = require('http');
const socketService = require('./services/socket.service');

const server = http.createServer(app);
socketService.initializeSocketIO(server);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('WebSocket server initialized');
});
```

## Frontend - Estructura

### 1. Servicio de Notificaciones

**Archivo**: `src/app/service/notification.service.ts`

```typescript
class NotificationService {
    // Conexión Socket.IO
    connect(): void
    disconnect(): void
    isConnected(): boolean
    
    // Notificaciones
    notifications$: Observable<Notificacion[]>
    unreadCount$: Observable<ContadorNotificaciones>
    
    // Acciones
    loadNotifications(limite, soloNoLeidas)
    markAsRead(notificationId)
    markAllAsRead()
    deleteNotification(notificationId)
    
    // Permisos browser
    requestNotificationPermission()
}
```

**Auto-conexión**: Se conecta automáticamente cuando el usuario inicia sesión.

### 2. Badge Component

**Archivo**: `src/app/components/notification-badge/`

**Características**:
- Icono de campana con contador en tiempo real
- Indicador visual de notificaciones urgentes
- Dropdown con últimas 20 notificaciones
- Estado de conexión WebSocket
- Botón "Marcar todas como leídas"
- Navegación a página completa

**Integración en Navbar**:
```html
<div *ngIf="isLoggedIn" class="me-3">
    <app-notification-badge></app-notification-badge>
</div>
```

### 3. Página de Notificaciones

**Archivo**: `src/app/components/notificaciones/`

**Características**:
- Lista completa de todas las notificaciones
- Estadísticas: Total, No Leídas, Urgentes
- Filtros avanzados:
  - Búsqueda por texto
  - Filtro por tipo (reserva, pago, etc.)
  - Filtro por prioridad
  - Filtro por estado (leída/no leída)
- Acciones individuales y masivas
- Diseño responsive con cards

### 4. Ruta Protegida

```typescript
{
    path: 'notificaciones',
    component: NotificacionesComponent,
    canActivate: [authGuard]
}
```

## Uso del Sistema

### Crear Notificación Manual (Admin)

```javascript
// Backend
const notificacionService = require('./services/notificacion.service');

await notificacionService.crearNotificacion({
    userId: 123,
    tipo: 'sistema',
    titulo: 'Mantenimiento Programado',
    mensaje: 'El sistema estará en mantenimiento el 25/01',
    datos: { fecha: '2025-01-25', duracion: '2h' },
    url: '/sistema/mantenimiento',
    icono: 'bi-tools',
    prioridad: 'alta'
});
```

### Enviar Notificación con WebSocket

```javascript
// Backend
const socketService = require('./services/socket.service');

await socketService.notifyUser(userId, 'custom_event', {
    type: 'mensaje',
    title: 'Nuevo Mensaje',
    message: 'Tienes un mensaje de María',
    data: { conversationId: 456 },
    url: '/chat/456',
    icon: 'bi-chat-fill',
    priority: 'normal'
});
```

### Escuchar Notificaciones (Frontend)

```typescript
// Angular Component
constructor(private notificationService: NotificationService) {
    this.notificationService.notifications$.subscribe(notifications => {
        console.log('Nuevas notificaciones:', notifications);
    });
    
    this.notificationService.unreadCount$.subscribe(count => {
        console.log('No leídas:', count.total_no_leidas);
    });
}
```

### Solicitar Permisos Browser

```typescript
// En componente principal
ngOnInit() {
    this.notificationService.requestNotificationPermission();
}
```

## Eventos WebSocket

### Cliente → Servidor

- `mark_notification_read` - Marcar notificación como leída
- `mark_all_read` - Marcar todas como leídas
- `get_unread_count` - Obtener contador actualizado

### Servidor → Cliente

- `connected` - Confirmación de conexión exitosa
- `nueva_reserva` - Nueva reserva creada
- `pago_recibido` - Pago procesado
- `invitado_confirmo` - Invitado confirmó asistencia
- `mensaje_proveedor` - Nuevo mensaje de proveedor
- `nuevo_proveedor_pendiente` - Proveedor pendiente aprobación (admin)
- `evento_proximo` - Recordatorio de evento
- `estado_reserva` - Cambio de estado de reserva
- `unread_count_updated` - Contador actualizado
- `error` - Error en operación

## Seguridad

### Autenticación WebSocket

```javascript
// Middleware de autenticación JWT
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});
```

### Autorización

- Usuarios solo reciben sus propias notificaciones
- Admins tienen sala separada para notificaciones administrativas
- Validación de userId en todas las operaciones CRUD

## Optimización

### Base de Datos

- **Índices**: user_id, leida, fecha_creacion, tipo
- **Limpieza automática**: Función para eliminar notificaciones antiguas
- **Triggers**: Creación automática en eventos del sistema
- **Vistas materializadas**: Estadísticas pre-calculadas

### WebSocket

- **Reconexión automática**: Socket.IO maneja desconexiones
- **Salas por usuario**: Evita broadcast innecesario
- **Compresión**: Habilitada por defecto en Socket.IO
- **Heartbeat**: Ping/Pong automático para mantener conexión

### Frontend

- **Signals**: Estado reactivo con Angular 18
- **Lazy Loading**: Componentes cargados bajo demanda
- **Virtual Scrolling**: Para listas largas de notificaciones (opcional)
- **Debouncing**: En filtros de búsqueda

## Mantenimiento

### Limpieza de Notificaciones Antiguas

```sql
-- Ejecutar mensualmente (cron job)
SELECT limpiar_notificaciones_antiguas(90); -- Elimina leídas > 90 días
```

### Monitoreo

```sql
-- Ver estadísticas de notificaciones
SELECT * FROM v_estadisticas_notificaciones
WHERE fecha >= CURRENT_DATE - 30
ORDER BY fecha DESC;

-- Ver usuarios con más notificaciones no leídas
SELECT * FROM v_notificaciones_no_leidas
ORDER BY total_no_leidas DESC
LIMIT 10;
```

### Logs

- Backend: `console.log` con emojis para fácil identificación
- Frontend: `console.log` en desarrollo, deshabilitado en producción

## Testing

### Backend

```javascript
// Test de creación de notificación
const notifId = await notificacionService.crearNotificacion({
    userId: 1,
    tipo: 'test',
    titulo: 'Test',
    mensaje: 'Mensaje de prueba',
    prioridad: 'normal'
});
console.log('Notificación creada:', notifId);
```

### Frontend

```typescript
// Test de conexión
console.log('Socket conectado:', this.notificationService.isConnected());

// Test de recepción
this.notificationService.notifications$.subscribe(notifications => {
    console.log('Notificaciones recibidas:', notifications.length);
});
```

## Futuras Mejoras

- [ ] Push Notifications para móviles (PWA)
- [ ] Notificaciones por email para no leídas > 24h
- [ ] Preferencias de notificación por usuario
- [ ] Agrupación de notificaciones similares
- [ ] Snooze de notificaciones (recordar más tarde)
- [ ] Notificaciones de escritorio con acciones rápidas
- [ ] Analytics de engagement con notificaciones

## Troubleshooting

### No Recibo Notificaciones

1. Verificar que Socket.IO esté conectado: `isConnected()`
2. Revisar token JWT válido en localStorage
3. Verificar permisos de notificaciones del browser
4. Revisar logs del servidor WebSocket

### Notificaciones Duplicadas

- Verificar que no haya múltiples conexiones activas
- Revisar que no se esté creando notificación en BD y WebSocket por separado

### Contador No Actualiza

- Llamar manualmente a `loadUnreadCount()`
- Verificar que evento `unread_count_updated` esté siendo emitido

## Tecnologías Utilizadas

- **Backend**: Node.js, Express, Socket.IO 4.x
- **Frontend**: Angular 18, Socket.IO Client
- **Base de Datos**: PostgreSQL 17
- **Autenticación**: JWT (jsonwebtoken)
- **Tiempo Real**: WebSocket (Socket.IO)
- **UI**: Bootstrap 5, Bootstrap Icons

## Autores

Sistema desarrollado para ÉCLAT - Plataforma de Gestión de Eventos

---

**Última actualización**: Enero 2025  
**Versión**: 1.0.0
