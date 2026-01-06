const app = require('./src/app');
const http = require('http');
const socketService = require('./src/services/socket.service');
const proveedoresRouter = require('./tools/backend-proveedores');

const PORT = process.env.PORT || 5000;

// Registrar rutas de proveedores
app.use('/api', proveedoresRouter);

console.log('[index.js] Creating HTTP server...');
// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar Socket.IO para notificaciones en tiempo real y chat
console.log('[index.js] Initializing Socket.IO...');
socketService.initializeSocketIO(server);

server.on('error', (err) => {
    console.error('[Server Error]:', err);
});

server.on('clientError', (err, socket) => {
    console.error('[Client Error]:', err);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

console.log('[index.js] Starting server on port', PORT);
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🔌 WebSockets habilitados en puerto ${PORT}`);
    console.log(`🌍 Escuchando en todas las interfaces (0.0.0.0)`);
});

server.on('listening', () => {
    console.log('[Server] Listening event fired');
});

// Manejar promesas no capturadas
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});