const db = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Modelo para gestión de imágenes de proveedores
 */

// Obtener todas las imágenes de un proveedor
exports.findByProveedor = async(idProveedor) => {
    const query = `
        SELECT 
            id_proveedor_imagen,
            id_proveedor,
            url_imagen,
            es_principal,
            orden,
            activo,
            fecha_registro
        FROM proveedor_imagen
        WHERE id_proveedor = $1
        ORDER BY es_principal DESC, orden ASC, id_proveedor_imagen ASC
    `;

    const result = await db.query(query, [idProveedor]);
    return result.rows;
};

// Obtener una imagen específica por ID
exports.findById = async(idImagen) => {
    const query = `
        SELECT 
            id_proveedor_imagen,
            id_proveedor,
            url_imagen,
            es_principal,
            orden,
            activo,
            fecha_registro
        FROM proveedor_imagen
        WHERE id_proveedor_imagen = $1
    `;

    const result = await db.query(query, [idImagen]);
    return result.rows[0] || null;
};

// Crear nueva(s) imagen(es) - puede ser archivo o URL
exports.create = async(idProveedor, imagenes) => {
    if (!Array.isArray(imagenes)) {
        imagenes = [imagenes];
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Verificar que el proveedor existe
        const proveedorCheck = await client.query(
            'SELECT id_proveedor FROM proveedor WHERE id_proveedor = $1', [idProveedor]
        );

        if (proveedorCheck.rows.length === 0) {
            throw new Error('Proveedor no encontrado');
        }

        const imagenesInsertadas = [];

        for (const imagen of imagenes) {
            let urlImagen = null;

            // Procesar URL o ruta de archivo
            if (typeof imagen === 'string') {
                urlImagen = imagen;
            } else if (imagen.url_imagen) {
                urlImagen = imagen.url_imagen;
            } else if (imagen.url) {
                urlImagen = imagen.url;
            } else if (imagen.filename) {
                // Si es un archivo subido por multer
                urlImagen = `/uploads/${imagen.filename}`;
            }

            if (!urlImagen) {
                console.warn('Imagen sin URL válida, omitiendo:', imagen);
                continue;
            }

            const esPrincipal = imagen.es_principal === true || imagen.principal === true;
            const orden = imagen.orden ? parseInt(imagen.orden, 10) : imagenesInsertadas.length + 1;
            const activo = imagen.activo !== false;

            const insertQuery = `
                INSERT INTO proveedor_imagen 
                    (id_proveedor, url_imagen, es_principal, orden, activo)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id_proveedor_imagen, id_proveedor, url_imagen, es_principal, orden, activo, fecha_registro
            `;

            const result = await client.query(insertQuery, [
                idProveedor,
                urlImagen,
                esPrincipal,
                orden,
                activo
            ]);

            imagenesInsertadas.push(result.rows[0]);
        }

        await client.query('COMMIT');
        return imagenesInsertadas;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Eliminar una imagen por ID
exports.delete = async(idImagen) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Obtener información de la imagen
        const imagenCheck = await client.query(
            'SELECT id_proveedor_imagen, url_imagen, id_proveedor FROM proveedor_imagen WHERE id_proveedor_imagen = $1', [idImagen]
        );

        if (imagenCheck.rows.length === 0) {
            throw new Error('Imagen no encontrada');
        }

        const imagen = imagenCheck.rows[0];

        // Intentar eliminar el archivo físico si es local
        if (imagen.url_imagen && !imagen.url_imagen.startsWith('http')) {
            try {
                const rutaArchivo = path.join(__dirname, '../../', imagen.url_imagen);
                if (fs.existsSync(rutaArchivo)) {
                    fs.unlinkSync(rutaArchivo);
                    console.log(`[IMAGEN] Archivo físico eliminado: ${rutaArchivo}`);
                }
            } catch (fsError) {
                console.warn(`[IMAGEN] No se pudo eliminar archivo físico ${imagen.url_imagen}:`, fsError.message);
                // No fallar por esto, continuar con la eliminación de BD
            }
        }

        // Eliminar de la base de datos
        const deleteQuery = `
            DELETE FROM proveedor_imagen 
            WHERE id_proveedor_imagen = $1
            RETURNING id_proveedor_imagen, id_proveedor, url_imagen
        `;

        const result = await client.query(deleteQuery, [idImagen]);

        await client.query('COMMIT');
        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Actualizar imagen (url, es_principal, orden, etc.)
exports.update = async(idImagen, data) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (data.url_imagen !== undefined) {
            updateFields.push(`url_imagen = $${paramCount++}`);
            updateValues.push(data.url_imagen);
        }
        if (data.es_principal !== undefined) {
            updateFields.push(`es_principal = $${paramCount++}`);
            updateValues.push(data.es_principal);
        }
        if (data.orden !== undefined) {
            updateFields.push(`orden = $${paramCount++}`);
            updateValues.push(parseInt(data.orden, 10));
        }
        if (data.activo !== undefined) {
            updateFields.push(`activo = $${paramCount++}`);
            updateValues.push(data.activo);
        }

        if (updateFields.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        updateValues.push(idImagen);
        const updateQuery = `
            UPDATE proveedor_imagen
            SET ${updateFields.join(', ')}
            WHERE id_proveedor_imagen = $${paramCount}
            RETURNING id_proveedor_imagen, id_proveedor, url_imagen, es_principal, orden, activo, fecha_registro
        `;

        const result = await client.query(updateQuery, updateValues);

        if (result.rows.length === 0) {
            throw new Error('Imagen no encontrada');
        }

        await client.query('COMMIT');
        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Establecer una imagen como principal
exports.setPrincipal = async(idImagen, idProveedor) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Desmarcar todas las imágenes de este proveedor
        await client.query(
            'UPDATE proveedor_imagen SET es_principal = false WHERE id_proveedor = $1', [idProveedor]
        );

        // Marcar la nueva como principal
        const updateQuery = `
            UPDATE proveedor_imagen
            SET es_principal = true
            WHERE id_proveedor_imagen = $1 AND id_proveedor = $2
            RETURNING id_proveedor_imagen, id_proveedor, url_imagen, es_principal
        `;

        const result = await client.query(updateQuery, [idImagen, idProveedor]);

        if (result.rows.length === 0) {
            throw new Error('Imagen no encontrada para este proveedor');
        }

        await client.query('COMMIT');
        return result.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Reordenar imágenes
exports.reorder = async(idProveedor, imagenes) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        for (let i = 0; i < imagenes.length; i++) {
            const idImagen = imagenes[i].id_proveedor_imagen || imagenes[i].id;
            const orden = i + 1;

            await client.query(
                'UPDATE proveedor_imagen SET orden = $1 WHERE id_proveedor_imagen = $2 AND id_proveedor = $3', [orden, idImagen, idProveedor]
            );
        }

        await client.query('COMMIT');
        return { mensaje: 'Imágenes reordenadas correctamente', total: imagenes.length };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};