class XY2APKConverter {
    constructor() {
        this.htmlFile = null;
        this.iconFile = null;
        this.currentAPK = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkServerStatus();
        this.loadRecentAPKs();
        this.setupAutoGenerate();
    }

    bindEvents() {
        // HTML File Upload
        document.getElementById('htmlUploadArea').addEventListener('click', () => {
            document.getElementById('htmlFile').click();
        });

        document.getElementById('htmlFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0], 'html');
        });

        // Icon File Upload
        document.getElementById('iconUploadArea').addEventListener('click', () => {
            document.getElementById('iconFile').click();
        });

        document.getElementById('iconFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0], 'icon');
        });

        // Convert Button
        document.getElementById('convertBtn').addEventListener('click', () => {
            this.convertToAPK();
        });

        // Action Buttons
        document.getElementById('downloadBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentAPK) {
                window.open(this.currentAPK.downloadUrl, '_blank');
            }
        });

        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareAPK();
        });

        document.getElementById('newBtn').addEventListener('click', () => {
            this.resetForm();
        });

        // Refresh Recent APKs
        document.getElementById('refreshApks').addEventListener('click', () => {
            this.loadRecentAPKs();
        });
    }

    setupAutoGenerate() {
        const appNameInput = document.getElementById('appName');
        const packageInput = document.getElementById('packageName');
        
        appNameInput.addEventListener('input', (e) => {
            if (!packageInput.value || packageInput.value === 'com.example.myapp') {
                const packageName = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '')
                    .substring(0, 15);
                
                if (packageName) {
                    packageInput.value = `com.${packageName}.app`;
                }
            }
        });
    }

    async handleFileUpload(file, type) {
        if (!file) return;

        // Validasi berdasarkan tipe
        if (type === 'html') {
            const validTypes = ['text/html', 'application/zip', 'application/x-zip-compressed'];
            const validExts = ['.html', '.htm', '.zip'];
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            
            if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
                this.showNotification('Format file tidak didukung. Gunakan HTML atau ZIP.', 'error');
                return;
            }

            if (file.size > 50 * 1024 * 1024) {
                this.showNotification('Ukuran file terlalu besar. Maksimal 50MB.', 'error');
                return;
            }

            this.htmlFile = file;
            this.displayFileInfo(file, 'htmlFileInfo', type);

        } else if (type === 'icon') {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            
            if (!validTypes.includes(file.type)) {
                this.showNotification('Format icon tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.', 'error');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                this.showNotification('Ukuran icon terlalu besar. Maksimal 10MB.', 'error');
                return;
            }

            this.iconFile = file;
            this.displayFileInfo(file, 'iconFileInfo', type);
            
            // Preview icon
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('iconPreview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Icon Preview">`;
                
                // Update result icon preview
                const resultIcon = document.getElementById('resultIcon');
                resultIcon.innerHTML = `<img src="${e.target.result}" alt="App Icon" style="width: 60px; height: 60px; border-radius: 15px;">`;
            };
            reader.readAsDataURL(file);
        }
    }

    displayFileInfo(file, elementId, type) {
        const element = document.getElementById(elementId);
        const size = (file.size / (1024 * 1024)).toFixed(2);
        
        if (type === 'icon') {
            element.innerHTML = `
                <div class="file-info-item">
                    <span>${file.name}</span>
                    <span>${size} MB</span>
                </div>
            `;
        } else {
            element.innerHTML = `
                <div class="file-info-item">
                    <span>${file.name}</span>
                    <span>${size} MB</span>
                    <button class="remove-btn" onclick="converter.removeFile('${type}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
    }

    removeFile(type) {
        if (type === 'html') {
            this.htmlFile = null;
            document.getElementById('htmlFileInfo').innerHTML = '';
            document.getElementById('htmlFile').value = '';
        } else {
            this.iconFile = null;
            document.getElementById('iconFileInfo').innerHTML = '';
            document.getElementById('iconFile').value = '';
            document.getElementById('iconPreview').innerHTML = '';
            document.getElementById('resultIcon').innerHTML = '<i class="fas fa-mobile-alt"></i>';
        }
    }

    async convertToAPK() {
        // Validasi
        if (!this.htmlFile) {
            this.showNotification('Harap upload file HTML/ZIP terlebih dahulu!', 'error');
            return;
        }

        const appName = document.getElementById('appName').value.trim();
        const packageName = document.getElementById('packageName').value.trim();
        const version = document.getElementById('appVersion').value.trim();

        if (!appName || !packageName || !version) {
            this.showNotification('Harap isi semua field yang diperlukan!', 'error');
            return;
        }

        // Kumpulkan konfigurasi
        const features = [];
        if (document.getElementById('splashScreen').checked) features.push('splash');
        if (document.getElementById('fullscreen').checked) features.push('fullscreen');
        if (document.getElementById('admob').checked) features.push('admob');
        if (document.getElementById('pushNotification').checked) features.push('push');

        const permissions = document.getElementById('permissions').value;
        const includeIcon = document.getElementById('includeIcon').checked;

        // Disable button dan tampilkan loading
        const convertBtn = document.getElementById('convertBtn');
        const originalContent = convertBtn.innerHTML;
        convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Memproses...</span>';
        convertBtn.disabled = true;

        try {
            const startTime = Date.now();

            // Upload file ke server
            const formData = new FormData();
            formData.append('htmlFile', this.htmlFile);
            if (this.iconFile && includeIcon) {
                formData.append('appIcon', this.iconFile);
            }

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const uploadResult = await uploadResponse.json();

            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Upload gagal');
            }

            // Konversi ke APK
            const convertResponse = await fetch('/api/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    htmlFilename: uploadResult.files.htmlFile.filename,
                    iconFilename: uploadResult.files.iconFile?.filename,
                    appName: appName,
                    packageName: packageName,
                    version: version,
                    permissions: permissions,
                    features: features,
                    includeIcon: includeIcon
                })
            });

            const convertResult = await convertResponse.json();

            if (convertResult.success) {
                // Simpan data APK
                this.currentAPK = convertResult.apkInfo;
                
                // Tampilkan hasil
                this.displayResult(convertResult.apkInfo, startTime);
                this.showNotification('APK berhasil dibuat!', 'success');
                
                // Load ulang daftar APK terbaru
                this.loadRecentAPKs();
            } else {
                throw new Error(convertResult.error || 'Konversi gagal');
            }
        } catch (error) {
            console.error('Conversion error:', error);
            this.showNotification(`Gagal membuat APK: ${error.message}`, 'error');
        } finally {
            // Reset button
            convertBtn.innerHTML = originalContent;
            convertBtn.disabled = false;
        }
    }

    displayResult(apkInfo, startTime) {
        // Update elemen hasil
        document.getElementById('resultAppName').textContent = apkInfo.appName;
        document.getElementById('resultPackage').textContent = apkInfo.packageName;
        document.getElementById('resultVersion').textContent = apkInfo.version;
        document.getElementById('resultSize').textContent = (apkInfo.size / (1024 * 1024)).toFixed(2) + ' MB';
        document.getElementById('buildId').textContent = apkInfo.id.substring(0, 8).toUpperCase();
        
        // Update waktu build
        const endTime = Date.now();
        const buildTime = ((endTime - startTime) / 1000).toFixed(1);
        document.getElementById('buildTime').textContent = `${buildTime} detik`;
        
        // Update fitur
        const featureNames = {
            'splash': 'Splash Screen',
            'fullscreen': 'Fullscreen',
            'admob': 'AdMob',
            'push': 'Push Notification'
        };
        const featuresText = apkInfo.features.map(f => featureNames[f] || f).join(', ');
        document.getElementById('buildFeatures').textContent = featuresText;
        
        // Update izin
        const permissionNames = {
            'minimal': 'Internet',
            'standard': 'Internet, Storage',
            'full': 'All Permissions'
        };
        document.getElementById('buildPermissions').textContent = permissionNames[apkInfo.permissions] || apkInfo.permissions;
        
        // Update download link
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.href = apkInfo.downloadUrl;
        
        // Tampilkan hasil
        document.getElementById('resultSection').classList.add('show');
        
        // Scroll ke hasil
        document.getElementById('resultSection').scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
    }

    async loadRecentAPKs() {
        const recentApksList = document.getElementById('recentApks');
        recentApksList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Memuat APK terbaru...</div>';

        try {
            const response = await fetch('/api/recent-apks');
            const result = await response.json();

            if (result.success && result.apks.length > 0) {
                recentApksList.innerHTML = '';
                
                result.apks.forEach(apk => {
                    const date = new Date(apk.created);
                    const dateStr = date.toLocaleDateString('id-ID');
                    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    
                    const apkItem = document.createElement('div');
                    apkItem.className = 'recent-apk-item';
                    apkItem.innerHTML = `
                        <div class="apk-item-info">
                            <h5>${apk.appName}</h5>
                            <div class="apk-item-meta">
                                <span>v${apk.version}</span>
                                <span>${(apk.size / (1024 * 1024)).toFixed(2)} MB</span>
                                <span>${dateStr} ${timeStr}</span>
                            </div>
                        </div>
                        <button class="apk-item-download" onclick="window.open('${apk.downloadUrl}', '_blank')">
                            <i class="fas fa-download"></i> Download
                        </button>
                    `;
                    
                    recentApksList.appendChild(apkItem);
                });
            } else {
                recentApksList.innerHTML = `
                    <div class="no-apks">
                        <i class="fas fa-box-open"></i>
                        <p>Belum ada APK yang dibuat</p>
                        <small>Konversi file HTML Anda menjadi APK pertama!</small>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading recent APKs:', error);
            recentApksList.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Gagal memuat daftar APK</p>
                </div>
            `;
        }
    }

    shareAPK() {
        if (!this.currentAPK) return;

        const appName = this.currentAPK.appName;
        const shareText = `Saya baru saja membuat aplikasi Android "${appName}" menggunakan XY2APK! Buat aplikasimu juga di: ${window.location.href}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Aplikasi Android Saya',
                text: shareText,
                url: window.location.href
            });
        } else {
            // Fallback untuk copy ke clipboard
            navigator.clipboard.writeText(shareText)
                .then(() => this.showNotification('Link berhasil disalin ke clipboard!', 'success'))
                .catch(() => this.showNotification('Gagal menyalin link', 'error'));
        }
    }

    resetForm() {
        // Reset file uploads
        this.htmlFile = null;
        this.iconFile = null;
        document.getElementById('htmlFileInfo').innerHTML = '';
        document.getElementById('iconFileInfo').innerHTML = '';
        document.getElementById('iconPreview').innerHTML = '';
        document.getElementById('htmlFile').value = '';
        document.getElementById('iconFile').value = '';
        
        // Reset form values
        document.getElementById('appName').value = 'Aplikasi Saya';
        document.getElementById('packageName').value = 'com.example.myapp';
        document.getElementById('appVersion').value = '1.0.0';
        document.getElementById('permissions').value = 'standard';
        document.getElementById('splashScreen').checked = true;
        document.getElementById('fullscreen').checked = true;
        document.getElementById('admob').checked = false;
        document.getElementById('pushNotification').checked = false;
        document.getElementById('includeIcon').checked = true;
        
        // Reset result icon
        document.getElementById('resultIcon').innerHTML = '<i class="fas fa-mobile-alt"></i>';
        
        // Hide result section
        document.getElementById('resultSection').classList.remove('show');
        
        // Scroll ke atas
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        this.showNotification('Form telah direset. Silakan buat APK baru!', 'success');
    }

    async checkServerStatus() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            const statusElement = document.getElementById('serverStatus');
            if (data.status === 'healthy') {
                statusElement.textContent = 'Server Online';
                statusElement.style.color = '#4cc9f0';
            } else {
                statusElement.textContent = 'Server Offline';
                statusElement.style.color = '#e63946';
            }
        } catch (error) {
            console.error('Server status check failed:', error);
            document.getElementById('serverStatus').textContent = 'Server Offline';
            document.getElementById('serverStatus').style.color = '#e63946';
        }
    }

    showNotification(message, type = 'info') {
        const notificationCenter = document.getElementById('notificationCenter');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <div class="notification-content">
                <p>${message}</p>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        notificationCenter.appendChild(notification);
        
        // Auto remove setelah 5 detik
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', () => {
    window.converter = new XY2APKConverter();
});