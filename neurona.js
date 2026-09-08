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
// 3. EL ENCHUFE DE APIS EXTERNAS (Libre de Bloqueo Geográfico)
// ==========================================
async function sincronizarBunkerBinanceHTTP() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,cardano,dogecoin,avalanche-2,chainlink,sui,near,aptos,render,injective,arbitrum,optimism,polygon-ecosystem-token,fantom,celestia,render-token,fetch-ai,internet-computer,cosmos,uniswap,pepe,shiba-inu,wif,floki,bonk,litecoin,bitcoin-cash,ethereum-classic,filecoin,the-graph,thorchain,stacks,immutable-x,algorand,vechain,hedera,elrond,theta-token,the-sandbox,decentraland,gala,chiliz,flow,curve-dao-token,lido-dao,synthetix,maker,aave,compound-governance-token,zrx,basic-attention-token,enjincoin,kava,zilliqa,iotex,ankr,ocean-protocol,certik,rlc,band-protocol,dash,zcash,monero,eos,neo,ontology,qtum,icon,iost,ravencoin,zencash,siacoin,ckb,helium,arweave,storj,moonbeam,astar,moonriver,bome,mew,notcoin,dogus,popcat,neiro,turbo,pnut,act,goat,sats,shib,pepe,floki,usd-coin&vs_currencies=usd', { timeout: 8000 });
    
    const data = response.data;
    
    if (data) {
      const mapping = {
        'BTCUSDT': 'bitcoin', 'ETHUSDT': 'ethereum', 'BNBUSDT': 'binancecoin', 'SOLUSDT': 'solana',
        'XRPUSDT': 'ripple', 'ADAUSDT': 'cardano', 'DOGEUSDT': 'dogecoin', 'AVAXUSDT': 'avalanche-2',
        'LINKUSDT': 'chainlink', 'SUIUSDT': 'sui', 'NEARUSDT': 'near', 'APTUSDT': 'aptos',
        'RENDERUSDT': 'render', 'INJUSDT': 'injective', 'ARBUSDT': 'arbitrum', 'OPUSDT': 'optimism',
        'POLUSDT': 'polygon-ecosystem-token', 'FTMUSDT': 'fantom', 'TIAUSDT': 'celestia', 'FETUSDT': 'fetch-ai',
        'ICPUSDT': 'internet-computer', 'ATOMUSDT': 'cosmos', 'UNIUSDT': 'uniswap', 'PEPEUSDT': 'pepe',
        'SHIBUSDT': 'shiba-inu', 'WIFUSDT': 'wif', 'FLOKIUSDT': 'floki', 'BONKUSDT': 'bonk',
        'LTCUSDT': 'litecoin', 'BCHUSDT': 'bitcoin-cash', 'ETCUSDT': 'ethereum-classic', 'FILUSDT': 'filecoin',
        'GRTUSDT': 'the-graph', 'RUNEUSDT': 'thorchain', 'STXUSDT': 'stacks', 'IMXUSDT': 'immutable-x',
        'ALGOUSDT': 'algorand', 'VETUSDT': 'vechain', 'HBARUSDT': 'hedera', 'EGLDUSDT': 'elrond',
        'THETAUSDT': 'theta-token', 'SANDUSDT': 'the-sandbox', 'MANAUSDT': 'decentraland', 'GALAUSDT': 'gala',
        'CHZUSDT': 'chiliz', 'FLOWUSDT': 'flow', 'CRVUSDT': 'curve-dao-token', 'LDOUSDT': 'lido-dao',
        'SNXUSDT': 'synthetix', 'MKRUSDT': 'maker', 'AAVEUSDT': 'aave', 'COMPUSDT': 'compound-governance-token',
        'USDCUSDT': 'usd-coin'
      };

      WHITELIST_PAIRS.forEach(pair => {
        const coinKey = mapping[pair];
        if (coinKey && data[coinKey] && data[coinKey].usd) {
          const currentPrice = data[coinKey].usd;
          
          marketRAM.crypto.set(pair, {
            price: currentPrice,
            bid: currentPrice * 0.9999,
            ask: currentPrice * 1.0001,
            updated: Date.now()
          });

          ramBunkerState.cryptoFeeds[pair] = {
            symbol: pair,
            price: currentPrice,
            high: currentPrice * 1.02,
            low: currentPrice * 0.98,
            volume: "1500000",
            time: Date.now()
          };
        }
      });

      for (let [symbol, dataItem] of marketRAM.forexCommodities.entries()) {
          let shift = (Math.random() - 0.49) * (dataItem.price * 0.00008);
          dataItem.price = Number((dataItem.price + shift).toFixed(dataItem.price > 100 ? 2 : 4));
          dataItem.updated = Date.now();
          marketRAM.forexCommodities.set(symbol, dataItem);
          ramBunkerState.forexFeeds[symbol] = dataItem;
      }

      broadcastToPlatform();
      console.log(`[BUNKER ACTIVO] Sincronización exitosa vía HTTP libre. Pares en vigilancia: ${Object.keys(ramBunkerState.cryptoFeeds).length}`);
    }
  } catch (err) {
    console.error('[ALERTA DE RED] Fallo en API alternativa, manteniendo estado en RAM:', err.message);
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
// 6. LATIDO DEL MOTOR (Reloj de 15 Segundos)
// ==========================================
sincronizarBunkerBinanceHTTP();
setInterval(sincronizarBunkerBinanceHTTP, 15000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[BÚNKER BLINDADO ACTIVO] Neurona operando en el puerto ${PORT}`);
});

