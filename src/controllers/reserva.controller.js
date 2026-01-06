const reservaModel = require('../models/reserva.models');

/**
 * Controlador para Reservas - Maneja evento, reservacion e invitados
 */

// Crear nueva reservación
exports.createReserva = async(req, res) => {
    try {
        try {
            console.log('Received POST /reservas body (server):', JSON.stringify(req.body));
        } catch (e) {
            console.log('Received POST /reservas body: <unserializable payload>');
        }
        const {
            id_usuario,
            evento,
            proveedores,
            cedulaReservacion,
            numeroInvitados,
            invitados,
            subtotal,
            iva,
            total
        } = req.body;

        // Detectar si el frontend envió subtotal/iva/total (acepta strings numéricas)
        const frontendSentSubtotal = (typeof req.body.subtotal === 'number' && !isNaN(req.body.subtotal)) ||
            (typeof req.body.subtotal === 'string' && !isNaN(Number(req.body.subtotal)));

        let sendSubtotal = subtotal || 0;
        let sendIva = iva || 0;
        let sendTotal = total || 0;
        let sendProveedores = proveedores || [];

        if (frontendSentSubtotal) {
            const subtotalVal = Number(req.body.subtotal);
            const impuestos = (typeof req.body.iva === 'number' && !isNaN(req.body.iva)) ?
                Number(req.body.iva) :
                Number((subtotalVal * 0.15).toFixed(2));
            const totalVal = (typeof req.body.total === 'number' && !isNaN(req.body.total)) ?
                Number(req.body.total) :
                Number((subtotalVal + impuestos).toFixed(2));

            // Marcar precios por proveedor si vienen en el payload
            sendProveedores = (proveedores || []).map(p => {
                const copy = Object.assign({}, p);
                if (copy.precio_calculado != null) copy._precio_calculado = Number(copy.precio_calculado);
                else if (copy.precioCalculado != null) copy._precio_calculado = Number(copy.precioCalculado);
                else copy._precio_calculado = null;
                return copy;
            });

            console.log('Using frontend totals to insert ->', { subtotal: subtotalVal, impuestos, total: totalVal });
            console.log('Provider prices (from payload or null = compute):', sendProveedores.map(p => ({ id: p.id_proveedor, precio: p._precio_calculado })));

            sendSubtotal = subtotalVal;
            sendIva = impuestos;
            sendTotal = totalVal;
        }

        // Validaciones básicas
        if (!id_usuario || !evento) {
            return res.status(400).json({
                error: 'Faltan datos requeridos (id_usuario, evento)'
            });
        }

        // Crear reserva con todos los datos
        const result = await reservaModel.createReserva({
            id_usuario,
            evento,
            proveedores: sendProveedores,
            cedulaReservacion: cedulaReservacion || '',
            numeroInvitados: numeroInvitados || 0,
            invitados: invitados || [],
            subtotal: sendSubtotal,
            iva: sendIva,
            total: sendTotal,
            pago: req.body.pago || {},
            metodo_pago_factura: req.body.metodo_pago_factura || null,
            numero_comprobante: req.body.numero_comprobante || null,
            transactionId: req.body.transactionId || req.body.transaction_id || null,
            numero_autorizacion: req.body.numero_autorizacion || req.body.numeroAutorizacion || null
        });

        res.status(201).json({
            message: 'Reservación creada exitosamente',
            data: result
        });

    } catch (error) {
        console.error('Error al crear reservación:', error);
        const status = error.status || (error.code === 'PROVIDER_OVERLAP' ? 409 : 500);
        res.status(status).json({ error: error.message });
    }
};

// Legacy: Mantener método criarReserva por compatibilidad
const ReservaController = {
    /**
     * POST /api/reservas (legacy)
     * Crear nueva reserva con evento y proveedores
     */
    crearReserva: async(req, res) => {
        try {
            try {
                console.log('Received POST /reservas body (server):', JSON.stringify(req.body));
            } catch (e) {
                console.log('Received POST /reservas body: <unserializable payload>');
            }
            const {
                nombreEvento,
                tipoEvento,
                descripcion,
                fechaInicio,
                fechaFin,
                precioBase,
                hayPlaylist,
                playlist,
                proveedores,
                numeroInvitados,
                numero_invitados,
                subtotal,
                iva,
                total,
                cedulaReservacion,
                cedula_reservacion,
                idCategoria,
                id_categoria
            } = req.body;

            // Obtener usuario del token JWT
            const idUsuario = (req.user && req.user.id) || (req.user && req.user.id_usuario);
            const rol = (req.user && (req.user.rol || req.user.role || req.user.tipo || req.user.nombre_rol)) || '';
            const creadoPor = String(rol).toLowerCase().includes('admin') ? 'Administrador' : 'Usuario';

            // Validaciones
            if (!nombreEvento || !tipoEvento || !fechaInicio || !fechaFin) {
                return res.status(400).json({
                    message: 'nombreEvento, tipoEvento, fechaInicio y fechaFin son requeridos'
                });
            }

            if (!Array.isArray(proveedores) || proveedores.length === 0) {
                return res.status(400).json({
                    message: 'Debe seleccionar al menos un proveedor'
                });
            }

            // Detectar subtotal/total enviados por frontend (acepta strings numéricas)
            const frontendSentSubtotal = (typeof req.body.subtotal === 'number' && !isNaN(req.body.subtotal)) ||
                (typeof req.body.subtotal === 'string' && !isNaN(Number(req.body.subtotal)));

            let sendProveedores = proveedores || [];
            let sendSubtotal = subtotal || 0;
            let sendIva = iva || 0;
            let sendTotal = total || 0;

            if (frontendSentSubtotal) {
                const subtotalVal = Number(req.body.subtotal);
                const impuestos = (typeof req.body.iva === 'number' && !isNaN(req.body.iva)) ?
                    Number(req.body.iva) :
                    Number((subtotalVal * 0.15).toFixed(2));
                const totalVal = (typeof req.body.total === 'number' && !isNaN(req.body.total)) ?
                    Number(req.body.total) :
                    Number((subtotalVal + impuestos).toFixed(2));

                sendProveedores = (proveedores || []).map(p => {
                    const copy = Object.assign({}, p);
                    if (copy.precio_calculado != null) copy._precio_calculado = Number(copy.precio_calculado);
                    else if (copy.precioCalculado != null) copy._precio_calculado = Number(copy.precioCalculado);
                    else copy._precio_calculado = null;
                    return copy;
                });

                console.log('Using frontend totals to insert ->', { subtotal: subtotalVal, impuestos, total: totalVal });
                console.log('Provider prices (from payload or null = compute):', sendProveedores.map(p => ({ id: p.id_proveedor, precio: p._precio_calculado })));

                sendSubtotal = subtotalVal;
                sendIva = impuestos;
                sendTotal = totalVal;
            }

            // Crear reserva con transacción
            const datosParaCreacion = {
                nombreEvento: nombreEvento,
                tipoEvento: tipoEvento,
                descripcion: descripcion,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                precioBase: sendSubtotal || precioBase || 0,
                hayPlaylist: hayPlaylist,
                playlist: playlist,
                idUsuario: idUsuario,
                idPlan: req.body.id_plan || 1,
                proveedores: sendProveedores,
                numeroInvitados: numeroInvitados,
                numero_invitados: numero_invitados,
                invitados: req.body.invitados || [],
                subtotal: sendSubtotal,
                iva: sendIva,
                total: sendTotal,
                cedulaReservacion,
                cedula_reservacion,
                creadoPor,
                idCategoria,
                id_categoria,
                // Datos de pago y factura
                pago: req.body.pago || {},
                metodo_pago_factura: req.body.metodo_pago_factura || null,
                numero_comprobante: req.body.numero_comprobante || null,
                transactionId: req.body.transactionId || req.body.transaction_id || null,
                numero_autorizacion: req.body.numero_autorizacion || req.body.numeroAutorizacion || null
            };

            console.log('🔍 [Controller] Datos que se pasarán a Reserva.create():', {
                nombreEvento: datosParaCreacion.nombreEvento,
                invitadosCount: datosParaCreacion.invitados?.length || 0,
                invitadosPrimerElemento: datosParaCreacion.invitados?.[0] || null,
                proveedoresCount: datosParaCreacion.proveedores?.length || 0
            });

            const resultado = await reservaModel.create(datosParaCreacion);

            res.status(201).json({
                message: 'Reserva creada exitosamente',
                id_reservacion: resultado.id_reservacion,
                id_evento: resultado.id_evento,
                total: resultado.total,
                evento: resultado.evento
            });
        } catch (error) {
            console.error('Error en ReservaController.crearReserva:', error);
            const status = error.status || (error.code === 'PROVIDER_OVERLAP' ? 409 : 500);
            res.status(status).json({
                message: status === 409 ? 'Proveedor solapa en el periodo solicitado' : 'Error al crear la reserva',
                error: error.message
            });
        }
    },

    /**
     * GET /api/reservas/:id
     * Obtener reserva por ID
     */
    getReservaById: async(req, res) => {
        try {
            const { id } = req.params;
            const reserva = await reservaModel.findById(id);

            if (!reserva) {
                return res.status(404).json({
                    message: 'Reservación no encontrada'
                });
            }

            res.status(200).json(reserva);
        } catch (error) {
            console.error('Error en ReservaController.getReservaById:', error);
            res.status(500).json({
                message: 'Error al obtener reservación',
                error: error.message
            });
        }
    },

    /**
     * GET /api/reservas/usuario/:idUsuario
     * Obtener reservas de un usuario específico
     */
    getReservasByUsuario: async(req, res) => {
        try {
            const { idUsuario } = req.params;
            const reservas = await reservaModel.findByUsuario(idUsuario);

            res.status(200).json(reservas);
        } catch (error) {
            console.error('Error en ReservaController.getReservasByUsuario:', error);
            res.status(500).json({
                message: 'Error al obtener reservaciones del usuario',
                error: error.message
            });
        }
    },

    /**
     * GET /api/reservas
     * Obtener todas las reservas (admin)
     */
    getAllReservas: async(req, res) => {
        try {
            const reservas = await reservaModel.findAll();
            res.status(200).json(reservas);
        } catch (error) {
            console.error('Error en ReservaController.getAllReservas:', error);
            res.status(500).json({
                message: 'Error al obtener reservaciones',
                error: error.message
            });
        }
    },

    /**
     * PATCH /api/reservas/:id/estado
     * Actualizar estado de una reservación
     */
    updateEstadoReserva: async(req, res) => {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (!estado) {
                return res.status(400).json({
                    message: 'El estado es requerido'
                });
            }

            const estadosValidos = ['pendiente', 'confirmado', 'completado', 'cancelado'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({
                    message: `Estado inválido. Valores válidos: ${estadosValidos.join(', ')}`
                });
            }

            const reservaActualizada = await reservaModel.updateEstado(id, estado);

            if (!reservaActualizada) {
                return res.status(404).json({
                    message: 'Reservación no encontrada'
                });
            }

            res.status(200).json({
                message: 'Estado actualizado exitosamente',
                data: reservaActualizada
            });
        } catch (error) {
            console.error('Error en ReservaController.updateEstadoReserva:', error);
            const status = error.message.includes('no tiene columnas de estado') ? 501 : 500;
            res.status(status).json({
                message: 'No se puede actualizar el estado con el esquema actual',
                error: error.message
            });
        }
    },

    /**
     * DELETE /api/reservas/:id
     * Eliminar una reservación
     */
    deleteReserva: async(req, res) => {
        try {
            const { id } = req.params;
            const reservaEliminada = await reservaModel.delete(id);

            if (!reservaEliminada) {
                return res.status(404).json({
                    message: 'Reservación no encontrada'
                });
            }

            res.status(200).json({
                message: 'Reservación eliminada exitosamente'
            });
        } catch (error) {
            console.error('Error en ReservaController.deleteReserva:', error);
            res.status(500).json({
                message: 'Error al eliminar reservación',
                error: error.message
            });
        }
    }
};

module.exports = {
    ...ReservaController,
    createReserva: exports.createReserva
};