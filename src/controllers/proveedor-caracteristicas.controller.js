const db = require('../config/db');
const cloudinaryConfig = require('../config/cloudinary.config');

const parseJsonValue = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return fallback;
    try {
        return JSON.parse(value);
    } catch (err) {
        return fallback;
    }
};

const coerceBoolean = (value) => {
    if (value === true || value === false) return value;
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;
    return null;
};

const normalizeValueFields = (item) => {
    if (!item || typeof item !== 'object') {
        return { valorTexto: null, valorNumero: null, valorBooleano: null, valorJson: null };
    }

    if (item.valor_json !== undefined) {
        return {
            valorTexto: item.valor_texto ?? null,
            valorNumero: item.valor_numero ?? null,
            valorBooleano: item.valor_booleano ?? null,
            valorJson: item.valor_json
        };
    }

    if (item.valor_numero !== undefined && item.valor_numero !== null && item.valor_numero !== '') {
        const num = Number(item.valor_numero);
        return {
            valorTexto: Number.isFinite(num) ? String(num) : String(item.valor_numero),
            valorNumero: Number.isFinite(num) ? num : null,
            valorBooleano: null,
            valorJson: null
        };
    }

    if (item.valor_booleano !== undefined && item.valor_booleano !== null && item.valor_booleano !== '') {
        return {
            valorTexto: null,
            valorNumero: null,
            valorBooleano: coerceBoolean(item.valor_booleano),
            valorJson: null
        };
    }

    const raw = item.valor_texto ?? item.valor ?? item.valorTexto;
    if (raw === undefined || raw === null || raw === '') {
        return { valorTexto: null, valorNumero: null, valorBooleano: null, valorJson: null };
    }

    if (typeof raw === 'boolean') {
        return { valorTexto: null, valorNumero: null, valorBooleano: raw, valorJson: null };
    }

    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) {
        return { valorTexto: String(raw), valorNumero: asNumber, valorBooleano: null, valorJson: null };
    }

    return { valorTexto: String(raw), valorNumero: null, valorBooleano: null, valorJson: null };
};

const uploadCaracteristicaFile = async (file) => {
    const isPDF = file.mimetype === 'application/pdf';
    if (isPDF) {
        const result = await cloudinaryConfig.uploadFileBuffer(
            file.buffer,
            'eclat/proveedores/caracteristicas/documentos',
            file.originalname
        );
        return {
            url: result.url,
            publicId: result.publicId || result.public_id || null,
            resourceType: result.resourceType || 'raw'
        };
    }

    const result = await cloudinaryConfig.uploadImageBuffer(
        file.buffer,
        'eclat/proveedores/caracteristicas/imagenes'
    );
    return {
        url: result.url,
        publicId: result.publicId || result.public_id || null,
        resourceType: result.resourceType || 'image'
    };
};

exports.upsertProveedorCaracteristicas = async (req, res) => {
    try {
        const body = req.body || {};
        let items = [];

        if (Array.isArray(body)) {
            items = body;
        } else if (body && typeof body === 'object') {
            items = parseJsonValue(body.caracteristicas, []);
        }

        if (!Array.isArray(items)) items = [];

        const menuUrls = parseJsonValue(body.caracteristicas_urls, {});
        const itemsById = new Map();

        items.forEach((item) => {
            const idCar = parseInt(item?.id_caracteristica ?? item?.id, 10);
            if (!Number.isFinite(idCar)) return;
            itemsById.set(idCar, { ...item, id_caracteristica: idCar });
        });

        if (menuUrls && typeof menuUrls === 'object') {
            Object.entries(menuUrls).forEach(([idKey, url]) => {
                const idCar = parseInt(idKey, 10);
                const trimmed = typeof url === 'string' ? url.trim() : '';
                if (!Number.isFinite(idCar) || !trimmed) return;
                const existing = itemsById.get(idCar) || { id_caracteristica: idCar };
                existing.valor_texto = trimmed;
                existing.valor = trimmed;
                itemsById.set(idCar, existing);
            });
        }

        if (Array.isArray(req.files) && req.files.length > 0) {
            for (const file of req.files) {
                if (!file?.fieldname) continue;
                if (!file.buffer || file.buffer.length === 0) {
                    return res.status(400).json({ error: 'archivo_sin_buffer', message: 'Archivo sin contenido' });
                }

                const idRaw = file.fieldname
                    .replace('caracteristica_', '')
                    .replace('file_car_', '');
                const idCar = parseInt(idRaw, 10);
                if (!Number.isFinite(idCar)) continue;

                const uploadResult = await uploadCaracteristicaFile(file);
                const existing = itemsById.get(idCar) || { id_caracteristica: idCar };
                existing.valor_texto = uploadResult.url;
                existing.valor = uploadResult.url;
                existing.valor_json = JSON.stringify({
                    url: uploadResult.url,
                    public_id: uploadResult.publicId
                });
                itemsById.set(idCar, existing);
            }
        }

        const firstItem = itemsById.values().next().value || {};
        const idProveedor = parseInt(
            body.id_proveedor || firstItem.id_proveedor || firstItem.idProveedor,
            10
        );

        if (!Number.isFinite(idProveedor)) {
            return res.status(400).json({ error: 'id_proveedor_requerido', message: 'id_proveedor es requerido' });
        }

        const itemsToSave = Array.from(itemsById.values())
            .map((item) => ({
                ...item,
                id_proveedor: idProveedor,
                id_caracteristica: parseInt(item.id_caracteristica ?? item.id, 10)
            }))
            .filter((item) => Number.isFinite(item.id_caracteristica));

        if (itemsToSave.length === 0) {
            return res.status(200).json({ message: 'Sin caracteristicas para actualizar', updated: 0 });
        }

        const client = await db.connect();
        try {
            await client.query('BEGIN');
            for (const item of itemsToSave) {
                const { valorTexto, valorNumero, valorBooleano, valorJson } = normalizeValueFields(item);
                const upsertQuery = `
                    INSERT INTO proveedor_caracteristica
                        (id_proveedor, id_caracteristica, valor_texto, valor_numero, valor_booleano, valor_json, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW())
                    ON CONFLICT (id_proveedor, id_caracteristica)
                    DO UPDATE SET
                        valor_texto = EXCLUDED.valor_texto,
                        valor_numero = EXCLUDED.valor_numero,
                        valor_booleano = EXCLUDED.valor_booleano,
                        valor_json = EXCLUDED.valor_json,
                        updated_at = NOW()
                `;
                await client.query(upsertQuery, [
                    idProveedor,
                    item.id_caracteristica,
                    valorTexto,
                    valorNumero,
                    valorBooleano,
                    valorJson
                ]);
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        return res.status(200).json({ message: 'Caracteristicas actualizadas', updated: itemsToSave.length });
    } catch (err) {
        console.error('Error en proveedor-caracteristicas.upsert:', err);
        return res.status(500).json({
            error: 'error_actualizar_caracteristicas',
            message: err.message
        });
    }
};
