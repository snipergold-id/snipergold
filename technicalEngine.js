function sma(values, period) {
  if (!values || values.length < period) return null;

  return values
    .slice(-period)
    .reduce((sum, value) => sum + value, 0) / period;
}


function ema(values, period) {
  if (!values || values.length < period) return null;

  const multiplier = 2 / (period + 1);

  let result =
    values
      .slice(0, period)
      .reduce((sum, value) => sum + value, 0) / period;

  for (let i = period; i < values.length; i++) {
    result =
      (values[i] - result) * multiplier + result;
  }

  return result;
}


function atr(candles, period = 14) {
  if (!candles || candles.length < period + 1) {
    return null;
  }

  const ranges = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];

    ranges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      )
    );
  }

  return sma(ranges, period);
}


function pivots(candles, strength = 2) {

  const highs = [];
  const lows = [];

  for (
    let i = strength;
    i < candles.length - strength;
    i++
  ) {

    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= strength; j++) {

      if (
        candles[i].high <= candles[i - j].high ||
        candles[i].high <= candles[i + j].high
      ) {
        isHigh = false;
      }

      if (
        candles[i].low >= candles[i - j].low ||
        candles[i].low >= candles[i + j].low
      ) {
        isLow = false;
      }
    }

    if (isHigh) {
      highs.push({
        price: candles[i].high,
        time: candles[i].time,
        index: i
      });
    }

    if (isLow) {
      lows.push({
        price: candles[i].low,
        time: candles[i].time,
        index: i
      });
    }
  }

  return { highs, lows };
}


function analyzeStructure(highs, lows) {

  if (
    highs.length < 2 ||
    lows.length < 2
  ) {
    return {
      label: "INSUFFICIENT_DATA",
      direction: "NEUTRAL",
      details: []
    };
  }

  const previousHigh =
    highs.at(-2).price;

  const latestHigh =
    highs.at(-1).price;

  const previousLow =
    lows.at(-2).price;

  const latestLow =
    lows.at(-1).price;


  const highState =
    latestHigh > previousHigh
      ? "HH"
      : "LH";


  const lowState =
    latestLow > previousLow
      ? "HL"
      : "LL";


  const details = [
    highState,
    lowState
  ];


  if (
    highState === "HH" &&
    lowState === "HL"
  ) {
    return {
      label: "HH → HL",
      direction: "BULLISH",
      details
    };
  }


  if (
    highState === "LH" &&
    lowState === "LL"
  ) {
    return {
      label: "LH → LL",
      direction: "BEARISH",
      details
    };
  }


  if (
    highState === "HH" &&
    lowState === "LL"
  ) {
    return {
      label: "HH + LL",
      direction: "MIXED",
      details
    };
  }


  if (
    highState === "LH" &&
    lowState === "HL"
  ) {
    return {
      label: "LH + HL",
      direction: "MIXED",
      details
    };
  }


  return {
    label: `${highState} + ${lowState}`,
    direction: "MIXED",
    details
  };
}


function analyzeMomentum(closes) {

  if (closes.length < 20) {
    return {
      label: "NEUTRAL",
      score: 0
    };
  }


  const current =
    closes.at(-1);

  const previous =
    closes.at(-6);

  const change =
    current - previous;

  const average =
    sma(closes, 20);


  if (!average) {
    return {
      label: "NEUTRAL",
      score: 0
    };
  }


  if (
    change > 0 &&
    current > average
  ) {
    return {
      label: "BULLISH",
      score: 1
    };
  }


  if (
    change < 0 &&
    current < average
  ) {
    return {
      label: "BEARISH",
      score: -1
    };
  }


  return {
    label: "NEUTRAL",
    score: 0
  };
}


function detectBreakout(
  candles,
  highs,
  lows
) {

  if (
    candles.length < 10
  ) {
    return {
      label: "NONE",
      direction: "NEUTRAL"
    };
  }


  const price =
    candles.at(-1).close;


  const resistance =
    highs.at(-1)?.price ?? null;

  const support =
    lows.at(-1)?.price ?? null;


  if (
    resistance !== null &&
    price > resistance
  ) {
    return {
      label: "BULLISH_BREAKOUT",
      direction: "BULLISH"
    };
  }


  if (
    support !== null &&
    price < support
  ) {
    return {
      label: "BEARISH_BREAKOUT",
      direction: "BEARISH"
    };
  }


  return {
    label: "NONE",
    direction: "NEUTRAL"
  };
}


function detectPullback(
  price,
  trend,
  support,
  resistance,
  volatility
) {

  if (
    !volatility ||
    !price
  ) {
    return "NONE";
  }


  const tolerance =
    volatility * 0.75;


  if (
    trend === "BULLISH" &&
    support !== null &&
    Math.abs(price - support) <= tolerance
  ) {
    return "BULLISH_PULLBACK";
  }


  if (
    trend === "BEARISH" &&
    resistance !== null &&
    Math.abs(price - resistance) <= tolerance
  ) {
    return "BEARISH_PULLBACK";
  }


  return "NONE";
}


function determineTrend(
  price,
  ema20,
  ema50,
  ema100
) {

  if (
    !ema20 ||
    !ema50 ||
    !ema100
  ) {
    return "NEUTRAL";
  }


  if (
    price > ema20 &&
    ema20 > ema50 &&
    ema50 > ema100
  ) {
    return "BULLISH";
  }


  if (
    price < ema20 &&
    ema20 < ema50 &&
    ema50 < ema100
  ) {
    return "BEARISH";
  }


  return "NEUTRAL";
}


function calculateConfluence(
  trend,
  structure,
  momentum,
  breakout,
  pullback
) {

  let bullish = 0;
  let bearish = 0;


  if (
    trend === "BULLISH"
  ) {
    bullish += 2;
  }

  if (
    trend === "BEARISH"
  ) {
    bearish += 2;
  }


  if (
    structure === "BULLISH"
  ) {
    bullish += 2;
  }

  if (
    structure === "BEARISH"
  ) {
    bearish += 2;
  }


  if (
    momentum === "BULLISH"
  ) {
    bullish += 1;
  }

  if (
    momentum === "BEARISH"
  ) {
    bearish += 1;
  }


  if (
    breakout === "BULLISH"
  ) {
    bullish += 2;
  }

  if (
    breakout === "BEARISH"
  ) {
    bearish += 2;
  }


  if (
    pullback === "BULLISH_PULLBACK"
  ) {
    bullish += 1;
  }

  if (
    pullback === "BEARISH_PULLBACK"
  ) {
    bearish += 1;
  }


  return {
    bullish,
    bearish,
    total:
      bullish + bearish
  };
}


function determineBias(
  confluence
) {

  if (
    confluence.bullish >= 5 &&
    confluence.bullish >
      confluence.bearish + 1
  ) {
    return "BULLISH";
  }


  if (
    confluence.bearish >= 5 &&
    confluence.bearish >
      confluence.bullish + 1
  ) {
    return "BEARISH";
  }


  return "NEUTRAL";
}


function calculateConfidence(
  confluence,
  bias,
  structure,
  trend,
  momentum
) {

  if (
    bias === "NEUTRAL"
  ) {

    if (
      structure === "MIXED"
    ) {
      return 55;
    }

    return 60;
  }


  const directionScore =
    bias === "BULLISH"
      ? confluence.bullish
      : confluence.bearish;


  const oppositeScore =
    bias === "BULLISH"
      ? confluence.bearish
      : confluence.bullish;


  let confidence =
    50 +
    directionScore * 5 -
    oppositeScore * 3;


  if (
    trend === bias
  ) {
    confidence += 5;
  }


  if (
    structure === bias
  ) {
    confidence += 5;
  }


  if (
    momentum === bias
  ) {
    confidence += 5;
  }


  return Math.max(
    50,
    Math.min(
      confidence,
      95
    )
  );
}


function buildReasons(
  bias,
  trend,
  structure,
  momentum,
  breakout,
  pullback
) {

  const reasons = [];


  if (
    trend !== "NEUTRAL"
  ) {
    reasons.push(
      `Trend ${trend.toLowerCase()}`
    );
  }


  if (
    structure !== "NEUTRAL" &&
    structure !== "MIXED"
  ) {
    reasons.push(
      `Structure ${structure}`
    );
  }


  if (
    momentum !== "NEUTRAL"
  ) {
    reasons.push(
      `Momentum ${momentum.toLowerCase()}`
    );
  }


  if (
    breakout !== "NONE"
  ) {
    reasons.push(
      breakout
    );
  }


  if (
    pullback !== "NONE"
  ) {
    reasons.push(
      pullback
    );
  }


  if (
    reasons.length === 0
  ) {
    reasons.push(
      "Confluence belum cukup kuat"
    );
  }


  return reasons;
}


export function analyzeCandles(
  candles
) {

  if (
    !candles ||
    candles.length < 30
  ) {

    return {
      price:
        candles?.at(-1)?.close ?? null,

      bias: "NEUTRAL",

      confidence: 0,

      trend: "NEUTRAL",

      structure:
        "INSUFFICIENT_DATA",

      structureDetails: [],

      momentum: "NEUTRAL",

      breakout: "NONE",

      pullback: "NONE",

      support: null,

      resistance: null,

      atr14: null,

      confluence: {
        bullish: 0,
        bearish: 0,
        total: 0
      },

      reasons: [
        "Data candle belum cukup"
      ],

      scenario:
        "Data candle belum cukup untuk melakukan analisis.",

      invalidation:
        "Tidak ada invalidation sampai data mencukupi."
    };
  }


  const closes =
    candles.map(
      candle => candle.close
    );


  const price =
    closes.at(-1);


  const ema20 =
    ema(closes, 20);

  const ema50 =
    ema(closes, 50);

  const ema100 =
    ema(closes, 100);


  const volatility =
    atr(candles, 14);


  const {
    highs,
    lows
  } =
    pivots(
      candles,
      2
    );


  const support =
    lows.at(-1)?.price ?? null;

  const resistance =
    highs.at(-1)?.price ?? null;


  const structureData =
    analyzeStructure(
      highs,
      lows
    );


  const trend =
    determineTrend(
      price,
      ema20,
      ema50,
      ema100
    );


  const momentumData =
    analyzeMomentum(
      closes
    );


  const breakoutData =
    detectBreakout(
      candles,
      highs,
      lows
    );


  const pullback =
    detectPullback(
      price,
      trend,
      support,
      resistance,
      volatility
    );


  const confluence =
    calculateConfluence(
      trend,
      structureData.direction,
      momentumData.label,
      breakoutData.direction,
      pullback
    );


  const bias =
    determineBias(
      confluence
    );


  const confidence =
    calculateConfidence(
      confluence,
      bias,
      structureData.direction,
      trend,
      momentumData.label
    );


  const reasons =
    buildReasons(
      bias,
      trend,
      structureData.direction,
      momentumData.label,
      breakoutData.label,
      pullback
    );


  let scenario;


  if (
    bias === "BULLISH"
  ) {

    scenario =
      "Confluence bullish lebih dominan. Fokus pada continuation atau pullback menuju area struktur dan tunggu confirmation.";

  } else if (
    bias === "BEARISH"
  ) {

    scenario =
      "Confluence bearish lebih dominan. Fokus pada continuation atau retracement menuju area struktur dan tunggu confirmation.";

  } else {

    scenario =
      "Confluence belum cukup kuat. Tunggu struktur dan momentum menjadi lebih jelas sebelum menentukan directional bias.";
  }


  let invalidation;


  if (
    bias === "BULLISH"
  ) {

    invalidation =
      support !== null
        ? `Bias bullish melemah jika harga menembus swing low ${support.toFixed(2)} secara tegas.`
        : "Bias bullish melemah jika support struktur utama ditembus.";

  } else if (
    bias === "BEARISH"
  ) {

    invalidation =
      resistance !== null
        ? `Bias bearish melemah jika harga menembus swing high ${resistance.toFixed(2)} secara tegas.`
        : "Bias bearish melemah jika resistance struktur utama ditembus.";

  } else {

    invalidation =
      "Belum ada invalidation directional sampai bias market menjadi lebih jelas.";
  }


  return {

    price,

    bias,

    confidence,

    trend,

    structure:
      structureData.label,

    structureDetails:
      structureData.details,

    momentum:
      momentumData.label,

    breakout:
      breakoutData.label,

    pullback,

    support,

    resistance,

    atr14:
      volatility,

    ema20,

    ema50,

    ema100,

    confluence,

    reasons,

    scenario,

    invalidation
  };
}