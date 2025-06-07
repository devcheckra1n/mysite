// backend/index.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static front-end
app.use(express.static(path.join(__dirname, '../public')));

// Endpoint: list all audio files in public/music
app.get('/api/audio-files', (req, res) => {
  const musicDir = path.join(__dirname, '../public/music');
  fs.readdir(musicDir, (err, files) => {
    if (err) {
      console.error('❌ Could not read music directory:', err);
      return res.status(500).json({ error: 'Could not read music directory.' });
    }
    const audioFiles = files.filter(f => /\.(mp3|opus|wav|ogg)$/i.test(f));
    res.json(audioFiles);
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Server listening on http://localhost:${PORT}`);
});
