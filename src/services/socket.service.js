const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Inicializa Socket.IO con el servidor HTTP
 */
const initializeSocketIO = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:4200',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Middleware de autenticación para WebSockets
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.userRole = decoded.role;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Manejo de conexiones
    io.on('connection', (socket) => {
        console.log(`✅ Usuario conectado: ${socket.userId} (Socket ID: ${socket.id})`);

        // Unir al usuario a su sala personal
        socket.join(`user:${socket.userId}`);

        // Si es admin, unir a sala de admins
        if (socket.userRole === 'admin') {
            socket.join('admins');
            console.log(`👑 Admin conectado: ${socket.userId}`);
        }

        // Enviar estado de conexión
        socket.emit('connected', {
            message: 'Conectado exitosamente',
            userId: socket.userId,
            socketId: socket.id
        });

        // Manejo de desconexión
        socket.on('disconnect', (reason) => {
            console.log(`❌ Usuario desconectado: ${socket.userId} (Razón: ${reason})`);
        });

        // Evento de prueba
        socket.on('ping', (data) => {
            socket.emit('pong', { message: 'Pong!', timestamp: new Date() });
        });

        // NOTE: Endpoints de notificaciones persistentes removidos.
        // Funcionalidad de sockets queda para eventos en tiempo real (sin persistencia).
    });

    console.log('🔌 Socket.IO inicializado correctamente');
    return io;
};

/**
 * Obtiene la instancia de Socket.IO
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO no ha sido inicializado');
    }
    return io;
};

/**
 * Envía notificación a un usuario específico (WebSocket + BD)
 */
const notifyUser = async(userId, event, data) => {
    try {
        const io = getIO();

        // Enviar por WebSocket en tiempo real
        io.to(`user:${userId}`).emit(event, {
            ...data,
            timestamp: new Date(),
            read: false
        });

        // Persistencia de notificaciones removida; solo envío en tiempo real
        console.log(`📨 Notificación (socket) enviada a usuario ${userId}: ${event}`);
    } catch (error) {
        console.error('Error al enviar notificación:', error);
    }
};

/**
 * Envía notificación a todos los administradores
 */
const notifyAdmins = (event, data) => {
    try {
        const io = getIO();
        io.to('admins').emit(event, {
            ...data,
            timestamp: new Date()
        });
        console.log(`📢 Notificación enviada a admins: ${event}`);
    } catch (error) {
        console.error('Error al notificar admins:', error);
    }
};

/**
 * Envía notificación broadcast a todos los usuarios conectados
 */
const notifyAll = (event, data) => {
    try {
        const io = getIO();
        io.emit(event, {
            ...data,
            timestamp: new Date()
        });
        console.log(`📣 Broadcast enviado: ${event}`);
    } catch (error) {
        console.error('Error al enviar broadcast:', error);
    }
};

/**
 * Notificaciones específicas por tipo de evento
 */

// Nueva reserva creada
const notifyNewReserva = async(userId, reservaData) => {
    await notifyUser(userId, 'nueva_reserva', {
        type: 'reserva',
        title: 'Nueva Reserva Creada',
        message: `Tu reserva para ${reservaData.nombre_evento} ha sido creada`,
        data: reservaData,
        url: `/reserva/${reservaData.id_reserva}`,
        icon: 'bi-calendar-check',
        priority: 'normal'
    });
};

// Pago recibido
const notifyPagoRecibido = async(userId, pagoData) => {
    await notifyUser(userId, 'pago_recibido', {
        type: 'pago',
        title: 'Pago Recibido',
        message: `Pago de $${pagoData.monto} recibido exitosamente`,
        data: pagoData,
        url: `/factura/${pagoData.id_pago}`,
        icon: 'bi-credit-card-fill',
        priority: 'alta'
    });
};

// Invitado confirmó asistencia
const notifyInvitadoConfirmo = async(userId, invitadoData) => {
    await notifyUser(userId, 'invitado_confirmo', {
        type: 'invitacion',
        title: 'Invitado Confirmó',
        message: `${invitadoData.nombre} confirmó su asistencia`,
        data: invitadoData,
        url: `/evento/${invitadoData.id_evento}/invitados`,
        icon: 'bi-person-check-fill',
        priority: 'normal'
    });
};

// Proveedor envió mensaje
const notifyMensajeProveedor = async(userId, mensajeData) => {
    await notifyUser(userId, 'mensaje_proveedor', {
        type: 'mensaje',
        title: 'Nuevo Mensaje',
        message: `Tienes un nuevo mensaje de ${mensajeData.proveedor_nombre}`,
        data: mensajeData,
        url: `/mensajes/${mensajeData.id_conversacion}`,
        icon: 'bi-chat-dots-fill',
        priority: 'normal'
    });
};

// Nuevo proveedor pendiente (para admins)
const notifyNuevoProveedorPendiente = async(proveedorData) => {
    notifyAdmins('nuevo_proveedor_pendiente', {
        type: 'proveedor',
        title: 'Nuevo Proveedor Pendiente',
        message: `${proveedorData.nombre_empresa} solicita aprobación`,
        data: proveedorData,
        url: `/admin/proveedores/pendientes`,
        icon: 'bi-shop',
        priority: 'alta'
    });
};

// Evento próximo (recordatorio)
const notifyEventoProximo = async(userId, eventoData) => {
    await notifyUser(userId, 'evento_proximo', {
        type: 'recordatorio',
        title: 'Evento Próximo',
        message: `${eventoData.nombre_evento} es en ${eventoData.dias_restantes} días`,
        data: eventoData,
        url: `/evento/${eventoData.id_evento}`,
        icon: 'bi-bell-fill',
        priority: 'alta'
    });
};

// Estado de reserva actualizado
const notifyEstadoReserva = async(userId, reservaData) => {
    await notifyUser(userId, 'estado_reserva', {
        type: 'reserva',
        title: 'Estado de Reserva Actualizado',
        message: `Tu reserva está ahora en estado: ${reservaData.estado}`,
        data: reservaData,
        url: `/reserva/${reservaData.id_reserva}`,
        icon: 'bi-info-circle-fill',
        priority: 'normal'
    });
};

module.exports = {
    initializeSocketIO,
    getIO,
    notifyUser,
    notifyAdmins,
    notifyAll,
    // Notificaciones específicas
    notifyNewReserva,
    notifyPagoRecibido,
    notifyInvitadoConfirmo,
    notifyMensajeProveedor,
    notifyNuevoProveedorPendiente,
    notifyEventoProximo,
    notifyEstadoReserva
};