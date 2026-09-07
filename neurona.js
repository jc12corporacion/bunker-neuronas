const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const mercadoCache = new Map();

function generarSecureX(simbolo, precio) {
    const timestamp = Date.now();
    const salt = crypto.randomBytes(4).toString('hex');
    const payload = `${simbolo}:${precio}:${timestamp}:${salt}`;
    const firma = crypto.createHmac('sha256', 'bunker-secret-key-pro').update(payload).digest('hex');
    
    return {
        simbolo,
        precio,
        timestamp,
        securex_hash: firma
    };
}

function conectarBinance() {
    const wsBinance = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

    wsBinance.on('message', (data) => {
        try {
            const tickers = JSON.parse(data);
            tickers.forEach(ticker => {
                if (ticker.s.endsWith('USDT')) {
                    const simbolo = ticker.s;
                    const precio = parseFloat(ticker.c);
                    mercadoCache.set(simbolo, precio);
                    broadcast(generarSecureX(simbolo, precio));
                }
            });
        } catch (e) {
            console.error('Error:', e.message);
        }
    });

    wsBinance.on('close', () => {
        setTimeout(conectarBinance, 5000);
    });
}

function broadcast(data) {
    const mensaje = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(mensaje);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('Cliente web conectado al Búnker.');
    mercadoCache.forEach((precio, simbolo) => {
        ws.send(JSON.stringify(generarSecureX(simbolo, precio)));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Neurona activa y operando en el puerto ${PORT}`);
    conectarBinance();
});

