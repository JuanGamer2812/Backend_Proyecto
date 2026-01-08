const service = require('../services/trabaja_nosotros_proveedor.service');
const path = require('path');
const cloudinaryConfig = require('../config/cloudinary.config');
const { makeAbsoluteUrl } = require('../utils/url.util');
const fs = require('fs');

// Validaciones
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validateEmpresaName = (name) => {
    return name && name.length >= 3 && name.length <= 100;
};

const validateCategoria = (categoria) => {
    const categoriasValidas = [
        'catering',
        'fotografia',
        'musica',
        'decoracion',
        'transporte',
        'floristeria',
        'animacion'
    ];
    return categoriasValidas.includes(categoria);
};

// GET - Obtener todos
exports.getAll = async(req, res) => {
    try {
        const data = await service.getAllTrabajaNosotrosProveedor();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET - Obtener por ID
exports.getById = async(req, res) => {
    try {
        const { id } = req.params;
        const data = await service.getTrabajaNosotrosProveedorById(id);

        if (!data) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        // Si hay un CV almacenado en portafolio_file_postu_proveedor, parsearlo y exponer url absoluta
        try {
            if (data.portafolio_file_postu_proveedor) {
                try {
                    const parsed = JSON.parse(data.portafolio_file_postu_proveedor);
                    data.portafolio_file = {
                        url: makeAbsoluteUrl(parsed.url || parsed.url_imagen || parsed.secure_url || parsed.secureUrl),
                        public_id: parsed.public_id || parsed.publicId || null
                    };
                } catch (e) {
                    // Si no es JSON, asumir es una URL/relative path
                    data.portafolio_file = { url: makeAbsoluteUrl(data.portafolio_file_postu_proveedor) };
                }
            }
        } catch (err) {
            console.warn('[TRABaja][GET] error parsing portafolio_file_postu_proveedor', err);
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST - Crear nuevo con multipart/form-data
exports.create = async(req, res) => {
    try {
        const { categoria, empresa, email, portafolio } = req.body;

        // Validaciones
        if (!validateCategoria(categoria)) {
            return res.status(400).json({
                success: false,
                message: 'Categoría no válida'
            });
        }

        if (!validateEmpresaName(empresa)) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la empresa debe tener entre 3 y 100 caracteres'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email no válido'
            });
        }

        // Procesar archivos: subir PDFs (CV) a Cloudinary similar a flow de proveedor
        const archivos = [];
        const archivosPaths = [];
        let portafolio_file_postu_proveedor = null; // campo que guardaremos en DB (url o JSON)

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // Si es PDF (CV), subir a Cloudinary como raw y guardar URL + public_id
                try {
                    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
                        // Obtener buffer: multer diskStorage no provee `buffer`, leer desde disco si es necesario
                        let fileBuffer = file.buffer;
                        if (!fileBuffer) {
                            const filePath = file.path || path.join(__dirname, '../../tmp_uploads', file.filename);
                            try {
                                fileBuffer = await fs.promises.readFile(filePath);
                            } catch (rfErr) {
                                console.error('[TRABaja][CREATE] Error leyendo archivo desde disco:', rfErr);
                                throw rfErr;
                            }
                        }

                        const result = await cloudinaryConfig.uploadFileBuffer(
                            fileBuffer,
                            'eclat/postulantes/cv',
                            file.originalname
                        );
                        const fileMeta = {
                            nombre: file.originalname,
                            tipo: file.mimetype,
                            tamanio: file.size,
                            url: result.url,
                            public_id: result.publicId || result.public_id || null
                        };
                        archivos.push(fileMeta);
                        archivosPaths.push(result.url);
                        // Guardar el primer CV en el campo DB (string JSON con url + public_id)
                        if (!portafolio_file_postu_proveedor) {
                            try {
                                portafolio_file_postu_proveedor = JSON.stringify({ url: result.url, public_id: result.publicId || result.public_id || null });
                            } catch (e) {
                                portafolio_file_postu_proveedor = result.url;
                            }
                        }
                        continue;
                    }

                    // Para otros archivos, almacenar en tmp_uploads como antes
                    const fileUrl = `/tmp_uploads/${file.filename}`;
                    archivosPaths.push(fileUrl);
                    archivos.push({
                        nombre: file.originalname,
                        tipo: file.mimetype,
                        tamanio: file.size,
                        url: fileUrl
                    });
                } catch (uploadErr) {
                    console.error('[TRABaja][CREATE] Error subiendo archivo a Cloudinary:', uploadErr);
                    return res.status(500).json({ success: false, message: 'Error al subir archivo', error: uploadErr.message });
                }
            }
        }

        // Preparar datos para insertar (usar campo portafolio_file_postu_proveedor si existe)
        const dataToInsert = {
            categoria_postu_proveedor: categoria,
            nom_empresa_postu_proveedor: empresa,
            correo_postu_proveedor: email,
            portafolio_postu_proveedor: portafolio || null,
            portafolio_link_postu_proveedor: null,
            portafolio_file_postu_proveedor: portafolio_file_postu_proveedor || null
        };

        const result = await service.createTrabajaNosotrosProveedor(dataToInsert);

        // Preparar respuesta: incluir metadata de archivos y URL absoluta si corresponde
        const responseArchivos = archivos.map(a => ({...a, url: a.url && makeAbsoluteUrl(a.url) }));

        res.status(201).json({
            success: true,
            message: 'Solicitud enviada correctamente',
            id_postu_proveedor: result.id_postu_proveedor,
            data: {
                categoria: result.categoria_postu_proveedor,
                empresa: result.nom_empresa_postu_proveedor,
                email: result.correo_postu_proveedor,
                portafolio: result.portafolio_postu_proveedor,
                portafolio_file: result.portafolio_file_postu_proveedor ? (function() {
                    try { const v = JSON.parse(result.portafolio_file_postu_proveedor); return { url: makeAbsoluteUrl(v.url), public_id: v.public_id }; } catch (e) { return { url: makeAbsoluteUrl(result.portafolio_file_postu_proveedor) }; }
                })() : null,
                fecha: result.fecha_postu_proveedor
            },
            archivos: responseArchivos
        });

    } catch (err) {
        console.error('Error en trabaja_nosotros_proveedor.create:', err);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud',
            error: err.message
        });
    }
};

// PUT - Actualizar
exports.update = async(req, res) => {
    try {
        const { id } = req.params;
        const data = await service.updateTrabajaNosotrosProveedor(id, req.body);

        if (!data) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE - Eliminar
exports.delete = async(req, res) => {
    try {
        const { id } = req.params;
        const data = await service.deleteTrabajaNosotrosProveedor(id);

        if (!data) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }

        res.json({ message: 'Registro eliminado correctamente', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};