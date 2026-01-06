const http = require('http');

const postData = JSON.stringify({
    email: 'test@test.com',
    password: 'password123'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 5000
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response:', data);
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    console.error(`Code: ${e.code}`);
    process.exit(1);
});

req.on('timeout', () => {
    console.error('Request timeout');
    req.destroy();
    process.exit(1);
});

console.log('Sending login request...');
req.write(postData);
req.end();