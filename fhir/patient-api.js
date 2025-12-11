const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const FHIR_BASE = process.env.FHIR_SERVER_BASE || 'http://203.64.84.177:8080/fhir';

// 取得所有 Patient
router.get('/patients', async (req, res) => {
  try {
    const r = await fetch(`${FHIR_BASE}/Patient`);
    const b = await r.json();
    const list = (b.entry || []).map(e => ({
      id: e.resource.id,
      name: e.resource.name?.[0]?.text || '未命名'
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
