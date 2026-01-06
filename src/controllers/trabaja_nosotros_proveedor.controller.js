const service = require('../services/trabaja_nosotros_proveedor.service');
const path = require('path');

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

        // Procesar archivos
        const archivos = [];
        const archivosPaths = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileUrl = `/tmp_uploads/${file.filename}`;
                archivosPaths.push(fileUrl);
                archivos.push({
                    nombre: file.originalname,
                    tipo: file.mimetype,
                    tamanio: file.size,
                    url: fileUrl
                });
            }
        }

        // Preparar datos para insertar
        const dataToInsert = {
            categoria_postu_proveedor: categoria,
            nom_empresa_postu_proveedor: empresa,
            correo_postu_proveedor: email,
            portafolio_postu_proveedor: portafolio || null,
            archivos_paths: archivosPaths.length > 0 ? archivosPaths : null
        };

        const result = await service.createTrabajaNosotrosProveedor(dataToInsert);

        res.status(201).json({
            success: true,
            message: 'Solicitud enviada correctamente',
            id_postu_proveedor: result.id_postu_proveedor,
            data: {
                categoria: result.categoria_postu_proveedor,
                empresa: result.nom_empresa_postu_proveedor,
                email: result.correo_postu_proveedor,
                portafolio: result.portafolio_postu_proveedor,
                fecha: result.fecha_postu_proveedor
            },
            archivos: archivos
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