const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json({ type: ['application/json', 'application/fhir+json'] }));
app.use(cookieParser());

// 靜態資源
app.use(express.static(path.join(__dirname, 'public')));

// 路由
const personRoutes = require('./routes/person');
const patientRoutes = require('./routes/patient');
const appointmentRoutes = require('./routes/appointment');

app.use('/api', personRoutes);
app.use('/api', patientRoutes);
app.use('/api', appointmentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
