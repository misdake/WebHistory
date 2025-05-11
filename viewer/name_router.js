const express = require('express');
const { collectNameDateMap } = require('./files');

const router = express.Router();
const HISTORY_DIR = require('path').join(__dirname, '../history');

// Cache the name->date mapping in memory (optional for performance)
let nameToDateCache = null;

// Middleware to ensure the cache is populated
router.use(async (req, res, next) => {
    if (!nameToDateCache) {
        try {
            nameToDateCache = await collectNameDateMap(HISTORY_DIR);
            console.log("Name-date map built.")
        } catch (err) {
            console.error('Failed to build name-date map:', err);
            return res.status(500).json({ error: 'Server error' });
        }
    }
    next();
});

// Route to refresh the name->date cache
router.post('/refresh', async (req, res) => {
    try {
        nameToDateCache = await collectNameDateMap(HISTORY_DIR);
        console.log("Name-date map refreshed.");
        res.json({message: 'Cache successfully refreshed'});
    } catch (err) {
        console.error('Failed to refresh name-date map:', err);
        res.status(500).json({error: 'Failed to refresh cache'});
    }
});

// Route to return all names
router.get('/names', (req, res) => {
    const names = Object.keys(nameToDateCache || {});
    res.json({ names });
});

// Route to return all dates for a specific name
router.get('/date/:name', (req, res) => {
    const { name } = req.params;
    const dates = nameToDateCache?.[name] || [];
    if (dates.length === 0) {
        return res.status(404).json({ error: `No dates found for name: ${name}` });
    }
    res.json({ name, dates });
});

module.exports = router;
