const { executeTransaction, lockRow } = require('../utils/transaction.util');
const db = require('../config/db');

/**
 * Crear un evento completo con todos sus servicios en una transacción
 * Si alguna parte falla, se revierte todo
 */
exports.createEventoCompleto = async (eventoData) => {
    return await executeTransaction(async (client) => {
        // 1. Insertar el evento principal
        const eventoResult = await client.query(
            `INSERT INTO evento (
                nombre_evento, tipo_evento, descripcion, fecha_inicio, fecha_fin,
                precio_evento, hay_playlist, playlist, id_categoria, version,
                ultima_modificacion, modificado_por
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, NOW(), $10)
            RETURNING id_evento`,
            [
                eventoData.nombre_evento,
                eventoData.tipo_evento,
                eventoData.descripcion,
                eventoData.fecha_inicio,
                eventoData.fecha_fin,
                eventoData.precio_evento,
                eventoData.hay_playlist || false,
                eventoData.playlist || null,
                eventoData.id_categoria || null,
                eventoData.id_usuario
            ]
        );

        const id_evento = eventoResult.rows[0].id_evento;

        // 2. Insertar música si está habilitada
        if (eventoData.musica && eventoData.musica.enabled) {
            await client.query(
                `INSERT INTO musica (
                    id_evento, nombre, descripcion, precio, por_hora,
                    genero, estado, hora_inicio, hora_fin, imagen, plan
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    id_evento,
                    eventoData.musica.nombre,
                    eventoData.musica.descripcion,
                    eventoData.musica.precio,
                    eventoData.musica.por_hora || false,
                    eventoData.musica.genero,
                    eventoData.musica.estado || true,
                    eventoData.musica.hora_inicio,
                    eventoData.musica.hora_fin,
                    eventoData.musica.imagen || null,
                    eventoData.musica.plan
                ]
            );
        }

        // 3. Insertar catering si está habilitado
        if (eventoData.catering && eventoData.catering.enabled) {
            await client.query(
                `INSERT INTO catering (
                    id_evento, nombre, tipo_comida, descripcion,
                    menu, precio_pp, plan
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    id_evento,
                    eventoData.catering.nombre,
                    eventoData.catering.tipo_comida,
                    eventoData.catering.descripcion,
                    eventoData.catering.menu,
                    eventoData.catering.precio_pp,
                    eventoData.catering.plan
                ]
            );
        }

        // 4. Insertar decoración si está habilitada
        if (eventoData.decoracion && eventoData.decoracion.enabled) {
            await client.query(
                `INSERT INTO decoracion (
                    id_evento, nombre, nivel, tipo, descripcion, precio, plan
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    id_evento,
                    eventoData.decoracion.nombre,
                    eventoData.decoracion.nivel,
                    eventoData.decoracion.tipo,
                    eventoData.decoracion.descripcion,
                    eventoData.decoracion.precio,
                    eventoData.decoracion.plan
                ]
            );
        }

        // 5. Insertar lugar si está habilitado
        if (eventoData.lugar && eventoData.lugar.enabled) {
            await client.query(
                `INSERT INTO lugar (
                    id_evento, nombre, descripcion, direccion, capacidad, precio, plan
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    id_evento,
                    eventoData.lugar.nombre,
                    eventoData.lugar.descripcion,
                    eventoData.lugar.direccion,
                    eventoData.lugar.capacidad,
                    eventoData.lugar.precio,
                    eventoData.lugar.plan
                ]
            );
        }

        // 6. Retornar el evento completo
        const eventoCompleto = await client.query(
            'SELECT * FROM v_evento_unificado WHERE id_evento = $1',
            [id_evento]
        );

        return eventoCompleto.rows[0];
    });
};

/**
 * Actualizar un evento con control de concurrencia (Optimistic Locking)
 */
exports.updateEventoWithVersioning = async (id_evento, eventoData, expectedVersion) => {
    return await executeTransaction(async (client) => {
        // Bloquear la fila para evitar actualizaciones concurrentes
        const currentEvento = await lockRow(client, 'evento', id_evento);

        if (currentEvento.rows.length === 0) {
            throw new Error('Evento no encontrado');
        }

        const currentVersion = currentEvento.rows[0].version;

        // Verificar que la versión coincida (Optimistic Locking)
        if (currentVersion !== expectedVersion) {
            throw new Error(
                `Conflicto de concurrencia: El evento ha sido modificado por otro usuario. ` +
                `Versión esperada: ${expectedVersion}, Versión actual: ${currentVersion}`
            );
        }

        // Actualizar el evento (el trigger incrementará automáticamente la versión)
        const result = await client.query(
            `UPDATE evento 
             SET nombre_evento = $1, 
                 descripcion = $2, 
                 fecha_inicio = $3, 
                 fecha_fin = $4,
                 precio_evento = $5,
                 modificado_por = $6
             WHERE id_evento = $7 AND version = $8
             RETURNING *`,
            [
                eventoData.nombre_evento,
                eventoData.descripcion,
                eventoData.fecha_inicio,
                eventoData.fecha_fin,
                eventoData.precio_evento,
                eventoData.id_usuario,
                id_evento,
                expectedVersion
            ]
        );

        if (result.rows.length === 0) {
            throw new Error('No se pudo actualizar el evento. Posible conflicto de concurrencia.');
        }

        return result.rows[0];
    });
};

/**
 * Eliminar un evento y todos sus servicios asociados
 */
exports.deleteEventoCompleto = async (id_evento) => {
    return await executeTransaction(async (client) => {
        // Las eliminaciones en cascada se encargarán de los servicios
        // gracias a ON DELETE CASCADE en las FK
        
        const result = await client.query(
            'DELETE FROM evento WHERE id_evento = $1 RETURNING *',
            [id_evento]
        );

        if (result.rows.length === 0) {
            throw new Error('Evento no encontrado');
        }

        return {
            message: 'Evento y todos sus servicios eliminados exitosamente',
            evento: result.rows[0]
        };
    });
};

/**
 * Crear una reserva con pago
 */
exports.createReservaConPago = async (reservaData) => {
    return await executeTransaction(async (client) => {
        // 1. Crear la reserva
        const reservaResult = await client.query(
            `INSERT INTO reserva (
                id_usuario, id_evento, fecha_reserva, estado, precio_total
            ) VALUES ($1, $2, NOW(), 'pendiente', $3)
            RETURNING id_reserva`,
            [reservaData.id_usuario, reservaData.id_evento, reservaData.precio_total]
        );

        const id_reserva = reservaResult.rows[0].id_reserva;

        // 2. Crear el registro de pago
        const pagoResult = await client.query(
            `INSERT INTO pago (
                id_reserva, monto, metodo_pago, estado, fecha_pago
            ) VALUES ($1, $2, $3, 'procesando', NOW())
            RETURNING id_pago`,
            [id_reserva, reservaData.precio_total, reservaData.metodo_pago]
        );

        const id_pago = pagoResult.rows[0].id_pago;

        // 3. Aquí se llamaría a la pasarela de pago (Stripe, MercadoPago, etc.)
        // Por ahora, simulamos que el pago fue exitoso
        
        // 4. Actualizar estado de pago
        await client.query(
            `UPDATE pago SET estado = 'completado' WHERE id_pago = $1`,
            [id_pago]
        );

        // 5. Actualizar estado de reserva
        await client.query(
            `UPDATE reserva SET estado = 'confirmada' WHERE id_reserva = $1`,
            [id_reserva]
        );

        // 6. Generar factura
        await client.query(
            `INSERT INTO factura (
                id_reserva, numero_factura, fecha_emision, subtotal, iva, total
            ) VALUES ($1, $2, NOW(), $3, $4, $5)`,
            [
                id_reserva,
                `FAC-${Date.now()}`,
                reservaData.precio_total,
                reservaData.precio_total * 0.12, // IVA 12%
                reservaData.precio_total * 1.12
            ]
        );

        return {
            id_reserva,
            id_pago,
            mensaje: 'Reserva creada y pago procesado exitosamente'
        };
    });
};

/**
 * Importar invitados en masa para un evento
 */
exports.importarInvitados = async (id_evento, invitados) => {
    return await executeTransaction(async (client) => {
        const resultados = [];

        for (const invitado of invitados) {
            try {
                const result = await client.query(
                    `INSERT INTO invitado (
                        id_evento, nombre, email, telefono, cantidad_personas
                    ) VALUES ($1, $2, $3, $4, $5)
                    RETURNING id_invitado`,
                    [
                        id_evento,
                        invitado.nombre,
                        invitado.email || null,
                        invitado.telefono || null,
                        invitado.cantidad_personas || 1
                    ]
                );

                resultados.push({
                    exito: true,
                    invitado: invitado.nombre,
                    id: result.rows[0].id_invitado
                });
            } catch (error) {
                resultados.push({
                    exito: false,
                    invitado: invitado.nombre,
                    error: error.message
                });
            }
        }

        return {
            total: invitados.length,
            exitosos: resultados.filter(r => r.exito).length,
            fallidos: resultados.filter(r => !r.exito).length,
            detalles: resultados
        };
    });
};
