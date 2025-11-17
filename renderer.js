class SecureBrowserApp {
    constructor() {
        this.currentSection = 'profiles';
        this.editingProfileName = '';
        this.editingProxyName = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadData();
        this.showSection('profiles');
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

        // Close modals
        document.querySelectorAll('.close-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });

        // Test all profiles
        document.getElementById('testAllProfiles').addEventListener('click', () => this.testAllProfiles());

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });
    }

    async loadData() {
        await this.updateProfilesList();
        await this.updateProxiesList();
        this.updateStats();
    }

    showSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
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
                return;
            }

            profilesGrid.innerHTML = profiles.map(profile => `
                <div class="profile-card">
                    <div class="profile-header">
                        <div class="profile-name">${this.escapeHtml(profile.name)}</div>
                        <div class="profile-meta">
                            <i class="fas fa-microchip"></i>
                            Hardware: Auto
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
                                <span class="info-label">Ngôn ngữ:</span>
                                <span class="info-value">en-US</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Proxy:</span>
                                <span class="info-value">Không có</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Trạng thái:</span>
                                <span class="badge badge-success">Sẵn sàng</span>
                            </div>
                        </div>
                        <div class="profile-footer">
                            <button class="btn btn-primary btn-sm" onclick="app.openBrowser('${this.escapeHtml(profile.name)}')">
                                <i class="fas fa-play"></i> Mở
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="app.editProfile('${this.escapeHtml(profile.name)}')">
                                <i class="fas fa-cog"></i> Cấu hình
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            this.showNotification('Lỗi khi tải profiles: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
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
                return;
            }

            proxiesList.innerHTML = proxies.map(proxy => `
                <div class="proxy-card">
                    <div class="proxy-info">
                        <div class="proxy-name">${this.escapeHtml(proxy.name)}</div>
                        <div class="proxy-details">
                            ${proxy.server} 
                            ${proxy.username ? `• ${proxy.username}` : ''}
                            ${proxy.timezoneId ? `• ${proxy.timezoneId}` : ''}
                        </div>
                    </div>
                    <div class="proxy-actions">
                        <button class="btn btn-warning btn-sm" onclick="app.editProxy('${this.escapeHtml(proxy.name)}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteProxy('${this.escapeHtml(proxy.name)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            // Update proxy dropdowns
            this.updateProxyDropdowns(proxies);
        } catch (error) {
            this.showNotification('Lỗi khi tải proxies: ' + error.message, 'error');
        }
    }

    updateProxyDropdowns(proxies) {
        const defaultOption = '<option value="">Không dùng Proxy</option>';
        const proxySelects = [
            document.getElementById('newProfileProxySelect')
        ];

        proxySelects.forEach(select => {
            if (select) {
                select.innerHTML = defaultOption + proxies.map(proxy => 
                    `<option value="${this.escapeHtml(proxy.name)}">${this.escapeHtml(proxy.name)} - ${this.escapeHtml(proxy.server)}</option>`
                ).join('');
            }
        });
    }

    updateStats() {
        const profileCards = document.querySelectorAll('.profile-card');
        const proxyCards = document.querySelectorAll('.proxy-card');
        
        document.getElementById('profilesCount').textContent = profileCards.length;
        document.getElementById('proxiesCount').textContent = proxyCards.length;
    }

    // Profile Methods
    showCreateProfileModal() {
        document.getElementById('createProfileModal').style.display = 'block';
        this.resetProfileForm();
    }

    resetProfileForm() {
        document.getElementById('newProfileName').value = '';
        document.getElementById('newProfileProxySelect').value = '';
        document.getElementById('customUserAgent').value = '';
        document.getElementById('customLanguage').value = 'en-US';
        document.getElementById('customHardware').value = 'auto';
        document.getElementById('customScreenResolution').value = 'auto';
    }

    async createProfile() {
        const profileName = document.getElementById('newProfileName').value.trim();
        const proxyName = document.getElementById('newProfileProxySelect').value;
        const customUserAgent = document.getElementById('customUserAgent').value.trim();
        const customLanguage = document.getElementById('customLanguage').value;
        const customHardware = document.getElementById('customHardware').value;
        const customScreenResolution = document.getElementById('customScreenResolution').value;

        if (!profileName) {
            this.showNotification('Vui lòng nhập tên profile', 'error');
            return;
        }

        const customSettings = {
            language: customLanguage,
            userAgent: customUserAgent || undefined,
            hardware: customHardware !== 'auto' ? customHardware : undefined,
            screenResolution: customScreenResolution !== 'auto' ? customScreenResolution : undefined
        };

        this.showLoading(true);
        try {
            const result = await window.electronAPI.createProfile({
                profileName,
                proxyName,
                customSettings
            });

            if (result.success) {
                this.showNotification(result.message, 'success');
                this.hideModal('createProfileModal');
                await this.updateProfilesList();
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Lỗi khi tạo profile: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async openBrowser(profileName) {
        const url = document.getElementById('urlToOpen').value.trim();
        let finalUrl = url;
        
        if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
            finalUrl = 'https://' + finalUrl;
        }

        this.showLoading(true);
        try {
            const result = await window.electronAPI.openBrowser(profileName, finalUrl);
            if (!result.success) {
                this.showNotification(`Lỗi khi mở trình duyệt: ${result.message}`, 'error');
            } else {
                this.showNotification(`Trình duyệt đã được mở với profile ${profileName}`, 'success');
            }
        } catch (error) {
            this.showNotification('Lỗi khi mở trình duyệt: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteProfile(profileName) {
        if (!confirm(`Bạn có chắc chắn muốn xóa profile '${profileName}'?`)) {
            return;
        }

        this.showLoading(true);
        try {
            const result = await window.electronAPI.deleteProfile(profileName);
            this.showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                await this.updateProfilesList();
            }
        } catch (error) {
            this.showNotification('Lỗi khi xóa profile: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Proxy Methods
    showProxyModal() {
        document.getElementById('proxyModal').style.display = 'block';
        document.getElementById('proxyModalTitle').innerHTML = '<i class="fas fa-plus"></i> Thêm Proxy Mới';
        this.resetProxyForm();
    }

    resetProxyForm() {
        document.getElementById('proxyName').value = '';
        document.getElementById('proxyServer').value = '';
        document.getElementById('proxyUsername').value = '';
        document.getElementById('proxyPassword').value = '';
        this.editingProxyName = '';
    }

    async saveProxy() {
        const name = document.getElementById('proxyName').value.trim();
        const server = document.getElementById('proxyServer').value.trim();

        if (!name || !server) {
            this.showNotification('Tên và Server proxy không được để trống', 'error');
            return;
        }

        const proxyConfig = {
            name,
            server,
            username: document.getElementById('proxyUsername').value.trim(),
            password: document.getElementById('proxyPassword').value.trim(),
        };

        this.showLoading(true);
        try {
            let result;
            if (this.editingProxyName) {
                result = await window.electronAPI.updateProxy(this.editingProxyName, proxyConfig);
            } else {
                result = await window.electronAPI.addProxy(proxyConfig);
            }

            this.showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                this.hideModal('proxyModal');
                await this.updateProxiesList();
            }
        } catch (error) {
            this.showNotification('Lỗi khi lưu proxy: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async editProxy(proxyName) {
        const proxies = await window.electronAPI.getProxies();
        const proxyToEdit = proxies.find(p => p.name === proxyName);
        
        if (proxyToEdit) {
            document.getElementById('proxyName').value = proxyToEdit.name;
            document.getElementById('proxyServer').value = proxyToEdit.server;
            document.getElementById('proxyUsername').value = proxyToEdit.username || '';
            document.getElementById('proxyPassword').value = proxyToEdit.password || '';
            this.editingProxyName = proxyToEdit.name;
            
            document.getElementById('proxyModalTitle').innerHTML = '<i class="fas fa-edit"></i> Sửa Proxy';
            document.getElementById('proxyModal').style.display = 'block';
        }
    }

    async deleteProxy(proxyName) {
        if (!confirm(`Bạn có chắc chắn muốn xóa proxy '${proxyName}'?`)) {
            return;
        }

        this.showLoading(true);
        try {
            const result = await window.electronAPI.deleteProxy(proxyName);
            this.showNotification(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                if (this.editingProxyName === proxyName) {
                    this.resetProxyForm();
                }
                await this.updateProxiesList();
            }
        } catch (error) {
            this.showNotification('Lỗi khi xóa proxy: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Utility Methods
    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        // Tạo notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Thêm styles cho notification
        if (!document.querySelector('.notification-container')) {
            const container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        document.querySelector('.notification-container').appendChild(notification);

        // Tự động xóa sau 5 giây
        setTimeout(() => {
            notification.remove();
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
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async testAllProfiles() {
        const profiles = await window.electronAPI.getProfiles();
        const url = document.getElementById('urlToOpen').value.trim();
        
        if (!url) {
            this.showNotification('Vui lòng nhập URL để test', 'error');
            return;
        }

        this.showNotification(`Đang mở ${profiles.length} profiles...`, 'info');
        
        for (const profile of profiles) {
            await this.openBrowser(profile.name);
            // Delay giữa các profile để tránh quá tải
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Khởi tạo app khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SecureBrowserApp();
});