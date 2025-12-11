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
