const pool = require('../config/db');

/**
 * Servicio completo de proveedores con sistema de aprobación
 */

/**
 * Obtiene todos los proveedores (con filtros opcionales)
 */
const getAllProveedores = async (filters = {}) => {
    try {
        let query = 'SELECT * FROM v_proveedores_completo WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (filters.estado) {
            query += ` AND estado_aprobacion = $${paramCount}`;
            params.push(filters.estado);
            paramCount++;
        }

        if (filters.activo !== undefined) {
            query += ` AND activo = $${paramCount}`;
            params.push(filters.activo);
            paramCount++;
        }

        if (filters.tipo_empresa) {
            query += ` AND tipo_empresa = $${paramCount}`;
            params.push(filters.tipo_empresa);
            paramCount++;
        }

        query += ' ORDER BY fecha_registro DESC';

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        throw error;
    }
};

/**
 * Obtiene proveedores pendientes de aprobación
 */
const getProveedoresPendientes = async () => {
    try {
        const result = await pool.query('SELECT * FROM v_proveedores_pendientes');
        return result.rows;
    } catch (error) {
        console.error('Error al obtener proveedores pendientes:', error);
        throw error;
    }
};

/**
 * Obtiene proveedores top (mejor calificados)
 */
const getProveedoresTop = async (limit = 10) => {
    try {
        const result = await pool.query(
            'SELECT * FROM v_proveedores_top LIMIT $1',
            [limit]
        );
        return result.rows;
    } catch (error) {
        console.error('Error al obtener proveedores top:', error);
        throw error;
    }
};

/**
 * Obtiene un proveedor por ID
 */
const getProveedorById = async (id) => {
    try {
        console.log(`[proveedor-completo.service] Consultando proveedor id: ${id}`);
        
        // Primero verificamos si la vista existe, si no usamos la tabla directamente
        let result;
        try {
            result = await pool.query(
                'SELECT * FROM v_proveedores_completo WHERE id_proveedor = $1',
                [id]
            );
        } catch (viewError) {
            console.warn('[proveedor-completo.service] Vista v_proveedores_completo no disponible, usando tabla proveedor:', viewError.message);
            // Fallback a la tabla proveedor directamente
            result = await pool.query(
                'SELECT * FROM proveedor WHERE id_proveedor = $1',
                [id]
            );
        }
        
        console.log(`[proveedor-completo.service] Resultado: ${result.rows.length} filas`);
        return result.rows[0];
    } catch (error) {
        console.error('[proveedor-completo.service] Error al obtener proveedor:', error);
        throw error;
    }
};

/**
 * Crea un nuevo proveedor (estado inicial: pendiente)
 */
const createProveedor = async (proveedorData) => {
    try {
        const {
            nombre_empresa,
            tipo_empresa,
            descripcion,
            email,
            telefono,
            direccion,
            ciudad,
            pais,
            sitio_web,
            redes_sociales
        } = proveedorData;

        const result = await pool.query(
            `INSERT INTO proveedor (
                nombre_empresa, tipo_empresa, descripcion, email, telefono,
                direccion, ciudad, pais, sitio_web, redes_sociales,
                estado_aprobacion, activo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente', true)
            RETURNING *`,
            [nombre_empresa, tipo_empresa, descripcion, email, telefono,
             direccion, ciudad, pais, sitio_web, redes_sociales]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error al crear proveedor:', error);
        throw error;
    }
};

/**
 * Actualiza un proveedor
 */
const updateProveedor = async (id, proveedorData) => {
    try {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(proveedorData).forEach(key => {
            if (proveedorData[key] !== undefined && key !== 'id_proveedor') {
                fields.push(`${key} = $${paramCount}`);
                values.push(proveedorData[key]);
                paramCount++;
            }
        });

        if (fields.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        values.push(id);
        const query = `UPDATE proveedor SET ${fields.join(', ')} WHERE id_proveedor = $${paramCount} RETURNING *`;

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error al actualizar proveedor:', error);
        throw error;
    }
};

/**
 * Aprueba un proveedor
 */
const aprobarProveedor = async (id, adminId, mensaje = null) => {
    try {
        await pool.query(
            'SELECT aprobar_proveedor($1, $2, $3)',
            [id, adminId, mensaje]
        );

        return await getProveedorById(id);
    } catch (error) {
        console.error('Error al aprobar proveedor:', error);
        throw error;
    }
};

/**
 * Rechaza un proveedor
 */
const rechazarProveedor = async (id, adminId, razon) => {
    try {
        await pool.query(
            'SELECT rechazar_proveedor($1, $2, $3)',
            [id, adminId, razon]
        );

        return await getProveedorById(id);
    } catch (error) {
        console.error('Error al rechazar proveedor:', error);
        throw error;
    }
};

/**
 * Suspende un proveedor
 */
const suspenderProveedor = async (id, adminId, razon) => {
    try {
        const result = await pool.query(
            `UPDATE proveedor 
             SET estado_aprobacion = 'suspendido',
                 activo = false,
                 razon_rechazo = $2,
                 aprobado_por = $3
             WHERE id_proveedor = $1
             RETURNING *`,
            [id, razon, adminId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error al suspender proveedor:', error);
        throw error;
    }
};

/**
 * Agrega un servicio a un proveedor
 */
const agregarServicio = async (servicioData) => {
    try {
        const {
            id_proveedor,
            tipo_servicio,
            nombre_servicio,
            descripcion,
            precio_base,
            precio_max,
            unidad_precio
        } = servicioData;

        const result = await pool.query(
            `INSERT INTO proveedor_servicio (
                id_proveedor, tipo_servicio, nombre_servicio, descripcion,
                precio_base, precio_max, unidad_precio
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [id_proveedor, tipo_servicio, nombre_servicio, descripcion,
             precio_base, precio_max, unidad_precio]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error al agregar servicio:', error);
        throw error;
    }
};

/**
 * Obtiene servicios de un proveedor
 */
const getServiciosProveedor = async (proveedorId) => {
    try {
        const result = await pool.query(
            'SELECT * FROM proveedor_servicio WHERE id_proveedor = $1 ORDER BY fecha_creacion DESC',
            [proveedorId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error al obtener servicios:', error);
        throw error;
    }
};

/**
 * Actualiza un servicio
 */
const updateServicio = async (servicioId, servicioData) => {
    try {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(servicioData).forEach(key => {
            if (servicioData[key] !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(servicioData[key]);
                paramCount++;
            }
        });

        values.push(servicioId);
        const query = `UPDATE proveedor_servicio SET ${fields.join(', ')} WHERE id_servicio = $${paramCount} RETURNING *`;

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error al actualizar servicio:', error);
        throw error;
    }
};

/**
 * Elimina un servicio
 */
const deleteServicio = async (servicioId) => {
    try {
        await pool.query(
            'DELETE FROM proveedor_servicio WHERE id_servicio = $1',
            [servicioId]
        );
        return true;
    } catch (error) {
        console.error('Error al eliminar servicio:', error);
        throw error;
    }
};

/**
 * Obtiene proveedores por tipo de servicio
 */
const getProveedoresPorServicio = async (tipoServicio) => {
    try {
        const result = await pool.query(
            'SELECT * FROM obtener_proveedores_por_servicio($1)',
            [tipoServicio]
        );
        return result.rows;
    } catch (error) {
        console.error('Error al obtener proveedores por servicio:', error);
        throw error;
    }
};

/**
 * Agrega un documento al proveedor
 */
const agregarDocumento = async (documentoData) => {
    try {
        const { id_proveedor, tipo_documento, nombre_archivo, url_documento } = documentoData;

        const result = await pool.query(
            `INSERT INTO proveedor_documento (id_proveedor, tipo_documento, nombre_archivo, url_documento)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id_proveedor, tipo_documento, nombre_archivo, url_documento]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error al agregar documento:', error);
        throw error;
    }
};

/**
 * Obtiene documentos de un proveedor
 */
const getDocumentosProveedor = async (proveedorId) => {
    try {
        const result = await pool.query(
            'SELECT * FROM proveedor_documento WHERE id_proveedor = $1 ORDER BY fecha_carga DESC',
            [proveedorId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error al obtener documentos:', error);
        throw error;
    }
};

module.exports = {
    getAllProveedores,
    getProveedoresPendientes,
    getProveedoresTop,
    getProveedorById,
    createProveedor,
    updateProveedor,
    aprobarProveedor,
    rechazarProveedor,
    suspenderProveedor,
    agregarServicio,
    getServiciosProveedor,
    updateServicio,
    deleteServicio,
    getProveedoresPorServicio,
    agregarDocumento,
    getDocumentosProveedor
};
