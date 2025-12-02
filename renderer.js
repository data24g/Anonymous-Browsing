class SecureBrowserApp {
    constructor() {
        this.currentSection = 'profiles';
        this.editingProfileName = '';
        this.editingProxyName = '';
        this.isProcessing = false;
        this.hardwareOptions = [];
        this.deviceTypes = [];
        
        this.userAgentPresets = {
            'auto': 'Tự động chọn User Agent phù hợp',
            'chrome-windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'edge-windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
            'firefox-windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
            'chrome-mac': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'safari-mac': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
        };
        
        this.deviceTypes = [
            { id: 'desktop', name: '🖥️ Desktop (1920x1080)', width: 1920, height: 1080 },
            { id: 'desktop-2k', name: '🖥️ Desktop 2K (2560x1440)', width: 2560, height: 1440 },
            { id: 'laptop', name: '💻 Laptop (1366x768)', width: 1366, height: 768 },
            { id: 'laptop-hd', name: '💻 Laptop HD (1536x864)', width: 1536, height: 864 },
            { id: 'ultrawide', name: '📺 Ultrawide (3440x1440)', width: 3440, height: 1440 }
        ];
        
        this.timezones = [
            'America/New_York',
            'America/Los_Angeles', 
            'America/Chicago',
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'Asia/Ho_Chi_Minh',
            'Asia/Bangkok',
            'Asia/Shanghai',
            'Asia/Tokyo',
            'Asia/Seoul',
            'Australia/Sydney'
        ];
        
        this.init();
    }

    async init() {
        await this.loadHardwareOptions();
        this.bindEvents();
        await this.loadData();
        this.showSection('profiles');
        this.setupUserAgentEvents();
        this.setupProxyEvents();
        this.updateDeviceTypeDropdown();
        this.updateSystemInfoPreview();
    }

    async loadHardwareOptions() {
        try {
            this.hardwareOptions = await window.electronAPI.getHardwareOptions();
            this.updateHardwareDropdown();
        } catch (error) {
            console.error('Failed to load hardware options:', error);
            this.hardwareOptions = [
                { id: 'auto', name: '🔄 Tự động chọn phần cứng phù hợp' },
                { id: 'intel_uhd_620', name: 'Intel UHD Graphics 620' },
                { id: 'nvidia_gtx_1650', name: 'NVIDIA GeForce GTX 1650' },
                { id: 'amd_radeon', name: 'AMD Radeon Graphics' }
            ];
            this.updateHardwareDropdown();
        }
    }

    updateHardwareDropdown() {
        const hardwareSelect = document.getElementById('customHardware');
        if (hardwareSelect) {
            hardwareSelect.innerHTML = this.hardwareOptions.map(option => 
                `<option value="${option.id}">${option.name}</option>`
            ).join('');
        }
    }

    updateDeviceTypeDropdown() {
        const deviceTypeSelect = document.getElementById('customDeviceType');
        if (deviceTypeSelect) {
            deviceTypeSelect.innerHTML = this.deviceTypes.map(device => 
                `<option value="${device.id}">${device.name}</option>`
            ).join('');
        }
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Profile Modals
        document.getElementById('showCreateProfileModal').addEventListener('click', () => this.showCreateProfileModal());
        document.getElementById('createProfileBtn').addEventListener('click', () => this.createProfile());
        document.getElementById('cancelCreateProfile').addEventListener('click', () => this.hideModal('createProfileModal'));

        // Proxy Modals
        document.getElementById('showProxyModal').addEventListener('click', () => this.showProxyModal());
        document.getElementById('saveProxyBtn').addEventListener('click', () => this.saveProxy());
        document.getElementById('cancelProxy').addEventListener('click', () => this.hideModal('proxyModal'));
        document.getElementById('testProxyBtn').addEventListener('click', () => this.testProxy());

        // Close modals
        document.querySelectorAll('.close-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });

        // Test all profiles
        document.getElementById('testAllProfiles').addEventListener('click', () => this.testAllProfiles());

        // Click outside modal
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        // Enter key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (document.getElementById('createProfileModal').style.display === 'block') {
                    this.createProfile();
                } else if (document.getElementById('proxyModal').style.display === 'block') {
                    this.saveProxy();
                }
            }
            if (e.key === 'Escape') {
                this.hideModal('createProfileModal');
                this.hideModal('proxyModal');
            }
        });

        // Device type change
        document.getElementById('customDeviceType').addEventListener('change', () => {
            this.updateSystemInfoPreview();
        });

        // Timezone change
        document.getElementById('customTimezone').addEventListener('change', () => {
            this.updateSystemInfoPreview();
        });

        // Hardware change
        document.getElementById('customHardware').addEventListener('change', () => {
            this.updateSystemInfoPreview();
        });

        // Language change
        document.getElementById('customLanguage').addEventListener('change', () => {
            this.updateSystemInfoPreview();
        });

        // Proxy change
        document.getElementById('newProfileProxySelect').addEventListener('change', () => {
            this.updateSystemInfoPreview();
        });
    }

    setupUserAgentEvents() {
        document.getElementById('userAgentPreset').addEventListener('change', (e) => {
            this.updateUserAgentPreview();
        });

        document.getElementById('useCustomUserAgent').addEventListener('change', (e) => {
            const customContainer = document.getElementById('customUserAgentContainer');
            if (e.target.checked) {
                customContainer.style.display = 'block';
                document.getElementById('userAgentPreset').disabled = true;
            } else {
                customContainer.style.display = 'none';
                document.getElementById('userAgentPreset').disabled = false;
                document.getElementById('customUserAgent').value = '';
            }
            this.updateUserAgentPreview();
        });

        document.getElementById('customUserAgent').addEventListener('input', () => {
            this.updateUserAgentPreview();
        });

        this.updateUserAgentPreview();
    }

    updateUserAgentPreview() {
        const useCustom = document.getElementById('useCustomUserAgent').checked;
        const previewElement = document.getElementById('previewText');

        if (useCustom) {
            const customUA = document.getElementById('customUserAgent').value.trim();
            if (customUA) {
                previewElement.textContent = customUA.length > 60 ? customUA.substring(0, 60) + '...' : customUA;
            } else {
                previewElement.textContent = 'Tự động chọn User Agent phù hợp';
            }
        } else {
            const preset = document.getElementById('userAgentPreset').value;
            previewElement.textContent = this.userAgentPresets[preset] || 'Tự động chọn User Agent phù hợp';
        }
    }

    getSelectedUserAgent() {
        const useCustom = document.getElementById('useCustomUserAgent').checked;

        if (useCustom) {
            const customUA = document.getElementById('customUserAgent').value.trim();
            return customUA || 'auto';
        } else {
            const preset = document.getElementById('userAgentPreset').value;
            return preset;
        }
    }

    setupProxyEvents() {
        const proxyInput = document.getElementById('proxyServer');
        if (proxyInput) {
            proxyInput.addEventListener('input', (e) => {
                this.updateProxyPreview();
            });
            
            proxyInput.addEventListener('blur', (e) => {
                this.parseProxyString();
            });
        }
    }

    updateProxyPreview() {
        const proxyInput = document.getElementById('proxyServer');
        const previewElement = document.getElementById('proxyPreview');
        
        if (proxyInput && previewElement) {
            const value = proxyInput.value.trim();
            if (value) {
                const parts = value.split(':');
                if (parts.length === 2) {
                    previewElement.innerHTML = `<i class="fas fa-info-circle"></i> Định dạng: IP:Port (Không xác thực)`;
                    previewElement.className = 'proxy-preview info';
                    previewElement.style.display = 'block';
                } else if (parts.length === 4) {
                    previewElement.innerHTML = `<i class="fas fa-user-shield"></i> Định dạng: IP:Port:Username:Password (Có xác thực)`;
                    previewElement.className = 'proxy-preview success';
                    previewElement.style.display = 'block';
                } else {
                    previewElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Định dạng không hợp lệ`;
                    previewElement.className = 'proxy-preview error';
                    previewElement.style.display = 'block';
                }
            } else {
                previewElement.style.display = 'none';
            }
        }
    }

    async parseProxyString() {
        const proxyInput = document.getElementById('proxyServer');
        if (!proxyInput) return;
        
        const proxyString = proxyInput.value.trim();
        if (!proxyString) return;
        
        try {
            const parsedProxy = await window.electronAPI.parseProxyString(proxyString);
            if (parsedProxy.success) {
                console.log('✅ Proxy parsed successfully:', parsedProxy);
                if (parsedProxy.username && document.getElementById('proxyUsername')) {
                    document.getElementById('proxyUsername').value = parsedProxy.username;
                }
                if (parsedProxy.password && document.getElementById('proxyPassword')) {
                    document.getElementById('proxyPassword').value = parsedProxy.password;
                }
                
                this.showProxyLocationInfo(parsedProxy);
            } else {
                this.showNotification(parsedProxy.message, 'error');
            }
        } catch (error) {
            console.error('Error parsing proxy:', error);
        }
    }

    showProxyLocationInfo(proxyData) {
        const locationInfo = document.getElementById('proxyLocationInfo');
        if (!locationInfo) return;
        
        if (proxyData.country || proxyData.city || proxyData.timezone) {
            if (proxyData.country) {
                document.getElementById('proxyCountry').textContent = proxyData.country;
            }
            if (proxyData.city) {
                document.getElementById('proxyCity').textContent = proxyData.city;
            }
            if (proxyData.timezoneId) {
                document.getElementById('proxyTimezone').textContent = proxyData.timezoneId;
            }
            locationInfo.style.display = 'block';
        } else {
            locationInfo.style.display = 'none';
        }
    }

    updateSystemInfoPreview() {
        const deviceType = document.getElementById('customDeviceType').value;
        const timezone = document.getElementById('customTimezone').value;
        const hardware = document.getElementById('customHardware').value;
        const language = document.getElementById('customLanguage').value;
        const proxySelect = document.getElementById('newProfileProxySelect');
        const proxyName = proxySelect ? proxySelect.value : '';

        // Device info
        const selectedDevice = this.deviceTypes.find(d => d.id === deviceType) || this.deviceTypes[0];
        document.getElementById('autoDeviceInfo').textContent = selectedDevice.name.replace(/^[^ ]+ /, '');

        // Timezone info
        document.getElementById('autoTimezoneInfo').textContent = timezone === 'auto' ? 'Tự động chọn' : timezone.split('/').pop();

        // Hardware info
        const hardwareOption = this.hardwareOptions.find(h => h.id === hardware);
        document.getElementById('autoWebglInfo').textContent = hardwareOption ? 
            hardwareOption.name.replace(/^[^ ]+ /, '') : 'Tự động chọn';

        // Location info
        document.getElementById('autoLocationInfo').textContent = proxyName ? 
            'Tự động theo proxy' : 'Tự động theo timezone';

        // CPU and RAM
        let cpuInfo = '4 cores';
        let ramInfo = '8GB';
        
        if (hardware.includes('rtx') || hardware.includes('rx_6')) {
            cpuInfo = '8-12 cores';
            ramInfo = '16-32GB';
        } else if (hardware.includes('gtx') || hardware.includes('iris')) {
            cpuInfo = '6-8 cores';
            ramInfo = '8-16GB';
        } else if (hardware.includes('intel') || hardware.includes('amd')) {
            cpuInfo = '4-6 cores';
            ramInfo = '8GB';
        }
        
        document.getElementById('autoCpuInfo').textContent = cpuInfo;
        document.getElementById('autoRamInfo').textContent = ramInfo;
    }

    async loadData() {
        await this.updateProfilesList();
        await this.updateProxiesList();
        this.updateStats();
    }

    showSection(section) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        document.querySelectorAll('.content-section').forEach(sectionEl => {
            sectionEl.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        this.currentSection = section;
    }

    async updateProfilesList() {
        this.showLoading(true);
        try {
            const profiles = await window.electronAPI.getProfiles();
            const profilesGrid = document.getElementById('profilesGrid');

            if (profiles.length === 0) {
                profilesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-circle"></i>
                    <h3>Chưa có profile nào</h3>
                    <p>Tạo profile đầu tiên để bắt đầu</p>
                </div>
            `;
                this.updateStats();
                return;
            }

            const profilesWithConfig = await Promise.all(
                profiles.map(async (profile) => {
                    try {
                        const config = await window.electronAPI.getProfileConfig(profile.name);
                        return {
                            ...profile,
                            config: config.success ? config.config : null
                        };
                    } catch (error) {
                        return { ...profile, config: null };
                    }
                })
            );

            profilesGrid.innerHTML = profilesWithConfig.map(profile => {
                const config = profile.config;
                const customSettings = config?.customSettings || {};
                const fingerprint = config?.fingerprint || {};
                const hardware = customSettings.hardware || 'auto';
                const language = customSettings.language || 'auto';
                const proxyName = config?.proxyName || 'Không có';
                const screenResolution = customSettings.screenResolution || 'auto';

                const displayHardware = this.getHardwareDisplay(hardware, fingerprint);
                const displayLanguage = this.getLanguageDisplay(language, fingerprint);
                const displayResolution = this.getResolutionDisplay(screenResolution, fingerprint);

                const cpuCores = fingerprint.cpuCores || 'N/A';
                const deviceMemory = fingerprint.deviceMemory || 'N/A';
                const timezone = fingerprint.timezoneId || 'Auto';

                return `
            <div class="profile-card">
                <div class="profile-header">
                    <div>
                        <div class="profile-name">${this.escapeHtml(profile.name)}</div>
                        <div class="profile-meta">
                            <i class="fas fa-microchip"></i>
                            ${displayHardware}
                        </div>
                    </div>
                    <div class="profile-actions">
                        <button class="btn btn-sm btn-danger" onclick="app.deleteProfile('${this.escapeHtml(profile.name)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="profile-body">
                    <div class="profile-info">
                        <div class="info-item">
                            <span class="info-label">GPU:</span>
                            <span class="info-value">${displayHardware}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">CPU/RAM:</span>
                            <span class="info-value">${cpuCores} cores / ${deviceMemory}GB</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Timezone:</span>
                            <span class="info-value">${timezone}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Ngôn ngữ:</span>
                            <span class="info-value">${displayLanguage}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Proxy:</span>
                            <span class="info-value">${this.escapeHtml(proxyName)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Độ phân giải:</span>
                            <span class="info-value">${displayResolution}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Trạng thái:</span>
                            <span class="badge badge-success">Sẵn sàng</span>
                        </div>
                    </div>
                    <div class="profile-footer">
                        <button class="btn btn-primary btn-sm" onclick="app.openBrowser('${this.escapeHtml(profile.name)}')">
                            <i class="fas fa-play"></i> Mở trình duyệt
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="app.openBrowserWithoutProxy('${this.escapeHtml(profile.name)}')">
                            <i class="fas fa-wifi-slash"></i> No Proxy
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="app.closeBrowser('${this.escapeHtml(profile.name)}')">
                            <i class="fas fa-stop"></i> Đóng
                        </button>
                    </div>
                </div>
            </div>
            `;
            }).join('');
        } catch (error) {
            this.showNotification('Lỗi khi tải profiles: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.updateStats();
        }
    }

    getHardwareDisplay(hardware, fingerprint) {
        if (hardware !== 'auto') {
            const hardwareOption = this.hardwareOptions.find(opt => opt.id === hardware);
            return hardwareOption ? hardwareOption.name : 'Tự động';
        }

        if (fingerprint.webglVendor && fingerprint.webglRenderer) {
            return `${fingerprint.webglVendor} - ${fingerprint.webglRenderer}`;
        }

        return 'Tự động chọn phần cứng';
    }

    getLanguageDisplay(language, fingerprint) {
        if (language !== 'auto') {
            return this.getLanguageDisplayName(language);
        }

        if (fingerprint.navigator?.language) {
            return this.getLanguageDisplayName(fingerprint.navigator.language);
        }

        return 'English (US)';
    }

    getResolutionDisplay(resolution, fingerprint) {
        if (resolution !== 'auto') {
            return resolution;
        }

        if (fingerprint.screen) {
            return `${fingerprint.screen.width}x${fingerprint.screen.height}`;
        }

        return '1920x1080';
    }

    getLanguageDisplayName(language) {
        const languageMap = {
            'auto': 'Tự động (en-US)',
            'en-US': 'English (US)',
            'vi-VN': 'Tiếng Việt',
            'zh-CN': '中文 (简体)',
            'ja-JP': '日本語',
            'ko-KR': '한국어',
            'fr-FR': 'Français',
            'de-DE': 'Deutsch',
            'es-ES': 'Español'
        };
        return languageMap[language] || language;
    }

    async updateProxiesList() {
        try {
            const proxies = await window.electronAPI.getProxies();
            const proxiesList = document.getElementById('proxiesList');

            if (proxies.length === 0) {
                proxiesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-server"></i>
                        <h3>Chưa có proxy nào</h3>
                        <p>Thêm proxy đầu tiên để bắt đầu</p>
                    </div>
                `;
                this.updateStats();
                return;
            }

            proxiesList.innerHTML = proxies.map(proxy => `
                <div class="proxy-card">
                    <div class="proxy-info">
                        <div class="proxy-name">${this.escapeHtml(proxy.name)}</div>
                        <div class="proxy-details">
                            <div class="proxy-server">
                                <i class="fas fa-globe"></i> ${this.escapeHtml(proxy.server)}
                            </div>
                            ${proxy.username ? `
                                <div class="proxy-auth">
                                    <i class="fas fa-user"></i> ${this.escapeHtml(proxy.username)}:••••••
                                </div>
                            ` : ''}
                            ${proxy.timezoneId ? `
                                <div class="proxy-location">
                                    <i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(proxy.timezoneId)}
                                </div>
                            ` : ''}
                            <div class="proxy-date">
                                <i class="fas fa-calendar"></i> ${new Date(proxy.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                        </div>
                    </div>
                    <div class="proxy-actions">
                        <button class="btn btn-info btn-sm" onclick="app.testSpecificProxy('${this.escapeHtml(proxy.name)}')" title="Test Proxy">
                            <i class="fas fa-bolt"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="app.editProxy('${this.escapeHtml(proxy.name)}')" title="Sửa Proxy">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteProxy('${this.escapeHtml(proxy.name)}')" title="Xóa Proxy">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            this.updateProxyDropdowns(proxies);
            this.updateStats();
        } catch (error) {
            console.error('Error loading proxies:', error);
            this.showNotification('Lỗi khi tải proxies: ' + error.message, 'error');
        }
    }

    updateProxyDropdowns(proxies) {
        const defaultOption = '<option value="">Không dùng Proxy</option>';
        const proxySelect = document.getElementById('newProfileProxySelect');

        if (proxySelect) {
            proxySelect.innerHTML = defaultOption + proxies.map(proxy =>
                `<option value="${this.escapeHtml(proxy.name)}">${this.escapeHtml(proxy.name)} - ${this.escapeHtml(proxy.server)}</option>`
            ).join('');
        }
    }

    updateStats() {
        const profileCards = document.querySelectorAll('.profile-card');
        const proxyCards = document.querySelectorAll('.proxy-card');

        document.getElementById('profilesCount').textContent = profileCards.length;
        document.getElementById('proxiesCount').textContent = proxyCards.length;
    }

    showCreateProfileModal() {
        document.getElementById('createProfileModal').style.display = 'block';
        this.resetProfileForm();
        setTimeout(() => {
            document.getElementById('newProfileName').focus();
        }, 100);
    }

    resetProfileForm() {
        document.getElementById('newProfileName').value = '';
        document.getElementById('newProfileProxySelect').value = '';
        document.getElementById('userAgentPreset').value = 'auto';
        document.getElementById('useCustomUserAgent').checked = false;
        document.getElementById('customUserAgent').value = '';
        document.getElementById('customUserAgentContainer').style.display = 'none';
        document.getElementById('userAgentPreset').disabled = false;
        document.getElementById('customLanguage').value = 'en-US';
        document.getElementById('customHardware').value = 'auto';
        document.getElementById('customDeviceType').value = 'desktop';
        document.getElementById('customTimezone').value = 'auto';
        this.updateUserAgentPreview();
        this.updateSystemInfoPreview();
    }

    async createProfile() {
        if (this.isProcessing) {
            return;
        }

        const profileName = document.getElementById('newProfileName').value.trim();
        const proxyName = document.getElementById('newProfileProxySelect').value;
        const userAgent = this.getSelectedUserAgent();
        const customLanguage = document.getElementById('customLanguage').value;
        const customHardware = document.getElementById('customHardware').value;
        const customDeviceType = document.getElementById('customDeviceType').value;
        const customTimezone = document.getElementById('customTimezone').value;

        if (!profileName) {
            this.showNotification('Vui lòng nhập tên profile', 'error');
            document.getElementById('newProfileName').focus();
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(profileName)) {
            this.showNotification('Tên profile chỉ được chứa chữ cái, số, gạch dưới và gạch ngang', 'error');
            return;
        }

        // Get screen resolution from device type
        const selectedDevice = this.deviceTypes.find(d => d.id === customDeviceType) || this.deviceTypes[0];
        const screenResolution = `${selectedDevice.width}x${selectedDevice.height}`;

        const customSettings = {
            language: customLanguage,
            userAgent: userAgent,
            hardware: customHardware,
            screenResolution: screenResolution,
            deviceType: customDeviceType,
            timezone: customTimezone
        };

        console.log('Creating profile with:', {
            profileName,
            proxyName,
            customSettings
        });

        this.setProcessing(true);
        try {
            const result = await window.electronAPI.createProfile({
                profileName: profileName,
                proxyName: proxyName || null,
                customSettings: customSettings
            });

            console.log('Create profile result:', result);

            if (result.success) {
                this.showNotification(result.message, 'success');
                this.hideModal('createProfileModal');
                await this.updateProfilesList();
                this.resetProfileForm();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error creating profile:', error);
            this.showNotification('Lỗi khi tạo profile: ' + error.message, 'error');
        } finally {
            this.setProcessing(false);
        }
    }

    async openBrowser(profileName) {
        if (this.isProcessing) {
            return;
        }

        const urlInput = document.getElementById('urlToOpen');
        let finalUrl = 'https://google.com';
        
        if (urlInput && urlInput.value.trim()) {
            finalUrl = urlInput.value.trim();
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                finalUrl = 'https://' + finalUrl;
            }
        }

        console.log(`Opening browser for profile: ${profileName}, URL: ${finalUrl}`);

        this.setProcessing(true);
        try {
            const result = await window.electronAPI.openBrowser(profileName, finalUrl);
            console.log('Open browser result:', result);
            
            if (!result.success) {
                if (result.message.includes('proxy')) {
                    // Hỏi người dùng có muốn mở không dùng proxy
                    if (confirm('Lỗi proxy! Bạn có muốn thử mở không dùng proxy?')) {
                        await this.openBrowserWithoutProxy(profileName);
                        return;
                    }
                }
                this.showNotification(`Lỗi: ${result.message}`, 'error');
            } else {
                this.showNotification(`✅ Đã mở trình duyệt với profile "${profileName}"`, 'success');
                
                if (result.fingerprints) {
                    console.log('Fingerprint details:', result.fingerprints);
                    this.showNotification(
                        `Hardware: ${result.fingerprints.hardware} | Resolution: ${result.fingerprints.resolution}`, 
                        'info'
                    );
                }
            }
        } catch (error) {
            console.error('Error opening browser:', error);
            this.showNotification('Lỗi khi mở trình duyệt: ' + error.message, 'error');
        } finally {
            this.setProcessing(false);
        }
    }

    async openBrowserWithoutProxy(profileName) {
        if (this.isProcessing) {
            return;
        }

        const urlInput = document.getElementById('urlToOpen');
        let finalUrl = 'https://google.com';
        
        if (urlInput && urlInput.value.trim()) {
            finalUrl = urlInput.value.trim();
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                finalUrl = 'https://' + finalUrl;
            }
        }

        console.log(`Opening browser WITHOUT proxy for profile: ${profileName}`);

        this.setProcessing(true);
        try {
            // Tạm thời disable proxy bằng cách set null
            const result = await window.electronAPI.openBrowser(profileName, finalUrl);
            
            if (!result.success) {
                this.showNotification(`Lỗi: ${result.message}`, 'error');
            } else {
                this.showNotification(`✅ Đã mở trình duyệt (không dùng proxy)`, 'success');
            }
        } catch (error) {
            console.error('Error opening browser without proxy:', error);
            this.showNotification('Lỗi: ' + error.message, 'error');
        } finally {
            this.setProcessing(false);
        }
    }

    async closeBrowser(profileName) {
        try {
            const result = await window.electronAPI.closeBrowser(profileName);
            this.showNotification(result.message, result.success ? 'success' : 'error');
        } catch (error) {
            this.showNotification('Lỗi khi đóng trình duyệt: ' + error.message, 'error');
        }
    }

    async deleteProfile(profileName) {
        if (!confirm(`Bạn có chắc chắn muốn xóa profile '${profileName}'?`)) {
            return;
        }

        this.setProcessing(true);
        try {
            const result = await window.electronAPI.deleteProfile(profileName);
            this.showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                await this.updateProfilesList();
            }
        } catch (error) {
            this.showNotification('Lỗi khi xóa profile: ' + error.message, 'error');
        } finally {
            this.setProcessing(false);
        }
    }

    showProxyModal() {
        document.getElementById('proxyModal').style.display = 'block';
        document.getElementById('proxyModalTitle').innerHTML = '<i class="fas fa-plus"></i> Thêm Proxy Mới';
        this.resetProxyForm();
        setTimeout(() => {
            document.getElementById('proxyName').focus();
        }, 100);
    }

    resetProxyForm() {
        document.getElementById('proxyName').value = '';
        document.getElementById('proxyServer').value = '';
        document.getElementById('proxyUsername').value = '';
        document.getElementById('proxyPassword').value = '';
        const previewElement = document.getElementById('proxyPreview');
        if (previewElement) {
            previewElement.style.display = 'none';
        }
        this.editingProxyName = '';
        
        document.getElementById('testProxyBtn').style.display = 'block';
        document.getElementById('saveProxyBtn').textContent = 'Thêm Proxy';
        
        const locationInfo = document.getElementById('proxyLocationInfo');
        if (locationInfo) {
            locationInfo.style.display = 'none';
        }
    }

    async saveProxy() {
        if (this.isProcessing) {
            return;
        }

        const name = document.getElementById('proxyName').value.trim();
        const server = document.getElementById('proxyServer').value.trim();

        if (!name) {
            this.showNotification('Vui lòng nhập tên proxy', 'error');
            document.getElementById('proxyName').focus();
            return;
        }

        if (!server) {
            this.showNotification('Vui lòng nhập server proxy', 'error');
            document.getElementById('proxyServer').focus();
            return;
        }

        const proxyConfig = {
            name: name,
            server: server,
            username: document.getElementById('proxyUsername').value.trim(),
            password: document.getElementById('proxyPassword').value.trim(),
        };

        console.log('Saving proxy:', proxyConfig);

        this.setProcessing(true);
        try {
            let result;
            
            if (this.editingProxyName) {
                result = await window.electronAPI.updateProxy(this.editingProxyName, proxyConfig);
                console.log('Update proxy result:', result);
            } else {
                result = await window.electronAPI.addProxy(proxyConfig);
                console.log('Add proxy result:', result);
            }

            if (result.success) {
                this.showNotification(result.message, 'success');
                this.hideModal('proxyModal');
                await this.updateProxiesList();
                this.resetProxyForm();
            } else {
                this.showNotification(result.message, 'error');
                console.error('Proxy operation failed:', result.message);
            }
        } catch (error) {
            console.error('Error in saveProxy:', error);
            this.showNotification('Lỗi khi lưu proxy: ' + error.message, 'error');
        } finally {
            this.setProcessing(false);
        }
    }

    async editProxy(proxyName) {
        console.log('Editing proxy:', proxyName);
        
        try {
            const proxies = await window.electronAPI.getProxies();
            const proxyToEdit = proxies.find(p => p.name === proxyName);

            if (proxyToEdit) {
                console.log('Found proxy to edit:', proxyToEdit);
                
                document.getElementById('proxyName').value = proxyToEdit.name;
                document.getElementById('proxyServer').value = proxyToEdit.server;
                document.getElementById('proxyUsername').value = proxyToEdit.username || '';
                document.getElementById('proxyPassword').value = proxyToEdit.password || '';
                this.editingProxyName = proxyToEdit.name;

                document.getElementById('proxyModalTitle').innerHTML = '<i class="fas fa-edit"></i> Sửa Proxy';
                document.getElementById('saveProxyBtn').textContent = 'Cập nhật Proxy';
                document.getElementById('proxyModal').style.display = 'block';

                this.updateProxyPreview();
                
                if (proxyToEdit.country || proxyToEdit.city || proxyToEdit.timezoneId) {
                    const locationInfo = document.getElementById('proxyLocationInfo');
                    if (locationInfo) {
                        locationInfo.style.display = 'block';
                    }
                }

                setTimeout(() => {
                    document.getElementById('proxyName').focus();
                }, 100);
            } else {
                this.showNotification('Không tìm thấy proxy để sửa', 'error');
            }
        } catch (error) {
            console.error('Error editing proxy:', error);
            this.showNotification('Lỗi khi tải thông tin proxy: ' + error.message, 'error');
        }
    }

    async deleteProxy(proxyName) {
        if (!confirm(`Bạn có chắc chắn muốn xóa proxy '${proxyName}'?\n\nHành động này không thể hoàn tác.`)) {
            return;
        }

        console.log('Deleting proxy:', proxyName);
        
        this.setProcessing(true);
        try {
            const result = await window.electronAPI.deleteProxy(proxyName);
            console.log('Delete proxy result:', result);
            
            if (result.success) {
                this.showNotification(result.message, 'success');
                if (this.editingProxyName === proxyName) {
                    this.resetProxyForm();
                }
                await this.updateProxiesList();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting proxy:', error);
            this.showNotification('Lỗi khi xóa proxy: ' + error.message, 'error');
        } finally {
            this.setProcessing(false);
        }
    }

    async testProxy() {
        const server = document.getElementById('proxyServer').value.trim();
        
        if (!server) {
            this.showNotification('Vui lòng nhập server proxy để test', 'error');
            return;
        }

        const proxyConfig = {
            server: server,
            username: document.getElementById('proxyUsername').value.trim(),
            password: document.getElementById('proxyPassword').value.trim(),
        };

        this.setProcessing(true);
        try {
            const result = await window.electronAPI.testProxy(proxyConfig);
            if (result.success) {
                this.showNotification('✅ ' + result.message, 'success');
            } else {
                this.showNotification('❌ ' + result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Lỗi khi test proxy: ' + error.message, 'error');
        } finally {
            this.setProcessing(false);
        }
    }

    async testSpecificProxy(proxyName) {
        const proxies = await window.electronAPI.getProxies();
        const proxy = proxies.find(p => p.name === proxyName);
        
        if (proxy) {
            this.setProcessing(true);
            try {
                const result = await window.electronAPI.testProxy(proxy);
                if (result.success) {
                    this.showNotification(`✅ Proxy ${proxyName} hoạt động tốt!`, 'success');
                } else {
                    this.showNotification(`❌ Proxy ${proxyName} không hoạt động: ${result.message}`, 'error');
                }
            } catch (error) {
                this.showNotification('Lỗi khi test proxy: ' + error.message, 'error');
            } finally {
                this.setProcessing(false);
            }
        }
    }

    async testAllProfiles() {
        if (this.isProcessing) {
            return;
        }

        const profiles = await window.electronAPI.getProfiles();
        const url = document.getElementById('urlToOpen').value.trim();

        if (!url) {
            this.showNotification('Vui lòng nhập URL để test', 'error');
            document.getElementById('urlToOpen').focus();
            return;
        }

        if (profiles.length === 0) {
            this.showNotification('Không có profile nào để test', 'warning');
            return;
        }

        this.showNotification(`Đang mở ${profiles.length} profiles...`, 'info');

        for (let i = 0; i < profiles.length; i++) {
            const profile = profiles[i];
            this.showNotification(`Đang mở profile ${i + 1}/${profiles.length}: ${profile.name}`, 'info');
            await this.openBrowser(profile.name);

            if (i < profiles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        this.showNotification(`Đã mở tất cả ${profiles.length} profiles`, 'success');
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
        this.setProcessing(false);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
            setTimeout(() => {
                if (overlay.classList.contains('active')) {
                    this.showNotification('Thao tác đang mất nhiều thời gian hơn dự kiến...', 'warning');
                }
            }, 10000);
        } else {
            overlay.classList.remove('active');
        }
    }

    setProcessing(processing) {
        this.isProcessing = processing;
        const buttons = document.querySelectorAll('button:not(.close-button)');

        buttons.forEach(button => {
            if (processing) {
                button.disabled = true;
                button.style.opacity = '0.6';
                button.style.cursor = 'not-allowed';
            } else {
                button.disabled = false;
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
            }
        });

        this.showLoading(processing);
    }

    showNotification(message, type = 'info') {
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Khởi tạo app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SecureBrowserApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.setProcessing(false);
    }
});