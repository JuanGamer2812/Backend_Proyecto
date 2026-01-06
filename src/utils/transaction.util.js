const db = require('../config/db');

/**
 * Ejecuta una función dentro de una transacción
 * Si la función falla, hace rollback automático
 * 
 * @param {Function} callback - Función async que ejecuta las queries
 * @returns {Promise} Resultado de la transacción
 * 
 * @example
 * await executeTransaction(async (client) => {
 *   await client.query('INSERT INTO tabla1 VALUES ($1)', [valor1]);
 *   await client.query('INSERT INTO tabla2 VALUES ($1)', [valor2]);
 *   return { success: true };
 * });
 */
const executeTransaction = async (callback) => {
    const client = await db.connect();
    
    try {
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Ejecutar operaciones
        const result = await callback(client);
        
        // Confirmar transacción
        await client.query('COMMIT');
        
        return result;
    } catch (error) {
        // Revertir transacción en caso de error
        await client.query('ROLLBACK');
        throw error;
    } finally {
        // Liberar cliente
        client.release();
    }
};

/**
 * Verifica el nivel de aislamiento de la transacción
 */
const setIsolationLevel = async (client, level = 'READ COMMITTED') => {
    /**
     * Niveles disponibles:
     * - READ UNCOMMITTED
     * - READ COMMITTED (default)
     * - REPEATABLE READ
     * - SERIALIZABLE
     */
    await client.query(`SET TRANSACTION ISOLATION LEVEL ${level}`);
};

/**
 * Crea un savepoint dentro de una transacción
 */
const createSavepoint = async (client, name) => {
    await client.query(`SAVEPOINT ${name}`);
};

/**
 * Retrocede a un savepoint específico
 */
const rollbackToSavepoint = async (client, name) => {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
};

/**
 * Libera un savepoint
 */
const releaseSavepoint = async (client, name) => {
    await client.query(`RELEASE SAVEPOINT ${name}`);
};

/**
 * Ejecuta múltiples operaciones con savepoints
 * Permite rollback parcial en caso de error
 */
const executeWithSavepoints = async (operations) => {
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        
        const results = [];
        
        for (let i = 0; i < operations.length; i++) {
            const savepointName = `sp_${i}`;
            
            try {
                await createSavepoint(client, savepointName);
                const result = await operations[i](client);
                results.push({ success: true, result });
                await releaseSavepoint(client, savepointName);
            } catch (error) {
                await rollbackToSavepoint(client, savepointName);
                results.push({ success: false, error: error.message });
                
                // Decidir si continuar o detener
                if (operations[i].critical) {
                    throw error;
                }
            }
        }
        
        await client.query('COMMIT');
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Lock de fila para evitar lecturas concurrentes
 */
const lockRow = async (client, table, id, lockType = 'FOR UPDATE') => {
    /**
     * Tipos de lock:
     * - FOR UPDATE: Bloqueo exclusivo
     * - FOR NO KEY UPDATE: Permite otras operaciones que no modifican la clave
     * - FOR SHARE: Bloqueo compartido
     * - FOR KEY SHARE: Bloqueo compartido solo en la clave
     */
    return await client.query(
        `SELECT * FROM ${table} WHERE id = $1 ${lockType}`,
        [id]
    );
};

module.exports = {
    executeTransaction,
    setIsolationLevel,
    createSavepoint,
    rollbackToSavepoint,
    releaseSavepoint,
    executeWithSavepoints,
    lockRow
};
