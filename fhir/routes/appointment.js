const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = 'http://hapi.fhir.org/baseR4';

// 定義 ID 與顯示文字的對照表，方便在 POST 時抓取對應的文字
const slotTimeMap = {
    "52229": "上午 10:00 - 12:00",
    "52223": "下午 02:00 - 04:00"
};

// [GET] 提供固定的兩個時段選項
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

// [POST] 建立預約
router.post('/book', async (req, res) => {
    const { patientId, diet, mode, slotId } = req.body;

    if (!patientId || !slotId) {
        return res.status(400).json({ error: "缺少必要的報名資訊" });
    }

    // 根據 slotId 找出對應的顯示文字
    const slotDisplayText = slotTimeMap[slotId] || "未指定時段";

    try {
        const apptRes = await fetch(`${FHIR_BASE}/Appointment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/fhir+json' },
            body: JSON.stringify({
                resourceType: "Appointment",
                status: "booked",
                // --- 關鍵修改：加入 display 欄位 ---
                slot: [{ 
                    reference: `Slot/${slotId}`,
                    display: slotDisplayText  // 這樣 HAPI 原始資料就會顯示文字了
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