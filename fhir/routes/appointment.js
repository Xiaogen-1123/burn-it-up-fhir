const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = 'http://hapi.fhir.org/baseR4';

// [GET] 提供固定的兩個時段選項
router.get('/slots', async (req, res) => {
    // 這裡手動定義你要的兩個時段，並加上 display 欄位供前端顯示
    const fixedSlots = [
        {
            id: "52229", 
            display: "上午 10:00 - 12:00",
            start: "2025-12-24T10:00:00+08:00"
        },
        {
            id: "52223", 
            display: "下午 02:00 - 04:00",
            start: "2025-12-24T14:00:00+08:00"
        }
    ];
    
    // 直接回傳這兩個固定選項
    res.json(fixedSlots);
});

// [POST] 建立預約
router.post('/book', async (req, res) => {
    const { patientId, diet, mode, slotId } = req.body;

    // 簡單檢查必填欄位
    if (!patientId || !slotId) {
        return res.status(400).json({ error: "缺少必要的報名資訊" });
    }

    try {
        const apptRes = await fetch(`${FHIR_BASE}/Appointment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/fhir+json' },
            body: JSON.stringify({
                resourceType: "Appointment",
                status: "booked",
                // 連結時段
                slot: [{ reference: `Slot/${slotId}` }],
                // 連結病人
                participant: [
                    { 
                        actor: { reference: `Patient/${patientId}` }, 
                        status: "accepted" 
                    }
                ],
                // 存入擴充欄位：葷素、方式
                extension: [
                    { url: "http://example.org/fhir/diet", valueString: diet },
                    { url: "http://example.org/fhir/mode", valueString: mode }
                ]
            })
        });

        const result = await apptRes.json();

        if (!apptRes.ok) {
            console.error("FHIR 錯誤回傳:", result);
            throw new Error("FHIR 伺服器拒絕建立預約");
        }

        console.log(`成功建立預約！ID: ${result.id}`);
        res.json({ status: "success", appointmentId: result.id });
    } catch (err) {
        console.error("預約處理出錯:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;