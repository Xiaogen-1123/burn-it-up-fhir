const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = 'http://hapi.fhir.org/baseR4';

// [GET] 查詢所有狀態為 free 的 Slot
router.get('/slots', async (req, res) => {
    try {
        const response = await fetch(`${FHIR_BASE}/Slot?status=free&_count=10`);
        const data = await response.json();
        
        if (!data.entry) return res.json([]);

        // 只取出需要的欄位給前端
        const slots = data.entry.map(item => ({
            id: item.resource.id,
            start: item.resource.start,
            end: item.resource.end
        }));
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// [POST] 建立預約
router.post('/book', async (req, res) => {
    const { patientId, diet, mode, slotId } = req.body;

    try {
        const apptRes = await fetch(`${FHIR_BASE}/Appointment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/fhir+json' },
            body: JSON.stringify({
                resourceType: "Appointment",
                status: "booked",
                slot: [{ reference: `Slot/${slotId}` }],
                participant: [
                    { actor: { reference: `Patient/${patientId}` }, status: "accepted" }
                ],
                extension: [
                    { url: "http://example.org/fhir/diet", valueString: diet },
                    { url: "http://example.org/fhir/mode", valueString: mode }
                ]
            })
        });

        if (!apptRes.ok) throw new Error("FHIR 伺服器拒絕建立 Appointment");

        console.log(`[Slot] Slot/${slotId} 已被佔用`);
        res.json({ status: "success" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;