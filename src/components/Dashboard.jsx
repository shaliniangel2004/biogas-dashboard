import { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

function Dashboard() {
  const [liveData, setLiveData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('warning');
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isDataStale, setIsDataStale] = useState(false);
  const [dataAgeSeconds, setDataAgeSeconds] = useState(null);

  const API_URL = 'https://biogas-api.onrender.com';

  const THRESHOLDS = {
    temperature1: { min: 20, max: 38, critical_min: 15, critical_max: 45, unit: '°C' },
    temperature2: { min: 20, max: 38, critical_min: 15, critical_max: 45, unit: '°C' },
    pressure: { min: 1000, max: 1040, critical_min: 980, critical_max: 1060, unit: 'hPa' },
    ph_level: { min: 6.5, max: 7.8, critical_min: 6.0, critical_max: 8.5, unit: '' },
    concentration: { min: 55, max: 75, critical_min: 45, critical_max: 85, unit: '%' }
  };

  const checkThresholds = (data) => {
    if (isDataStale || !data) return;
    const newAlerts = [];
    Object.keys(THRESHOLDS).forEach(param => {
      const value = data[param];
      if (typeof value !== 'number') return;
      const threshold = THRESHOLDS[param];
      const paramName = param.replace('_', ' ').toUpperCase();

      if (value <= threshold.critical_min) {
        newAlerts.push({ id: Date.now() + param, type: 'critical', message: `🚨 CRITICAL: ${paramName} is extremely low (${value.toFixed(1)}${threshold.unit})` });
      } 
      else if (value >= threshold.critical_max) {
        newAlerts.push({ id: Date.now() + param, type: 'critical', message: `🚨 CRITICAL: ${paramName} is extremely high (${value.toFixed(1)}${threshold.unit})` });
      } 
      else if (value < threshold.min) {
        newAlerts.push({ id: Date.now() + param, type: 'warning', message: `⚠️ WARNING: ${paramName} is low (${value.toFixed(1)}${threshold.unit})` });
      } 
      else if (value > threshold.max) {
        newAlerts.push({ id: Date.now() + param, type: 'warning', message: `⚠️ WARNING: ${paramName} is high (${value.toFixed(1)}${threshold.unit})` });
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 20).map((a) => ({
        ...a,
        timestamp: new Date().toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})
      })));
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sensors/latest`);

      if (response.ok) {
        const result = await response.json();

        const ageInSeconds = result.data.timestamp
          ? (Date.now() - new Date(result.data.timestamp).getTime()) / 1000
          : Infinity;

        setDataAgeSeconds(ageInSeconds);

        if (result.success && ageInSeconds < 20) {

          setIsDataStale(false);
          setLiveData(result.data);

          // ✅ IST conversion
          setLastUpdateTime(
            new Date().toLocaleTimeString('en-IN',{
              timeZone:'Asia/Kolkata',
              hour:'2-digit',
              minute:'2-digit',
              second:'2-digit'
            })
          );

          setError(null);
          checkThresholds(result.data);

        } else {
          setIsDataStale(true);
          setLiveData(null);
          setError(`Sensor offline. Last data was ${Math.round(ageInSeconds)} seconds ago.`);
        }

      } else {
        setIsDataStale(true);
        setError(`API Error: ${response.status}`);
      }

    } catch (err) {
      setIsDataStale(true);
      setError('Failed to connect to API server.');
    }

    finally {
      setLoading(false);
    }
  };


  const fetchHistoricalData = async () => {
    try {

      const response = await fetch(`${API_URL}/api/sensors/history`);

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data) {

          const formattedData = result.data.map(item => ({
            ...item,

            // ✅ IST conversion for charts
            time: new Date(item.time).toLocaleTimeString('en-IN',{
              timeZone:'Asia/Kolkata',
              hour:'2-digit',
              minute:'2-digit',
              second:'2-digit'
            })

          }));

          setHistoricalData(formattedData);
        }
      }

    } catch (err) {
      console.error('Error fetching historical data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHistoricalData();

    const dataInterval = setInterval(fetchData, 5000);
    const historyInterval = setInterval(fetchHistoricalData, 60000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(historyInterval);
    };
  }, []);


  const systemStatus = loading
    ? { text: '⏳ CONNECTING...', color: '#ff9800' }
    : (isDataStale
        ? { text: '🔴 SENSOR OFFLINE', color: '#f44336' }
        : { text: '🟢 ONLINE', color: '#4caf50' });


  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <h2 style={styles.loadingText}>Connecting to Biogas Plant...</h2>
      </div>
    );
  }


  return (
    <div style={styles.container}>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🔥 Smart Biogas Monitoring System</h1>
          <p style={styles.subtitle}>IoT-Enabled Cold Region Biogas Plant</p>
        </div>

        <div style={styles.headerRight}>

          <div style={{
            ...styles.systemStatus,
            background: systemStatus.color
          }}>
            {systemStatus.text}
          </div>

          {/* ✅ FIXED display */}
          <div style={styles.lastUpdate}>
            Last Update: {lastUpdateTime ? lastUpdateTime : 'Never'}
          </div>

          {isDataStale && dataAgeSeconds > 0 &&
            <div style={styles.staleWarning}>
              ⚠️ Data is {Math.round(dataAgeSeconds)} seconds old
            </div>
          }

        </div>
      </header>


      {/* SENSOR CARDS */}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📊 Live Sensor Data</h2>

        <div style={styles.cardsGrid}>

          <SensorCard title="Temperature1" value={liveData?.temperature1} unit="°C"/>
          <SensorCard title="Temperature2" value={liveData?.temperature2} unit="°C"/>
          <SensorCard title="Pressure" value={liveData?.pressure} unit="hPa"/>
          <SensorCard title="pH Level" value={liveData?.ph_level} unit=""/>
          <SensorCard title="CH₄ Concentration" value={liveData?.concentration} unit="%"/>

        </div>
      </section>


      {/* TEMPERATURE CHART */}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📈 Historical Trends</h2>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="time" />

            <YAxis/>

            <Tooltip/>

            <Legend/>

            <Area
              type="monotone"
              dataKey="temperature1"
              stroke="#667eea"
              fill="#667eea"
            />

            <Area
              type="monotone"
              dataKey="temperature2"
              stroke="#43e97b"
              fill="#43e97b"
            />

          </AreaChart>
        </ResponsiveContainer>

      </section>

    </div>
  );
}


function SensorCard({ title, value, unit }) {

  return (
    <div style={styles.sensorCard}>

      <h3>{title}</h3>

      <p style={styles.cardValue}>
        {value ? value.toFixed(2) : 'N/A'} {unit}
      </p>

    </div>
  );
}


const styles = {

container:{
minHeight:'100vh',
background:'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
padding:'20px',
color:'#fff'
},

header:{
display:'flex',
justifyContent:'space-between',
marginBottom:'30px'
},

title:{
fontSize:'28px'
},

subtitle:{
opacity:0.8
},

section:{
marginBottom:'30px'
},

sectionTitle:{
fontSize:'22px',
marginBottom:'20px'
},

cardsGrid:{
display:'grid',
gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',
gap:'20px'
},

sensorCard:{
background:'rgba(255,255,255,0.1)',
padding:'20px',
borderRadius:'15px'
},

cardValue:{
fontSize:'30px',
fontWeight:'bold'
},

systemStatus:{
padding:'8px 16px',
borderRadius:'20px'
},

lastUpdate:{
fontSize:'12px'
},

staleWarning:{
fontSize:'11px',
color:'#ff9800'
}

};

export default Dashboard;