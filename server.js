import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { analyzeCandles } from "./technicalEngine.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TWELVE_DATA_API_KEY;
const intervals = { M5:"5min", M15:"15min", H1:"1h", H4:"4h" };

app.get("/health", (_req,res) => res.json({
  ok:true, service:"SniperGold V2",
  dataProviderConfigured:Boolean(API_KEY)
}));

app.get("/api/xauusd", async (req,res) => {
  try {
    if (!API_KEY) return res.status(500).json({
      ok:false, error:"Twelve Data API key belum dipasang di server."
    });

    const tf = String(req.query.tf || "M15").toUpperCase();
    if (!intervals[tf]) return res.status(400).json({
      ok:false, error:"Timeframe harus M5, M15, H1 atau H4."
    });

    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol","XAU/USD");
    url.searchParams.set("interval",intervals[tf]);
    url.searchParams.set("outputsize","200");
    url.searchParams.set("apikey",API_KEY);

    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok || data.status === "error")
      return res.status(502).json({
        ok:false, error:data.message || "Market data provider error."
      });

    const candles = (data.values || []).reverse().map(c => ({
      time:c.datetime, open:Number(c.open), high:Number(c.high),
      low:Number(c.low), close:Number(c.close)
    }));

    if (candles.length < 30)
      return res.status(502).json({
        ok:false, error:"Data candle yang diterima belum cukup."
      });

    res.json({
      ok:true, symbol:"XAU/USD", timeframe:tf,
      lastCandle:candles.at(-1),
      analysis:analyzeCandles(candles)
    });
  } catch {
    res.status(500).json({ok:false,error:"Backend error."});
  }
});

app.listen(PORT,()=>console.log(`SniperGold V2: http://localhost:${PORT}`));