const WHITELIST_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT',
  'NEARUSDT', 'APTUSDT', 'RENDERUSDT', 'INJUSDT', 'ARBUSDT',
  'OPUSDT', 'MATICUSDT', 'POLUSDT', 'FTMUSDT', 'TIAUSDT',
  'SEIUSDT', 'FETUSDT', 'ICPUSDT', 'ATOMUSDT', 'UNIUSDT',
  'PEPEUSDT', 'SHIBUSDT', 'WIFUSDT', 'FLOKIUSDT', 'BONKUSDT',
  'LTCUSDT', 'BCHUSDT', 'ETCUSDT', 'FILUSDT', 'GRTUSDT',
  'RUNEUSDT', 'STXUSDT', 'IMXUSDT', 'ALGOUSDT', 'VETUSDT',
  'HBARUSDT', 'EGLDUSDT', 'THETAUSDT', 'AXSUSDT', 'SANDUSDT',
  'MANAUSDT', 'GALAUSDT', 'CHZUSDT', 'FLOWUSDT', 'CRVUSDT',
  'LDOUSDT', 'SNXUSDT', 'MKRUSDT', 'AAVEUSDT', 'COMPUSDT',
  'ZRXUSDT', 'BATUSDT', 'ENJUSDT', 'KAVAUSDT', 'ZILUSDT',
  'IOTXUSDT', 'SKLUSDT', 'OCEANUSDT', 'CTSIUSDT', 'RLCUSDT',
  'BANDUSDT', 'DASHUSDT', 'ZECUSDT', 'XMRUSDT', 'EOSUSDT',
  'NEOUSDT', 'ONTUSDT', 'QTUMUSDT', 'ICXUSDT', 'IOSTUSDT',
  'RVNUSDT', 'ZENUSDT', 'SCUSDT', 'CKBUSDT', 'HNTUSDT',
  'ARUSDT', 'STORJUSDT', 'GLMRUSDT', 'ASTRUSDT', 'MOVRUSDT',
  'BOMEUSDT', 'MEWUSDT', 'NOTUSDT', 'DOGSUSDT', 'POPCATUSDT',
  'NEIROUSDT', 'TURBOUSDT', 'PNUTUSDT', 'ACTUSDT', 'GOATUSDT',
  '1000SATSUSDT', '1000SHIBUSDT', '1000PEPEUSDT', '1000FLOKIUSDT', 'USDCUSDT'
];

// Estructura unificada para evitar conflictos de memoria
const ramBunkerState = {
  cryptoFeeds: {},
  forexFeeds: {}
};

const WebSocket = require('ws');
const axios = require('axios');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ==========================================
// 1. BLINDAJE DE SEGURIDAD ESTRICTA (Cabeceras)
// ==========================================
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Endpoint de salud para Render
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ONLINE',
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

// ==========================================
// 2. CAJAS DE MEMORIA RAM ESCALABLES
// ==========================================
let marketRAM = {
    crypto: new Map(),          
    forexCommodities: new Map()  
};

// Inicializar caja base de Forex, Metales y Petróleo
const initialForexCommodityPairs = [
    { symbol: "EURUSD", price: 1.0850, category: "forex" },
    { symbol: "GBPUSD", price: 1.2720, category: "forex" },
    { symbol: "USDJPY", price: 155.50, category: "forex" },
    { symbol: "AUDUSD", price: 0.6650, category: "forex" },
    { symbol: "USDCAD", price: 1.3650, category: "forex" },
    { symbol: "USDCHF", price: 0.9010, category: "forex" },
    { symbol: "NZDUSD", price: 0.6120, category: "forex" },
    { symbol: "EURGBP", price: 0.8520, category: "forex" },
    { symbol: "EURJPY", price: 169.40, category: "forex" },
    { symbol: "GBPJPY", price: 198.20, category: "forex" },
    { symbol: "XAUUSD", price: 2320.10, category: "metal" },
    { symbol: "XAGUSD", price: 29.40,  category: "metal" },
    { symbol: "WTIUSD", price: 78.40,  category: "energy" },
    { symbol: "BRENT",  price: 82.50,  category: "energy" }
];

initialForexCommodityPairs.forEach(item => {
    marketRAM.forexCommodities.set(item.symbol, {
        price: item.price,
        category: item.category,
        updated: Date.now()
    });
    ramBunkerState.forexFeeds[item.symbol] = {
        price: item.price,
        category: item.category,
        updated: Date.now()
    };
});

// ==========================================
// 3. EL ENCHUFE DE APIS EXTERNAS (HTTP Polling anti-451)
// ==========================================
async function sincronizarBunkerBinanceHTTP() {
  try {
    // Usamos el endpoint global de 24hr que pasa sin problemas por el filtro de Render
    const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', { timeout: 5000 });
    const tickers = response.data;
    
    if (Array.isArray(tickers)) {
      tickers.forEach(ticker => {
        if (WHITELIST_PAIRS.includes(ticker.symbol)) {
          // Actualizamos memoria interna y el estado RAM compartido
          marketRAM.crypto.set(ticker.symbol, {
            price: parseFloat(ticker.lastPrice),
            bid: parseFloat(ticker.bidPrice || ticker.lastPrice),
            ask: parseFloat(ticker.askPrice || ticker.lastPrice),
            updated: Date.now()
          });

          ramBunkerState.cryptoFeeds[ticker.symbol] = {
            symbol: ticker.symbol,
            price: ticker.lastPrice,
            high: ticker.highPrice,
            low: ticker.lowPrice,
            volume: ticker.volume,
            time: Date.now()
          };
        }
      });

      // Simulación fluida para Forex y Commodities
      for (let [symbol, data] of marketRAM.forexCommodities.entries()) {
          let shift = (Math.random() - 0.49) * (data.price * 0.00008);
          data.price = Number((data.price + shift).toFixed(data.price > 100 ? 2 : 4));
          data.updated = Date.now();
          marketRAM.forexCommodities.set(symbol, data);
          ramBunkerState.forexFeeds[symbol] = data;
      }

      // Difundir por WebSocket a los clientes conectados
      broadcastToPlatform();
      console.log(`[BUNKER ACTIVO] RAM sincronizada. Pares cripto en vigilancia: ${Object.keys(ramBunkerState.cryptoFeeds).length}`);
    }
  } catch (err) {
    console.error('[ALERTA DE RED] Fallo en API externa, la RAM mantiene el último estado estable:', err.message);
  }
}

// ==========================================
// 4. LA TUBERÍA DE SALIDA (WebSocket Masivo)
// ==========================================
function broadcastToPlatform() {
    const payload = JSON.stringify({
        type: 'NEURONA_SYNC',
        data: {
            crypto: Object.fromEntries(marketRAM.crypto),
            forexCommodities: Object.fromEntries(marketRAM.forexCommodities)
        },
        serverTime: Date.now()
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(payload);
            } catch (err) {
                console.error("Error transmitiendo tick al cliente:", err.message);
            }
        }
    });
}

// Control de conexiones seguras de los usuarios
wss.on('connection', (ws) => {
    console.log("[NEURONA] Terminal conectado de forma segura a TradeRival.");

    try {
        ws.send(JSON.stringify({
            type: 'INIT_STATE',
            data: {
                crypto: Object.fromEntries(marketRAM.crypto),
                forexCommodities: Object.fromEntries(marketRAM.forexCommodities)
            }
        }));
    } catch (err) {
        console.error("Error enviando estado inicial:", err.message);
    }

    ws.on('error', (error) => {
        console.error("Error en socket:", error.message);
    });

    ws.on('close', () => {
        console.log("[NEURONA] Terminal desconectado.");
    });
});

// ==========================================
// 5. ENDPOINT PARA EL FRONTEND
// ==========================================
app.get('/api/bunker-status', (req, res) => {
  res.json({
    status: 'ONLINE',
    totalPairsTracked: Object.keys(ramBunkerState.cryptoFeeds).length,
    data: ramBunkerState.cryptoFeeds
  });
});

// ==========================================
// 6. LATIDO DEL MOTOR (Reloj de 3 Segundos)
// ==========================================
sincronizarBunkerBinanceHTTP();
setInterval(sincronizarBunkerBinanceHTTP, 3000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[BÚNKER BLINDADO ACTIVO] Neurona operando en el puerto ${PORT}`);
});

