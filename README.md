# burn-it-up-fhir
FHIR 大健康比賽

# FHIR大健康
組別：burn it up 

## 一、資料規格文件（FHIR Resource 設計）

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

## 二、程式碼及執行結果示例（FHIR JSON）

以下展示建立 Person、Patient 與 Appointment 的完整 JSON。

---

### **（1）建立 Person（登入帳號）**
--  person.json
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
--  patient.json
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