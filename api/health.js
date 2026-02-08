module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    const fs = require('fs-extra');
    const path = require('path');
    
    // Check disk space
    const tmpDir = '/tmp';
    const stats = fs.statSync(tmpDir);
    const freeSpace = stats.size;

    res.status(200).json({
      status: 'healthy',
      service: 'XY2APK Converter',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      server: 'Vercel Serverless',
      features: {
        upload: true,
        convert: true,
        iconSupport: true,
        noLogin: true
      },
      limits: {
        maxFileSize: '10MB',
        supportedFormats: ['HTML', 'ZIP', 'PNG', 'JPEG', 'GIF', 'WebP'],
        retention: '1 hour (temporary storage)'
      },
      storage: {
        freeSpace: Math.round(freeSpace / (1024 * 1024)) + 'MB',
        location: 'Temporary (/tmp)'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
};