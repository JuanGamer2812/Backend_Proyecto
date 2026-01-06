const http = require('http');

console.log('Test starting...');

const data = JSON.stringify({ email: 'admin@test.com', password: 'admin123' });

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    },
    timeout: 3000
}, (res) => {
    console.log('Got response, status:', res.statusCode);
    let body = '';
    res.on('data', (chunk) => {
        console.log('Got chunk:', chunk.length, 'bytes');
        body += chunk;
    });
    res.on('end', () => {
        console.log('Response complete');
        console.log('Body:', body);
        process.exit(0);
    });
});

req.on('error', (err) => {
    console.error('Request failed:', err.code, '-', err.message);
    process.exit(1);
});

req.on('timeout', () => {
    console.error('Request timeout');
    req.destroy();
    process.exit(1);
});

console.log('Sending POST request to localhost:5000/api/auth/login');
req.write(data);
req.end();

setTimeout(() => {
    console.error('No response after 5 seconds');
    process.exit(1);
}, 5000);