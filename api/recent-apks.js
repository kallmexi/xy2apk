const fs = require('fs-extra');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    const outputDir = path.join('/tmp', 'xy2apk-apks');
    const apks = [];

    if (fs.existsSync(outputDir)) {
      const folders = await fs.readdir(outputDir);
      
      for (const folder of folders) {
        const folderPath = path.join(outputDir, folder);
        const files = await fs.readdir(folderPath);
        
        for (const file of files) {
          if (file.endsWith('.apk')) {
            const filePath = path.join(folderPath, file);
            const stats = await fs.stat(filePath);
            const manifestPath = path.join(folderPath, 'manifest.json');
            
            let manifest = {};
            if (fs.existsSync(manifestPath)) {
              try {
                manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
              } catch (e) {}
            }

            apks.push({
              id: folder,
              filename: file,
              appName: manifest.appName || 'Unknown App',
              packageName: manifest.packageName || 'com.unknown.app',
              version: manifest.version || '1.0.0',
              size: stats.size,
              created: stats.birthtime,
              downloadUrl: `/api/download?id=${folder}&filename=${encodeURIComponent(file)}`
            });
          }
        }
      }
    }

    // Urutkan berdasarkan tanggal dibuat (terbaru pertama)
    apks.sort((a, b) => new Date(b.created) - new Date(a.created));

    res.status(200).json({
      success: true,
      count: apks.length,
      apks: apks.slice(0, 5) // Hanya 5 terbaru
    });

  } catch (error) {
    console.error('Recent APKs error:', error);
    res.status(500).json({ error: 'Gagal mengambil daftar APK' });
  }
};