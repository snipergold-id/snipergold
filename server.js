import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { analyzeCandles } from "./technicalEngine.js";

dotenv.config();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
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
app.post("/api/ai-analysis", async (req,res) => {
  try {
    const { marketData, timeframe } = req.body;

   if (!process.env.GEMINI_API_KEY) {
  return res.status(500).json({
    ok:false,
    error:"Gemini API key belum dipasang di server."
  });
}
    if (!marketData) {
      return res.status(400).json({
        ok:false,
        error:"Data market tidak tersedia."
      });
    }

    const prompt = `
Kamu adalah SniperGold AI Market Analyst.

Analisis hanya berdasarkan data market yang diberikan.
Jangan mengarang harga, candle, support, resistance, atau kondisi market yang tidak ada di data.

Instrumen: XAU/USD
Timeframe: ${timeframe || "M15"}

Data teknikal:
${JSON.stringify(marketData, null, 2)}

Berikan analisis ringkas dengan struktur:
1. Market Bias
2. Trend
3. Market Structure
4. Support
5. Resistance
6. Scenario
7. Invalidation
8. Risk Warning

Penting:
- Ini bukan nasihat investasi.
- Jangan menjanjikan profit.
- Jangan mengatakan bahwa arah market pasti naik/turun.
- Jika data tidak cukup jelas, katakan NEUTRAL.
`;

   const response = await ai.models.generateContent({
  model: "gemini-3.5-flash-lite",
  contents: prompt
});

res.json({
  ok: true,
  analysis: response.text
});
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok:false,
      error:"AI analysis gagal dijalankan."
    });
  }
});

app.listen(PORT,()=>console.log(`SniperGold V2: http://localhost:${PORT}`));