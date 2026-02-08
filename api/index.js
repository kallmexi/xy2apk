const express = require('express');
const app = express();

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'XY2APK Converter',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL_ENV || 'development'
    });
});

// Upload endpoint (simulated)
app.post('/api/upload', (req, res) => {
    try {
        // Simulate file upload
        res.json({
            success: true,
            message: 'Upload simulated successfully',
            files: {
                htmlFile: {
                    filename: `file_${Date.now()}.html`,
                    size: 1024,
                    mimetype: 'text/html'
                }
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Upload simulation failed'
        });
    }
});

// Convert endpoint (simulated)
app.post('/api/convert', (req, res) => {
    try {
        const { appName, packageName, version = '1.0.0' } = req.body;
        
        if (!appName || !packageName) {
            return res.status(400).json({
                success: false,
                error: 'App name and package name are required'
            });
        }
        
        const processId = Date.now().toString(36);
        const apkFilename = `${appName.replace(/\s+/g, '_')}_${version}.apk`;
        
        res.json({
            success: true,
            message: 'APK created successfully',
            apkInfo: {
                id: processId,
                filename: apkFilename,
                appName,
                packageName,
                version,
                size: Math.floor(Math.random() * 5000000) + 1000000, // 1-5MB
                features: req.body.features || [],
                permissions: req.body.permissions || 'standard',
                timestamp: new Date().toISOString(),
                downloadUrl: `/api/download?id=${processId}&filename=${encodeURIComponent(apkFilename)}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Conversion failed: ' + error.message
        });
    }
});

// Download endpoint
app.get('/api/download', (req, res) => {
    try {
        const { id, filename } = req.query;
        const downloadFilename = filename || 'app.apk';
        
        // Create simulated APK content
        const apkContent = JSON.stringify({
            app: 'XY2APK Generated APK',
            note: 'This is a simulated APK file. In production, this would be a real Android APK.',
            timestamp: new Date().toISOString(),
            buildId: id || 'unknown'
        }, null, 2);
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        res.send(apkContent);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Download failed'
        });
    }
});

// Serve static files
app.use(express.static('public'));

// Default route - serve index.html
app.get('*', (req, res) => {
    res.sendFile(require('path').join(__dirname, '../public/index.html'));
});

module.exports = app;
