const WebSocket = require('ws');
const http = require('http');

// Configuración de puertos y URLs desde variables de entorno (Blindaje geográfico)
const PORT = process.env.PORT || 10000;
const BINANCE_WS_URL = process.env.BINANCE_WS_URL || 'wss://stream.binance.us:9443/ws';

// Servidor HTTP básico para mantener el servicio activo en Render y servir endpoints de estado
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        status: 'online', 
        engine: 'Búnker Cloud Pro',
        timestamp: Date.now() 
    }));
});

// Configuración del WebSocket para el motor gráfico de Canvas
const wss = new WebSocket.Server({ server });

let ultimasCotizaciones = {};

function conectarBinance() {
    console.log(`Conectando a Binance mediante: ${BINANCE_WS_URL}`);
    const wsBinance = new WebSocket(BINANCE_WS_URL);

    wsBinance.on('open', () => {
        console.log('¡Conectado exitosamente al WebSocket de Binance!');
        
        // Suscripción a múltiples streams (Ejemplo: BTC, ETH, y pares principales configurados)
        const payload = {
            method: "SUBSCRIBE",
            params: [
                "btcusdt@ticker",
                "ethusdt@ticker",
                "eurusdt@ticker" // Agrega aquí los demás pares que necesites
            ],
            id: 1
        };
        wsBinance.send(JSON.stringify(payload));
    });

    wsBinance.on('message', (data) => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.s && parsed.c) {
                // Organizar la cotización por activo con marca de tiempo milimétrica
                ultimasCotizaciones[parsed.s] = {
                    simbolo: parsed.s,
                    precio: parsed.c,
                    cambio: parsed.P,
                    tiempo: Date.now()
                };

                // Reenviar en milisegundos a todos los clientes conectados al motor de Canvas
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(ultimasCotizaciones[parsed.s]));
                    }
                });
            }
        } catch (e) {
            console.error('Error procesando trama de datos:', e.message);
        }
    });

    wsBinance.on('error', (error) => {
        console.error('Error en la conexión WebSocket:', error.message);
    });

    wsBinance.on('close', () => {
        console.log('Conexión cerrada. Intentando reconectar en 5 segundos...');
        setTimeout(conectarBinance, 5000);
    });
}

server.listen(PORT, () => {
    console.log(`Neurona activa y operando en el puerto ${PORT}`);
    conectarBinance();
});

