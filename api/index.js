const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Buat folder untuk uploads
const uploadsDir = path.join('/tmp', 'xy2apk-uploads');
const apkOutputDir = path.join('/tmp', 'xy2apk-apks');

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(apkOutputDir);

// API Routes
app.use('/api/upload', require('./upload'));
app.use('/api/convert', require('./convert'));
app.use('/api/download', require('./download'));
app.use('/api/recent-apks', require('./recent-apks'));
app.use('/api/health', require('./health'));

// Serve static files dari /public
app.use(express.static(path.join(__dirname, '../public')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Terjadi kesalahan pada server',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Export untuk Vercel
module.exports = app;