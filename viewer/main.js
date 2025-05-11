const express = require('express');

const nameRoutes = require('./name_router');
const screenshotRoutes = require('./screenshot_router');

const app = express();
const PORT = 3000;

app.use('/screenshot', screenshotRoutes);

app.use('/name', nameRoutes);


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
