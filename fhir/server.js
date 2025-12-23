const path = require('path');
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const open = require('open'); 

const app = express();

// 支援標準 JSON 與 FHIR 專用的 JSON 格式
app.use(express.json({ type: ['application/json', 'application/fhir+json'] }));
app.use(cookieParser());

// 靜態檔案路徑
app.use(express.static(path.join(__dirname, 'public')));

// 設定首頁路由：直接連接到 login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- 路由設定 ---
const personRoutes = require('./routes/person');
const patientRoutes = require('./routes/patient');
const appointmentRoutes = require('./routes/appointment'); // 1. 引入預約路由

app.use('/api', personRoutes);    // 處理登入、自動開戶、Person 連接
app.use('/api', patientRoutes);   // 處理病人清單、偏好紀錄查詢
app.use('/api', appointmentRoutes); // 2. 處理活動預約、防重覆報名

// --- 啟動伺服器 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`==========================================`);
  console.log(`🚀 Server 啟動成功！`);
  console.log(`🔗 本地網址: http://localhost:${PORT}`);
  console.log(`==========================================`);
  
  // 啟動後自動在瀏覽器打開網頁
  try {
    await open(`http://localhost:${PORT}`);
  } catch (err) {
    console.log("自動開啟失敗，請手動輸入 http://localhost:3000");
  }
});