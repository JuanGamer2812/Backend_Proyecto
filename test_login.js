const http = require('http');

async function testLogin() {
    const postData = JSON.stringify({
        email: 'ana.garcia@email.com',
        password: 'ana123'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log('🧪 Probando login con credenciales...');
    console.log('Email: ana.garcia@email.com');
    console.log('Password: ana123\n');

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ LOGIN EXITOSO');
                console.log('Response:', JSON.parse(data));
            } else {
                console.log('❌ LOGIN FALLÓ');
                console.log('Status:', res.statusCode);
                console.log('Error:', JSON.parse(data));
            }
        });
    });

    req.on('error', (error) => {
        console.log('❌ ERROR DE CONEXIÓN');
        console.log('Error:', error.message);
    });

    req.write(postData);
    req.end();
}

testLogin();
