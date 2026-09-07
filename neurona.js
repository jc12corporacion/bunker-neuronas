const WebSocket = require('ws');

// Usamos la variable de entorno de Render o una alternativa por defecto si corre local
const BINANCE_URL = process.env.BINANCE_WS_URL || 'wss://stream.binance.us:9443/ws';

console.log(`Conectando a Binance mediante: ${BINANCE_URL}`);

function conectarWebSocket() {
    const ws = new WebSocket(BINANCE_URL);

    ws.on('open', function open() {
        console.log('¡Conectado exitosamente al WebSocket de Binance!');
    });

    ws.on('message', function incoming(data) {
        // Aquí procesas los datos de tu bot de trading
        const mensaje = JSON.parse(data);
        console.log('Datos recibidos:', mensaje);
    });

    ws.on('error', function error(err) {
        console.error('Error en el WebSocket:', err.message);
    });

    ws.on('close', function close() {
        console.log('Conexión cerrada. Intentando reconectar en 5 segundos...');
        setTimeout(conectarWebSocket, 5000);
    });
}

// Arrancar la conexión
conectarWebSocket();

// Servidor HTTP básico para mantener el servicio activo en el puerto 10000 para Render
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Búnker Cloud Pro - Neurona activa y operando\n');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Neurona activa y operando en el puerto ${PORT}`);
});

