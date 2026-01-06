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
 * Sube una imagen a Cloudinary desde un buffer (multer)
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} folder - Carpeta en Cloudinary (opcional)
 * @returns {Promise<Object>} - Objeto con secure_url y public_id
 */
const uploadImageBuffer = (buffer, folder = 'eclat') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folder, resource_type: 'auto' },
            (error, result) => {
                if (error) {
                    console.error('Error uploading to Cloudinary:', error);
                    reject(error);
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id
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
    deleteImage,
    cloudinary
};
