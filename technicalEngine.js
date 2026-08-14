function sma(v,p){
  return v.length<p?null:v.slice(-p).reduce((a,b)=>a+b,0)/p;
}
function atr(c,p=14){
  const t=[];
  for(let i=1;i<c.length;i++){
    const x=c[i],q=c[i-1];
    t.push(Math.max(x.high-x.low,Math.abs(x.high-q.close),Math.abs(x.low-q.close)));
  }
  return sma(t,p);
}
function pivots(c,s=2){
  const highs=[],lows=[];
  for(let i=s;i<c.length-s;i++){
    let hi=true,lo=true;
    for(let j=1;j<=s;j++){
      if(c[i].high<=c[i-j].high||c[i].high<=c[i+j].high)hi=false;
      if(c[i].low>=c[i-j].low||c[i].low>=c[i+j].low)lo=false;
    }
    if(hi)highs.push({price:c[i].high,time:c[i].time});
    if(lo)lows.push({price:c[i].low,time:c[i].time});
  }
  return {highs,lows};
}
export function analyzeCandles(c){
  const closes=c.map(x=>x.close), price=closes.at(-1);
  const fast=sma(closes,20), slow=sma(closes,50), volatility=atr(c);
  const {highs,lows}=pivots(c), h=highs.slice(-2), l=lows.slice(-2);
  let structure="NEUTRAL";
  if(h.length===2&&l.length===2){
    if(h[1].price>h[0].price&&l[1].price>l[0].price)structure="HH → HL";
    else if(h[1].price<h[0].price&&l[1].price<l[0].price)structure="LH → LL";
  }
  let trend="NEUTRAL";
  if(fast&&slow){
    if(price>fast&&fast>slow)trend="BULLISH";
    else if(price<fast&&fast<slow)trend="BEARISH";
  }
  const bias=trend;
  let confidence=50+(trend!=="NEUTRAL"?15:0)+(structure!=="NEUTRAL"?15:0)+(h.length&&l.length?10:0);
  confidence=Math.min(confidence,90);
  return {
    price,bias,confidence,trend,structure,
    support:l.at(-1)?.price??null,
    resistance:h.at(-1)?.price??null,
    atr14:volatility,
    scenario:bias==="BULLISH"
      ?"Tunggu pullback dan confirmation; hindari mengejar harga."
      :bias==="BEARISH"
      ?"Tunggu retracement dan bearish confirmation."
      :"Tunggu struktur yang lebih jelas sebelum mengambil bias.",
    invalidation:bias==="BULLISH"
      ?"Bias bullish melemah jika support/struktur utama ditembus secara tegas."
      :bias==="BEARISH"
      ?"Bias bearish melemah jika resistance/struktur utama ditembus secara tegas."
      :"Belum ada invalidation directional sampai struktur lebih jelas."
  };
}