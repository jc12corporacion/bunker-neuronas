const http = require('http');
const express = require('express');
const axios = require('axios');

// 1. Los 100 pares de criptomonedas
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

// 2. Los 34 pares de Forex y Commodities
const FOREX_COMMODITIES_LIST = [
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD",
  "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "CADJPY", "CHFJPY", "NZDJPY",
  "EURAUD", "EURCAD", "EURNZD", "GBPAUD", "GBPCAD", "GBPNZD", "AUDCAD",
  "AUDNZD", "NZDCAD", "USDZAR", "USDMXN", "USDTRY", "USDBRL", 
  "XAUUSD", "XAGUSD", "WTIUSD", "BRENT", "COPPER", "NATGAS", "PLATIN"
];

const app = express();
const server = http.createServer(app);
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server });

let marketRAM = {
    crypto: new Map(),
    forexCommodities: new Map()
};

// Inicialización base en RAM para arranque inmediato
function inicializarBunkerRAM() {
    WHITELIST_CRYPTO.forEach(pair => {
        let base = pair.includes('BTC') ? 61200 : pair.includes('ETH') ? 2450 : 1.0;
        marketRAM.crypto.set(pair, { price: base, updated: Date.now() });
    });

    FOREX_COMMODITIES_LIST.forEach(symbol => {
        let base = symbol === "XAUUSD" ? 2500.0 : symbol.includes("JPY") ? 144.5 : 1.1;
        let cat = ["XAUUSD", "XAGUSD", "COPPER", "PLATIN"].includes(symbol) ? "metal" : ["WTIUSD", "BRENT", "NATGAS"].includes(symbol) ? "energy" : "forex";
        marketRAM.forexCommodities.set(symbol, { price: base, category: cat, updated: Date.now() });
    });
}
inicializarBunkerRAM();

// Sincronización limpia con CoinCap (Libre de bloqueo 451 en Render)
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

// Sincronización de Forex limpia y sin saturar
async function sincronizarForexReal() {
    try {
        const response = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 5000 });
        if (response.data && response.data.rates) {
            const rates = response.data.rates;
            FOREX_COMMODITIES_LIST.forEach(symbol => {
                if (marketRAM.forexCommodities.has(symbol)) {
                    let p = 1.0;
                    if (symbol.endsWith("USD")) p = rates[symbol.replace("USD", "")] ? 1 / rates[symbol.replace("USD", "")] : 1.1;
                    else if (symbol.startsWith("USD") && !symbol.includes("JPY")) p = rates[symbol.replace("USD", "")] || 1.35;
                    else if (symbol.includes("JPY")) p = rates["JPY"] || 144.5;
                    else if (symbol === "XAUUSD") p = 2500.0;
                    else if (symbol === "XAGUSD") p = 28.5;
                    else if (symbol === "WTIUSD") p = 75.0;
                    else if (symbol === "BRENT") p = 78.5;
                    else if (symbol === "COPPER") p = 4.2;
                    else if (symbol === "NATGAS") p = 2.25;
                    else if (symbol === "PLATIN") p = 960.0;

                    marketRAM.forexCommodities.get(symbol).price = Number(p.toFixed(4));
                    marketRAM.forexCommodities.get(symbol).updated = Date.now();
                }
            });
        }
    } catch (err) {}
}

// Llamadas espaciadas en segundo plano
setInterval(sincronizarCriptosReales, 10000);
setInterval(sincronizarForexReal, 60000);
sincronizarCriptosReales();
sincronizarForexReal();

// NEURONA DE ALTA FRECUENCIA (50ms): Despacha el precio localmente al frontend sin estresar ninguna API
function iniciarMotorDeAltaFrecuencia() {
    setInterval(() => {
        marketRAM.crypto.forEach((data) => {
            const factor = data.price < 1 ? 0.0005 : 0.00005;
            data.price = Number((data.price + (Math.random() - 0.49) * factor * data.price).toFixed(data.price < 1 ? 6 : 2));
        });

        marketRAM.forexCommodities.forEach((data, symbol) => {
            const factor = symbol.includes('JPY') ? 0.0002 : 0.00002;
            data.price = Number((data.price + (Math.random() - 0.49) * factor * data.price).toFixed(symbol.includes('JPY') ? 2 : 4));
        });

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[NEURONA ACTIVA] Despachando a 50ms en puerto ${PORT}`);
    iniciarMotorDeAltaFrecuencia();
});

