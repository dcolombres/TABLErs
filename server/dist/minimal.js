import express from 'express';
const app = express();
const PORT = 3005;
app.get('/test', (req, res) => {
    res.send('OK');
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Minimal server running on port ${PORT}`);
});
