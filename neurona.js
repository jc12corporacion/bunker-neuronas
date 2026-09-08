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
// 2. LISTA BLANCA DE CRIPTOMONEDAS (Top 100+ Más Líquidos)
// ==========================================
// Filtramos solo los pares institucionales y de alto volumen para evitar gráficos basura
const ALLOWED_CRYPTO_PARES = new Set([
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", 
    "DOTUSDT", "MATICUSDT", "LTCUSDT", "UNIUSDT", "ATOMUSDT", "NEARUSDT", "ICPUSDT", "APTUSDT", 
    "OPUSDT", "ARBUSDT", "SUIUSDT", "INJUSDT", "RENDERUSDT", "TIAUSDT", "FETUSDT", "DOGEUSDT", 
    "SHIBUSDT", "PEPEUSDT", "WIFUSDT", "BONKUSDT", "XLMUSDT", "BCHUSDT", "ETCUSDT", "FILUSDT",
    "ARBUSDT", "IMXUSDT", "GRTUSDT", "SNXUSDT", "FTMUSDT", "RUNEUSDT", "KASUSDT", "SEIUSDT"
    // (Aquí puedes seguir sumando hasta completar tu bloque estricto de los 100 más fuertes)
]);

// ==========================================
// 3. CAJAS DE MEMORIA RAM ESCALABLES
// ==========================================
let marketRAM = {
    crypto: new Map(),           
    forexCommodities: new Map()  
};

// Inicializar caja base de Forex, Metales y Petróleo (Los 50 más líquidos + Oro y Petróleo)
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
    { symbol: "XAUUSD", price: 2320.10, category: "metal" }, // Oro
    { symbol: "XAGUSD", price: 29.40,  category: "metal" }, // Plata
    { symbol: "WTIUSD", price: 78.40,  category: "energy" },// Petróleo WTI
    { symbol: "BRENT",  price: 82.50,  category: "energy" } // Petróleo Brent
];

initialForexCommodityPairs.forEach(item => {
    marketRAM.forexCommodities.set(item.symbol, {
        price: item.price,
        category: item.category,
        updated: Date.now()
    });
});

// ==========================================
// 4. EL ENCHUFE DE APIS EXTERNAS (Protegido y Filtrado)
// ==========================================
async function fetchAndProcessFeeds() {
    try {
        // Petición a Binance optimizada
        const binanceRes = await axios.get('https://api.binance.com/api/v3/ticker/bookTicker', { timeout: 4000 });
        
        if (binanceRes.data && Array.isArray(binanceRes.data)) {
            binanceRes.data.forEach(ticker => {
                // Solo guardamos si el par está dentro de nuestra lista blanca estricta
                if (ALLOWED_CRYPTO_PARES.has(ticker.symbol)) {
                    marketRAM.crypto.set(ticker.symbol, {
                        price: parseFloat(ticker.bidPrice),
                        bid: parseFloat(ticker.bidPrice),
                        ask: parseFloat(ticker.askPrice),
                        updated: Date.now()
                    });
                }
            });
        }

        // Actualización fluida para la caja de Forex y Commodities (Sincronizada con feed o simulación de alta precisión)
        for (let [symbol, data] of marketRAM.forexCommodities.entries()) {
            let shift = (Math.random() - 0.49) * (data.price * 0.00008);
            data.price = Number((data.price + shift).toFixed(data.price > 100 ? 2 : 4));
            data.updated = Date.now();
            marketRAM.forexCommodities.set(symbol, data);
        }

        // Difundir el paquete limpio a través de la tubería
        broadcastToPlatform();

    } catch (err) {
        console.error("[ALERTA DE RED] Fallo en API externa. La RAM mantiene el último estado estable:", err.message);
    }
}

// ==========================================
// 5. LA TUBERÍA DE SALIDA (WebSocket Masivo)
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
// 6. LATIDO DEL MOTOR (Reloj de 1 Segundo)
// ==========================================
setInterval(fetchAndProcessFeeds, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[BÚNKER BLINDADO ACTIVO] Neurona operando en el puerto ${PORT}`);
});



function conectarBunkerBinance() {
  const ws = new WebSocket('wss://data-stream.binance.vision:9443/ws/!miniTicker@arr');


  ws.on('open', () => {
    console.log('--- BUNKER CONECTADO A BINANCE: Tubería abierta y activa ---');
  });

  ws.on('message', (data) => {
    try {
      const parsedData = JSON.parse(data);
      
      if (Array.isArray(parsedData)) {
        parsedData.forEach(ticker => {
          // Solo dejamos pasar lo que está en nuestra lista blanca de alta liquidez
          if (WHITELIST_PAIRS.includes(ticker.s)) {
            ramBunkerState.cryptoFeeds[ticker.s] = {
              symbol: ticker.s,
              price: ticker.c,
              high: ticker.h,
              low: ticker.l,
              volume: ticker.v,
              time: Date.now()
            };
          }
        });
      }
    } catch (err) {
      console.error('Error procesando el flujo de Binance:', err.message);
    }
  });

  ws.on('error', (err) => {
    console.error('Error en el WebSocket de Binance:', err.message);
  });

  ws.on('close', () => {
    console.log('Conexión cerrada. Reintentando conectar el Bunker en 5 segundos...');
    setTimeout(conectarBunkerBinance, 5000);
  });
}

// Arrancamos el motor de la conexión
conectarBunkerBinance();



// Endpoint para que el frontend consulte el estado actual de la RAM del Bunker
app.get('/api/bunker-status', (req, res) => {
  res.json({
    status: 'ONLINE',
    totalPairsTracked: Object.keys(ramBunkerState.cryptoFeeds).length,
    data: ramBunkerState.cryptoFeeds
  });
});
