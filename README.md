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

### **（1）建立 Person（登入帳號）**
```json
{
  "resourceType": "Person",
  "identifier": [
    { "system": "http://example.org/email", "value": "xiaoming@example.com" }
  ],
  "name": [{ "text": "林小明" }]
}
```
### **（2）建立 Patient（若首次登入）**

```json
{
  "resourceType": "Patient",
  "identifier": [
    { "system": "http://example.org/person-id", "value": "PERSON-123" }
  ],
  "name": [{ "text": "林小明" }],
  "managingOrganization": { "reference": "Organization/tcu" }
}
```
### **（3）建立 Appointment（活動報名紀錄）**
```json
{
  "resourceType": "Appointment",
  "status": "booked",
  "slot": [
    { "reference": "Slot/20250803-1530" }
  ],
  "participant": [
    {
      "actor": { "reference": "Patient/100" },
      "status": "accepted"
    }
  ],
  "serviceType": [
    {
      "coding": [
        {
          "system": "http://example.org/type",
          "code": "virtual",
          "display": "線上"
        }
      ]
    }
  ],
  "extension": [
    {
      "url": "http://example.org/fhir/meal",
      "valueString": "素食"
    }
  ]
}
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

