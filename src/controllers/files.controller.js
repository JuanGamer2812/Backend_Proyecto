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
        const url = req.query.url;
        if (!url) return res.status(400).json({ error: 'url required' });
        let parsed;
        try { parsed = new URL(url); } catch (e) { return res.status(400).json({ error: 'invalid url' }); }
        if (!parsed.hostname.endsWith('cloudinary.com')) return res.status(400).json({ error: 'host not allowed' });

        // Use fetch if available
        const fetchFn = global.fetch || (await
            import ('node-fetch')).default;
        const r = await fetchFn(url);
        if (!r.ok) return res.status(r.status).end();
        const upstreamType = r.headers.get('content-type') || 'application/octet-stream';
        const isPdfHint = parsed.pathname.toLowerCase().includes('.pdf');
        const contentType = (upstreamType === 'application/octet-stream' && isPdfHint)
            ? 'application/pdf'
            : upstreamType;
        res.set('content-type', contentType);
        res.set('content-disposition', 'inline');
        // Stream body
        if (r.body && r.body.pipe) {
            r.body.pipe(res);
        } else {
            const buffer = await r.arrayBuffer();
            res.send(Buffer.from(buffer));
        }
    } catch (err) {
        console.error('[files.controller] proxy error', err);
        res.status(500).json({ error: 'proxy failed' });
    }
};

module.exports = exports;
