const http = require('http');

console.log('Starting test...');

setTimeout(() => {
    const data = JSON.stringify({ email: 'admin@test.com', password: 'admin123' });

    const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            console.log('Body:', body);
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error('Error:', e.message);
        process.exit(1);
    });

    console.log('Sending request...');
    req.write(data);
    req.end();
}, 500);