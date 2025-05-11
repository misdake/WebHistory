const express = require('express');

const nameRoutes = require('./name_router');
const screenshotRoutes = require('./screenshot_router');
const path = require("path");

const app = express();
const PORT = 3000;

const STATIC_DIR = path.join(__dirname, 'static');
app.use(express.static(STATIC_DIR))

app.use('/screenshot', screenshotRoutes);

app.use('/name', nameRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    require('child_process').exec(`start http://localhost:${PORT}`);
});
