import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { defineMock } from 'umi';
import { createAvatarFileName } from '../src/utils/avatarUpload';

const avatarDirectory = join(__dirname, '..', '..', 'img');

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
}

const mimeTypes: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function ensureAvatarDirectory() {
  if (!existsSync(avatarDirectory)) {
    mkdirSync(avatarDirectory, { recursive: true });
  }
}

export default defineMock({
  'POST /api/avatar/upload': (req, res) => {
    const files = (req as typeof req & { files?: UploadedFile[] }).files;
    const file = Array.isArray(files) ? files[0] : null;
    const userId = Number(req.body?.userId ?? 0);

    if (!file || !file.buffer || !file.originalname || !userId) {
      res.status(400).json({ message: 'Avatar file is required.' });
      return;
    }

    ensureAvatarDirectory();
    const fileName = createAvatarFileName(userId, file.originalname);
    writeFileSync(join(avatarDirectory, fileName), file.buffer);
    res.status(200).json({ url: `/img/${fileName}` });
  },

  'GET /img/:fileName': (req, res) => {
    const fileName = String(req.params.fileName ?? '');
    const filePath = join(avatarDirectory, fileName);

    if (!/^[a-z0-9.-]+$/i.test(fileName) || !existsSync(filePath)) {
      res.status(404).end();
      return;
    }

    res.setHeader('Content-Type', mimeTypes[extname(fileName).toLowerCase()] ?? 'application/octet-stream');
    createReadStream(filePath).pipe(res);
  },
});
