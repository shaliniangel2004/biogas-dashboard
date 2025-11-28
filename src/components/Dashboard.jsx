import { useState, useEffect } from 'react';

function Dashboard() {
  const [liveData, setLiveData] = useState({
    temperature: 0,
    pressure: 0,
    ph_level: 0,
    humidity: 0,
    concentration: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Your Render API URL
  const API_URL = 'https://biogas-api.onrender.com';

  // Fetch data from API
  const fetchData = async () => {
    try {
      console.log('Fetching data from API...');
      const response = await fetch(`${API_URL}/api/sensors/latest`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success && result.data) {
          setLiveData(result.data);
          setError(null);
        } else {
          setError('No data available');
        }
      } else {
        setError(`API Error: ${response.status}`);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading data...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Biogas Monitoring Dashboard</h1>
      
      {error && (
        <div style={{ color: 'red', margin: '20px 0' }}>
          Error: {error}
        </div>
      )}
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        <DataCard title="Temperature" value={liveData.temperature} unit="°C" />
        <DataCard title="Pressure" value={liveData.pressure} unit="hPa" />
        <DataCard title="pH Level" value={liveData.ph_level} unit="" />
        <DataCard title="Humidity" value={liveData.humidity} unit="%" />
        <DataCard title="CH₄ Concentration" value={liveData.concentration} unit="%" />
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h3>API Status</h3>
        <p>Connected to: {API_URL}</p>
        <p>Last update: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

function DataCard({ title, value, unit }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: 'white',
      padding: '20px',
      borderRadius: '10px',
      width: '200px'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>{title}</h3>
      <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
        {typeof value === 'number' ? value.toFixed(2) : '0.00'} {unit}
      </p>
    </div>
  );
}

export default Dashboard;