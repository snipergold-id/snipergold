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

const intervals = {
  M5: "5min",
  M15: "15min",
  H1: "1h",
  H4: "4h"
};


app.get("/health", (_req, res) => {

  res.json({
    ok: true,
    service: "SniperGold V2",
    dataProviderConfigured: Boolean(API_KEY),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });

});


app.get("/api/xauusd", async (req, res) => {

  try {

    if (!API_KEY) {

      return res.status(500).json({
        ok: false,
        error:
          "Twelve Data API key belum dipasang di server."
      });

    }


    const tf =
      String(
        req.query.tf || "M15"
      ).toUpperCase();


    if (!intervals[tf]) {

      return res.status(400).json({
        ok: false,
        error:
          "Timeframe harus M5, M15, H1 atau H4."
      });

    }


    const url =
      new URL(
        "https://api.twelvedata.com/time_series"
      );


    url.searchParams.set(
      "symbol",
      "XAU/USD"
    );

    url.searchParams.set(
      "interval",
      intervals[tf]
    );

    url.searchParams.set(
      "outputsize",
      "200"
    );

    url.searchParams.set(
      "apikey",
      API_KEY
    );


    const response =
      await fetch(url);


    const data =
      await response.json();


    if (
      !response.ok ||
      data.status === "error"
    ) {

      return res.status(502).json({
        ok: false,
        error:
          data.message ||
          "Market data provider error."
      });

    }


    const candles =
      (data.values || [])
        .reverse()
        .map(candle => ({
          time: candle.datetime,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close)
        }));


    if (
      candles.length < 30
    ) {

      return res.status(502).json({
        ok: false,
        error:
          "Data candle yang diterima belum cukup."
      });

    }


    const analysis =
      analyzeCandles(candles);


    const marketDecision = {

      bias: analysis.bias,

      directionalPressure:
        analysis.trend,

      structure:
        analysis.structure,

      structureDetails:
        analysis.structureDetails,

      momentum:
        analysis.momentum,

      breakout:
        analysis.breakout,

      pullback:
        analysis.pullback,

      confluence:
        analysis.confluence,

      confidence:
        analysis.confidence,

      reasons:
        analysis.reasons,

      support:
        analysis.support,

      resistance:
        analysis.resistance,

      atr14:
        analysis.atr14,

      scenario:
        analysis.scenario,

      invalidation:
        analysis.invalidation
    };


    res.json({

      ok: true,

      symbol: "XAU/USD",

      timeframe: tf,

      lastCandle:
  candles.at(-1),

candles,

      analysis,

      marketDecision

    });


  } catch (error) {

    console.error(
      "XAUUSD ERROR:",
      error
    );

    res.status(500).json({
      ok: false,
      error:
        "Backend error."
    });

  }

});


app.post(
  "/api/ai-analysis",
  async (req, res) => {

    try {

      const {
        marketData,
        timeframe
      } = req.body;


      if (
        !process.env.GEMINI_API_KEY
      ) {

        return res.status(500).json({
          ok: false,
          error:
            "Gemini API key belum dipasang di server."
        });

      }


      if (!marketData) {

        return res.status(400).json({
          ok: false,
          error:
            "Data market tidak tersedia."
        });

      }

const prompt = `

Kamu adalah SniperGold AI Market Analyst.

Tugas utama kamu adalah menginterpretasikan data market
yang SUDAH dihitung oleh SniperGold Technical Engine.

==================================================
ATURAN DATA
==================================================

1. Gunakan HANYA data yang diberikan.
2. Jangan mengarang harga.
3. Jangan mengarang support atau resistance.
4. Jangan membuat level baru yang tidak ada di data.
5. Jangan mengubah angka confidence atau confluence.
6. Jangan menganggap confidence sebagai probabilitas profit.
7. Jangan menjanjikan profit.
8. Jangan mengatakan harga PASTI naik atau PASTI turun.
9. Jika kondisi mixed atau confluence lemah, katakan NEUTRAL.
10. Bedakan MARKET BIAS dengan TRADING SETUP.

==================================================
INSTRUMEN
==================================================

XAU/USD

TIMEFRAME:
${timeframe || "M15"}

==================================================
DATA MARKET
==================================================

${JSON.stringify(
  marketData,
  null,
  2
)}

==================================================
FORMAT ANALISIS
==================================================

Gunakan struktur berikut:

MARKET BIAS:
[ BULLISH / BEARISH / NEUTRAL ]

DIRECTIONAL PRESSURE:
[ BULLISH / BEARISH / NEUTRAL ]

MARKET STRUCTURE:
[jelaskan structure berdasarkan data]

MOMENTUM:
[ BULLISH / BEARISH / NEUTRAL ]

SETUP:
[jelaskan breakout/pullback berdasarkan data]

CONFLUENCE:
[jelaskan bullish factors dan bearish factors
berdasarkan angka yang diberikan]

CONFIDENCE:
[gunakan angka confidence yang diberikan]

KEY LEVELS:
Support: [gunakan angka support]
Resistance: [gunakan angka resistance]

MARKET SCENARIO:
[jelaskan skenario berdasarkan data]

INVALIDATION:
[gunakan invalidation dari engine]

WHAT TO WATCH:
[jelaskan apa yang perlu diperhatikan trader
tanpa memberikan kepastian arah]

RISK WARNING:
Analisis ini hanya untuk informasi dan edukasi,
bukan nasihat keuangan atau investasi.
Trading memiliki risiko kehilangan modal.

==================================================
GAYA JAWABAN
==================================================

- Profesional.
- Ringkas.
- Mudah dipahami trader.
- Jangan terlalu banyak basa-basi.
- Jangan menggunakan bahasa promosi.
- Jangan memberikan jaminan profit.
- Jangan menyebut "win rate" kecuali data tersebut
  benar-benar diberikan.
- Jangan memberikan sinyal BUY/SELL sebagai kepastian.
- Jika market belum jelas, prioritaskan WAIT / OBSERVE.

`;


      const response =
        await ai.models.generateContent({
          model:
            "gemini-3.5-flash-lite",
          contents: prompt
        });


      res.json({
        ok: true,
        analysis:
          response.text
      });


    } catch (error) {

      console.error(
        "AI ERROR:",
        error
      );

      res.status(500).json({
        ok: false,
        error:
          "AI analysis gagal dijalankan."
      });

    }

  }
);


app.listen(
  PORT,
  () => {
    console.log(
      `SniperGold V2: http://localhost:${PORT}`
    );
  }
);