const path = require('path');
const fs = require('fs-extra');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    const { id, filename } = req.query;
    
    if (!id || !filename) {
      return res.status(400).json({ error: 'Parameter tidak lengkap' });
    }

    const decodedFilename = decodeURIComponent(filename);
    const apkPath = path.join('/tmp', 'xy2apk-apks', id, decodedFilename);

    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({ error: 'File APK tidak ditemukan' });
    }

    // Set headers untuk download
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${decodedFilename}"`);
    
    // Stream file ke response
    const fileStream = fs.createReadStream(apkPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Gagal mendownload APK' });
  }
};