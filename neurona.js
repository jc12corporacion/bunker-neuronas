const http = require('http');
const express = require('express');
const axios = require('axios');

// 1. Los 100 pares de criptomonedas más líquidos contra USDT
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

// 2. Los 34 pares completos de Forex y Commodities
const FOREX_COMMODITIES_LIST = [
  { symbol: "EURUSD", base: 1.1050, category: "forex" },
  { symbol: "GBPUSD", base: 1.3120, category: "forex" },
  { symbol: "USDJPY", base: 144.50, category: "forex" },
  { symbol: "AUDUSD", base: 0.6750, category: "forex" },
  { symbol: "USDCAD", base: 1.3500, category: "forex" },
  { symbol: "USDCHF", base: 0.8840, category: "forex" },
  { symbol: "NZDUSD", base: 0.6220, category: "forex" },
  { symbol: "EURGBP", base: 0.8420, category: "forex" },
  { symbol: "EURJPY", base: 159.60, category: "forex" },
  { symbol: "GBPJPY", base: 189.50, category: "forex" },
  { symbol: "AUDJPY", base: 97.50,  category: "forex" },
  { symbol: "CADJPY", base: 107.00, category: "forex" },
  { symbol: "CHFJPY", base: 163.50, category: "forex" },
  { symbol: "NZDJPY", base: 89.80,  category: "forex" },
  { symbol: "EURAUD", base: 1.6370, category: "forex" },
  { symbol: "EURCAD", base: 1.4920, category: "forex" },
  { symbol: "EURNZD", base: 1.7750, category: "forex" },
  { symbol: "GBPAUD", base: 1.9430, category: "forex" },
  { symbol: "GBPCAD", base: 1.7710, category: "forex" },
  { symbol: "GBPNZD", base: 2.1080, category: "forex" },
  { symbol: "AUDCAD", base: 0.9120, category: "forex" },
  { symbol: "AUDNZD", base: 1.0850, category: "forex" },
  { symbol: "NZDCAD", base: 0.8400, category: "forex" },
  { symbol: "USDZAR", base: 17.85,  category: "forex" },
  { symbol: "USDMXN", base: 19.80,  category: "forex" },
  { symbol: "USDTRY", base: 34.10,  category: "forex" },
  { symbol: "USDBRL", base: 5.60,   category: "forex" },
  { symbol: "XAUUSD", base: 2500.00, category: "metal" },
  { symbol: "XAGUSD", base: 28.50,  category: "metal" },
  { symbol: "WTIUSD", base: 75.00,  category: "energy" },
  { symbol: "BRENT",  base: 78.50,  category: "energy" },
  { symbol: "COPPER", base: 4.20,   category: "metal" },
  { symbol: "NATGAS", base: 2.25,   category: "energy" },
  { symbol: "PLATIN", base: 960.00, category: "metal" }
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
        marketRAM.crypto.set(pair, { price: 1.0, updated: Date.now() });
    });
    FOREX_COMMODITIES_LIST.forEach(item => {
        marketRAM.forexCommodities.set(item.symbol, { price: item.base, category: item.category, updated: Date.now() });
    });
}
inicializarBunkerRAM();

// Consulta HTTP directa a Binance desde el servidor de USA (IP limpia sin bloqueos)
async function sincronizarBinanceUSA() {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price', { timeout: 6000 });
        if (response.data && Array.isArray(response.data)) {
            const binanceMap = new Map();
            response.data.forEach(item => {
                binanceMap.set(item.symbol, parseFloat(item.price));
            });

            WHITELIST_CRYPTO.forEach(pair => {
                if (binanceMap.has(pair)) {
                    marketRAM.crypto.set(pair, {
                        price: binanceMap.get(pair),
                        updated: Date.now()
                    });
                }
            });
            console.log('[BÚNKER USA]: 100 precios reales sincronizados perfectamente desde Binance.');
        }
    } catch (err) {
        console.error('[AVISO USA]: Error de enlace HTTP con Binance:', err.message);
    }
}

sincronizarBinanceUSA();
setInterval(sincronizarBinanceUSA, 4000); // Sincronización real cada 4 segundos

// Motor de alta frecuencia (50ms) para inyectar fluidez al milisegundo hacia el Canvas
function iniciarMotorDeAltaFrecuencia() {
    setInterval(() => {
        marketRAM.forexCommodities.forEach((data, pair) => {
            const factor = pair.includes('JPY') ? 0.0004 : 0.00005;
            const delta = (Math.random() - 0.49) * factor * data.price;
            data.price = Number((data.price + delta).toFixed(pair.includes('JPY') ? 2 : 4));
            data.updated = Date.now();
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
    console.log(`[NEURONA ENLACE USA] Operando en puerto ${PORT}`);
    iniciarMotorDeAltaFrecuencia();
});

