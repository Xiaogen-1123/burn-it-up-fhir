const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = process.env.FHIR_SERVER_BASE || 'http://203.64.84.177:8080/fhir';

// 建立 Appointment
router.post('/appointments', async (req, res) => {
  try {
    const appointment = req.body;
    const r = await fetch(`${FHIR_BASE}/Appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(appointment)
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
