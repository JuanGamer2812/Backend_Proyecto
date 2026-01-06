// Mapeo oficial de nombres de rol por ID (según la base de datos)
const ROLE_NAME_BY_ID = {
    1: 'Administrador',
    2: 'Usuario'
};

// Opcional de compatibilidad: 'role' (admin/user)
const clientRoleFromId = (idRol) => (Number(idRol) === 1 ? 'admin' : 'user');

// Convierte un string (o número) a id_rol conocido. Acepta nombres en español/inglés o números.
const roleStringToId = (roleStr) => {
    if (roleStr === undefined || roleStr === null) return null;
    const asNum = Number(roleStr);
    if (Number.isInteger(asNum)) return asNum;
    const s = String(roleStr).toLowerCase();
    if (['admin', 'administrator', 'administrador'].includes(s)) return 1;
    if (['user', 'usuario', 'cliente'].includes(s)) return 2;
    // check exact name mapping from ROLE_NAME_BY_ID
    const match = Object.entries(ROLE_NAME_BY_ID).find(([, name]) => name.toLowerCase() === s);
    return match ? Number(match[0]) : null;
};

// Devuelve el nombre del rol según el id o un override si se provee
const idToRolNombre = (id, overrideName) => {
    if (overrideName) return overrideName;
    return ROLE_NAME_BY_ID[id] || 'Usuario';
};

// Resuelve el nombre del rol usando varios orígenes (id oficial, nombre desde BD, legacy)
const resolveRole = (idRol, nombreRolDb, rolLegacy) => {
    const byId = ROLE_NAME_BY_ID[Number(idRol)];
    if (byId) return byId;
    if (nombreRolDb) return nombreRolDb;
    if (rolLegacy) return String(rolLegacy).toLowerCase() === 'admin' ? 'Administrador' : 'Usuario';
    return 'Usuario';
};

module.exports = {
    ROLE_NAME_BY_ID,
    clientRoleFromId,
    resolveRole,
    roleStringToId,
    idToRolNombre
};