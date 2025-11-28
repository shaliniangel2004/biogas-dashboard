const express = require('express');
const cors = require('cors');
const { InfluxDB } = require('@influxdata/influxdb-client');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// YOUR INFLUXDB CLOUD CREDENTIALS
const url = 'https://us-east-1-1.aws.cloud2.influxdata.com';
const token = 'WiQDi74BKf-7abM5ARBchwOEwnbNVZqQGKYysRvDUSrQb7vwVcfmxb05JxT1WeC2xz_Ip_VPGXLSoxvNfmY-aw==';
const org = 'biogas';
const bucket = 'biogas_data';

const influxDB = new InfluxDB({ url, token });
const queryApi = influxDB.getQueryApi(org);

// Home Route
app.get('/', (req, res) => {
  res.json({
    message: '🔥 Biogas Monitoring API is running!',
    status: 'online'
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: 'InfluxDB Cloud' });
});

// Get Latest Sensor Data
app.get('/api/sensors/latest', async (req, res) => {
  try {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "biogas_sensor")
        |> last()
    `;

    const results = {};
    
    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const data = tableMeta.toObject(row);
          results[data._field] = data._value;
          results.timestamp = data._time;
        },
        error: reject,
        complete: resolve
      });
    });

    res.json({
      success: true,
      data: {
        temperature: results.temperature || 0,
        pressure: results.pressure || 0,
        ph_level: results.ph_level || 0,
        humidity: results.humidity || 0,
        concentration: results.concentration || 0,
        timestamp: results.timestamp
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Historical Data
app.get('/api/sensors/history', async (req, res) => {
  try {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "biogas_sensor")
        |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
    `;

    const dataPoints = {};

    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const data = tableMeta.toObject(row);
          const time = data._time;
          if (!dataPoints[time]) dataPoints[time] = { time };
          dataPoints[time][data._field] = data._value;
        },
        error: reject,
        complete: resolve
      });
    });

    const historyArray = Object.values(dataPoints).sort((a, b) => 
      new Date(a.time) - new Date(b.time)
    );

    res.json({ success: true, count: historyArray.length, data: historyArray });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "biogas_sensor")
        |> last()
    `;

    const results = {};
    
    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const data = tableMeta.toObject(row);
          results[data._field] = data._value;
        },
        error: reject,
        complete: resolve
      });
    });

    const thresholds = {
      temperature: { min: 20, max: 38 },
      pressure: { min: 1000, max: 1040 },
      ph_level: { min: 6.5, max: 7.8 },
      humidity: { min: 65, max: 85 },
      concentration: { min: 55, max: 75 }
    };

    const alerts = [];

    Object.keys(thresholds).forEach(param => {
      const value = results[param];
      const t = thresholds[param];
      if (value < t.min) {
        alerts.push({ parameter: param, value, type: 'warning', message: `${param} is LOW` });
      } else if (value > t.max) {
        alerts.push({ parameter: param, value, type: 'warning', message: `${param} is HIGH` });
      }
    });

    res.json({ success: true, alertCount: alerts.length, alerts });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   🔥 BIOGAS MONITORING API SERVER         ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log(`║   🌐 Running on: http://localhost:${PORT}    ║`);
  console.log('║   ☁️  Database: InfluxDB Cloud             ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log('║   📡 Endpoints:                           ║');
  console.log('║   • /                  - API Info         ║');
  console.log('║   • /api/sensors/latest - Live Data       ║');
  console.log('║   • /api/sensors/history - History        ║');
  console.log('║   • /api/alerts        - Alerts           ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
});