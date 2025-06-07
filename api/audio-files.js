import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const dir = path.join(process.cwd(), 'public', 'music');
  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Could not read music directory.' });
    const audio = files.filter(f => /\.(mp3|opus|wav|ogg)$/i.test(f));
    res.status(200).json(audio);
  });
}
