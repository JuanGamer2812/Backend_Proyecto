const proveedorService = require('./src/services/proveedor.service');

async function test() {
    try {
        console.log('Probando actualización de proveedor...');
        const result = await proveedorService.updateProveedor(1, {
            nombre: 'Test Update',
            estado: true
        });
        console.log('Resultado:', result);
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

test();
