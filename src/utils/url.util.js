const BASE_URL = process.env.BACKEND_PUBLIC_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;

const makeAbsoluteUrl = (relative) => {
    if (!relative) return null;
    // If already absolute, return as is
    if (String(relative).startsWith('http://') || String(relative).startsWith('https://')) {
        return relative;
    }
    // Ensure leading slash
    const rel = relative.startsWith('/') ? relative : `/${relative}`;
    return `${BASE_URL}${rel}`;
};

module.exports = { makeAbsoluteUrl, BASE_URL };