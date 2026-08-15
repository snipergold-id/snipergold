SNIPERGOLD V2 CONNECTED
========================

Ini menghubungkan UI AI Analyst dengan backend market-data.

LANGKAH:
1. Install Node.js LTS.
2. Buka terminal di folder proyek.
3. Jalankan: npm install
4. Copy .env.example menjadi .env
5. Masukkan API key Twelve Data ke TWELVE_DATA_API_KEY.
6. Jalankan: npm start
7. Buka http://localhost:3000
8. Pilih timeframe dan tekan ANALYZE MARKET.

API key JANGAN dimasukkan ke HTML dan jangan dikirim melalui chat.

V2 saat ini:
- XAU/USD
- M5/M15/H1/H4
- OHLC
- SMA20/50
- ATR14
- Pivot structure
- HH/HL atau LH/LL
- Bias, confidence, support, resistance
- Scenario dan invalidation

BELUM ADA:
- OpenAI/LLM production
- live streaming/WebSocket
- broker-specific XAUUSDM feed
- database/analytics
- admin dashboard
- authentication
- production security hardening

Sebelum production, kita validasi data feed terhadap broker target dan menambahkan
backend AI yang aman.
