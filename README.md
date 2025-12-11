# burn-it-up-fhir
---

## 一、主題及應用情境

本系統提供一套使用 FHIR 標準打造的活動報名平台，支援病患登入後，查看可參加的活動與時段，並直接完成預約。

應用情境如下：

- 使用者登入系統後，會根據其 Email 與 Person 資料綁定身分。
- 若使用者尚無病患紀錄（Patient），系統會自動建立。
- 平台顯示主辦單位排定的活動，搭配 Schedule 與 Slot 呈現可預約時段。
- 使用者選擇時段後可完成報名，並紀錄參加方式與用餐偏好。
- 系統會建立 Appointment，並改變 Slot 狀態避免重複預約。

此平台可用於醫院健檢報名、健康講座、校園活動等需要排班與報名管理的場合。

---


## 二、資料規格文件（FHIR Resource 設計）

本系統使用以下 FHIR 資源：

### **1. Schedule（排班資訊）**
- 描述活動日期、主講者或負責人。
- Schedule.actor 連結 PractitionerRole。

### **2. Slot（可預約時段）**
- 每筆 Slot 代表一段具體可預約時間。  
- status = free → 可預約  
- status = busy → 已被預約  

### **3. Appointment（預約紀錄）**
- status：預約狀態（booked）  
- slot：選定時段  
- participant：病患與活動人員  
- serviceType：參加方式（線上 / 實體）  
- extension：用餐偏好  

### **4. Patient（病患資料）**
- 若使用者首次登入則自動建立  
- identifier 連結 Person 帳號  

### **5. Person（使用者帳號）**
- 儲存 email、姓名等資訊  
- 與 Patient 一對一  

### **6. Organization（主辦機構）**
- 如大學、醫院、健檢中心  

### **7. Practitioner / PractitionerRole（活動人員）**
- Practitioner：講者、醫護人員  
- PractitionerRole：描述其在某機構的角色  

---

## 三、程式碼及執行結果示例（FHIR JSON）

以下展示建立 Person、Patient 與 Appointment 的完整 JSON。

---
### ** (1) 主程式 server **

```js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json({ type: ['application/json', 'application/fhir+json'] }));
app.use(cookieParser());

// 靜態資源
app.use(express.static(path.join(__dirname, 'public')));

// 路由
const personRoutes = require('./routes/person');
const patientRoutes = require('./routes/patient');
const appointmentRoutes = require('./routes/appointment');

app.use('/api', personRoutes);
app.use('/api', patientRoutes);
app.use('/api', appointmentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

```
### ** (2) Person 相關 API **

```js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = process.env.FHIR_SERVER_BASE || 'http://203.64.84.177:8080/fhir';

// 註冊 Person 並建立 Patient
router.post('/register', async (req, res) => {
  const { name, email, gender, birthDate, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: '姓名和 Email 必填' });

  try {
    const checkUrl = `${FHIR_BASE}/Person?identifier=${encodeURIComponent(email)}`;
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();
    if (checkData.total > 0) return res.status(409).json({ error: '此 Email 已被註冊' });

    const person = {
      resourceType: 'Person',
      name: [{ text: name }],
      identifier: [{ system: 'http://example.org/fhir/email', value: email }],
      telecom: phone ? [{ system: 'phone', value: phone, use: 'mobile' }] : []
    };

    const createPersonRes = await fetch(`${FHIR_BASE}/Person`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(person)
    });
    const newPerson = await createPersonRes.json();

    const patient = {
      resourceType: 'Patient',
      name: [{ use: 'official', text: name }],
      gender: gender || 'unknown',
      birthDate: birthDate || null,
      telecom: phone ? [{ system: 'phone', value: phone, use: 'mobile' }] : [],
      link: [{ other: { reference: `Person/${newPerson.id}` }, type: 'seealso' }]
    };

    const createPatientRes = await fetch(`${FHIR_BASE}/Patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(patient)
    });
    const newPatient = await createPatientRes.json();

    res.json({ person: newPerson, patient: newPatient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

```
### ** (3) Patient 相關 API **

```js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = process.env.FHIR_SERVER_BASE || 'http://203.64.84.177:8080/fhir';

// 取得所有 Patient
router.get('/patients', async (req, res) => {
  try {
    const r = await fetch(`${FHIR_BASE}/Patient`);
    const b = await r.json();
    const list = (b.entry || []).map(e => ({
      id: e.resource.id,
      name: e.resource.name?.[0]?.text || '未命名'
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

```
### ** (4) Appointment 相關 API **

```js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = process.env.FHIR_SERVER_BASE || 'http://203.64.84.177:8080/fhir';

// 建立 Appointment
router.post('/appointments', async (req, res) => {
  try {
    const appointment = req.body;
    const r = await fetch(`${FHIR_BASE}/Appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(appointment)
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

```

### **（5）建立 Person（登入帳號）**
```json
{
  "resourceType": "Person",
  "id": "person-001",
  "name": [{ "text": "王小明" }],
  "identifier": [{ "system": "http://example.org/fhir/email", "value": "test@example.com" }],
  "telecom": [{ "system": "email", "value": "test@example.com", "use": "home" }]
}

```
### **（6）建立 Patient（若首次登入）**

```json
{
  "resourceType": "Patient",
  "id": "patient-001",
  "name": [{ "use": "official", "text": "王小明" }],
  "gender": "male",
  "birthDate": "1990-01-01",
  "telecom": [{ "system": "phone", "value": "0912345678", "use": "mobile" }],
  "link": [{ "other": { "reference": "Person/person-001" }, "type": "seealso" }]
}

```
### **（7）建立 Appointment（活動報名紀錄）**
```json
{
  "resourceType": "Appointment",
  "status": "booked",
  "description": "牙科檢查",
  "start": "2025-12-15T10:00:00+08:00",
  "end": "2025-12-15T10:30:00+08:00",
  "participant": [
    { "actor": { "reference": "Patient/patient-001" }, "status": "accepted" }
  ]
}

```
(8) ** 登入頁面 **
```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<title>註冊系統</title>
</head>
<body>
<h1>註冊系統</h1>
<form id="registerForm">
  <label>姓名: <input type="text" name="name" required></label><br>
  <label>Email: <input type="email" name="email" required></label><br>
  <label>電話: <input type="text" name="phone"></label><br>
  <label>性別: 
    <select name="gender">
      <option value="male">男</option>
      <option value="female">女</option>
      <option value="other">其他</option>
    </select>
  </label><br>
  <label>生日: <input type="date" name="birthDate"></label><br>
  <button type="submit">註冊</button>
</form>

<script>
const form = document.getElementById('registerForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  const result = await res.json();
  alert(JSON.stringify(result, null, 2));
});
</script>
</body>
</html>

```
---

## 四、說明文件（FHIR 實作邏輯）
1. 使用者登入邏輯
- 系統依 Email 查詢 Person
- 若無對應 Patient → 自動建立 Patient

2. 查詢活動與時段
- 使用 Schedule 顯示活動排班資訊
- 使用 Slot 顯示可預約時段（status = free）

3. 建立報名（Appointment）邏輯
- 使用者選定 Slot 後：
    - 建立 Appointment
    - 將 Slot.status = busy
    - participant 連結 Patient 與活動人員
    - extension 記錄用餐偏好（葷 / 素）

4. 查詢應用示例
- 查某 Slot 的所有預約紀錄（Appointment.slot）
- 查某醫師的排班（Schedule.actor + PractitionerRole）

---

## 五、程式可能延伸應用
可依需求擴充：
- 報名通知功能（Email / SMS）
- 候補名單（Slot 額滿加入候補）
- 修改 / 取消預約（同步更新 Slot 狀態）
- 活動分析報表（熱門時段、參加率）
- 整合院內系統（健檢、門診等流程）

