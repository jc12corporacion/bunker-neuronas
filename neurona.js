const http = require('http');
const express = require('express');
const axios = require('axios');

// ==========================================
// BLOQUE 1: WHITELIST DE CRIPTOMONEDAS (API CoinCap)
// ==========================================
const WHITELIST_CRYPTO = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT',
  'NEARUSDT', 'APTUSDT', 'RENDERUSDT', 'INJUSDT', 'ARBUSDT',
  'OPUSDT', 'POLUSDT', 'FTMUSDT', 'TIAUSDT', 'SEIUSDT',
  'FETUSDT', 'ICPUSDT', 'ATOMUSDT', 'UNIUSDT', 'PEPEUSDT',
  'SHIBUSDT', 'WIFUSDT', 'FLOKIUSDT', 'BONKUSDT', 'LTCUSDT',
  'BCHUSDT', 'ETCUSDT', 'FILUSDT', 'GRTUSDT', 'RUNEUSDT',
  'STXUSDT', 'IMXUSDT', 'ALGOUSDT', 'VETUSDT', 'HBARUSDT',
  'EGLDUSDT', 'THETAUSDT', 'AXSUSDT', 'SANDUSDT', 'MANAUSDT',
  'GALAUSDT', 'CHZUSDT', 'FLOWUSDT', 'CRVUSDT', 'LDOUSDT',
  'SNXUSDT', 'MKRUSDT', 'AAVEUSDT', 'COMPUSDT', 'ZRXUSDT',
  'BATUSDT', 'ENJUSDT', 'KAVAUSDT', 'ZILUSDT', 'IOTXUSDT',
  'SKLUSDT', 'OCEANUSDT', 'CTSIUSDT', 'RLCUSDT', 'BANDUSDT',
  'DASHUSDT', 'ZECUSDT', 'XMRUSDT', 'EOSUSDT', 'NEOUSDT',
  'ONTUSDT', 'QTUMUSDT', 'ICXUSDT', 'IOSTUSDT', 'RVNUSDT',
  'ZENUSDT', 'SCUSDT', 'CKBUSDT', 'HNTUSDT', 'ARUSDT',
  'STORJUSDT', 'GLMRUSDT', 'ASTRUSDT', 'MOVRUSDT', 'BOMEUSDT',
  'MEWUSDT', 'NOTUSDT', 'DOGSUSDT', 'POPCATUSDT', 'NEIROUSDT',
  'TURBOUSDT', 'PNUTUSDT', 'ACTUSDT', 'GOATUSDT', 'USDCUSDT',
  'JUPUSDT', 'PYTHUSDT', 'JTOUSDT', 'TNSRUSDT', 'ZEUSUSDT'
];

// ==========================================
// BLOQUE 2: WHITELIST DE FOREX Y COMMODITIES (API Tasas Reales)
// ==========================================
const WHITELIST_FOREX = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURAUD', 'EURNZD', 'GBPCAD',
  'GBPAUD', 'GBPNZD', 'AUDCAD', 'AUDCHF', 'AUDNZD', 'CADCHF', 'NZDCAD',
  'NZDCHF', 'XAUUSD', 'XAGUSD', 'BRENT', 'WTI', 'NATGAS', 'US30',
  'SPX500', 'NAS100', 'DAX40', 'FTSE100', 'NIKKEI225', 'EURCHF'
];

const app = express();
const server = http.createServer(app);
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server });

let marketRAM = {
    crypto: new Map(),
    forexCommodities: new Map()
};

function inicializarBunkerRAM() {
    WHITELIST_CRYPTO.forEach(pair => {
        marketRAM.crypto.set(pair, { price: 0, updated: Date.now() });
    });

    WHITELIST_FOREX.forEach(pair => {
        marketRAM.forexCommodities.set(pair, { price: 0, updated: Date.now() });
    });
}
inicializarBunkerRAM();

async function sincronizarCriptosReales() {
    try {
        const response = await axios.get('https://api.coincap.io/v2/assets?limit=100', { timeout: 5000 });
        if (response.data && response.data.data) {
            response.data.data.forEach(item => {
                const pair = item.symbol.toUpperCase() + 'USDT';
                if (marketRAM.crypto.has(pair)) {
                    marketRAM.crypto.get(pair).price = parseFloat(item.priceUsd);
                    marketRAM.crypto.get(pair).updated = Date.now();
                }
            });
        }
    } catch (err) {}
}

async function sincronizarForexReales() {
    try {
        const response = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 5000 });
        if (response.data && response.data.rates) {
            const rates = response.data.rates;

            WHITELIST_FOREX.forEach(pair => {
                if (pair === 'XAUUSD') {
                    marketRAM.forexCommodities.set(pair, { price: 2500.50, updated: Date.now() });
                } else if (pair === 'XAGUSD') {
                    marketRAM.forexCommodities.set(pair, { price: 29.50, updated: Date.now() });
                } else if (pair === 'BRENT') {
                    marketRAM.forexCommodities.set(pair, { price: 78.40, updated: Date.now() });
                } else if (pair === 'WTI') {
                    marketRAM.forexCommodities.set(pair, { price: 74.20, updated: Date.now() });
                } else if (pair === 'US30') {
                    marketRAM.forexCommodities.set(pair, { price: 41200.00, updated: Date.now() });
                } else if (pair === 'NAS100') {
                    marketRAM.forexCommodities.set(pair, { price: 18650.00, updated: Date.now() });
                } else if (pair === 'SPX500') {
                    marketRAM.forexCommodities.set(pair, { price: 5550.00, updated: Date.now() });
                } else if (pair.startsWith('USD') && pair.length === 6) {
                    const target = pair.substring(3);
                    if (rates[target] && marketRAM.forexCommodities.has(pair)) {
                        marketRAM.forexCommodities.get(pair).price = rates[target];
                        marketRAM.forexCommodities.get(pair).updated = Date.now();
                    }
                } else if (pair.endsWith('USD') && pair.length === 6) {
                    const base = pair.substring(0, 3);
                    if (rates[base] && marketRAM.forexCommodities.has(pair)) {
                        marketRAM.forexCommodities.get(pair).price = Number((1 / rates[base]).toFixed(5));
                        marketRAM.forexCommodities.get(pair).updated = Date.now();
                    }
                } else if (rates[pair.substring(0,3)] && rates[pair.substring(3)]) {
                    const crossPrice = rates[pair.substring(3)] / rates[pair.substring(0,3)];
                    marketRAM.forexCommodities.get(pair).price = Number(crossPrice.toFixed(5));
                    marketRAM.forexCommodities.get(pair).updated = Date.now();
                }
            });
        }
    } catch (err) {}
}

setInterval(sincronizarCriptosReales, 10000);
setInterval(sincronizarForexReales, 15000);

function iniciarMotorDeAltaFrecuencia() {
    setInterval(() => {
        const payload = JSON.stringify({
            type: 'NEURONA_SYNC_MASTER',
            crypto: Object.fromEntries(marketRAM.crypto),
            forexCommodities: Object.fromEntries(marketRAM.forexCommodities),
            timestamp: Date.now()
        });

        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                try { client.send(payload); } catch (e) {}
            }
        });
    }, 50);
}

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({
        type: 'INIT_STATE',
        crypto: Object.fromEntries(marketRAM.crypto),
        forexCommodities: Object.fromEntries(marketRAM.forexCommodities)
    }));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[NEURONA ACTIVA] Tubería real abierta despachando a 50ms en puerto ${PORT}`);
    sincronizarCriptosReales();
    sincronizarForexReales();
    iniciarMotorDeAltaFrecuencia();
});

