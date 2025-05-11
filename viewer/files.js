const fs = require('fs').promises;
const path = require('path');

// Read and parse a specific files.json
async function parseFilesJson(path) {
    const data = await fs.readFile(path, 'utf8');
    return JSON.parse(data);
}

// Get path mappings for a specific date
async function getScreenshotPaths(historyDir, date) {
    const basePath = `${historyDir}/${date}`;
    const filesJson = await parseFilesJson(`${basePath}/files.json`);
    const paths = Object.entries(filesJson).map(([name, url]) => {
        return {
            name,
            url,
        };
    });
    return paths;
}

async function collectNameDateMap(historyDir) {
    const nameToDate = {};

    // Read all date directories
    const dates = await fs.readdir(historyDir);
    for (const date of dates) {
        const dateDir = path.join(historyDir, date);
        if (!(await fs.stat(dateDir)).isDirectory()) continue;

        // Parse files.json for the current date
        const filesJsonPath = path.join(dateDir, 'files.json');
        try {
            const filesJson = JSON.parse(await fs.readFile(filesJsonPath, 'utf8'));
            for (const name of Object.keys(filesJson)) {
                if (!nameToDate[name]) {
                    nameToDate[name] = [];
                }
                nameToDate[name].push(date); // Map name to the current date
            }
        } catch (err) {
            console.error(`Error reading files.json in ${date}:`, err);
        }
    }

    return nameToDate;
}

module.exports = {
    getScreenshotPaths,
    collectNameDateMap,
};
