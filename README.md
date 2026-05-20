# 健康講座報名系統

##  主題及應用情境

- 本系統提供一套使用 FHIR 標準打造的活動報名平台，支援病患登入後，查看可參加的活動與時段，並直接完成預約。
  
**應用情境：**

* 使用者登入系統後，會根據其 Email 與 Person 資料綁定身分。
* 若使用者尚無病患紀錄（Patient），系統會自動建立。
* 平台顯示主辦單位排定的活動，搭配 Schedule 與 Slot 呈現可預約時段。
* 使用者選擇時段後可完成報名，並紀錄參加方式與用餐偏好。
* 系統會建立 Appointment，並改變 Slot 狀態避免重複預約。
* 此平台可用於醫院健檢報名、健康講座、校園活動等需要排班與報名管理的場合。

---

## 2. 資料規格文件

### Patient 範例

```json
{
  "resourceType": "Patient",
  "id": "patient-001",
  "active": true,
  "name": [
    { "use": "official", "text": "小根" }
  ],
  "gender": "male",
  "birthDate": "2005-01-01",
  "telecom": [
    {
      "system": "email",
      "value": "xiaogen@example.com"
    }
  ],
  "extension": [
    { "url": "http://example.org/fhir/diet", "valueString": "素食" },
    { "url": "http://example.org/fhir/mode", "valueString": "實體" }
  ]
}
```

### Person 範例

```json
{
  "resourceType": "Person",
  "id": "person-001",
  "active": true,
  "name": [{ "text": "小根" }],
  "telecom": [{ "system": "email", "value": "xiaogen@example.com", "use": "home" }],
  "link": [
    {
      "target": { "reference": "Patient/53665445", "display": "小根的病人資料" },
      "assurance": "level2"
    }
  ]
}
```

### Appointment 範例

```json
{
  "resourceType": "Appointment",
  "status": "booked",
  "description": "活動報名：牙科檢查",
  "start": "2025-12-15T10:00:00+08:00",
  "end": "2025-12-15T10:30:00+08:00",
  "slot": [{ "reference": "Slot/slot-example-001" }],
  "participant": [
    { "actor": { "reference": "Patient/53665445" }, "status": "accepted" }
  ],
  "extension": [
    { "url": "http://example.org/fhir/diet", "valueString": "素食" },
    { "url": "http://example.org/fhir/mode", "valueString": "實體" }
  ]
}
```

---

## 3. 程式碼及執行結果

### 3.1 前端登入與報名頁面 (`login.html`)

```html
<!-- login.html -->
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>健康講座報名</title>
<style>
  /* CSS 設定 */
</style>
</head>
<body>
<div class="card">
  <h2 id="mainTitle">健康講座報名</h2>
  <div id="loginSection">
    <span class="step-tag">Step 1</span>
    <label>姓名</label>
    <input type="text" id="name" placeholder="輸入姓名" value="小根">
    <label>Email</label>
    <input type="email" id="email" placeholder="輸入 Email">
    <button id="loginBtn" onclick="handleLogin()">確認身分</button>
  </div>

  <div id="bookingSection">
    <span class="step-tag">Step 2</span>
    <h3 id="welcomeMsg" style="color: #28a745;">你好！請選擇報名資訊</h3>
    <label>用餐偏好</label>
    <select id="diet">
      <option value="葷食">葷食</option>
      <option value="素食">素食</option>
      <option value="過敏待註記">過敏待註記</option>
    </select>
    <label>參加方式</label>
    <select id="mode">
      <option value="實體">實體</option>
      <option value="線上">線上</option>
    </select>
    <label>選擇預約時段</label>
    <select id="slotSelect"><option value="">載入時段中...</option></select>
    <button id="bookBtn" onclick="handleBooking()" style="background-color: #28a745;">送出報名資料</button>
  </div>
</div>

<script>
let currentPatientId = null;

async function handleLogin() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const btn = document.getElementById('loginBtn');

  if (!name || !email) return alert("請填寫姓名與 Email");

  try {
    btn.disabled = true;
    btn.innerText = "驗證中...";
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    const result = await res.json();
    if (res.ok && result.patientId) {
      currentPatientId = result.patientId;
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('bookingSection').style.display = 'block';
      document.getElementById('mainTitle').innerText = "健康講座報名";
      document.getElementById('welcomeMsg').innerText = `你好，${name}！`;
      loadSlots();
    } else {
      throw new Error(result.error || "驗證失敗");
    }
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.innerText = "確認身分";
  }
}

async function loadSlots() {
  try {
    const res = await fetch('/api/slots');
    const slots = await res.json();
    const select = document.getElementById('slotSelect');
    select.innerHTML = '';
    if (!slots || slots.length === 0) {
      select.innerHTML = '<option value="">目前無空閒時段</option>';
    } else {
      slots.forEach(slot => {
        const opt = document.createElement('option');
        opt.value = slot.id;
        opt.innerText = slot.display;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    select.innerHTML = '<option value="">載入時段出錯</option>';
  }
}

async function handleBooking() {
  const btn = document.getElementById('bookBtn');
  const slotId = document.getElementById('slotSelect').value;
  if (!slotId) return alert("請選擇時段");
  try {
    btn.disabled = true;
    btn.innerText = "提交中...";
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: currentPatientId,
        diet: document.getElementById('diet').value,
        mode: document.getElementById('mode').value,
        slotId: slotId
      })
    });
    if (res.ok) alert("恭喜！報名成功。");
    else alert("報名失敗，請稍後再試");
    location.reload();
  } catch (err) {
    alert("錯誤: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "送出報名資料";
  }
}
</script>
</body>
</html>
```

**執行結果：**

* 使用者輸入姓名與 Email 後，點擊「確認身分」可登入或自動建立 Patient 與 Person。
* 登入成功後切換至報名表單，可選擇時段、用餐偏好與參加方式，完成報名。

---

### 3.2 後端路由：Person 登錄 (`person.js`)

```js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FHIR_BASE = 'http://hapi.fhir.org/baseR4';

router.post('/register', async (req, res) => {
  const { name, email } = req.body;
  try {
    const personSearch = await fetch(`${FHIR_BASE}/Person?telecom=${email}`);
    const personData = await personSearch.json();
    let ptId;
    if (personData.total > 0 && personData.entry && personData.entry[0].resource) {
      const person = personData.entry[0].resource;
      if (person.link && person.link.length > 0)
        ptId = person.link[0].target.reference.split('/')[1];
    }
    if (!ptId) {
      const ptRes = await fetch(`${FHIR_BASE}/Patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify({
          resourceType: "Patient",
          active: true,
          name: [{ text: name }],
          telecom: [{ system: "email", value: email }]
        })
      });
      const newPt = await ptRes.json();
      ptId = newPt.id || ptRes.headers.get('location')?.split('/')[5];
      await fetch(`${FHIR_BASE}/Person`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify({
          resourceType: "Person",
          name: [{ text: name }],
          telecom: [{ system: "email", value: email }],
          link: [{ target: { reference: `Patient/${ptId}` } }]
        })
      });
    }
    res.json({ status: "success", patientId: ptId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**執行結果：**

* 使用者輸入姓名與 Email 後，回傳對應 Patient ID。
* 若不存在則自動建立 Patient 與 Person，並連結。

---

### 3.3 後端路由：Appointment 預約 (`appointment.js`)

```js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FHIR_BASE = 'http://hapi.fhir.org/baseR4';

const slotTimeMap = { "52229": "上午 10:00 - 12:00", "52223": "下午 02:00 - 04:00" };

router.get('/slots', async (req, res) => {
  const fixedSlots = [
    { id: "52229", display: slotTimeMap["52229"], start: "2025-12-24T10:00:00+08:00" },
    { id: "52223", display: slotTimeMap["52223"], start: "2025-12-24T14:00:00+08:00" }
  ];
  res.json(fixedSlots);
});

router.post('/book', async (req, res) => {
  const { patientId, diet, mode, slotId } = req.body;
  if (!patientId || !slotId) return res.status(400).json({ error: "缺少必要的報名資訊" });
  try {
    const apptRes = await fetch(`${FHIR_BASE}/Appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify({
        resourceType: "Appointment",
        status: "booked",
        slot: [{ reference: `Slot/${slotId}`, display: slotTimeMap[slotId] }],
        participant: [{ actor: { reference: `Patient/${patientId}` }, status: "accepted" }],
        extension: [
          { url: "http://example.org/fhir/diet", valueString: diet },
          { url: "http://example.org/fhir/mode", valueString: mode }
        ]
      })
    });
    const apptResult = await apptRes.json();
    await fetch(`${FHIR_BASE}/Slot/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify({ resourceType: "Slot", id: slotId, status: "busy" })
    });
    res.json({ status: "success", appointmentId: apptResult.id, message: "預約已完成且時段已鎖定" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**執行結果：**

* 回傳固定時段給前端。
* 預約後自動鎖定時段避免重複報名。

---

### 3.4 後端路由：Patient 資訊查詢 (`patient.js`)

```js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FHIR_BASE = 'http://hapi.fhir.org/baseR4';
const slotTimeMap = { "52229": "上午 10:00 - 12:00", "52223": "下午 02:00 - 04:00" };

router.get('/patients', async (req, res) => {
  if (req.query.pw !== 'admin123') return res.status(403).json({ error: "權限不足" });
  try {
    const url = `${FHIR_BASE}/Appointment?_sort=-_lastUpdated&_count=20&_include=Appointment:patient&_include=Appointment:slot`;
    const r = await fetch(url);
    const data = await r.json();
    if (!data.entry) return res.json([]);
    const resourceMap = {};
    data.entry.forEach(item => { resourceMap[`${item.resource.resourceType}/${item.resource.id}`] = item.resource; });
    const appointments = data.entry
      .filter(item => item.resource.resourceType === "Appointment")
      .map(item => {
        const appt = item.resource;
        const ptRef = appt.participant?.find(p => p.actor.reference.includes('Patient'))?.actor.reference;
        const pt = resourceMap[ptRef];
        const slotRef = appt.slot?.[0]?.reference;
        const slotId = slotRef ? slotRef.split('/')[1] : null;
        let timeDisplay = slotId && slotTimeMap[slotId] ? slotTimeMap[slotId] : "未指定時段";
        const dietExt = appt.extension?.find(e => e.url.includes("diet"));
        const modeExt = appt.extension?.find(e => e.url.includes("mode"));
        return {
          appointmentId: appt.id,
          patientId: pt?.id || "未知",
          name: pt?.name ? pt.name[0].text : "未知",
          email: pt?.telecom?.find(t => t.system === 'email')?.value || "未提供",
          "預約時間": timeDisplay,
          "用餐偏好": dietExt ? dietExt.valueString : "無紀錄",
          "參加方式": modeExt ? modeExt.valueString : "無紀錄",
          "狀態": appt.status,
          "最後更新": appt.meta?.lastUpdated
        };
      });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: "伺服器連線失敗" });
  }
});

module.exports = router;
```

---

### 3.5 主伺服器 (`server.js`)

```js
const path = require('path');
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const open = require('open'); 
const app = express();

app.use(express.json({ type: ['application/json', 'application/fhir+json'] }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'login.html')); });

const personRoutes = require('./routes/person');
const patientRoutes = require('./routes/patient');
const appointmentRoutes = require('./routes/appointment');

app.use('/api', personRoutes);
app.use('/api', patientRoutes);
app.use('/api', appointmentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server 啟動成功！🔗 本地網址: http://localhost:${PORT}`);
  try { await open(`http://localhost:${PORT}`); } catch (err) { console.log("請手動輸入 http://localhost:3000"); }
});
```

---

## 4. 說明文件

1. 系統依照 FHIR 標準操作 Patient、Person、Appointment 資源。
2. 前端分 Step1 身分驗證、Step2 報名表單。
3. 後端路由分別處理註冊、預約、查詢與時段管理。
4. 時段固定，報名後自動鎖定避免重複。

---

## 5. 程式可能延伸應用

* 報名通知功能（Email / SMS）
* 候補名單（Slot 額滿加入候補）
* 修改 / 取消預約（同步更新 Slot 狀態）
* 活動分析報表（熱門時段、參加率）
* 整合院內系統（健檢、門診等流程）
