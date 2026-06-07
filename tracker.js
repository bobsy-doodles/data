/**
 * Data Tracker
 * Collects behavioral and technical data with user consent
 * Sends data to server for storage and analysis
 */

class DataTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.pageViewCount = 0;
        this.clickCount = 0;
        this.userData = null;
        this.currentPageData = {
            page: window.location.pathname,
            timeOnPage: 0,
            clicks: 0,
            scrollDepth: 0,
            startTime: Date.now()
        };

        this.initializeTracking();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Initialize all tracking listeners
     */
    initializeTracking() {
        // Track page views
        this.trackPageView();

        // Track user interactions
        document.addEventListener('click', () => this.trackClick());

        // Track scroll depth
        window.addEventListener('scroll', () => this.trackScrollDepth());

        // Track time on page
        setInterval(() => this.updateTimeOnPage(), 10000); // Update every 10 seconds

        // Send data when user leaves page
        window.addEventListener('beforeunload', () => this.saveSessionData());

        // Recover userData from localStorage if exists
        this.recoverUserData();
    }

    /**
     * Track page view
     */
    trackPageView() {
        this.pageViewCount++;
        console.log(`Page view #${this.pageViewCount} - ${this.currentPageData.page}`);
    }

    /**
     * Track click interactions
     */
    trackClick() {
        this.clickCount++;
        this.currentPageData.clicks++;
    }

    /**
     * Calculate scroll depth percentage
     */
    trackScrollDepth() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        this.currentPageData.scrollDepth = Math.min(Math.round(scrollPercent), 100);
    }

    /**
     * Update time spent on current page
     */
    updateTimeOnPage() {
        this.currentPageData.timeOnPage = Math.round((Date.now() - this.currentPageData.startTime) / 1000);
    }

    /**
     * Get technical data about the user's device and browser
     */
    getTechnicalData() {
        const ua = navigator.userAgent;
        const browserInfo = this.parseBrowser(ua);
        
        return {
            userAgent: ua,
            browser: browserInfo.browser,
            browserVersion: browserInfo.version,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            deviceType: this.getDeviceType(),
            operatingSystem: this.getOperatingSystem(ua),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Determine device type
     */
    getDeviceType() {
        const ua = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad/.test(ua)) {
            if (/ipad/.test(ua)) return 'Tablet';
            return 'Mobile';
        }
        return 'Desktop';
    }

    /**
     * Parse operating system from user agent
     */
    getOperatingSystem(ua) {
        if (ua.indexOf('Win') > -1) return 'Windows';
        if (ua.indexOf('Mac') > -1) return 'macOS';
        if (ua.indexOf('X11') > -1) return 'Linux';
        if (ua.indexOf('Android') > -1) return 'Android';
        if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
        return 'Unknown';
    }

    /**
     * Parse browser information from user agent
     */
    parseBrowser(ua) {
        let browser = 'Unknown';
        let version = 'Unknown';

        if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            version = ua.substring(ua.indexOf('Firefox') + 8);
        } else if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
            version = ua.substring(ua.indexOf('Chrome') + 7);
        } else if (ua.indexOf('Safari') > -1) {
            browser = 'Safari';
            version = ua.substring(ua.indexOf('Version') + 8);
        } else if (ua.indexOf('Edg') > -1) {
            browser = 'Edge';
            version = ua.substring(ua.indexOf('Edg') + 4);
        }

        version = version.split(' ')[0].split(';')[0];

        return { browser, version };
    }

    /**
     * Get approximate location from IP (would require backend service)
     * For now, storing IP if available
     */
    async getLocationData() {
        try {
            // This would call a backend API that uses IP geolocation
            // For development, returning placeholder
            return {
                method: 'ip-based',
                accuracy: 'city-level',
                note: 'Approximate location based on IP address'
            };
        } catch (error) {
            console.log('Location data unavailable');
            return null;
        }
    }

    /**
     * Store user data (from form submission)
     */
    storeUserData(userData) {
        this.userData = {
            ...userData,
            dataCollectionTime: new Date().toISOString(),
            consented: true
        };
        // Persist to localStorage
        localStorage.setItem('userData', JSON.stringify(this.userData));
        console.log('User data stored:', this.userData);
    }

    /**
     * Recover user data from localStorage
     */
    recoverUserData() {
        const stored = localStorage.getItem('userData');
        if (stored) {
            this.userData = JSON.parse(stored);
        }
    }

    /**
     * Compile all collected data
     */
    async compileData() {
        this.updateTimeOnPage();

        const compiledData = {
            sessionId: this.sessionId,
            userData: this.userData,
            behavioral: {
                pageViews: this.pageViewCount,
                totalClicks: this.clickCount,
                currentPageData: {
                    page: this.currentPageData.page,
                    timeOnPage: this.currentPageData.timeOnPage,
                    clicks: this.currentPageData.clicks,
                    scrollDepth: this.currentPageData.scrollDepth
                }
            },
            technical: this.getTechnicalData(),
            session: {
                sessionDuration: Math.round((Date.now() - this.startTime) / 1000),
                startTime: new Date(this.startTime).toISOString(),
                endTime: new Date().toISOString()
            }
        };

        return compiledData;
    }

    /**
     * Save session data (can be sent to server)
     */
    async saveSessionData() {
        if (!this.userData || !this.userData.email) {
            return; // Don't save if no user data
        }

        const data = await this.compileData();
        
        // Attempt to send to server (server endpoint required)
        await this.sendDataToServer(data);

        // Also save locally for backup
        this.saveLocalData(data);
    }

    /**
     * Send data to server (requires backend implementation)
     */
    async sendDataToServer(data) {
        try {
            // Replace with your actual backend endpoint
            const response = await fetch('/api/collect-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                keepalive: true // Ensure request completes even if page unloads
            });

            if (response.ok) {
                console.log('Data sent to server successfully');
            } else {
                console.error('Failed to send data to server:', response.status);
            }
        } catch (error) {
            console.error('Error sending data to server:', error);
            // Data will be saved locally as fallback
        }
    }

    /**
     * Save data locally in browser
     */
    saveLocalData(data) {
        const sessionStorage = localStorage.getItem('sessionHistory') || '[]';
        const history = JSON.parse(sessionStorage);
        history.push(data);
        localStorage.setItem('sessionHistory', JSON.stringify(history));
        console.log('Data saved locally');
    }

    /**
     * Get all collected data (for development/testing)
     */
    async getAllData() {
        return await this.compileData();
    }

    /**
     * Clear all collected data
     */
    clearData() {
        localStorage.removeItem('userData');
        localStorage.removeItem('sessionHistory');
        this.userData = null;
        this.clickCount = 0;
        this.pageViewCount = 0;
        console.log('All data cleared');
    }

    /**
     * Export data as JSON
     */
    async exportData() {
        const data = await this.compileData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-data-${this.sessionId}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize tracker globally
const tracker = new DataTracker();
