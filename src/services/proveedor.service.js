const model = require('../models/proveedor.models');

// Obtener todos los proveedores
exports.getAllProveedor = async() => {
    return await model.findAll();
};

// Obtener proveedores por estado y/o categoría
exports.getProveedoresByEstado = async(estado, categoria) => {
    return await model.findByEstado(estado, categoria);
};

// Obtener proveedores con múltiples filtros (verificado, estado_aprobacion, etc.)
exports.getProveedoresByFilters = async(filters) => {
    return await model.findByFilters(filters);
};

// Obtener proveedores públicos (solo verificados y aprobados)
exports.getProveedoresPublicos = async() => {
    return await model.findPublicos();
};

// Obtener proveedores públicos filtrados por estado/categoría (aprobados + activos)
exports.getProveedoresPublicosFiltrados = async(filters) => {
    return await model.findPublicosFiltrados(filters);
};

// Nuevo: listado público avanzado con imágenes y paginación
exports.getListadoPublicoAdvanced = async(filters) => {
    return await model.findListadoPublicoAdvanced(filters || {});
};

// Obtener proveedores por categoría
exports.getProveedoresByCategoria = async(categoria) => {
    return await model.findByCategoria(categoria);
};

// Obtener un proveedor por ID (preferir versión que incluye imágenes si está disponible)
exports.getProveedorById = async(id) => {
    if (typeof model.findByIdWithImages === 'function') {
        return await model.findByIdWithImages(id);
    }
    return await model.findById(id);
};

// Crear un nuevo proveedor
exports.createProveedor = async(data) => {
    return await model.create(data);
};

// Actualizar un proveedor
exports.updateProveedor = async(id, data) => {
    return await model.update(id, data);
};

// Eliminar un proveedor
exports.deleteProveedor = async(id) => {
    return await model.delete(id);
};

// ═══════════════════════════════════════════════════════════════
// 🆕 NUEVOS MÉTODOS WRAPPER
// ═══════════════════════════════════════════════════════════════

// 🆕 Obtener proveedor CON características desde proveedor_caracteristica
exports.getProveedorByIdWithCaracteristicas = async(id) => {
    return await model.findByIdWithCaracteristicas(id);
};

// 🆕 Actualizar proveedor CON características
exports.updateProveedorWithCaracteristicas = async(id, data) => {
    return await model.updateWithCaracteristicas(id, data);
};

// 🆕 Eliminar proveedor con cascade manual (alternativa segura)
exports.deleteProveedorSafe = async(id) => {
    return await model.deleteWithRelations(id);
};