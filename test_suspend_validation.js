require('dotenv').config();
const http = require('http');

// Test suspender sin razon_rechazo (debería dar 400)
const testData = {
    estado_aprobacion: 'suspendido'
        // Sin razon_rechazo - debería fallar
};

const data = JSON.stringify(testData);

console.log('Enviando PUT a /api/proveedor/2 con body:', testData);

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/proveedor/2',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
        'Content-Length': data.length
    }
}, (res) => {
    console.log('Status:', res.statusCode);
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Response:', body);
        process.exit(res.statusCode === 400 ? 0 : 1);
    });
});

req.on('error', err => {
    console.error('Error:', err.message);
    process.exit(1);
});

req.write(data);
req.end();