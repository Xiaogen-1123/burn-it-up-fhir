const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = 'http://hapi.fhir.org/baseR4';

// 定義 ID 與中文時間的對照表 (必須與 appointment.js 保持一致)
const slotTimeMap = {
    "52229": "上午 10:00 - 12:00",
    "52223": "下午 02:00 - 04:00"
};

router.get('/patients', async (req, res) => {
    // 1. 管理員密碼檢查
    if (req.query.pw !== 'admin123') {
        return res.status(403).json({ error: "權限不足" });
    }

    try {
        console.log("正在抓取報名預約清單...");
        
        const url = `${FHIR_BASE}/Appointment?_sort=-_lastUpdated&_count=20&_include=Appointment:patient&_include=Appointment:slot`;
        const r = await fetch(url);
        const data = await r.json();

        if (!data.entry) return res.json([]);

        const resourceMap = {};
        data.entry.forEach(item => {
            const res = item.resource;
            resourceMap[`${res.resourceType}/${res.id}`] = res;
        });

        const appointments = data.entry
            .filter(item => item.resource.resourceType === "Appointment")
            .map(item => {
                const appt = item.resource;
                
                // 找出對應的 Patient
                const ptRef = appt.participant?.find(p => p.actor.reference.includes('Patient'))?.actor.reference;
                const pt = resourceMap[ptRef];

                // --- 核心修改：優先使用中文對照表 ---
                const slotRef = appt.slot?.[0]?.reference; // 例如 "Slot/52229"
                const slotId = slotRef ? slotRef.split('/')[1] : null; // 取得 "52229"
                
                let timeDisplay = "未指定時段";
                
                if (slotId && slotTimeMap[slotId]) {
                    // 如果在我們的對照表內，直接使用漂亮的中文字串
                    timeDisplay = slotTimeMap[slotId];
                } else {
                    // 如果不在對照表內（例如舊資料），則抓取 Slot 資源的原始時間
                    const slot = resourceMap[slotRef];
                    if (slot && slot.start) {
                        const startDate = new Date(slot.start);
                        timeDisplay = startDate.toLocaleString('zh-TW', {
                            month: 'numeric', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: false
                        }) + " (原始時間)";
                    }
                }

                const dietExt = appt.extension?.find(e => e.url.includes("diet"));
                const modeExt = appt.extension?.find(e => e.url.includes("mode"));

                return {
                    appointmentId: appt.id,
                    patientId: pt?.id || "未知",
                    name: pt?.name ? pt.name[0].text : "未知",
                    email: pt?.telecom?.find(t => t.system === 'email')?.value || "未提供",
                    "預約時間": timeDisplay, // <--- 現在會顯示「上午 10:00 - 12:00」了
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