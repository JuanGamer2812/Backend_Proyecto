const model = require('../models/proveedor-imagen.models');
const proveedorModel = require('../models/proveedor.models');

/**
 * Controlador para gestión de imágenes de proveedores
 */

// GET - Obtener todas las imágenes de un proveedor
exports.getByProveedor = async(req, res) => {
    try {
        const { id_proveedor } = req.params;

        // Verificar que el proveedor existe
        const proveedor = await proveedorModel.findById(id_proveedor);
        if (!proveedor) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        const imagenes = await model.findByProveedor(id_proveedor);
        return res.status(200).json(imagenes || []);

    } catch (err) {
        console.error('Error en getByProveedor:', err);
        return res.status(500).json({ error: err.message || 'Error interno' });
    }
};

// GET - Obtener una imagen específica
exports.getById = async(req, res) => {
    try {
        const { id_imagen } = req.params;

        const imagen = await model.findById(id_imagen);
        if (!imagen) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        return res.status(200).json(imagen);

    } catch (err) {
        console.error('Error en getById:', err);
        return res.status(500).json({ error: err.message || 'Error interno' });
    }
};

// POST - Subir nuevas imágenes (archivos o URLs)
exports.create = async(req, res) => {
    try {
        const { id_proveedor } = req.body;

        if (!id_proveedor) {
            return res.status(400).json({ error: 'id_proveedor es requerido' });
        }

        // Procesar archivos subidos por multer
        const archivos = req.files || [];
        const imagenes = [];

        // Agregar archivos subidos
        for (const file of archivos) {
            imagenes.push({
                url_imagen: `/uploads/${file.filename}`,
                filename: file.filename
            });
        }

        // Agregar URLs del body
        let urls = req.body.urls || [];
        if (typeof urls === 'string') {
            urls = [urls];
        }

        if (Array.isArray(urls)) {
            for (const url of urls) {
                if (url && typeof url === 'string' && url.trim()) {
                    imagenes.push({
                        url_imagen: url.trim()
                    });
                }
            }
        }

        if (imagenes.length === 0) {
            return res.status(400).json({
                error: 'Debes proporcionar al menos una imagen (archivo o URL)'
            });
        }

        const imagenesInsertadas = await model.create(id_proveedor, imagenes);

        return res.status(201).json({
            mensaje: 'Imágenes subidas correctamente',
            imagenes: imagenesInsertadas,
            total: imagenesInsertadas.length
        });

    } catch (err) {
        console.error('Error en create:', err);

        if (err.message === 'Proveedor no encontrado') {
            return res.status(404).json({ error: err.message });
        }

        return res.status(500).json({
            error: 'Error interno al subir imágenes',
            detalle: err.message
        });
    }
};

// DELETE - Eliminar una imagen
exports.delete = async(req, res) => {
    try {
        const { id_imagen } = req.params;

        if (!id_imagen) {
            return res.status(400).json({ error: 'id_imagen es requerido' });
        }

        const imagenEliminada = await model.delete(id_imagen);

        return res.status(200).json({
            mensaje: 'Imagen eliminada correctamente',
            id_imagen: parseInt(id_imagen),
            id_proveedor: imagenEliminada.id_proveedor
        });

    } catch (err) {
        console.error('Error en delete:', err);

        if (err.message === 'Imagen no encontrada') {
            return res.status(404).json({ error: err.message });
        }

        return res.status(500).json({
            error: 'Error interno al eliminar imagen',
            detalle: err.message
        });
    }
};

// PUT - Actualizar datos de una imagen (url, es_principal, orden)
exports.update = async(req, res) => {
    try {
        const { id_imagen } = req.params;
        const data = req.body;

        if (!id_imagen) {
            return res.status(400).json({ error: 'id_imagen es requerido' });
        }

        const imagenActualizada = await model.update(id_imagen, data);

        return res.status(200).json({
            mensaje: 'Imagen actualizada correctamente',
            imagen: imagenActualizada
        });

    } catch (err) {
        console.error('Error en update:', err);

        if (err.message === 'Imagen no encontrada') {
            return res.status(404).json({ error: err.message });
        }

        return res.status(500).json({
            error: 'Error interno al actualizar imagen',
            detalle: err.message
        });
    }
};

// PUT - Establecer imagen como principal
exports.setPrincipal = async(req, res) => {
    try {
        const { id_imagen } = req.params;
        const { id_proveedor } = req.body;

        if (!id_imagen || !id_proveedor) {
            return res.status(400).json({
                error: 'id_imagen e id_proveedor son requeridos'
            });
        }

        const imagenPrincipal = await model.setPrincipal(id_imagen, id_proveedor);

        return res.status(200).json({
            mensaje: 'Imagen establecida como principal',
            imagen: imagenPrincipal
        });

    } catch (err) {
        console.error('Error en setPrincipal:', err);

        if (err.message.includes('no encontrada')) {
            return res.status(404).json({ error: err.message });
        }

        return res.status(500).json({
            error: 'Error interno al establecer imagen principal',
            detalle: err.message
        });
    }
};

// PUT - Reordenar imágenes
exports.reorder = async(req, res) => {
    try {
        const { id_proveedor } = req.params;
        const { imagenes } = req.body;

        if (!id_proveedor || !Array.isArray(imagenes)) {
            return res.status(400).json({
                error: 'id_proveedor e imagenes (array) son requeridos'
            });
        }

        const resultado = await model.reorder(id_proveedor, imagenes);

        return res.status(200).json(resultado);

    } catch (err) {
        console.error('Error en reorder:', err);

        return res.status(500).json({
            error: 'Error interno al reordenar imágenes',
            detalle: err.message
        });
    }
};