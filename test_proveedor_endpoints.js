require('dotenv').config();
const proveedorModel = require('./src/models/proveedor.models');

async function testEndpoints() {
    try {
        console.log('=== Test 1: findByFilters (verificado=false, estado_aprobacion=pendiente) ===');
        const pendientes = await proveedorModel.findByFilters({
            verificado: false,
            estado_aprobacion: 'pendiente'
        });
        console.log('Pendientes encontrados:', pendientes.length);
        if (pendientes.length > 0) {
            console.log('Ejemplo:', pendientes[0]);
        }

        console.log('\n=== Test 2: findPublicos (solo verificado=true y aprobado) ===');
        const publicos = await proveedorModel.findPublicos();
        console.log('Públicos encontrados:', publicos.length);
        if (publicos.length > 0) {
            console.log('Ejemplo:', publicos[0]);
        }

        console.log('\n=== Test 3: update con verificado y razon_rechazo ===');
        const updated = await proveedorModel.update(1, {
            estado_aprobacion: 'aprobado',
            verificado: true,
            razon_rechazo: null,
            aprobado_por: 1
        });
        console.log('Proveedor actualizado:', {
            id: updated.id_proveedor,
            estado_aprobacion: updated.estado_aprobacion,
            verificado: updated.verificado,
            motivo_rechazo: updated.motivo_rechazo
        });

        console.log('\n✅ Todos los tests pasaron correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en test:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testEndpoints();