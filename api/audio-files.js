import fs from 'fs';
import path from 'path';

/**
 * Vercel Serverless Function: Lists all audio files in /public/music
 */
export default function handler(req, res) {
  const musicDir = path.join(process.cwd(), 'public', 'music');
  fs.readdir(musicDir, (err, files) => {
    if (err) {
      console.error('Failed to read music directory:', err);
      return res.status(500).json({ error: 'Could not read music directory.' });
    }
    // Filter for supported audio extensions
    const audioFiles = files.filter(f => /\.(mp3|opus|wav|ogg)$/i.test(f));
    res.status(200).json(audioFiles);
  });
}
