const reporteService = require('../services/reporte.service');

const parseBoolean = (value) => {
    if (value === undefined || value === null) return undefined;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
};

exports.getProveedores = async(req, res) => {
    try {
        const { from, to, categoria } = req.query;
        const result = await reporteService.getProveedores({ from, to, categoria });
        res.json(result.items);
    } catch (error) {
        console.error('[reporte.controller] getProveedores error:', error);
        res.status(500).json({ error: 'No se pudo obtener el reporte de proveedores' });
    }
};

exports.getTrabajadores = async(req, res) => {
    try {
        const { from, to, tieneCv } = req.query;
        const result = await reporteService.getTrabajadores({ from, to, tieneCv: parseBoolean(tieneCv) });
        res.json(result.items);
    } catch (error) {
        console.error('[reporte.controller] getTrabajadores error:', error);
        res.status(500).json({ error: 'No se pudo obtener el reporte de trabajadores' });
    }
};

exports.getProveedoresPdf = async(req, res) => {
    try {
        const { from, to, categoria } = req.query;
        const buffer = await reporteService.getProveedoresPdf({ from, to, categoria });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte-proveedores.pdf"');
        res.send(buffer);
    } catch (error) {
        console.error('[reporte.controller] getProveedoresPdf error:', error);
        res.status(500).json({ error: 'No se pudo generar el PDF de proveedores' });
    }
};

exports.getTrabajadoresPdf = async(req, res) => {
    try {
        const { from, to, tieneCv } = req.query;
        const buffer = await reporteService.getTrabajadoresPdf({ from, to, tieneCv: parseBoolean(tieneCv) });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte-trabajadores.pdf"');
        res.send(buffer);
    } catch (error) {
        console.error('[reporte.controller] getTrabajadoresPdf error:', error);
        res.status(500).json({ error: 'No se pudo generar el PDF de trabajadores' });
    }
};