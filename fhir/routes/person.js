const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = 'http://hapi.fhir.org/baseR4';

router.post('/register', async (req, res) => {
    const { name, email } = req.body;

    try {
        // 1. 依 Email 查詢 Person
        const personSearch = await fetch(`${FHIR_BASE}/Person?telecom=${email}`);
        const personData = await personSearch.json();

        let ptId;
        
        // --- 核心修正：增加 entry 是否存在的檢查 ---
        if (personData.total > 0 && personData.entry && personData.entry[0].resource) {
            const person = personData.entry[0].resource;
            
            // 檢查是否真的有 link
            if (person.link && person.link.length > 0) {
                ptId = person.link[0].target.reference.split('/')[1];
                console.log(`[Person] 找到現有病人 ID: ${ptId}`);
            }
        }

        // 2. 如果沒找到 ID，則自動建立 Patient
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
            
            // --- 核心修正：更保險的 ID 取得方式 ---
            ptId = newPt.id || ptRes.headers.get('location')?.split('/')[5];

            if (!ptId) throw new Error("無法取得新建 Patient 的 ID");

            // 3. 建立 Person 並連結
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
            console.log(`[Person] 已為新用戶建立 Patient/${ptId}`);
        }

        // 4. 回傳結果
        res.json({ status: "success", patientId: ptId });

    } catch (err) {
        console.error("後端錯誤:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;