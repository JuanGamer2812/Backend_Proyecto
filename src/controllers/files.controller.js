const cloudinaryConfig = require('../config/cloudinary.config');
const { URL } = require('url');

exports.getSignedUrl = async(req, res) => {
    try {
        const publicId = req.query.publicId || req.body && req.body.publicId;
        const resourceType = req.query.resourceType || req.body && req.body.resourceType || 'image';
        if (!publicId) return res.status(400).json({ error: 'publicId required' });

        // Prefer Cloudinary when configured
        const cloud = cloudinaryConfig.cloudinary || cloudinaryConfig;

        if (cloud && cloud.api && typeof cloud.api.resource === 'function') {
            // Check resource exists -> if not, return 404
            try {
                await cloud.api.resource(publicId, { resource_type: resourceType });
            } catch (apiErr) {
                // Cloudinary returns http_code 404 when resource missing
                if (apiErr && (apiErr.http_code === 404 || apiErr.status_code === 404)) {
                    return res.status(404).json({ error: 'resource not found' });
                }
                // For other errors, log and continue to attempt signing
                console.warn('[files.controller] cloudinary api.resource warning', apiErr && apiErr.message);
            }

            try {
                const opts = { sign_url: true, resource_type: resourceType };
                const signedUrl = cloud.url(publicId, opts);
                // Return both keys to be tolerant with frontend
                return res.json({ signedUrl, url: signedUrl });
            } catch (errUrl) {
                console.error('[files.controller] cloudinary url error', errUrl);
                return res.status(500).json({ error: 'unable to sign url' });
            }
        }

        // Fallback: if no cloudinary available, try to return local/public URL
        // If files are served from /uploads, construct a URL relative to host
        const rawUrl = `/uploads/${decodeURIComponent(publicId)}`;
        return res.json({ signedUrl: rawUrl, url: rawUrl });
    } catch (err) {
        console.error('[files.controller] getSignedUrl error', err);
        return res.status(500).json({ error: 'unable to sign url' });
    }
};

exports.proxy = async(req, res) => {
    try {
        let url = req.query.url;
        if (!url) return res.status(400).json({ error: 'url required' });

        // Decodificar la URL si viene doblemente encodificada (%2520 -> %20)
        let decodeSafety = 0;
        while (url.includes('%25') && decodeSafety < 3) {
            url = decodeURIComponent(url);
            decodeSafety += 1;
            console.log('[proxy] URL decodificada (tenia encoding extra):', url);
        }

        let parsed;
        try { parsed = new URL(url); } catch (e) { return res.status(400).json({ error: 'invalid url' }); }
        if (!parsed.hostname.endsWith('cloudinary.com')) return res.status(400).json({ error: 'host not allowed' });

        // Construir candidatos: URL decodificada, versión con espacios normalizados y versión con extensión .pdf
        const candidates = new Set();
        const buildUrl = (pathname) => `${parsed.origin}${pathname}${parsed.search}`;

        const decodedPath = decodeURIComponent(parsed.pathname);
        candidates.add(url);

        // Normalizar espacios múltiples a uno
        const normalizedSpaces = decodedPath.replace(/\s{2,}/g, ' ');
        if (normalizedSpaces !== decodedPath) {
            candidates.add(buildUrl(encodeURI(normalizedSpaces)));
        }

        const lastSegment = decodedPath.split('/').pop() || '';
        const hasExtension = lastSegment.includes('.');
        if (!hasExtension) {
            candidates.add(buildUrl(encodeURI(`${decodedPath}.pdf`)));
            if (normalizedSpaces !== decodedPath) {
                candidates.add(buildUrl(encodeURI(`${normalizedSpaces}.pdf`)));
            }
        }

        // Usar fetch si está disponible
        const fetchFn = global.fetch || (await import('node-fetch')).default;

        let chosenBuffer = null;
        let chosenType = null;
        let chosenStatus = null;

        for (const candidate of candidates) {
            console.log('[proxy] Fetching URL candidate:', candidate);
            let response;
            try {
                response = await fetchFn(candidate);
            } catch (fe) {
                console.warn('[proxy] fetch failed for candidate', candidate, fe);
                continue;
            }

            chosenStatus = response.status;
            console.log('[proxy] Cloudinary response status:', response.status);
            if (!response.ok) {
                console.log('[proxy] Cloudinary returned error:', response.status);
                continue;
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            const upstreamType = response.headers.get('content-type') || 'application/octet-stream';
            const pathLower = new URL(candidate).pathname.toLowerCase();
            const isPdfInPath = pathLower.includes('.pdf') || pathLower.includes('/documentos/');
            const hasPdfMagic = buffer.length >= 5 &&
                buffer[0] === 0x25 &&
                buffer[1] === 0x50 &&
                buffer[2] === 0x44 &&
                buffer[3] === 0x46 &&
                buffer[4] === 0x2d;

            console.log('[proxy] upstreamType:', upstreamType, 'isPdfInPath:', isPdfInPath, 'hasPdfMagic:', hasPdfMagic, 'bufferLength:', buffer.length);

            let contentType = upstreamType;
            if (!upstreamType || upstreamType === 'application/octet-stream' || upstreamType === 'text/html') {
                if (hasPdfMagic || isPdfInPath) {
                    contentType = 'application/pdf';
                }
            }

            // Si no se detecta PDF y el contenido parece HTML, probar siguiente candidato
            if (contentType === 'text/html' && !hasPdfMagic && !isPdfInPath) {
                continue;
            }

            chosenBuffer = buffer;
            chosenType = contentType;
            break;
        }

        if (!chosenBuffer) {
            const statusToSend = chosenStatus && chosenStatus >= 400 ? chosenStatus : 404;
            return res.status(statusToSend).json({ error: 'resource not found' });
        }

        console.log('[proxy] final contentType:', chosenType);
        res.set('content-type', chosenType || 'application/pdf');
        res.set('content-disposition', 'inline');
        res.send(chosenBuffer);
    } catch (err) {
        console.error('[files.controller] proxy error', err);
        res.status(500).json({ error: 'proxy failed' });
    }
};

module.exports = exports;
