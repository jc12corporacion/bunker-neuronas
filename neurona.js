const WebSocket = require('ws');
const http = require('http');
const express = require('express');

// Lista blanca blindada con los 100 pares de criptomonedas más líquidos en USDT
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

// Lista completa de los 34 pares y activos de Forex y Commodities
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
const wss = new WebSocket.Server({ server });

let marketRAM = {
    crypto: new Map(),
    forexCommodities: new Map()
};

// 1. Inicializar Forex y Commodities en memoria
function inicializarForex() {
    FOREX_COMMODITIES_LIST.forEach(item => {
        marketRAM.forexCommodities.set(item.symbol, {
            price: item.base,
            category: item.category,
            updated: Date.now()
        });
    });
}
inicializarForex();

// 2. Conexión WebSocket a Bybit para las Criptomonedas (Reales contra USDT)
function conectarCriptoReal() {
    const bybitWs = new WebSocket('wss://stream.bybit.com/v5/public/spot');

    bybitWs.on('open', () => {
        console.log('[BÚNKER CRIPTO]: Enlazado al flujo real de Bybit (100 pares USDT).');
        const args = WHITELIST_CRYPTO.map(pair => `tickers.${pair}`);
        bybitWs.send(JSON.stringify({ op: "subscribe", args: args }));
    });

    bybitWs.on('message', (data) => {
        try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.topic && parsed.topic.startsWith('tickers.')) {
                const symbol = parsed.topic.replace('tickers.', '');
                if (WHITELIST_CRYPTO.includes(symbol) && parsed.data && parsed.data.lastPrice) {
                    const realPrice = parseFloat(parsed.data.lastPrice);
                    marketRAM.crypto.set(symbol, {
                        price: realPrice,
                        bid: parseFloat(parsed.data.bid1Price || realPrice),
                        ask: parseFloat(parsed.data.ask1Price || realPrice),
                        updated: Date.now()
                    });
                }
            }
        } catch (e) {
            console.error('[ERROR PARSEANDO CRIPTO]:', e.message);
        }
    });

    bybitWs.on('close', () => {
        console.log('[ALERTA]: Desconectado de Bybit. Reconectando en 3s...');
        setTimeout(conectarCriptoReal, 3000);
    });

    bybitWs.on('error', (err) => {
        console.error('[ERROR WS BYBIT]:', err.message);
        bybitWs.terminate();
    });
}

conectarCriptoReal();

// 3. Motor de sincronización y distribución de alta frecuencia (50ms)
function iniciarMotorBunker() {
    setInterval(() => {
        // Micro-variación profesional para mantener activo el carril de forex/commodities
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
            if (client.readyState === WebSocket.OPEN) {
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
    console.log(`[BÚNKER MAESTRO BLINDADO] Activo en puerto ${PORT}.`);
    iniciarMotorBunker();
});

