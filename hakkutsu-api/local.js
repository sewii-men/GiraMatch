
const { app } = require("./handler");
const port = 4000;
app.listen(port, () => {
    console.log(`🚀 Local API running at http://localhost:${port}`);
});
