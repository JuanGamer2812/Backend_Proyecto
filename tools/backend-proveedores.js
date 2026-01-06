const express = require('express');
const router = express.Router();

// Importar rutas de proveedores
const trabajaNosotrosProveedorRoutes = require('../src/routes/trabaja_nosotros_proveedor.routes');
const proveedorRoutes = require('../src/routes/proveedor.routes');
const categoriaRoutes = require('../src/routes/categoria.routes');
const planRoutes = require('../src/routes/plan.routes');

// Registrar rutas de proveedores
router.use('/trabaja_nosotros_proveedor', trabajaNosotrosProveedorRoutes);
router.use('/trabajanosotros', trabajaNosotrosProveedorRoutes); // Alias para frontend
router.use('/proveedor', proveedorRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/planes', planRoutes);

module.exports = router;