const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

// Setup folder uploads di Vercel (gunakan /tmp)
const uploadsDir = path.join('/tmp', 'xy2apk-uploads');
fs.ensureDirSync(uploadsDir);

// Konfigurasi storage untuk Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.fieldname === 'appIcon' ? 'icons' : 'html';
    const dir = path.join(uploadsDir, type);
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueId}${ext}`);
  }
});

// Filter file
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDocTypes = ['text/html', 'application/zip'];
  
  if (file.fieldname === 'appIcon') {
    // Untuk icon, hanya terima gambar
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan untuk icon (JPEG, PNG, GIF, WebP)'), false);
    }
  } else {
    // Untuk file HTML/ZIP
    const allowedExts = ['.html', '.htm', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedDocTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file HTML atau ZIP yang diperbolehkan'), false);
    }
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB untuk icon
    files: 2 // Maksimal 2 file: htmlFile dan appIcon
  },
  fileFilter: fileFilter
});

// Handler untuk upload
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    // Gunakan multer untuk handle multipart/form-data
    const uploadHandler = upload.fields([
      { name: 'htmlFile', maxCount: 1 },
      { name: 'appIcon', maxCount: 1 }
    ]);

    uploadHandler(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Ukuran file terlalu besar. Maksimal 10MB untuk icon' });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Field name tidak valid' });
          }
        }
        return res.status(400).json({ error: err.message });
      }

      if (!req.files || !req.files.htmlFile) {
        return res.status(400).json({ error: 'File HTML/ZIP diperlukan' });
      }

      const htmlFile = req.files.htmlFile[0];
      const iconFile = req.files.appIcon ? req.files.appIcon[0] : null;

      // Process icon jika ada
      let iconInfo = null;
      if (iconFile) {
        try {
          // Resize icon ke ukuran standar
          const iconPath = path.join(uploadsDir, 'icons', iconFile.filename);
          const resizedIconPath = path.join(uploadsDir, 'icons', `resized-${iconFile.filename}`);
          
          await sharp(iconPath)
            .resize(512, 512, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png()
            .toFile(resizedIconPath);

          iconInfo = {
            filename: `resized-${iconFile.filename}`,
            originalname: iconFile.originalname,
            size: fs.statSync(resizedIconPath).size,
            path: resizedIconPath,
            mimetype: 'image/png'
          };

          // Hapus file icon asli
          fs.unlinkSync(iconPath);
        } catch (iconError) {
          console.error('Error processing icon:', iconError);
          // Lanjut tanpa icon jika error
        }
      }

      const fileInfo = {
        htmlFile: {
          filename: htmlFile.filename,
          originalname: htmlFile.originalname,
          size: htmlFile.size,
          path: htmlFile.path,
          mimetype: htmlFile.mimetype
        },
        iconFile: iconInfo
      };

      res.status(200).json({
        success: true,
        message: 'File berhasil diupload',
        files: fileInfo
      });
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Gagal mengupload file: ' + error.message });
  }
};