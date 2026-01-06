const db = require('../config/db');

/**
 * Modelo para Categorías de Proveedores desde la tabla categoria
 */

const Categoria = {
    /**
     * Obtener todas las categorías activas desde la tabla categoria
     */
    findAll: async() => {
        try {
            const query = `
                SELECT 
                    id_tipo AS id_categoria,
                    nombre,
                    nombre AS icono
                FROM proveedor_tipo
                ORDER BY nombre ASC
            `;
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error en Categoria.findAll:', error);
            throw error;
        }
    },

    /**
     * Obtener categoría por nombre (para compatibilidad)
     */
    findByName: async(nombre) => {
        try {
            const query = `
                SELECT 
                    id_tipo AS id_categoria,
                    nombre,
                    nombre AS icono
                FROM proveedor_tipo
                WHERE nombre ILIKE $1
            `;
            const result = await db.query(query, [nombre]);
            return result.rows[0];
        } catch (error) {
            console.error('Error en Categoria.findByName:', error);
            throw error;
        }
    },

    /**
     * Obtener categoría por nombre
     */
    findByNombre: async(nombre) => {
        try {
            const query = `
                SELECT 
                    id_categoria,
                    nombre,
                    icono,
                    activo
                FROM categoria 
                WHERE nombre ILIKE $1
            `;
            const result = await db.query(query, [nombre]);
            return result.rows[0];
        } catch (error) {
            console.error('Error en Categoria.findByNombre:', error);
            throw error;
        }
    },

    /**
     * Crear nueva categoría
     */
    create: async(data) => {
        try {
            const query = `
                INSERT INTO categoria (nombre, icono, activo)
                VALUES ($1, $2, $3)
                RETURNING id_categoria, nombre, icono, activo
            `;
            const result = await db.query(query, [
                data.nombre,
                data.icono || null,
                data.activo !== undefined ? data.activo : true
            ]);
            return result.rows[0];
        } catch (error) {
            console.error('Error en Categoria.create:', error);
            throw error;
        }
    }
};

module.exports = Categoria;