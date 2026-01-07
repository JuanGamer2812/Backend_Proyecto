const service = require('../services/proveedor.service');
const postulanteService = require('../services/trabaja_nosotros_proveedor.service');
const CategoriaModel = require('../models/categoria.models');
const cloudinaryConfig = require('../config/cloudinary.config');

// Se obtiene desde DB en tiempo de ejecución, no hardcodeado
const getCategoriasMap = async() => {
    const rows = await CategoriaModel.findAll();
    const set = new Set();
    const map = {};
    (rows || []).forEach((row) => {
        const normalized = normalizeCategoria(row.nombre);
        set.add(normalized);
        // id_tipo viene como id_categoria en la consulta
        const tipoId = row.id_categoria || row.id_tipo;
        if (tipoId !== undefined && tipoId !== null) {
            map[normalized] = tipoId;
        }
    });
    return {set, map };
};

// Normaliza la categoría a claves canónicas en mayúsculas
const normalizeCategoria = (value) => {
    const normalized = String(value || 'OTRO')
        .normalize('NFD')
        .replace(/[^\w\s]/g, '')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

    const map = {
        MUSICA: 'MUSICA',
        CATERING: 'CATERING',
        DECORACION: 'DECORACION',
        LUGAR: 'LUGAR',
        FOTOGRAFIA: 'FOTOGRAFIA',
        VIDEO: 'VIDEO'
    };

    return map[normalized] || normalized;
};

// Forma homogénea de respuesta de proveedor
const shapeProveedor = (row) => ({
    id_proveedor: row.id_proveedor,
    nombre: row.nombre,
    categoria: normalizeCategoria(row.categoria || row.tipo_nombre || row.tipo || row.categoria_proveedor || row.categoria_postu_proveedor),
    precio_base: row.precio_base !== undefined ? row.precio_base : (row.precio !== undefined ? row.precio : null),
    precio: row.precio !== undefined ? row.precio : (row.precio_base !== undefined ? row.precio_base : null),
    descripcion: row.descripcion || null,
    imagen_proveedor: row.imagen_proveedor || null,
    proveedor_imagen: Array.isArray(row.proveedor_imagen) ? row.proveedor_imagen : (row.proveedor_imagen ? JSON.parse(row.proveedor_imagen) : []),
    imagen1_proveedor: row.imagen1_proveedor || null,
    imagen2_proveedor: row.imagen2_proveedor || null,
    imagen3_proveedor: row.imagen3_proveedor || null,
    estado: row.estado !== undefined ? row.estado : null,
    estado_aprobacion: row.estado_aprobacion ? String(row.estado_aprobacion).toUpperCase() : null
});

// GET - Obtener todos los proveedores con filtros opcionales
exports.getAll = async(req, res) => {
    try {
        const { estado, categoria, verificado, estado_aprobacion } = req.query;
        const categoriasData = categoria ? await getCategoriasMap() : null;

        // Si se especifica algún filtro, usar findByFilters
        if (estado || categoria || verificado !== undefined || estado_aprobacion) {
            const filters = {};

            // Backward compatibility: si estado es "aprobado", "pendiente", etc., mapearlo a estado_aprobacion
            if (estado) {
                const approvalStatuses = ['pendiente', 'aprobado', 'rechazado', 'suspendido'];
                if (approvalStatuses.includes(estado.toLowerCase())) {
                    filters.estado_aprobacion = estado;
                } else if (estado === 'true' || estado === 'false') {
                    filters.estado = estado === 'true';
                } else {
                    // Si no es ni approval status ni boolean, asumir que es estado_aprobacion
                    filters.estado_aprobacion = estado;
                }
            }

            if (categoria) {
                const normalizedCat = normalizeCategoria(categoria);
                if (!categoriasData || !categoriasData.set.has(normalizedCat)) {
                    return res.status(400).json({ error: 'categoria inválida', categoria });
                }
                filters.categoria = normalizedCat;
            }
            if (req.query.id_plan !== undefined || req.query.idPlan !== undefined) {
                const idPlanVal = req.query.id_plan || req.query.idPlan;
                const parsed = parseInt(idPlanVal, 10);
                if (Number.isNaN(parsed)) return res.status(400).json({ error: 'id_plan inválido' });
                filters.id_plan = parsed;
            }
            if (verificado !== undefined) filters.verificado = verificado === 'true';
            if (estado_aprobacion) filters.estado_aprobacion = estado_aprobacion;

            const data = await service.getProveedoresByFilters(filters);
            return res.status(200).json(data);
        }

        const data = await service.getAllProveedor();
        res.status(200).json(data);
    } catch (err) {
        console.error('Error en proveedorController.getAll:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET - Listado público con filtros (estado, categoria) y respuesta normalizada
exports.getListadoPublico = async(req, res) => {
    try {
        // Query params per spec
        const { estado_aprobacion, estado, id_plan, id_tipo, categoria, limit, offset } = req.query;

        // Validate categoria if provided
        let normalizedCat = null;
        if (categoria) {
            normalizedCat = normalizeCategoria(categoria);
            const { set: allowedCategorias } = await getCategoriasMap();
            if (!allowedCategorias.has(normalizedCat)) {
                return res.status(400).json({ error: 'categoria inválida', categoria });
            }
        }

        // Coerce boolean for estado
        const estadoBool = (typeof estado === 'undefined' || estado === null || estado === '') ? null : (estado === 'true' || estado === true);

        const params = {
            estado_aprobacion: estado_aprobacion ? estado_aprobacion : null,
            estado: estadoBool,
            id_plan: id_plan ? id_plan : null,
            id_tipo: id_tipo ? id_tipo : null,
            categoria: normalizedCat ? normalizedCat : null,
            limit: limit ? parseInt(limit, 10) : null,
            offset: offset ? parseInt(offset, 10) : null
        };

        const data = await service.getListadoPublicoAdvanced(params);
        // Always return 200 with JSON array (possibly empty)
        return res.status(200).json(data || []);
    } catch (err) {
        console.error('Error en proveedorController.getListadoPublico:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET - Obtener proveedores públicos (solo aprobados y verificados para /colaboradores)
exports.getPublico = async(req, res) => {
    try {
        const data = await service.getProveedoresPublicosFiltrados({});
        res.status(200).json((data || []).map(shapeProveedor));
    } catch (err) {
        console.error('Error en proveedorController.getPublico:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET - Obtener proveedores públicos filtrados por estado/categoría (sin auth)
exports.getFiltradoPublico = async(req, res) => {
    try {
        const { estado, categoria } = req.query;
        const normalizedCat = categoria ? normalizeCategoria(categoria) : null;

        if (categoria) {
            const { set: allowedCategorias } = await getCategoriasMap();
            if (!allowedCategorias.has(normalizedCat)) {
                return res.status(400).json({ error: 'categoria inválida', categoria });
            }
        }

        const data = await service.getProveedoresPublicosFiltrados({ estado, categoria: normalizedCat });
        res.status(200).json((data || []).map(shapeProveedor));
    } catch (err) {
        console.error('Error en proveedorController.getFiltradoPublico:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET - Obtener proveedores por categoría
exports.getByCategoria = async(req, res) => {
    try {
        const { categoria } = req.params;
        const normalizedCat = categoria ? normalizeCategoria(categoria) : null;

        if (categoria) {
            const { set: allowedCategorias } = await getCategoriasMap();
            if (!allowedCategorias.has(normalizedCat)) {
                return res.status(400).json({ error: 'categoria inválida', categoria });
            }
        }

        const data = await service.getProveedoresByCategoria(normalizedCat);
        res.status(200).json((data || []).map(shapeProveedor));
    } catch (err) {
        console.error('Error en proveedorController.getByCategoria:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET - Obtener un proveedor por ID
exports.getById = async(req, res) => {
    try {
        const { id } = req.params;
        const data = await service.getProveedorById(id);

        // DEBUG: mostrar proveedor_imagen y raw data para depuración
        try {
            console.log('[DEBUG] proveedor id=', id, 'proveedor_imagen rows =', data ? data.proveedor_imagen : data);
            console.log('[DEBUG] raw provider data =', data);
        } catch (dbgErr) {
            console.log('[DEBUG] error al loguear en controller.getById', dbgErr);
        }

        if (!data) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // Mantener compatibilidad: si no hay imagen_proveedor, usar la principal del arreglo
        if ((!data.imagen_proveedor || data.imagen_proveedor === null) && Array.isArray(data.proveedor_imagen) && data.proveedor_imagen.length) {
            const principal = data.proveedor_imagen.find(i => i.es_principal) || data.proveedor_imagen[0];
            data.imagen_proveedor = principal ? principal.url_imagen : data.imagen_proveedor;
        }

        res.json(shapeProveedor(data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST - Convertir postulante a proveedor (admin)
exports.convertirPostulante = async(req, res) => {
    try {
        const {
            id_postulante,
            idPostulante,
            id_postu_proveedor,
            idPostuProveedor,
            id_plan,
            categoria,
            precio_base,
            descripcion
        } = req.body || {};

        const postulanteId = id_postulante || idPostulante || id_postu_proveedor || idPostuProveedor;

        if (!postulanteId) {
            return res.status(400).json({ error: 'id_postulante es requerido' });
        }

        const postulante = await postulanteService.getTrabajaNosotrosProveedorById(postulanteId);
        if (!postulante) {
            return res.status(404).json({ error: 'Postulante no encontrado' });
        }

        const { set: allowedCategorias, map: categoriaToTipoId } = await getCategoriasMap();
        const catNorm = normalizeCategoria(categoria || postulante.categoria_postu_proveedor);

        if (!allowedCategorias.has(catNorm)) {
            return res.status(400).json({ error: 'Categoría del postulante no mapeada', categoria: postulante.categoria_postu_proveedor });
        }

        const tipoId = categoriaToTipoId[catNorm];
        if (!tipoId) {
            return res.status(400).json({ error: 'id_tipo no mapeado para la categoría', categoria: catNorm });
        }

        let aprobadoPor = null;
        const aprobadoPorCandidate = req.user ? (req.user.id_usuario || req.user.userId || req.user.id) : null;
        if (aprobadoPorCandidate !== null && aprobadoPorCandidate !== undefined) {
            const parsed = parseInt(aprobadoPorCandidate, 10);
            aprobadoPor = Number.isNaN(parsed) ? null : parsed;
        }

        const payload = {
            nom_empresa_proveedor: postulante.nom_empresa_postu_proveedor,
            categoria_proveedor: catNorm.charAt(0) + catNorm.slice(1).toLowerCase(),
            descripcion: descripcion || postulante.portafolio_postu_proveedor || 'Convertido desde postulación',
            id_plan: id_plan ? parseInt(id_plan, 10) : 1,
            id_tipo: tipoId,
            verificado: true,
            estado_aprobacion: 'aprobado',
            razon_rechazo: null,
            aprobado_por: aprobadoPor,
            precio: precio_base ? parseFloat(precio_base) : 0
        };

        const nuevoProveedor = await service.createProveedor(payload);

        return res.status(201).json({
            message: 'Postulante convertido a proveedor',
            proveedor: shapeProveedor(nuevoProveedor)
        });
    } catch (err) {
        console.error('Error en proveedorController.convertirPostulante:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST - Crear un nuevo proveedor (multipart/form-data)
exports.create = async(req, res) => {
    try {
        const {
            nom_empresa_proveedor,
            id_tipo,
            // Música
            genero,
            precio,
            porHora,
            horaInicio,
            horaFin,
            descripcion,
            plan,
            id_plan,
            idPlan,
            // Catering
            tipoComida,
            precioPersona,
            // Lugar
            capacidad,
            direccion,
            seguridad,
            imagen1,
            imagen2,
            imagen3,
            // Decoración
            nivel,
            tipo,
            logoFile,
            // Postulante (alias)
            id_postulante,
            idPostulante
        } = req.body;

        // Con upload.any(), req.files es un ARREGLO, no un objeto
        const filesArray = Array.isArray(req.files) ? req.files : [];

        // Leer el índice de imagen principal del frontend
        const imagenPrincipalIndex = parseInt(req.body.imagen_principal_index) || 0;
        console.log('📌 Índice de imagen principal recibido:', imagenPrincipalIndex);

        // Parsear características dinámicas enviadas por el front (JSON o arreglo)
        let caracteristicas = [];
        const rawCaracteristicas = req.body.caracteristicas || req.body.caracteristicas_json || req.body.caracteristicasJSON;
        if (rawCaracteristicas) {
            try {
                caracteristicas = Array.isArray(rawCaracteristicas) ? rawCaracteristicas : JSON.parse(rawCaracteristicas);
            } catch (err) {
                console.warn('[PROVEEDOR][CREATE] No se pudieron parsear caracteristicas:', rawCaracteristicas, err);
            }
        }

        // Separar imágenes de archivos de características (PDFs, etc.)
        const imagenes = [];
        const archivosCaracteristicas = {};
        let contadorImagenes = 0; // Contador separado para imágenes del proveedor

        // Procesar archivos y subirlos a Cloudinary
        for (const file of filesArray) {
            // Validar que el archivo tenga buffer
            if (!file.buffer || file.buffer.length === 0) {
                console.error('[PROVEEDOR][CREATE] Archivo sin buffer:', {
                    fieldname: file.fieldname,
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size
                });
                return res.status(400).json({
                    error: 'Archivo vacío o corrupto',
                    details: `El archivo ${file.originalname} no tiene contenido válido`
                });
            }

            // Los archivos de características vienen con fieldname que coincide con el id de característica
            // Formatos soportados: "caracteristica_15", "file_car_15"
            if (file.fieldname && (file.fieldname.startsWith('caracteristica_') || file.fieldname.startsWith('file_car_'))) {
                const idCaracteristica = file.fieldname
                    .replace('caracteristica_', '')
                    .replace('file_car_', '');
                
                try {
                    console.log('[PROVEEDOR][CREATE] Subiendo archivo de característica:', {
                        fieldname: file.fieldname,
                        idCaracteristica,
                        mimetype: file.mimetype,
                        originalname: file.originalname,
                        size: file.size,
                        bufferLength: file.buffer.length
                    });

                    // Subir archivo de característica a Cloudinary (imagen o PDF)
                    const result = await cloudinaryConfig.uploadImageBuffer(
                        file.buffer,
                        'eclat/proveedores/caracteristicas'
                    );
                    archivosCaracteristicas[idCaracteristica] = result.url;

                    console.log('[PROVEEDOR][CREATE] ✅ Archivo de característica subido a Cloudinary:', {
                        fieldname: file.fieldname,
                        idCaracteristica,
                        mimetype: file.mimetype,
                        cloudinaryUrl: result.url,
                        publicId: result.publicId
                    });
                } catch (cloudinaryError) {
                    console.error('[PROVEEDOR][CREATE] ❌ Error al subir archivo de característica a Cloudinary:', {
                        fieldname: file.fieldname,
                        mimetype: file.mimetype,
                        error: cloudinaryError.message,
                        stack: cloudinaryError.stack
                    });
                    return res.status(500).json({
                        error: 'Error al subir archivo de característica a Cloudinary',
                        details: cloudinaryError.message,
                        filename: file.originalname
                    });
                }
            } else {
                // Es una imagen del proveedor
                try {
                    console.log('[PROVEEDOR][CREATE] Subiendo imagen de proveedor:', {
                        mimetype: file.mimetype,
                        originalname: file.originalname,
                        size: file.size,
                        bufferLength: file.buffer.length
                    });

                    // Subir imagen a Cloudinary
                    const result = await cloudinaryConfig.uploadImageBuffer(
                        file.buffer,
                        'eclat/proveedores/imagenes'
                    );

                    // Marcar como principal solo la imagen cuyo índice coincide con imagen_principal_index
                    const esPrincipal = (contadorImagenes === imagenPrincipalIndex);
                    imagenes.push({
                        url_imagen: result.url,
                        es_principal: esPrincipal,
                        orden: contadorImagenes + 1
                    });

                    console.log(`[PROVEEDOR][CREATE] ✅ Imagen subida a Cloudinary: index=${contadorImagenes}, es_principal=${esPrincipal}, url=${result.url}`);
                    contadorImagenes++;
                } catch (cloudinaryError) {
                    console.error('[PROVEEDOR][CREATE] ❌ Error al subir imagen a Cloudinary:', {
                        mimetype: file.mimetype,
                        error: cloudinaryError.message,
                        stack: cloudinaryError.stack
                    });
                    return res.status(500).json({
                        error: 'Error al subir imagen a Cloudinary',
                        details: cloudinaryError.message,
                        filename: file.originalname
                    });
                }
            }
        }

        // Mapear archivos a sus características correspondientes
        caracteristicas.forEach(caract => {
            const idCaract = String(caract.id_caracteristica || caract.idCaracteristica);
            if (archivosCaracteristicas[idCaract]) {
                // Asignar la URL de Cloudinary del archivo a la característica
                caract.valor = archivosCaracteristicas[idCaract];
                caract.valor_texto = archivosCaracteristicas[idCaract];
            }
        });

        console.log('[PROVEEDOR][CREATE] Archivos procesados:', {
            totalArchivos: filesArray.length,
            imagenes: imagenes.length,
            archivosCaracteristicas: Object.keys(archivosCaracteristicas),
            caracteristicasConArchivos: caracteristicas.filter(c => c.valor_texto && (c.valor_texto.startsWith('http://') || c.valor_texto.startsWith('https://'))).length
        });

        // Log de validación de imagen principal
        const imagenPrincipal = imagenes.find(img => img.es_principal);
        console.log('📌 Imagen principal seleccionada:', imagenPrincipal ? `${imagenPrincipal.url_imagen} (índice ${imagenPrincipalIndex})` : 'NINGUNA');
        console.log('📋 Todas las imágenes:', imagenes.map((img, idx) => `[${idx}] ${img.url_imagen} (principal: ${img.es_principal})`));

        // Compatibilidad con front: mapear alias y, si viene id_postulante, rellenar faltantes desde la postulación
        const postulanteId = id_postulante || idPostulante;

        // Normalizar id_plan desde distintos nombres
        const idPlanValor = id_plan || idPlan || req.body.plan_id || req.body.planId;
        const idPlanParsed = idPlanValor ? parseInt(idPlanValor, 10) : null;
        // Fallback: algunos formularios envían el id del plan en el campo "plan"
        const idPlanFinal = Number.isInteger(idPlanParsed) ? idPlanParsed : (plan && !isNaN(parseInt(plan, 10)) ? parseInt(plan, 10) : null);

        console.log('[PROVEEDOR][CREATE] body:', req.body);
        console.log('[PROVEEDOR][CREATE] idPlanValor:', idPlanValor, 'plan:', plan, 'idPlanFinal:', idPlanFinal);

        let nombreEmpresa = nom_empresa_proveedor || req.body.nom_empresa || req.body.nombre || req.body.nombre_empresa || req.body.nom_empresa_postu_proveedor;
        let idTipo = id_tipo || req.body.id_tipo;
        let precioBase = precio || req.body.precio_base || req.body.precioBase;

        const categoriaOrigenRaw = req.body.categoria_origen || req.body.categoriaOrigen;
        const categoriaOrigenNorm = categoriaOrigenRaw ? normalizeCategoria(categoriaOrigenRaw) : null;

        // Normalizar horas desde posibles campos/formatos del front (ej. "08:59 a. m." o hora_inicio)
        const parseHour = (value) => {
            if (value === undefined || value === null) return null;
            const raw = String(value).trim().toLowerCase();
            // Formatos 08:59, 08:59 am, 08:59 p. m.
            const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(a\.m\.|am|p\.m\.|pm))?/);
            if (!match) return null;
            let hour = parseInt(match[1], 10);
            const ampm = match[3];
            if (ampm) {
                const isPM = ampm.includes('p');
                if (isPM && hour < 12) hour += 12;
                if (!isPM && hour === 12) hour = 0;
            }
            if (hour < 0 || hour > 23) return null;
            return hour;
        };

        const horaInicioValor = horaInicio || req.body.hora_inicio || req.body.horaInicio;
        const horaFinValor = horaFin || req.body.hora_fin || req.body.horaFin;
        const horaInicioParsed = parseHour(horaInicioValor);
        const horaFinParsed = parseHour(horaFinValor);

        if ((!nombreEmpresa || !idTipo) && postulanteId) {
            const postulante = await postulanteService.getTrabajaNosotrosProveedorById(postulanteId);
            if (postulante) {
                // Completar campos faltantes con los datos del postulante
                if (!nombreEmpresa) nombreEmpresa = postulante.nom_empresa_postu_proveedor;
                if (!idTipo && postulante.categoria_postu_proveedor) {
                    // Mapear categoria del postulante a id_tipo
                    const catNorm = normalizeCategoria(postulante.categoria_postu_proveedor);
                    const { map: categoriaToTipoId } = await getCategoriasMap();
                    idTipo = categoriaToTipoId[catNorm];
                }
            }
        }

        if (!idTipo && categoriaOrigenNorm && ['FOTOGRAFIA', 'VIDEO', 'GENERICO'].includes(categoriaOrigenNorm)) {
            const { map: categoriaToTipoId } = await getCategoriasMap();
            idTipo = categoriaToTipoId[categoriaOrigenNorm];
        }

        // Validaciones generales
        if (!nombreEmpresa || !String(nombreEmpresa).trim()) {
            return res.status(400).json({ message: 'nom_empresa_proveedor es requerido' });
        }

        if (!idTipo) {
            return res.status(400).json({ message: 'id_tipo es requerido' });
        }

        // Validar que id_tipo sea válido consultando la tabla proveedor_tipo
        const { map: categoriaToTipoId } = await getCategoriasMap();
        const tiposValidos = Object.values(categoriaToTipoId);

        if (!tiposValidos.includes(parseInt(idTipo))) {
            return res.status(400).json({
                message: 'id_tipo inválido o no registrado en la base de datos',
                id_tipo: idTipo
            });
        }

        // Obtener el nombre de la categoría desde el mapa (invertir el mapa)
        const tipoToCategoria = {};
        Object.entries(categoriaToTipoId).forEach(([cat, tipo]) => {
            tipoToCategoria[tipo] = cat;
        });

        const categoriaKey = tipoToCategoria[parseInt(idTipo)];
        const categoriaNormalizada = categoriaKey ? (categoriaKey.charAt(0) + categoriaKey.slice(1).toLowerCase()) : 'Otro';
        const categoriaLower = categoriaNormalizada.toLowerCase();

        // Validar plan requerido (la tabla proveedor tiene FK NOT NULL)
        if (idPlanFinal === null || Number.isNaN(idPlanFinal)) {
            return res.status(400).json({ message: 'id_plan es requerido y debe ser numérico' });
        }

        // ========================================================================
        // PREPARAR DATOS PARA INSERCIÓN - TODO DINÁMICO
        // ========================================================================
        const proveedorData = {
            nom_empresa_proveedor: String(nombreEmpresa).trim(),
            categoria_proveedor: categoriaNormalizada,
            descripcion: descripcion ? descripcion.trim() : null,
            plan: plan ? plan.trim() : null,
            id_plan: idPlanFinal,
            id_tipo: parseInt(idTipo),
            verificado: req.body.verificado === true || req.body.verificado === 'true' || false,
            estado_aprobacion: req.body.estado_aprobacion || 'pendiente',
            razon_rechazo: null,
            aprobado_por: req.body.aprobado_por || null,
            precio: precioBase ? parseFloat(precioBase) : 0,
            caracteristicas,
            imagenes
        };

        console.log('[PROVEEDOR][CREATE] Características finales que se envían al modelo:', JSON.stringify(caracteristicas, null, 2));

        // Crear proveedor en base de datos
        const nuevoProveedor = await service.createProveedor(proveedorData);

        res.status(201).json({
            message: 'Proveedor creado exitosamente',
            proveedor: nuevoProveedor
        });

    } catch (err) {
        console.error('Error en proveedorController.create:', err);
        res.status(500).json({
            message: 'Error al crear el proveedor',
            error: err.message
        });
    }
};

// PUT - Actualizar un proveedor
exports.update = async(req, res) => {
    try {
        const { id } = req.params;
        const { estado_aprobacion, motivo_rechazo, razon_rechazo, verificado } = req.body || {};

        console.log(`[UPDATE] Proveedor ${id} - Body recibido:`, JSON.stringify(req.body, null, 2));

        // Normalizar campo (motivo_rechazo o razon_rechazo)
        const motivoFinal = motivo_rechazo || razon_rechazo;

        // Validaciones de estado_aprobacion y razon_rechazo
        if (estado_aprobacion !== undefined) {
            const allowed = ['pendiente', 'aprobado', 'rechazado', 'suspendido'];
            if (!allowed.includes(estado_aprobacion)) {
                return res.status(400).json({
                    error: 'Validación',
                    message: 'estado_aprobacion debe ser uno de: pendiente | aprobado | rechazado | suspendido'
                });
            }

            // Validación para rechazado: razon_rechazo obligatoria
            if (estado_aprobacion === 'rechazado' && (!motivoFinal || String(motivoFinal).trim() === '')) {
                console.log('[VALIDACIÓN] Rechazado sin razon_rechazo:', { motivo_rechazo, razon_rechazo, motivoFinal });
                return res.status(400).json({
                    error: 'Validación',
                    message: 'razon_rechazo es obligatorio cuando estado_aprobacion = "rechazado"',
                    hint: 'Envíe el campo "razon_rechazo" con el motivo del rechazo'
                });
            }

            // Validación para suspendido: razon_rechazo obligatoria
            if (estado_aprobacion === 'suspendido' && (!motivoFinal || String(motivoFinal).trim() === '')) {
                console.log('[VALIDACIÓN] Suspendido sin razon_rechazo:', { motivo_rechazo, razon_rechazo, motivoFinal });
                return res.status(400).json({
                    error: 'Validación',
                    message: 'razon_rechazo es obligatorio cuando estado_aprobacion = "suspendido"',
                    hint: 'Envíe el campo "razon_rechazo" con el motivo de la suspensión',
                    received: { estado_aprobacion, motivo_rechazo, razon_rechazo }
                });
            }
        }

        // Pasar razon_rechazo normalizado
        const updateData = {...req.body };
        if (motivoFinal !== undefined) {
            updateData.razon_rechazo = motivoFinal;
            delete updateData.motivo_rechazo;
        }

        const data = await service.updateProveedor(id, updateData);

        if (!data) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        res.json({ message: 'Proveedor actualizado', proveedor: data });
    } catch (err) {
        console.error('Error al actualizar proveedor:', err);
        res.status(500).json({
            error: 'Error al actualizar el proveedor',
            message: err.message,
            details: err.stack
        });
    }
};

// DELETE - Eliminar un proveedor
exports.delete = async(req, res) => {
    try {
        const { id } = req.params;
        const data = await service.deleteProveedor(id);

        if (!data) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        res.json({ message: 'Proveedor eliminado correctamente', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET - Obtener caracteristicas de un proveedor (wrapper que usa el modelo de caracteristica)
exports.getCaracteristicasByProveedor = async(req, res) => {
    try {
        const id = req.params.id;
        const CaracteristicaModel = require('../models/caracteristica.model');
        const data = await CaracteristicaModel.findByProveedor(id);
        if (!data) return res.status(404).json({ error: 'Proveedor no encontrado' });
        return res.status(200).json(data);
    } catch (err) {
        console.error('Error en proveedorController.getCaracteristicasByProveedor:', err);
        return res.status(500).json({ error: err.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// 🆕 NUEVOS CONTROLADORES
// ═══════════════════════════════════════════════════════════════

// 🆕 Obtener proveedor con características aplanadas (para editar-proveedor)
exports.getByIdWithCaracteristicas = async(req, res) => {
    try {
        const { id } = req.params;
        const proveedor = await service.getProveedorByIdWithCaracteristicas(id);

        if (!proveedor) {
            return res.status(404).json({
                message: 'Proveedor no encontrado'
            });
        }

        res.json(proveedor);
    } catch (error) {
        console.error('Error en getByIdWithCaracteristicas:', error);
        res.status(500).json({
            message: 'Error al obtener proveedor',
            error: error.message
        });
    }
};

// 🆕 Actualizar proveedor con características
exports.updateWithCaracteristicas = async(req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Verificar que el proveedor existe
        const existingProveedor = await service.getProveedorById(id);
        if (!existingProveedor) {
            return res.status(404).json({
                message: 'Proveedor no encontrado'
            });
        }

        const proveedorActualizado = await service.updateProveedorWithCaracteristicas(id, data);

        res.json({
            message: 'Proveedor actualizado exitosamente',
            proveedor: proveedorActualizado
        });
    } catch (error) {
        console.error('Error en updateWithCaracteristicas:', error);
        res.status(500).json({
            message: 'Error al actualizar proveedor',
            error: error.message
        });
    }
};