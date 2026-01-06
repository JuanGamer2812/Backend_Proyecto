/**
 * Servicio de Invitaciones adaptado al schema del dump
 * - No usa la tabla 'invitacion'
 * - Genera códigos en Node
 * - Guarda metadata de la invitación en `invitado.notas` (JSON string)
 */

const pool = require('../config/db');
const emailService = require('./email.service');
const crypto = require('crypto');

class InvitacionService {
    _generarCodigoUnico() {
        return crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    }

    async crearInvitacion(eventoId, invitadoData) {
        try {
            const { nombre_invitado, email, telefono, numero_acompanantes, mensaje_personalizado, categoria, restricciones_alimentarias } = invitadoData;

            const codigo = this._generarCodigoUnico();

            const metadata = {
                codigo_unico: codigo,
                mensaje_personalizado: mensaje_personalizado || null,
                categoria: categoria || null,
                restricciones_alimentarias: restricciones_alimentarias || null,
                estado: 'pendiente',
                creado_en: new Date().toISOString(),
                acompanantes_confirmados: 0,
                enviado: false
            };

            const result = await pool.query(
                `INSERT INTO invitado (id_evento, nombre, email, telefono, notas, acompanantes)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id_invitado`, [eventoId, nombre_invitado, email, telefono || null, JSON.stringify(metadata), numero_acompanantes || 0]
            );

            const idInvitado = result.rows[0].id_invitado;
            console.log(`✅ Invitado creado (sin tabla invitacion): ${idInvitado} - ${nombre_invitado}`);

            return {
                id_invitado: idInvitado,
                codigo_unico: codigo
            };
        } catch (error) {
            console.error('❌ Error al crear invitación (invitado):', error);
            throw error;
        }
    }

    async crearInvitacionesMasivas(eventoId, invitados) {
        const client = await pool.connect();
        const resultados = [];

        try {
            await client.query('BEGIN');

            for (const inv of invitados) {
                const codigo = this._generarCodigoUnico();
                const metadata = {
                    codigo_unico: codigo,
                    mensaje_personalizado: inv.mensaje_personalizado || null,
                    categoria: inv.categoria || null,
                    restricciones_alimentarias: inv.restricciones_alimentarias || null,
                    estado: 'pendiente',
                    creado_en: new Date().toISOString(),
                    acompanantes_confirmados: 0,
                    enviado: false
                };

                const res = await client.query(
                    `INSERT INTO invitado (id_evento, nombre, email, telefono, notas, acompanantes)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id_invitado`, [eventoId, inv.nombre_invitado, inv.email, inv.telefono || null, JSON.stringify(metadata), inv.numero_acompanantes || 0]
                );

                const idInvitado = res.rows[0].id_invitado;

                resultados.push({
                    id_invitado: idInvitado,
                    codigo_unico: codigo,
                    nombre_invitado: inv.nombre_invitado,
                    email: inv.email
                });
            }

            await client.query('COMMIT');
            console.log(`✅ ${resultados.length} invitaciones (invitado.notas) creadas masivamente`);
            return resultados;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error al crear invitaciones masivas (invitado):', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async enviarInvitacion(idInvitado) {
        try {
            const res = await pool.query(`SELECT i.*, e.nombre_evento, e.fecha_inicio_evento AS fecha_evento, e.descripcion_evento AS descripcion, (u.nombre_usuario || ' ' || u.apellido_usuario) AS organizador_nombre, u.correo_usuario AS organizador_email FROM invitado i LEFT JOIN evento e ON i.id_evento = e.id_evento LEFT JOIN usuario u ON e.id_usuario_creador = u.id_usuario WHERE i.id_invitado = $1`, [idInvitado]);

            if (res.rows.length === 0) throw new Error('Invitado no encontrado');

            const invitado = res.rows[0];
            let notas = {};
            try { notas = invitado.notas ? JSON.parse(invitado.notas) : {}; } catch (e) { notas = { raw: invitado.notas }; }

            const codigo = notas.codigo_unico || this._generarCodigoUnico();
            notas.codigo_unico = codigo;
            notas.enviado = true;
            notas.estado = notas.estado || 'enviada';

            // actualizar notas
            await pool.query('UPDATE invitado SET notas = $1 WHERE id_invitado = $2', [JSON.stringify(notas), idInvitado]);

            const rsvpUrl = `${process.env.FRONTEND_URL}/rsvp/${codigo}`;

            await emailService.sendInvitationEmail({
                nombre_invitado: invitado.nombre,
                email: invitado.email,
                nombre_evento: invitado.nombre_evento,
                fecha_evento: invitado.fecha_evento ? new Date(invitado.fecha_evento).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
                ubicacion: invitado.ubicacion,
                descripcion: invitado.descripcion,
                numero_acompanantes: invitado.acompanantes,
                mensaje_personalizado: notas.mensaje_personalizado,
                organizador_nombre: invitado.organizador_nombre,
                organizador_email: invitado.organizador_email,
                rsvp_url: rsvpUrl,
                codigo_invitacion: codigo
            });

            console.log(`✅ Invitación (invitado ${idInvitado}) enviada a ${invitado.email}`);
            return true;
        } catch (error) {
            console.error('❌ Error al enviar invitación (invitado):', error);
            throw error;
        }
    }

    async enviarInvitacionesMasivas(idInvitados) {
        const resultados = { exitosos: 0, fallidos: 0, errores: [] };

        for (const id of idInvitados) {
            try {
                await this.enviarInvitacion(id);
                resultados.exitosos++;
            } catch (err) {
                resultados.fallidos++;
                resultados.errores.push({ id_invitado: id, error: err.message });
            }
        }

        console.log(`📧 Envío masivo (invitado.notas): ${resultados.exitosos} exitosos, ${resultados.fallidos} fallidos`);
        return resultados;
    }

    async obtenerInvitacionesEvento(eventoId) {
        try {
            const res = await pool.query('SELECT i.*, u.nombre_usuario AS organizador_nombre FROM invitado i LEFT JOIN evento e ON i.id_evento = e.id_evento LEFT JOIN usuario u ON e.id_usuario_creador = u.id_usuario WHERE i.id_evento = $1', [eventoId]);
            return res.rows.map(row => {
                let notas = {};
                try { notas = row.notas ? JSON.parse(row.notas) : {}; } catch (e) { notas = { raw: row.notas }; }
                return Object.assign({}, row, { notas });
            });
        } catch (error) {
            console.error('❌ Error al obtener invitados como invitaciones:', error);
            throw error;
        }
    }

    async obtenerInvitacionPorCodigo(codigo) {
        try {
            const res = await pool.query('SELECT i.*, e.nombre_evento, e.descripcion_evento, e.fecha_inicio_evento AS fecha_evento, (u.nombre_usuario || ' + "' '" + ' || u.apellido_usuario) AS organizador_nombre, u.correo_usuario AS organizador_email FROM invitado i LEFT JOIN evento e ON i.id_evento = e.id_evento LEFT JOIN usuario u ON e.id_usuario_creador = u.id_usuario WHERE i.notas::text LIKE $1', ['%' + codigo + '%']);

            if (res.rows.length === 0) return null;

            const row = res.rows[0];
            let notas = {};
            try { notas = row.notas ? JSON.parse(row.notas) : {}; } catch (e) { notas = { raw: row.notas }; }

            return Object.assign({}, row, { notas });
        } catch (error) {
            console.error('❌ Error al obtener invitación por código (invitado):', error);
            throw error;
        }
    }

    async confirmarAsistencia(codigo, datosConfirmacion, ipAddress, userAgent) {
        try {
            const { acompanantes_confirmados, restricciones_alimentarias } = datosConfirmacion;
            const invitacion = await this.obtenerInvitacionPorCodigo(codigo);
            if (!invitacion) throw new Error('Invitación no encontrada');

            let notas = invitacion.notas || {};
            notas.acompanantes_confirmados = acompanantes_confirmados || 0;
            if (restricciones_alimentarias) notas.restricciones_alimentarias = restricciones_alimentarias;
            notas.estado = 'confirmado';
            notas.confirmado_en = new Date().toISOString();
            notas.ip = ipAddress || null;
            notas.userAgent = userAgent || null;

            await pool.query('UPDATE invitado SET notas = $1 WHERE id_invitado = $2', [JSON.stringify(notas), invitacion.id_invitado]);

            // enviar email de confirmación
            await emailService.sendRSVPConfirmationEmail({
                nombre_invitado: invitacion.nombre,
                email: invitacion.email,
                nombre_evento: invitacion.nombre_evento,
                fecha_evento: invitacion.fecha_evento ? new Date(invitacion.fecha_evento).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
                ubicacion: invitacion.ubicacion,
                acompanantes_confirmados: acompanantes_confirmados || 0,
                restricciones_alimentarias: notas.restricciones_alimentarias || 'Ninguna'
            });

            console.log(`✅ Asistencia confirmada para código ${codigo}`);
            return true;
        } catch (error) {
            console.error('❌ Error al confirmar asistencia (invitado):', error);
            throw error;
        }
    }

    async rechazarInvitacion(codigo) {
        try {
            const invitacion = await this.obtenerInvitacionPorCodigo(codigo);
            if (!invitacion) throw new Error('Invitación no encontrada');

            let notas = invitacion.notas || {};
            notas.estado = 'rechazado';
            notas.rechazado_en = new Date().toISOString();

            await pool.query('UPDATE invitado SET notas = $1 WHERE id_invitado = $2', [JSON.stringify(notas), invitacion.id_invitado]);

            await emailService.sendRSVPDeclinedEmail({
                nombre_invitado: invitacion.nombre,
                email: invitacion.email,
                nombre_evento: invitacion.nombre_evento
            });

            console.log(`✅ Invitación rechazada: ${codigo}`);
            return true;
        } catch (error) {
            console.error('❌ Error al rechazar invitación (invitado):', error);
            throw error;
        }
    }

    async actualizarInvitacion(idInvitado, datos) {
        try {
            const campos = [];
            const valores = [];
            let idx = 1;

            if (datos.nombre_invitado !== undefined) { campos.push(`nombre = $${idx++}`);
                valores.push(datos.nombre_invitado); }
            if (datos.email !== undefined) { campos.push(`email = $${idx++}`);
                valores.push(datos.email); }
            if (datos.telefono !== undefined) { campos.push(`telefono = $${idx++}`);
                valores.push(datos.telefono); }
            if (datos.numero_acompanantes !== undefined) { campos.push(`acompanantes = $${idx++}`);
                valores.push(datos.numero_acompanantes); }

            // manejar notas -> merge
            let notas = null;
            if (datos.notas !== undefined) {
                try { notas = JSON.stringify(datos.notas); } catch (e) { notas = datos.notas; }
                campos.push(`notas = $${idx++}`);
                valores.push(notas);
            }

            if (campos.length === 0) throw new Error('No hay campos para actualizar');

            valores.push(idInvitado);
            const q = `UPDATE invitado SET ${campos.join(', ')} WHERE id_invitado = $${idx} RETURNING id_invitado`;
            const res = await pool.query(q, valores);
            if (res.rowCount === 0) throw new Error('Invitado no encontrado');

            console.log(`✅ Invitado actualizado: ${idInvitado}`);
            return true;
        } catch (error) {
            console.error('❌ Error al actualizar invitación (invitado):', error);
            throw error;
        }
    }

    async eliminarInvitacion(idInvitado) {
        try {
            const res = await pool.query('SELECT notas FROM invitado WHERE id_invitado = $1', [idInvitado]);
            if (res.rows.length === 0) throw new Error('Invitado no encontrado');

            let notas = {};
            try { notas = res.rows[0].notas ? JSON.parse(res.rows[0].notas) : {}; } catch (e) { notas = {}; }
            notas.estado = 'cancelado';
            notas.cancelado_en = new Date().toISOString();
            delete notas.codigo_unico;

            await pool.query('UPDATE invitado SET notas = $1 WHERE id_invitado = $2', [JSON.stringify(notas), idInvitado]);

            console.log(`✅ Invitación marcada como cancelada para invitado ${idInvitado}`);
            return true;
        } catch (error) {
            console.error('❌ Error al eliminar invitación (invitado):', error);
            throw error;
        }
    }

    async obtenerEstadisticas(eventoId) {
        try {
            const res = await pool.query('SELECT notas FROM invitado WHERE id_evento = $1', [eventoId]);
            const stats = { total_invitados: 0, pendientes: 0, confirmados: 0, rechazados: 0, cancelados: 0, invitaciones_enviadas: 0, asistentes_confirmados: 0, porcentaje_confirmacion: 0 };

            for (const r of res.rows) {
                stats.total_invitados++;
                let notas = {};
                try { notas = r.notas ? JSON.parse(r.notas) : {}; } catch (e) { notas = {}; }
                const estado = notas.estado || 'pendiente';
                if (estado === 'pendiente') stats.pendientes++;
                if (estado === 'confirmado') { stats.confirmados++;
                    stats.asistentes_confirmados += (notas.acompanantes_confirmados || 0); }
                if (estado === 'rechazado') stats.rechazados++;
                if (estado === 'cancelado') stats.cancelados++;
                if (notas.enviado) stats.invitaciones_enviadas++;
            }

            stats.porcentaje_confirmacion = stats.total_invitados === 0 ? 0 : Math.round(10000 * (stats.confirmados / stats.total_invitados)) / 100;
            return stats;
        } catch (error) {
            console.error('❌ Error al obtener estadísticas (invitado):', error);
            throw error;
        }
    }

    async obtenerPorCategoria(eventoId) {
        try {
            const res = await pool.query('SELECT notas FROM invitado WHERE id_evento = $1', [eventoId]);
            const counts = {};
            for (const r of res.rows) {
                let notas = {};
                try { notas = r.notas ? JSON.parse(r.notas) : {}; } catch (e) { notas = {}; }
                const cat = notas.categoria || 'sin_categoria';
                counts[cat] = (counts[cat] || 0) + 1;
            }
            return Object.keys(counts).map(cat => ({ categoria: cat, total: counts[cat] }));
        } catch (error) {
            console.error('❌ Error al obtener por categoría (invitado):', error);
            throw error;
        }
    }
}

module.exports = new InvitacionService();