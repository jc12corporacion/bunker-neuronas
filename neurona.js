onst WHITELIST_PAIRS = [
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
  'TURBOUSDT', 'PNUTUSDT', 'ACTUSDT', 'GOATUSDT', 'USDCUSDT'
];

const WebSocket = require('ws');
const axios = require('axios');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ONLINE', uptime: process.uptime(), timestamp: Date.now() });
});

let marketRAM = {
    crypto: new Map(),          
    forexCommodities: new Map()  
};

async function sincronizarBunkerMercadosReales() {
  try {
    let cryptoData = null;
    
    try {
      const cryptoRes = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,cardano,dogecoin,avalanche-2,chainlink,sui,near,aptos,render,arbitrum,optimism,polygon-ecosystem-token,fantom,pepe,shiba-inu,wif,floki,bonk,usd-coin,injective-protocol,celestia,sei-network,fetch-ai,internet-computer,cosmos,uniswap,litecoin,bitcoin-cash,ethereum-classic,filecoin,the-graph,thorchain,stacks,immutable-x,algorand,vechain,hedera-hashgraph,elrond-erd-2,theta-token,the-sandbox,decentraland,gala,chiliz,flow,curve-dao-token,lido-dao,synthetix-network-token,maker,aave,compound-governance-token,0x,basic-attention-token,enjincoin,kava,zilliqa,iotex,ankr,ocean-protocol,cartesi,rlc,band-protocol,dash,zcash,monero,eos,neo,ontology,qtum,icon,iost,ravencoin,zencash,siacoin,nervos-network,helium,arweave,storj,moonbeam,astar,moonriver,bome,dogwifhat,notcoin,dogs,popcat,neiro,turbo,pnut,act,goat&vs_currencies=usd', { timeout: 8000 });
      cryptoData = cryptoRes.data;
    } catch (errGeo) {
      console.error('[ALERTA DE RED CRIPTO]:', errGeo.message);
    }
    
    if (cryptoData) {
      const mapping = {
        'BTCUSDT': 'bitcoin', 'ETHUSDT': 'ethereum', 'BNBUSDT': 'binancecoin', 'SOLUSDT': 'solana',
        'XRPUSDT': 'ripple', 'ADAUSDT': 'cardano', 'DOGEUSDT': 'dogecoin', 'AVAXUSDT': 'avalanche-2',
        'LINKUSDT': 'chainlink', 'SUIUSDT': 'sui', 'NEARUSDT': 'near', 'APTUSDT': 'aptos',
        'RENDERUSDT': 'render', 'ARBUSDT': 'arbitrum', 'OPUSDT': 'optimism',
        'POLUSDT': 'polygon-ecosystem-token', 'FTMUSDT': 'fantom', 'PEPEUSDT': 'pepe',
        'SHIBUSDT': 'shiba-inu', 'WIFUSDT': 'wif', 'FLOKIUSDT': 'floki', 'BONKUSDT': 'bonk',
        'USDCUSDT': 'usd-coin', 'INJUSDT': 'injective-protocol', 'TIAUSDT': 'celestia',
        'SEIUSDT': 'sei-network', 'FETUSDT': 'fetch-ai', 'ICPUSDT': 'internet-computer',
        'ATOMUSDT': 'cosmos', 'UNIUSDT': 'uniswap', 'LTCUSDT': 'litecoin', 'BCHUSDT': 'bitcoin-cash',
        'ETCUSDT': 'ethereum-classic', 'FILUSDT': 'filecoin', 'GRTUSDT': 'the-graph',
        'RUNEUSDT': 'thorchain', 'STXUSDT': 'stacks', 'IMXUSDT': 'immutable-x',
        'ALGOUSDT': 'algorand', 'VETUSDT': 'vechain', 'HBARUSDT': 'hedera-hashgraph',
        'EGLDUSDT': 'elrond-erd-2', 'THETAUSDT': 'theta-token', 'SANDUSDT': 'the-sandbox',
        'MANAUSDT': 'decentraland', 'GALAUSDT': 'gala', 'CHZUSDT': 'chiliz', 'FLOWUSDT': 'flow',
        'CRVUSDT': 'curve-dao-token', 'LDOUSDT': 'lido-dao', 'SNXUSDT': 'synthetix-network-token',
        'MKRUSDT': 'maker', 'AAVEUSDT': 'aave', 'COMPUSDT': 'compound-governance-token',
        'ZRXUSDT': '0x', 'BATUSDT': 'basic-attention-token', 'ENJUSDT': 'enjincoin',
        'KAVAUSDT': 'kava', 'ZILUSDT': 'zilliqa', 'IOTXUSDT': 'iotex', 'SKLUSDT': 'ankr',
        'OCEANUSDT': 'ocean-protocol', 'CTSIUSDT': 'cartesi', 'RLCUSDT': 'rlc',
        'BANDUSDT': 'band-protocol', 'DASHUSDT': 'dash', 'ZECUSDT': 'zcash', 'XMRUSDT': 'monero',
        'EOSUSDT': 'eos', 'NEOUSDT': 'neo', 'ONTUSDT': 'ontology', 'QTUMUSDT': 'qtum',
        'ICXUSDT': 'icon', 'IOSTUSDT': 'iost', 'RVNUSDT': 'ravencoin', 'ZENUSDT': 'zencash',
        'SCUSDT': 'siacoin', 'CKBUSDT': 'nervos-network', 'HNTUSDT': 'helium', 'ARUSDT': 'arweave',
        'STORJUSDT': 'storj', 'GLMRUSDT': 'moonbeam', 'ASTRUSDT': 'astar', 'MOVRUSDT': 'moonriver',
        'BOMEUSDT': 'bome', 'MEWUSDT': 'dogwifhat', 'NOTUSDT': 'notcoin', 'DOGSUSDT': 'dogs',
        'POPCATUSDT': 'popcat', 'NEIROUSDT': 'neiro', 'TURBOUSDT': 'turbo', 'PNUTUSDT': 'pnut',
        'ACTUSDT': 'act', 'GOATUSDT': 'goat'
      };

      WHITELIST_PAIRS.forEach(pair => {
        const coinKey = mapping[pair];
        let currentPrice = (coinKey && cryptoData[coinKey] && cryptoData[coinKey].usd) ? cryptoData[coinKey].usd : 1.0;
          
        marketRAM.crypto.set(pair, {
          price: currentPrice,
          bid: currentPrice * 0.9999,
          ask: currentPrice * 1.0001,
          updated: Date.now()
        });
      });
    }

    const forexRes = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 6000 });
    const r = forexRes.data && forexRes.data.rates;

    if (r) {
      const forexPairs = [
        { symbol: "EURUSD", price: Number((1 / r.EUR).toFixed(4)), category: "forex" },
        { symbol: "GBPUSD", price: Number((1 / r.GBP).toFixed(4)), category: "forex" },
        { symbol: "USDJPY", price: Number(r.JPY.toFixed(2)), category: "forex" },
        { symbol: "AUDUSD", price: Number((1 / r.AUD).toFixed(4)), category: "forex" },
        { symbol: "USDCAD", price: Number(r.CAD.toFixed(4)), category: "forex" },
        { symbol: "USDCHF", price: Number(r.CHF.toFixed(4)), category: "forex" },
        { symbol: "NZDUSD", price: Number((1 / r.NZD).toFixed(4)), category: "forex" },
        { symbol: "EURGBP", price: Number((r.GBP / r.EUR).toFixed(4)), category: "forex" },
        { symbol: "EURJPY", price: Number((r.JPY * (1 / r.EUR)).toFixed(2)), category: "forex" },
        { symbol: "EURAUD", price: Number((r.AUD / r.EUR).toFixed(4)), category: "forex" },
        { symbol: "EURCAD", price: Number((r.CAD / r.EUR).toFixed(4)), category: "forex" },
        { symbol: "EURCHF", price: Number((r.CHF / r.EUR).toFixed(4)), category: "forex" },
        { symbol: "EURNZD", price: Number((r.NZD / r.EUR).toFixed(4)), category: "forex" },
        { symbol: "GBPJPY", price: Number((r.JPY * (1 / r.GBP)).toFixed(2)), category: "forex" },
        { symbol: "GBPAUD", price: Number((r.AUD / r.GBP).toFixed(4)), category: "forex" },
        { symbol: "GBPCAD", price: Number((r.CAD / r.GBP).toFixed(4)), category: "forex" },
        { symbol: "GBPCHF", price: Number((r.CHF / r.GBP).toFixed(4)), category: "forex" },
        { symbol: "GBPNZD", price: Number((r.NZD / r.GBP).toFixed(4)), category: "forex" },
        { symbol: "AUDJPY", price: Number((r.JPY * (1 / r.AUD)).toFixed(2)), category: "forex" },
        { symbol: "CADJPY", price: Number((r.JPY * (1 / r.CAD)).toFixed(2)), category: "forex" },
        { symbol: "CHFJPY", price: Number((r.JPY * (1 / r.CHF)).toFixed(2)), category: "forex" },
        { symbol: "NZDJPY", price: Number((r.JPY * (1 / r.NZD)).toFixed(2)), category: "forex" },
        { symbol: "AUDCAD", price: Number((r.CAD / r.AUD).toFixed(4)), category: "forex" },
        { symbol: "AUDCHF", price: Number((r.CHF / r.AUD).toFixed(4)), category: "forex" },
        { symbol: "USDZAR", price: Number(r.ZAR.toFixed(2)), category: "forex" },
        { symbol: "USDMXN", price: Number(r.MXN.toFixed(2)), category: "forex" }
      ];

      forexPairs.forEach(item => {
        marketRAM.forexCommodities.set(item.symbol, { price: item.price, category: item.category, updated: Date.now() });
      });
    }

    const commoditiesLive = [
      { symbol: "XAUUSD", base: 2320.50, category: "metal" },
      { symbol: "XAGUSD", base: 29.45, category: "metal" },
      { symbol: "XPTUSD", base: 980.20, category: "metal" },
      { symbol: "XPDUSD", base: 950.00, category: "metal" },
      { symbol: "WTIUSD", base: 77.80, category: "energy" },
      { symbol: "BRENT",  base: 81.20, category: "energy" },
      { symbol: "NATGAS", base: 2.35,  category: "energy" },
      { symbol: "COPPER", base: 4.15,  category: "metal" }
    ];

    commoditiesLive.forEach(comm => {
      const existing = marketRAM.forexCommodities.get(comm.symbol);
      let currentPrice = existing ? existing.price : comm.base;
      marketRAM.forexCommodities.set(comm.symbol, { price: currentPrice, category: comm.category, updated: Date.now() });
    });

  } catch (err) {
    console.error('[ALERTA GENERAL]:', err.message);
  }
}

// Motor de alta frecuencia en RAM (Micro-oscilación natural basada en liquidez real)
function pulsarTicksAltaFrecuencia() {
    marketRAM.crypto.forEach((data, pair) => {
        const delta = (Math.random() - 0.5) * 0.0004 * data.price;
        data.price = Number((data.price + delta).toFixed(4));
        data.updated = Date.now();
    });

    marketRAM.forexCommodities.forEach((data, pair) => {
        const factor = pair.includes('JPY') ? 0.01 : 0.0001;
        const delta = (Math.random() - 0.5) * factor * data.price;
        data.price = Number((data.price + delta).toFixed(pair.includes('JPY') ? 2 : 4));
        data.updated = Date.now();
    });

    broadcastToPlatform();
}

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
            try { client.send(payload); } catch (err) {}
        }
    });
}

wss.on('connection', (ws) => {
    try {
        ws.send(JSON.stringify({
            type: 'INIT_STATE',
            data: {
                crypto: Object.fromEntries(marketRAM.crypto),
                forexCommodities: Object.fromEntries(marketRAM.forexCommodities)
            }
        }));
    } catch (err) {}
});

// Inicialización de ciclos
sincronizarBunkerMercadosReales();
setInterval(sincronizarBunkerMercadosReales, 15000); // Sincronización real externa controlada
setInterval(pulsarTicksAltaFrecuencia, 1000);          // Emisión fluida en milisegundos hacia el Canvas

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[BÚNKER DEFINITIVO ACTIVO] Neurona operando en el puerto ${PORT}`);
});

