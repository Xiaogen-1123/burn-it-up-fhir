const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = 'http://hapi.fhir.org/baseR4';

router.get('/patients', async (req, res) => {
    // 1. 管理員密碼檢查
    if (req.query.pw !== 'admin123') {
        return res.status(403).json({ error: "權限不足" });
    }

    try {
        console.log("正在抓取報名預約清單（含時段詳細資訊）...");
        
        // 2. 抓取 Appointment，同時 include 病人 (patient) 和 時段 (slot)
        const url = `${FHIR_BASE}/Appointment?_sort=-_lastUpdated&_count=20&_include=Appointment:patient&_include=Appointment:slot`;
        const r = await fetch(url);
        const data = await r.json();

        if (!data.entry) return res.json([]);

        // 3. 建立一個資源地圖 (Map)，方便透過 ID 快速尋找包含的 Patient 和 Slot
        const resourceMap = {};
        data.entry.forEach(item => {
            const res = item.resource;
            resourceMap[`${res.resourceType}/${res.id}`] = res;
        });

        // 4. 解析資料
        const appointments = data.entry
            .filter(item => item.resource.resourceType === "Appointment")
            .map(item => {
                const appt = item.resource;
                
                // 找出對應的 Patient
                const ptRef = appt.participant?.find(p => p.actor.reference.includes('Patient'))?.actor.reference;
                const pt = resourceMap[ptRef];

                // --- 關鍵修改：找出對應的 Slot 並解析時間 ---
                const slotRef = appt.slot?.[0]?.reference;
                const slot = resourceMap[slotRef];
                
                let timeDisplay = "未指定時段";
                if (slot && slot.start) {
                    const startDate = new Date(slot.start);
                    // 格式化為：12/23 15:30
                    timeDisplay = startDate.toLocaleString('zh-TW', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                }

                // 從 extension 抓取偏好
                const dietExt = appt.extension?.find(e => e.url.includes("diet"));
                const modeExt = appt.extension?.find(e => e.url.includes("mode"));

                return {
                    appointmentId: appt.id,
                    patientId: pt?.id || "未知",
                    name: pt?.name ? pt.name[0].text : "未知",
                    email: pt?.telecom?.find(t => t.system === 'email')?.value || "未提供",
                    "預約時間": timeDisplay, // <--- 這裡現在會顯示具體時間了
                    "用餐偏好": dietExt ? dietExt.valueString : "無紀錄",
                    "參加方式": modeExt ? modeExt.valueString : "無紀錄",
                    "狀態": appt.status,
                    "最後更新": appt.meta?.lastUpdated
                };
            });

        res.json(appointments); 
    } catch (err) {
        console.error("抓取失敗:", err.message);
        res.status(500).json({ error: "伺服器連線失敗" });
    }
});

module.exports = router;