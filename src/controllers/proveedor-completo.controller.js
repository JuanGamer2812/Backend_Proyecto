const proveedorService = require('../services/proveedor-completo.service');
const emailService = require('../services/email.service');

/**
 * GET /api/proveedores
 * Obtiene todos los proveedores con filtros opcionales
 */
exports.getAll = async (req, res) => {
    try {
        const { estado, activo, tipo_empresa } = req.query;
        
        const filters = {};
        if (estado) filters.estado = estado;
        if (activo !== undefined) filters.activo = activo === 'true';
        if (tipo_empresa) filters.tipo_empresa = tipo_empresa;

        const proveedores = await proveedorService.getAllProveedores(filters);
        
        res.json({
            success: true,
            total: proveedores.length,
            proveedores
        });
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * GET /api/proveedores/pendientes
 * Obtiene proveedores pendientes de aprobación (solo admin)
 */
exports.getPendientes = async (req, res) => {
    try {
        const proveedores = await proveedorService.getProveedoresPendientes();
        
        res.json({
            success: true,
            total: proveedores.length,
            proveedores
        });
    } catch (error) {
        console.error('Error al obtener pendientes:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * GET /api/proveedores/top
 * Obtiene proveedores mejor calificados
 */
exports.getTop = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const proveedores = await proveedorService.getProveedoresTop(limit);
        
        res.json({
            success: true,
            proveedores
        });
    } catch (error) {
        console.error('Error al obtener top:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * GET /api/proveedores/:id
 * Obtiene un proveedor por ID
 */
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[proveedor-completo] getById llamado con id: ${id}`);
        
        const proveedor = await proveedorService.getProveedorById(id);
        console.log(`[proveedor-completo] Resultado de getProveedorById:`, proveedor ? 'encontrado' : 'no encontrado');

        if (!proveedor) {
            return res.status(404).json({
                error: 'No encontrado',
                message: 'Proveedor no encontrado'
            });
        }

        res.json({
            success: true,
            proveedor
        });
    } catch (error) {
        console.error('[proveedor-completo] Error detallado al obtener proveedor:', {
            id: req.params.id,
            errorMessage: error.message,
            errorStack: error.stack,
            errorCode: error.code
        });
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message,
            detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * POST /api/proveedores
 * Crea un nuevo proveedor (estado inicial: pendiente)
 */
exports.create = async (req, res) => {
    try {
        const proveedor = await proveedorService.createProveedor(req.body);

        res.status(201).json({
            success: true,
            message: 'Proveedor creado exitosamente. En espera de aprobación.',
            proveedor
        });
    } catch (error) {
        console.error('Error al crear proveedor:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * PUT /api/proveedores/:id
 * Actualiza un proveedor
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const proveedor = await proveedorService.updateProveedor(id, req.body);

        if (!proveedor) {
            return res.status(404).json({
                error: 'No encontrado',
                message: 'Proveedor no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Proveedor actualizado exitosamente',
            proveedor
        });
    } catch (error) {
        console.error('Error al actualizar proveedor:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * POST /api/proveedores/:id/aprobar
 * Aprueba un proveedor (solo admin)
 */
exports.aprobar = async (req, res) => {
    try {
        const { id } = req.params;
        const { mensaje } = req.body;
        const adminId = req.user.userId;

        const proveedor = await proveedorService.aprobarProveedor(id, adminId, mensaje);

        // Enviar email de aprobación (async)
        if (proveedor.email) {
            const emailContent = {
                to: proveedor.email,
                subject: '✅ Tu solicitud de proveedor ha sido aprobada - ÉCLAT',
                html: `
                    <h2>¡Felicitaciones ${proveedor.nombre_empresa}!</h2>
                    <p>Tu solicitud para ser proveedor en ÉCLAT ha sido <strong>aprobada</strong>.</p>
                    ${mensaje ? `<p><strong>Mensaje del equipo:</strong> ${mensaje}</p>` : ''}
                    <p>Ahora puedes empezar a ofrecer tus servicios en nuestra plataforma.</p>
                    <p><a href="${process.env.FRONTEND_URL}/proveedor">Ir a mi panel de proveedor</a></p>
                `
            };
            emailService.sendEmail(emailContent).catch(err => 
                console.error('Error al enviar email de aprobación:', err)
            );
        }

        res.json({
            success: true,
            message: 'Proveedor aprobado exitosamente',
            proveedor
        });
    } catch (error) {
        console.error('Error al aprobar proveedor:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * POST /api/proveedores/:id/rechazar
 * Rechaza un proveedor (solo admin)
 */
exports.rechazar = async (req, res) => {
    try {
        const { id } = req.params;
        const { razon } = req.body;
        const adminId = req.user.userId;

        if (!razon) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'La razón de rechazo es requerida'
            });
        }

        const proveedor = await proveedorService.rechazarProveedor(id, adminId, razon);

        // Enviar email de rechazo (async)
        if (proveedor.email) {
            const emailContent = {
                to: proveedor.email,
                subject: 'Actualización sobre tu solicitud de proveedor - ÉCLAT',
                html: `
                    <h2>Hola ${proveedor.nombre_empresa},</h2>
                    <p>Lamentamos informarte que tu solicitud para ser proveedor no ha sido aprobada en este momento.</p>
                    <p><strong>Razón:</strong> ${razon}</p>
                    <p>Puedes actualizar tu información y volver a aplicar.</p>
                    <p>Si tienes preguntas, no dudes en contactarnos.</p>
                `
            };
            emailService.sendEmail(emailContent).catch(err => 
                console.error('Error al enviar email de rechazo:', err)
            );
        }

        res.json({
            success: true,
            message: 'Proveedor rechazado',
            proveedor
        });
    } catch (error) {
        console.error('Error al rechazar proveedor:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * POST /api/proveedores/:id/suspender
 * Suspende un proveedor (solo admin)
 */
exports.suspender = async (req, res) => {
    try {
        const { id } = req.params;
        const { razon } = req.body;
        const adminId = req.user.userId;

        if (!razon) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'La razón de suspensión es requerida'
            });
        }

        const proveedor = await proveedorService.suspenderProveedor(id, adminId, razon);

        res.json({
            success: true,
            message: 'Proveedor suspendido',
            proveedor
        });
    } catch (error) {
        console.error('Error al suspender proveedor:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * GET /api/proveedores/:id/servicios
 * Obtiene servicios de un proveedor
 */
exports.getServicios = async (req, res) => {
    try {
        const { id } = req.params;
        const servicios = await proveedorService.getServiciosProveedor(id);

        res.json({
            success: true,
            total: servicios.length,
            servicios
        });
    } catch (error) {
        console.error('Error al obtener servicios:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * POST /api/proveedores/:id/servicios
 * Agrega un servicio al proveedor
 */
exports.addServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const servicioData = { ...req.body, id_proveedor: id };

        const servicio = await proveedorService.agregarServicio(servicioData);

        res.status(201).json({
            success: true,
            message: 'Servicio agregado exitosamente',
            servicio
        });
    } catch (error) {
        console.error('Error al agregar servicio:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * PUT /api/proveedores/servicios/:servicioId
 * Actualiza un servicio
 */
exports.updateServicio = async (req, res) => {
    try {
        const { servicioId } = req.params;
        const servicio = await proveedorService.updateServicio(servicioId, req.body);

        res.json({
            success: true,
            message: 'Servicio actualizado exitosamente',
            servicio
        });
    } catch (error) {
        console.error('Error al actualizar servicio:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * DELETE /api/proveedores/servicios/:servicioId
 * Elimina un servicio
 */
exports.deleteServicio = async (req, res) => {
    try {
        const { servicioId } = req.params;
        await proveedorService.deleteServicio(servicioId);

        res.json({
            success: true,
            message: 'Servicio eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar servicio:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

/**
 * GET /api/proveedores/buscar/servicio/:tipo
 * Busca proveedores por tipo de servicio
 */
exports.buscarPorServicio = async (req, res) => {
    try {
        const { tipo } = req.params;
        const proveedores = await proveedorService.getProveedoresPorServicio(tipo);

        res.json({
            success: true,
            total: proveedores.length,
            proveedores
        });
    } catch (error) {
        console.error('Error al buscar proveedores:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: error.message
        });
    }
};

module.exports = {
    getAll: exports.getAll,
    getPendientes: exports.getPendientes,
    getTop: exports.getTop,
    getById: exports.getById,
    create: exports.create,
    update: exports.update,
    aprobar: exports.aprobar,
    rechazar: exports.rechazar,
    suspender: exports.suspender,
    getServicios: exports.getServicios,
    addServicio: exports.addServicio,
    updateServicio: exports.updateServicio,
    deleteServicio: exports.deleteServicio,
    buscarPorServicio: exports.buscarPorServicio
};
