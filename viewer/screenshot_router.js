const express = require('express');
const path = require('path');
const { getScreenshotPaths } = require('./files');

const router = express.Router();
const HISTORY_DIR = path.join(__dirname, '../history');

// Predefined Constants
const ERROR_MESSAGES = {
    HISTORY_READ: (date) => `Error reading history for ${date}`,
    SCREENSHOT_NOT_FOUND: (name, date) => `Screenshot not found for ${name} on ${date}`
};

// Helper function to build file paths
const buildScreenshotPath = (date, name) => path.join(HISTORY_DIR, date, `${name}_${date}.png`);

// Endpoint to list screenshots for a specific date
router.get('/date/:date', async (req, res) => {
    const { date } = req.params;
    try {
        const screenshots = await getScreenshotPaths(HISTORY_DIR, date);
        res.json(screenshots);
    } catch {
        res.status(500).json({ error: ERROR_MESSAGES.HISTORY_READ(date) });
    }
});

// Serve screenshots directly
router.get('/file/:date/:name', (req, res) => {
    const { date, name } = req.params;
    const filePath = buildScreenshotPath(date, name);

    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).json({ error: ERROR_MESSAGES.SCREENSHOT_NOT_FOUND(name, date) });
        }
    });
});

module.exports = router;
