/**
 * Optional Node.js Backend Server
 * Stores collected data for analysis
 * 
 * Requirements:
 * - Node.js installed
 * - npm install express cors body-parser
 * 
 * Run: node server.js
 * Visit: http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Data storage directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Helper: Save data to JSON file
 */
function saveDataToFile(filename, data) {
    const filepath = path.join(dataDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

/**
 * Helper: Read all data files
 */
function getAllData() {
    const files = fs.readdirSync(dataDir);
    const allData = [];
    
    files.forEach(file => {
        if (file.endsWith('.json')) {
            const filepath = path.join(dataDir, file);
            const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            allData.push(data);
        }
    });
    
    return allData;
}

/**
 * Endpoint: Collect user registration
 * POST /api/register-user
 */
app.post('/api/register-user', (req, res) => {
    try {
        const { name, email, sessionId } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create user record
        const userRecord = {
            ...req.body,
            receivedAt: new Date().toISOString(),
            ipAddress: req.ip
        };

        // Save to file
        const filename = `registration_${email}_${Date.now()}.json`;
        saveDataToFile(filename, userRecord);

        console.log(`✓ User registered: ${email}`);

        res.json({
            success: true,
            message: 'Registration received',
            sessionId: sessionId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Endpoint: Collect behavioral and technical data
 * POST /api/collect-data
 */
app.post('/api/collect-data', (req, res) => {
    try {
        const { sessionId, userData } = req.body;

        if (!sessionId || !userData || !userData.email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Add server-side metadata
        const dataWithMetadata = {
            ...req.body,
            receivedAt: new Date().toISOString(),
            ipAddress: req.ip,
            serverProcessed: true
        };

        // Save to file
        const filename = `session_${userData.email}_${sessionId}_${Date.now()}.json`;
        saveDataToFile(filename, dataWithMetadata);

        console.log(`✓ Session data collected for: ${userData.email}`);

        res.json({
            success: true,
            message: 'Data received and processed',
            sessionId: sessionId
        });
    } catch (error) {
        console.error('Data collection error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Endpoint: Get analytics summary
 * GET /api/analytics
 * WARNING: In production, protect this endpoint with authentication
 */
app.get('/api/analytics', (req, res) => {
    try {
        const allData = getAllData();

        // Calculate statistics
        const stats = {
            totalSessions: allData.length,
            uniqueUsers: new Set(allData.map(d => d.userData?.email)).size,
            avgSessionDuration: Math.round(
                allData.reduce((sum, d) => sum + (d.session?.sessionDuration || 0), 0) / allData.length
            ),
            avgPageViews: Math.round(
                allData.reduce((sum, d) => sum + (d.behavioral?.pageViews || 0), 0) / allData.length
            ),
            avgClicks: Math.round(
                allData.reduce((sum, d) => sum + (d.behavioral?.totalClicks || 0), 0) / allData.length
            ),
            topBrowsers: getTopBrowsers(allData),
            topDevices: getTopDevices(allData),
            ageDistribution: getAgeDistribution(allData)
        };

        res.json({
            success: true,
            statistics: stats,
            dataPoints: allData.length,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Helper: Get top browsers
 */
function getTopBrowsers(data) {
    const browsers = {};
    data.forEach(d => {
        const browser = d.technical?.browser || 'Unknown';
        browsers[browser] = (browsers[browser] || 0) + 1;
    });
    return Object.entries(browsers).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

/**
 * Helper: Get top devices
 */
function getTopDevices(data) {
    const devices = {};
    data.forEach(d => {
        const device = d.technical?.deviceType || 'Unknown';
        devices[device] = (devices[device] || 0) + 1;
    });
    return Object.entries(devices).sort((a, b) => b[1] - a[1]);
}

/**
 * Helper: Get age distribution
 */
function getAgeDistribution(data) {
    const distribution = {
        '13-18': 0,
        '19-25': 0,
        '26-35': 0,
        '36-50': 0,
        '50+': 0
    };

    data.forEach(d => {
        const age = d.userData?.age;
        if (age) {
            if (age <= 18) distribution['13-18']++;
            else if (age <= 25) distribution['19-25']++;
            else if (age <= 35) distribution['26-35']++;
            else if (age <= 50) distribution['36-50']++;
            else distribution['50+']++;
        }
    });

    return distribution;
}

/**
 * Endpoint: Export all data (CSV format)
 * GET /api/export-csv
 * WARNING: In production, protect this endpoint with authentication
 */
app.get('/api/export-csv', (req, res) => {
    try {
        const allData = getAllData();

        // Convert to CSV
        let csv = 'Name,Email,Age,Browser,Device,SessionDuration,PageViews,Clicks,Timestamp\n';

        allData.forEach(d => {
            const row = [
                d.userData?.name || '',
                d.userData?.email || '',
                d.userData?.age || '',
                d.technical?.browser || '',
                d.technical?.deviceType || '',
                d.session?.sessionDuration || 0,
                d.behavioral?.pageViews || 0,
                d.behavioral?.totalClicks || 0,
                d.receivedAt || ''
            ].map(v => `"${v}"`).join(',');
            csv += row + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="user-data.csv"');
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Endpoint: Delete user data
 * POST /api/delete-user
 * WARNING: In production, require authentication and verification
 */
app.post('/api/delete-user', (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        // Find and delete all files for this user
        const files = fs.readdirSync(dataDir);
        let deletedCount = 0;

        files.forEach(file => {
            if (file.includes(email)) {
                const filepath = path.join(dataDir, file);
                fs.unlinkSync(filepath);
                deletedCount++;
            }
        });

        console.log(`✓ Deleted ${deletedCount} files for user: ${email}`);

        res.json({
            success: true,
            message: `Deleted ${deletedCount} data files`,
            email: email
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Root route - serve index.html
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   Data Insights Server Running        ║
╠═══════════════════════════════════════╣
║   URL: http://localhost:${PORT}          
║                                       ║
║   API Endpoints:                      ║
║   POST /api/register-user             ║
║   POST /api/collect-data              ║
║   GET  /api/analytics                 ║
║   GET  /api/export-csv                ║
║   POST /api/delete-user               ║
║   GET  /api/health                    ║
║                                       ║
║   Data stored in: ./data/             ║
╚═══════════════════════════════════════╝
    `);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
