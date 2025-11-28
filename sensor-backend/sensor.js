require('dotenv').config();
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

// YOUR InfluxDB CLOUD config
const url = 'https://us-east-1-1.aws.cloud2.influxdata.com';
const token = 'WiQDi74BKf-7abM5ARBchwOEwnbNVZqQGKYysRvDUSrQb7vwVcfmxb05JxT1WeC2xz_Ip_VPGXLSoxvNfmY-aw==';
const org = 'biogas';
const bucket = 'biogas_data';

console.log('🌐 Connecting to InfluxDB Cloud...');
console.log('URL:', url);
console.log('Org:', org);
console.log('Bucket:', bucket);

const influxDB = new InfluxDB({ url, token });
const writeApi = influxDB.getWriteApi(org, bucket);

// Function to generate realistic biogas sensor data
function generateBiogasData() {
  return {
    temperature: (15 + Math.random() * 20).toFixed(2),
    pressure: (1000 + Math.random() * 50).toFixed(2),
    ph_level: (6.5 + Math.random() * 1.5).toFixed(2),
    humidity: (60 + Math.random() * 30).toFixed(2),
    concentration: (50 + Math.random() * 30).toFixed(2)
  };
}

// Function to write data to InfluxDB
async function writeData() {
  try {
    const data = generateBiogasData();
    
    const point = new Point('biogas_sensor')
      .floatField('temperature', parseFloat(data.temperature))
      .floatField('pressure', parseFloat(data.pressure))
      .floatField('ph_level', parseFloat(data.ph_level))
      .floatField('humidity', parseFloat(data.humidity))
      .floatField('concentration', parseFloat(data.concentration));
    
    writeApi.writePoint(point);
    await writeApi.flush();
    
    console.log(`✅ Data sent to CLOUD at ${new Date().toLocaleTimeString()}:`);
    console.log(`  🌡️  Temp: ${data.temperature}°C`);
    console.log(`  💨 Pressure: ${data.pressure} hPa`);
    console.log(`  💧 pH: ${data.ph_level}`);
    console.log(`  💦 Humidity: ${data.humidity}%`);
    console.log(`  🔬 CH4 Concentration: ${data.concentration}%`);
    console.log(`  ☁️  Status: Successfully sent to InfluxDB Cloud!`);
    console.log('---');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Write data every 5 seconds
console.log('🚀 Biogas Virtual Sensor Started! (CLOUD MODE)\n');
writeData(); // Write immediately
setInterval(() => {
  writeData();
}, 5000);

// Stop gracefully
process.on('SIGINT', () => {
  console.log('\n⏹ Stopping sensor...');
  writeApi.close().then(() => {
    console.log('Sensor stopped.');
    process.exit(0);
  });
});