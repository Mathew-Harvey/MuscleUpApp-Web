const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Ebook download — serve as attachment so browser downloads the file
app.get('/download/ebook', (req, res) => {
  const file = path.join(__dirname, 'assets', 'ebook.html');
  res.download(file, 'The-Muscle-Up-Training-Guide.html', (err) => {
    if (err && !res.headersSent) res.status(500).send('Download failed');
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Muscle Up Web running on port ${PORT}`));
