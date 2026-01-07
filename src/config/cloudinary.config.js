const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configurar Cloudinary con las credenciales del .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Sube una imagen a Cloudinary desde un archivo local
 * @param {string} filePath - Ruta del archivo local
 * @param {string} folder - Carpeta en Cloudinary (opcional)
 * @returns {Promise<Object>} - Objeto con secure_url y public_id
 */
const uploadImage = async (filePath, folder = 'eclat') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: 'auto'
        });
        return {
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};

/**
 * Sube una imagen/archivo a Cloudinary desde un buffer (multer)
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} folder - Carpeta en Cloudinary (opcional)
 * @param {Object} options - Opciones adicionales (formato, transformaciones, etc.)
 * @returns {Promise<Object>} - Objeto con secure_url y public_id
 */
const uploadImageBuffer = (buffer, folder = 'eclat', options = {}) => {
    return new Promise((resolve, reject) => {
        // Validar que el buffer existe y no está vacío
        if (!buffer || buffer.length === 0) {
            reject(new Error('Empty file'));
            return;
        }

        console.log('[Cloudinary] Iniciando subida:', {
            folder,
            bufferLength: buffer.length,
            bufferSize: `${(buffer.length / 1024).toFixed(2)} KB`,
            options
        });

        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder: folder, 
                resource_type: 'auto', // auto detecta imágenes, videos, PDFs, etc.
                ...options 
            },
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary] Error al subir archivo:', {
                        error: error.message,
                        http_code: error.http_code,
                        folder
                    });
                    reject(error);
                } else {
                    console.log('[Cloudinary] ✅ Archivo subido exitosamente:', {
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        resourceType: result.resource_type,
                        bytes: result.bytes
                    });
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        resourceType: result.resource_type
                    });
                }
            }
        );
        
        uploadStream.end(buffer);
    });
};

/**
 * Sube un archivo (PDF, DOC, etc.) a Cloudinary como raw
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} folder - Carpeta en Cloudinary (opcional)
 * @param {string} originalFilename - Nombre original del archivo
 * @returns {Promise<Object>} - Objeto con secure_url y public_id
 */
const uploadFileBuffer = (buffer, folder = 'eclat', originalFilename = 'file') => {
    return new Promise((resolve, reject) => {
        // Validar que el buffer existe y no está vacío
        if (!buffer || buffer.length === 0) {
            reject(new Error('Empty file'));
            return;
        }

        console.log('[Cloudinary] Iniciando subida de archivo (raw):', {
            folder,
            originalFilename,
            bufferLength: buffer.length,
            bufferSize: `${(buffer.length / 1024).toFixed(2)} KB`
        });

        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder: folder, 
                resource_type: 'raw', // raw para PDFs, documentos, etc.
                public_id: originalFilename.replace(/\.[^/.]+$/, ''), // nombre sin extensión
                use_filename: true,
                unique_filename: true
            },
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary] Error al subir archivo raw:', {
                        error: error.message,
                        http_code: error.http_code,
                        folder,
                        originalFilename
                    });
                    reject(error);
                } else {
                    console.log('[Cloudinary] ✅ Archivo raw subido exitosamente:', {
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        resourceType: result.resource_type,
                        bytes: result.bytes
                    });
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        resourceType: result.resource_type
                    });
                }
            }
        );
        
        uploadStream.end(buffer);
    });
};

/**
 * Elimina una imagen de Cloudinary
 * @param {string} publicId - ID público de la imagen en Cloudinary
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
};

module.exports = {
    uploadImage,
    uploadImageBuffer,
    uploadFileBuffer,
    deleteImage,
    cloudinary
};
