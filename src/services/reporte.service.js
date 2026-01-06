const PDFDocument = require('pdfkit');
const reporteModel = require('../models/reporte.models');

const SYSTEM_NAME = 'ÉCLAT';

const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (value) => {
    const d = parseDate(value);
    if (!d) return '';
    return d.toISOString().slice(0, 10);
};

const formatDateTime = (value) => {
    const d = value instanceof Date ? value : parseDate(value);
    if (!d) return '';
    return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)}`;
};

const normalizeProveedor = (row) => {
    const portafolioFile = row.portafolio_file_postu_proveedor || row.portafolio_file || row.archivo_portafolio || null;
    const portafolioLink = row.portafolio_link_postu_proveedor || row.portafolio_link || null;
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    return {
        categoria: row.categoria_postu_proveedor || row.categoria || null,
        nombreEmpresa: row.nom_empresa_postu_proveedor || row.nombre_empresa || row.nombre || null,
        correo: row.correo_postu_proveedor || row.correo || null,
        descripcion: row.portafolio_postu_proveedor || row.descripcion || row.portafolio || null,
        fechaPostulacion: row.fecha_postu_proveedor || row.fecha_postulacion || row.fecha || null,
        portafolioLink: portafolioLink,
        portafolioFile: portafolioFile ? `${baseUrl}/tmp_uploads/${portafolioFile}` : null,
    };
};

const normalizeTrabajador = (row) => {
    const nombres = row.nombres ||
        row.nombre ||
        row.nombre_usuario || [row.nombre1, row.nombre2].filter(Boolean).join(' ') || [row.nombre1_postu_trabajador, row.nombre2_postu_trabajador].filter(Boolean).join(' ') ||
        null;

    const apellidos = row.apellidos ||
        row.apellido_usuario || [row.apellido1, row.apellido2].filter(Boolean).join(' ') || [row.apellido1_postu_trabajador, row.apellido2_postu_trabajador].filter(Boolean).join(' ') ||
        row.apellido ||
        null;

    const fechaPost = row.fecha_postulacion ||
        row.fecha ||
        row.fecha_registro ||
        row.fecha_registro_usuario ||
        row.fecha_postu_trabajador ||
        row.created_at ||
        row.createdon ||
        null;

    const cvFileName = row.cv_url ||
        row.curriculum_url ||
        row.curriculum ||
        row.cv ||
        row.cv_path ||
        row.cv_postu_trabajador ||
        null;

    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    return {
        cedula: row.cedula ||
            row.cedula_trabajador ||
            row.cedula_postu_trabajador ||
            row.dni ||
            null,
        nombres,
        apellidos,
        fechaNacimiento: row.fecha_nacimiento ||
            row.fnacimiento ||
            row.fecha_nac ||
            row.fecha_naci_postu_trabajador ||
            null,
        correo: row.correo ||
            row.email ||
            row.correo_trabajador ||
            row.correo_usuario ||
            row.correo_postu_trabajador ||
            null,
        telefono: row.telefono ||
            row.telefono_trabajador ||
            row.telefono_usuario ||
            row.telefono_postu_trabajador ||
            null,
        cvUrl: cvFileName ? `${baseUrl}/tmp_uploads/${cvFileName}` : null,
        fechaPostulacion: fechaPost,
    };
};

const filterByDate = (items, from, to, getter) => {
    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (!fromDate && !toDate) return items;

    return items.filter((item) => {
        const d = parseDate(getter(item));
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
        }
        return true;
    });
};

const buildPdf = ({ title, typeLabel, filters, columns, rows }) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // Header
        doc.fillColor('#111827').fontSize(18).text(title, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#374151');
        doc.text(`Sistema: ${SYSTEM_NAME}`);
        doc.text(`Tipo de postulación: ${typeLabel}`);
        doc.text(`Rango aplicado: ${filters.from || 'N/A'} ${filters.to ? '→ ' + filters.to : ''}`);
        doc.text(`Fecha de generación: ${formatDateTime(new Date())}`);
        doc.moveDown(0.5);
        doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke('#e5e7eb');
        doc.moveDown(0.6);

        const startX = doc.page.margins.left;
        const endX = doc.page.width - doc.page.margins.right;
        const pageBottom = doc.page.height - doc.page.margins.bottom;

        const headerHeight = 20;
        const rowHeight = 18;

        const drawHeaderRow = (y) => {
            let x = startX;
            doc.save();
            doc.rect(startX, y, endX - startX, headerHeight).fill('#f3f4f6');
            doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
            columns.forEach((col) => {
                doc.text(col.header, x + 6, y + 5, { width: col.width - 12, ellipsis: true });
                x += col.width;
            });
            doc.restore();
        };

        const drawRow = (y, row, zebra) => {
            let x = startX;
            if (zebra) {
                doc.save();
                doc.rect(startX, y, endX - startX, rowHeight).fill('#fafafa');
                doc.restore();
            }
            doc.font('Helvetica').fontSize(10).fillColor('#111827');
            columns.forEach((col) => {
                const value = row[col.key];
                const text = value === null || value === undefined || value === '' ? '-' : String(value);
                doc.text(text, x + 6, y + 4, { width: col.width - 12, ellipsis: true });
                // cell border
                doc.rect(x, y, col.width, rowHeight).stroke('#e5e7eb');
                x += col.width;
            });
        };

        let y = doc.y;
        drawHeaderRow(y);
        y += headerHeight;

        rows.forEach((row, idx) => {
            // Page break if needed
            if (y + rowHeight > pageBottom) {
                doc.addPage();
                y = doc.page.margins.top;
                drawHeaderRow(y);
                y += headerHeight;
            }
            drawRow(y, row, idx % 2 === 1);
            y += rowHeight;
        });

        doc.end();
    });
};

const getProveedorData = async(filters = {}) => {
    const raw = await reporteModel.getProveedoresRaw();
    const mapped = raw.rows.map(normalizeProveedor);

    let filtered = filterByDate(mapped, filters.from, filters.to, (i) => i.fechaPostulacion);

    if (filters.categoria) {
        const cat = filters.categoria.toLowerCase();
        filtered = filtered.filter((i) => (i.categoria || '').toString().toLowerCase() === cat);
    }

    filtered.sort((a, b) => {
        const da = parseDate(a.fechaPostulacion)?.getTime() || 0;
        const db = parseDate(b.fechaPostulacion)?.getTime() || 0;
        return db - da;
    });

    return { items: filtered, meta: { table: raw.table, tableMissing: raw.tableMissing } };
};

const getTrabajadorData = async(filters = {}) => {
    const raw = await reporteModel.getTrabajadoresRaw();
    const mapped = raw.rows.map(normalizeTrabajador);

    let filtered = mapped;
    if ((filters.from || filters.to) && mapped.some(i => parseDate(i.fechaPostulacion))) {
        filtered = filterByDate(mapped, filters.from, filters.to, (i) => i.fechaPostulacion);
    }

    if (filters.tieneCv === true) {
        filtered = filtered.filter((i) => Boolean(i.cvUrl));
    } else if (filters.tieneCv === false) {
        filtered = filtered.filter((i) => !i.cvUrl);
    }

    filtered.sort((a, b) => {
        const da = parseDate(a.fechaPostulacion)?.getTime() || 0;
        const db = parseDate(b.fechaPostulacion)?.getTime() || 0;
        return db - da;
    });

    return { items: filtered, meta: { table: raw.table, tableMissing: raw.tableMissing } };
};

exports.getProveedores = async(filters = {}) => {
    return getProveedorData(filters);
};

exports.getTrabajadores = async(filters = {}) => {
    return getTrabajadorData(filters);
};

exports.getProveedoresPdf = async(filters = {}) => {
    const { items } = await getProveedorData(filters);
    const rows = items.map((i) => ({
        categoria: i.categoria || '-',
        empresa: i.nombreEmpresa || '-',
        correo: i.correo || '-',
        descripcion: i.descripcion || i.portafolioLink || i.portafolioFile || '-',
        fecha: formatDate(i.fechaPostulacion) || '-',
    }));

    const buffer = await buildPdf({
        title: 'Reportes HR – Postulaciones',
        typeLabel: 'Proveedores',
        filters,
        columns: [
            { header: 'Categoría', key: 'categoria', width: 80 },
            { header: 'Empresa', key: 'empresa', width: 130 },
            { header: 'Correo', key: 'correo', width: 120 },
            { header: 'Descripción / Portafolio', key: 'descripcion', width: 150 },
            { header: 'Fecha', key: 'fecha', width: 70 },
        ],
        rows,
    });

    return buffer;
};

exports.getTrabajadoresPdf = async(filters = {}) => {
    const { items } = await getTrabajadorData(filters);
    const rows = items.map((i) => ({
        cedula: i.cedula || '-',
        nombre: [i.nombres, i.apellidos].filter(Boolean).join(' ') || '-',
        correo: i.correo || '-',
        telefono: i.telefono || '-',
        fechaNac: formatDate(i.fechaNacimiento) || '-',
        fechaPost: formatDate(i.fechaPostulacion) || '-',
        cv: i.cvUrl ? 'Sí' : 'No',
    }));

    const buffer = await buildPdf({
        title: 'Reportes HR – Postulaciones',
        typeLabel: 'Trabajadores',
        filters,
        columns: [
            { header: 'Cédula', key: 'cedula', width: 70 },
            { header: 'Nombre completo', key: 'nombre', width: 130 },
            { header: 'Correo', key: 'correo', width: 100 },
            { header: 'Teléfono', key: 'telefono', width: 70 },
            { header: 'Fecha Nac.', key: 'fechaNac', width: 70 },
            { header: 'Fecha Post.', key: 'fechaPost', width: 70 },
            { header: 'CV', key: 'cv', width: 50 },
        ],
        rows,
    });

    return buffer;
};