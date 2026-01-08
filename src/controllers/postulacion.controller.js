const postulacionModel = require('../models/postulacion.models');
const cloudinaryConfig = require('../config/cloudinary.config');

exports.getCvSigned = async(req, res) => {
    try {
        const id = req.params.id;
        if (!id) return res.status(400).json({ error: 'id required' });
        const row = await postulacionModel.findTrabajadorById(id);
        if (!row) return res.status(404).json({ error: 'not found' });

        let meta = null;
        if (row.cv_postu_trabajador) {
            try {
                meta = JSON.parse(row.cv_postu_trabajador);
            } catch (e) {
                // if it's a plain URL string
                meta = { url: row.cv_postu_trabajador };
            }
        }

        if (!meta || !meta.public_id) {
            // If no public_id, but have url and it's publicly accessible, return it
            if (meta && meta.url) return res.json({ signedUrl: meta.url });
            return res.status(404).json({ error: 'no asset metadata' });
        }

        const cloud = cloudinaryConfig.cloudinary || cloudinaryConfig;
        const resourceType = meta.resource_type || 'raw';
        const signedUrl = cloud.url(meta.public_id, { sign_url: true, resource_type: resourceType });
        return res.json({ signedUrl });
    } catch (err) {
        console.error('[postulacion.controller] getCvSigned error', err);
        res.status(500).json({ error: 'internal' });
    }
};

/**
 * POST /api/postulaciones/proveedores
 * Registra una postulación de proveedor
 */
exports.crearProveedor = async(req, res) => {
    try {
        const {
            categoria,
            nombreEmpresa,
            correo,
            portafolio,
            portafolioLink
        } = req.body;

        // Validaciones básicas
        if (!categoria || !nombreEmpresa || !correo || !portafolio) {
            return res.status(400).json({
                error: 'Faltan campos requeridos: categoria, nombreEmpresa, correo, portafolio'
            });
        }

        let portafolioUrl = null;
        let portafolioMeta = null;

        // Si hay archivo, subirlo a Cloudinary
        if (req.file) {
            console.log('[postulacion.controller] Archivo recibido en proveedor:', {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                hasBuffer: !!req.file.buffer
            });

            try {
                const isPDF = req.file.mimetype === 'application/pdf';
                let result;
                if (isPDF && cloudinaryConfig.uploadFileBuffer) {
                    result = await cloudinaryConfig.uploadFileBuffer(
                        req.file.buffer,
                        'eclat/postulaciones/proveedores',
                        req.file.originalname
                    );
                } else {
                    result = await cloudinaryConfig.uploadImageBuffer(
                        req.file.buffer,
                        'eclat/postulaciones/proveedores'
                    );
                }
                portafolioUrl = result.url;
                portafolioMeta = { url: result.url, public_id: result.publicId || result.public_id, resource_type: result.resourceType || result.resource_type || (isPDF ? 'raw' : 'image') };
                console.log('[postulacion.controller] Archivo subido a Cloudinary:', portafolioMeta);
            } catch (cloudinaryError) {
                console.error('[postulacion.controller] Error al subir a Cloudinary:', cloudinaryError);
                return res.status(500).json({
                    error: 'Error al subir archivo a Cloudinary',
                    details: cloudinaryError.message
                });
            }
        }

        const data = {
            categoria_postu_proveedor: categoria,
            nom_empresa_postu_proveedor: nombreEmpresa,
            correo_postu_proveedor: correo,
            portafolio_postu_proveedor: portafolio,
            portafolio_link_postu_proveedor: portafolioLink || null,
            portafolio_file_postu_proveedor: portafolioMeta ? JSON.stringify(portafolioMeta) : portafolioUrl
        };

        console.log('[postulacion.controller] Datos a guardar en BD:', data);

        const result = await postulacionModel.createProveedor(data);

        console.log('[postulacion.controller] ✅ Proveedor guardado:', {
            id: result.id_postu_proveedor,
            portafolio_file: result.portafolio_file_postu_proveedor
        });

        res.status(201).json({
            message: 'Postulación de proveedor registrada exitosamente',
            data: result
        });
    } catch (error) {
        console.error('[postulacion.controller] crearProveedor error:', error);

        // Error de duplicado (unique constraint)
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Ya existe una postulación con este correo electrónico'
            });
        }

        res.status(500).json({
            error: 'No se pudo registrar la postulación de proveedor',
            details: error.message
        });
    }
};

/**
 * POST /api/postulaciones/trabajadores
 * Registra una postulación de trabajador
 */
exports.crearTrabajador = async(req, res) => {
    try {
        const {
            cedula,
            nombre1,
            nombre2,
            apellido1,
            apellido2,
            fechaNacimiento,
            correo,
            telefono
        } = req.body;

        // Validaciones básicas
        if (!cedula || !nombre1 || !apellido1 || !fechaNacimiento || !correo || !telefono) {
            return res.status(400).json({
                error: 'Faltan campos requeridos: cedula, nombre1, apellido1, fechaNacimiento, correo, telefono'
            });
        }

        let cvUrl = null;
        let cvMeta = null;

        // Si hay archivo, subirlo a Cloudinary
        if (req.file) {
            console.log('[postulacion.controller] Archivo recibido en trabajador:', {
                fieldname: req.file.fieldname,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                hasBuffer: !!req.file.buffer
            });

            try {
                const isPDF = req.file.mimetype === 'application/pdf';
                let result;
                if (isPDF && cloudinaryConfig.uploadFileBuffer) {
                    result = await cloudinaryConfig.uploadFileBuffer(
                        req.file.buffer,
                        'eclat/postulaciones/trabajadores',
                        req.file.originalname
                    );
                } else {
                    result = await cloudinaryConfig.uploadImageBuffer(
                        req.file.buffer,
                        'eclat/postulaciones/trabajadores'
                    );
                }
                cvUrl = result.url;
                cvMeta = { url: result.url, public_id: result.publicId || result.public_id, resource_type: result.resourceType || result.resource_type || (isPDF ? 'raw' : 'image') };
                console.log('[postulacion.controller] Archivo subido a Cloudinary:', cvMeta);
            } catch (cloudinaryError) {
                console.error('[postulacion.controller] Error al subir a Cloudinary:', cloudinaryError);
                return res.status(500).json({
                    error: 'Error al subir archivo a Cloudinary',
                    details: cloudinaryError.message
                });
            }
        }

        const data = {
            cedula_postu_trabajador: cedula,
            nombre1_postu_trabajador: nombre1,
            nombre2_postu_trabajador: nombre2 || null,
            apellido1_postu_trabajador: apellido1,
            apellido2_postu_trabajador: apellido2 || null,
            fecha_naci_postu_trabajador: fechaNacimiento,
            correo_postu_trabajador: correo,
            telefono_postu_trabajador: telefono,
            cv_postu_trabajador: cvMeta ? JSON.stringify(cvMeta) : cvUrl
        };

        console.log('[postulacion.controller] Datos a guardar en BD:', data);

        const result = await postulacionModel.createTrabajador(data);

        console.log('[postulacion.controller] ✅ Trabajador guardado:', {
            id: result.id_postu_trabajador,
            cv: result.cv_postu_trabajador
        });

        res.status(201).json({
            message: 'Postulación de trabajador registrada exitosamente',
            data: result
        });
    } catch (error) {
        console.error('[postulacion.controller] crearTrabajador error:', error);

        // Error de duplicado (unique constraint)
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Ya existe una postulación con esta cédula o correo electrónico'
            });
        }

        res.status(500).json({
            error: 'No se pudo registrar la postulación de trabajador',
            details: error.message
        });
    }
};