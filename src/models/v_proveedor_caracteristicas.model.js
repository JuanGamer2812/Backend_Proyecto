const db = require('../config/db');

/**
 * Compone una lista de "características" para un proveedor a partir de
 * proveedor_servicio, proveedor_documento y campos específicos como menu/pdf.
 */
exports.getByProveedor = async(id_proveedor) => {
    const features = [];
    let counter = 1;
    // Servicios ofertados (tabla opcional)
    try {
        const serviciosQ = `
            SELECT id_servicio, nombre_servicio, descripcion, precio_base, unidad_precio
            FROM proveedor_servicio
            WHERE id_proveedor = $1 AND (activo IS NULL OR activo = true)
            ORDER BY id_servicio ASC
        `;
        const serviciosRes = await db.query(serviciosQ, [id_proveedor]);
        (serviciosRes.rows || []).forEach(s => {
            features.push({
                id_caracteristica: counter++,
                origen: 'servicio',
                id_origen: s.id_servicio,
                nombre: s.nombre_servicio,
                tipo_valor: 'servicio',
                valor_texto: s.descripcion || null,
                precio_base: s.precio_base !== undefined ? s.precio_base : null,
                unidad_precio: s.unidad_precio || null
            });
        });
    } catch (err) {
        if (err && err.code === '42P01') {
            console.log('[DEBUG] tabla proveedor_servicio no existe, omitiendo servicios para proveedor', id_proveedor);
        } else {
            console.error('Error consultando proveedor_servicio:', err);
        }
    }

    // Documentos / archivos
    // Documentos / archivos (tabla opcional)
    try {
        const docsQ = `
            SELECT id_documento, tipo_documento, nombre_archivo, url_documento
            FROM proveedor_documento
            WHERE id_proveedor = $1
            ORDER BY id_documento ASC
        `;
        const docsRes = await db.query(docsQ, [id_proveedor]);
        (docsRes.rows || []).forEach(d => {
            features.push({
                id_caracteristica: counter++,
                origen: 'documento',
                id_origen: d.id_documento,
                nombre: d.tipo_documento || d.nombre_archivo || 'Documento',
                tipo_valor: 'archivo',
                valor_texto: d.url_documento || d.nombre_archivo || null
            });
        });
    } catch (err) {
        if (err && err.code === '42P01') {
            console.log('[DEBUG] tabla proveedor_documento no existe, omitiendo documentos para proveedor', id_proveedor);
        } else {
            console.error('Error consultando proveedor_documento:', err);
        }
    }

    // Catering: menu (archivo)
    // Catering: menu (tabla opcional)
    try {
        const menuQ = `SELECT menu FROM proveedor_catering WHERE id_proveedor = $1 LIMIT 1`;
        const menuRes = await db.query(menuQ, [id_proveedor]);
        if (menuRes.rows && menuRes.rows[0] && menuRes.rows[0].menu) {
            features.push({
                id_caracteristica: counter++,
                origen: 'catering_menu',
                id_origen: null,
                nombre: 'Menú PDF',
                tipo_valor: 'archivo',
                valor_texto: menuRes.rows[0].menu
            });
        }
    } catch (err) {
        if (err && err.code === '42P01') {
            console.log('[DEBUG] tabla proveedor_catering no existe, omitiendo menu para proveedor', id_proveedor);
        } else {
            console.error('Error consultando proveedor_catering:', err);
        }
    }

    // Decoracion: pdf_catalogo
    // Decoracion: pdf_catalogo (tabla opcional)
    try {
        const pdfQ = `SELECT pdf_catalogo FROM proveedor_decoracion WHERE id_proveedor = $1 LIMIT 1`;
        const pdfRes = await db.query(pdfQ, [id_proveedor]);
        if (pdfRes.rows && pdfRes.rows[0] && pdfRes.rows[0].pdf_catalogo) {
            features.push({
                id_caracteristica: counter++,
                origen: 'decoracion_catalogo',
                id_origen: null,
                nombre: 'Catálogo PDF',
                tipo_valor: 'archivo',
                valor_texto: pdfRes.rows[0].pdf_catalogo
            });
        }
    } catch (err) {
        if (err && err.code === '42P01') {
            console.log('[DEBUG] tabla proveedor_decoracion no existe, omitiendo catalogo para proveedor', id_proveedor);
        } else {
            console.error('Error consultando proveedor_decoracion:', err);
        }
    }

    return features;
};