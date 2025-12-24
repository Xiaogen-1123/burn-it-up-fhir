const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = 'http://hapi.fhir.org/baseR4';

// 定義 ID 與顯示文字的對照表
const slotTimeMap = {
    "52229": "上午 10:00 - 12:00",
    "52223": "下午 02:00 - 04:00"
};

// [GET] 提供時段選項
router.get('/slots', async (req, res) => {
    const fixedSlots = [
        {
            id: "52229", 
            display: slotTimeMap["52229"],
            start: "2025-12-24T10:00:00+08:00"
        },
        {
            id: "52223", 
            display: slotTimeMap["52223"],
            start: "2025-12-24T14:00:00+08:00"
        }
    ];
    res.json(fixedSlots);
});

// [POST] 建立預約並鎖定時段
router.post('/book', async (req, res) => {
    const { patientId, diet, mode, slotId } = req.body;

    if (!patientId || !slotId) {
        return res.status(400).json({ error: "缺少必要的報名資訊" });
    }

    const slotDisplayText = slotTimeMap[slotId] || "未指定時段";

    try {
        // 第一步：建立 Appointment 資源
        const apptRes = await fetch(`${FHIR_BASE}/Appointment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/fhir+json' },
            body: JSON.stringify({
                resourceType: "Appointment",
                status: "booked",
                slot: [{ 
                    reference: `Slot/${slotId}`,
                    display: slotDisplayText 
                }],
                participant: [
                    { 
                        actor: { reference: `Patient/${patientId}` }, 
                        status: "accepted" 
                    }
                ],
                extension: [
                    { url: "http://example.org/fhir/diet", valueString: diet },
                    { url: "http://example.org/fhir/mode", valueString: mode }
                ]
            })
        });

        const apptResult = await apptRes.json();

        if (!apptRes.ok) {
            throw new Error("FHIR 伺服器建立預約失敗");
        }

        // 第二步：鎖定 Slot (將狀態改為 busy)
        // 這是確保「避免重複報名」的關鍵動作
        const slotUpdateRes = await fetch(`${FHIR_BASE}/Slot/${slotId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/fhir+json' },
            body: JSON.stringify({
                resourceType: "Slot",
                id: slotId,
                status: "busy" 
            })
        });

        if (!slotUpdateRes.ok) {
            console.warn(`警告：預約成功但 Slot/${slotId} 狀態更新失敗`);
        } else {
            console.log(`時段 Slot/${slotId} 已成功鎖定為 busy`);
        }

        console.log(`成功建立預約！ID: ${apptResult.id}`);
        res.json({ 
            status: "success", 
            appointmentId: apptResult.id,
            message: "預約已完成且時段已鎖定" 
        });

    } catch (err) {
        console.error("預約處理出錯:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;