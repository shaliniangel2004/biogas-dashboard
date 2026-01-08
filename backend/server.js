// biogas-backend/server.js

const express = require('express');
const cors = require('cors');
const { InfluxDB } = require('@influxdata/influxdb-client');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// InfluxDB Cloud credentials
const url = 'https://us-east-1-1.aws.cloud2.influxdata.com';
// IMPORTANT: Paste your real InfluxDB token inside the quotes below
const token = 'WiQDi74BKf-7abM5ARBchwOEwnbNVZqQGKYysRvDUSrQb7vwVcfmxb05JxT1WeC2xz_Ip_VPGXLSoxvNfmY-aw==';
const org = 'biogas';
const bucket = 'biogas_data';

const influxDB = new InfluxDB({ url, token });
const queryApi = influxDB.getQueryApi(org);

// Home route
app.get('/', (req, res) => res.json({ message: '🔥 Biogas Monitoring API is running!' }));

// Get latest sensor data
app.get('/api/sensors/latest', async (req, res) => {
  try {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "biogas_sensor")
        |> last()
    `;
    const results = {};
    let timestamp = null;
    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const data = tableMeta.toObject(row);
          results[data._field] = data._value;
          timestamp = data._time;
        },
        error: reject,
        complete: resolve
      });
    });

    if (Object.keys(results).length === 0) {
      return res.status(404).json({ success: false, message: 'No recent data found.' });
    }

    // UPDATED DATA STRUCTURE
    res.json({
      success: true,
      data: {
        temperature1: results.temperature1 || 0,
        temperature2: results.temperature2 || 0,
        pressure: results.pressure || 0,
        ph_level: results.ph_level || 0,
        concentration: results.concentration || 0,
        timestamp: timestamp || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get historical data
app.get('/api/sensors/history', async (req, res) => {
  try {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "biogas_sensor")
        |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
    `;
    const points = {};
    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const data = tableMeta.toObject(row);
          const t = data._time;
          if (!points[t]) points[t] = { time: t };
          points[t][data._field] = data._value;
        },
        error: reject,
        complete: resolve
      });
    });
    const history = Object.values(points).sort((a, b) => new Date(a.time) - new Date(b.time));
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Biogas Monitoring API Server running on http://localhost:${PORT}`);
});