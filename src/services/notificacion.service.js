// Servicio de notificaciones removido.
// La persistencia y funciones de notificaciones fueron eliminadas; este archivo queda como marcador.

module.exports = {};

console.log(`✅ Notificación ${notificacionId} eliminada`);
return true;
}
catch (error) {
    console.error('❌ Error al eliminar notificación:', error);
    throw error;
}
}

/**
 * Limpiar notificaciones antiguas (ejecutar periódicamente)
 */
async limpiarNotificacionesAntiguas(dias = 90) {
        try {
            const result = await pool.query(
                `SELECT limpiar_notificaciones_antiguas($1) as eliminadas`, [dias]
            );

            // Servicio de notificaciones removido.
            // La persistencia y funciones de notificaciones fueron eliminadas; este archivo queda como marcador.
            return eliminadas;