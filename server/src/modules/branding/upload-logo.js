import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BRANDING_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/branding');

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function isReadOnlyServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV,
  );
}

function safeId(value) {
  return String(value || 'workspace')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 64);
}

function inferExtension(file) {
  return EXT_BY_MIME[file?.mimetype] || 'png';
}

export const brandingLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(String(file?.mimetype || '').toLowerCase())) {
      cb(new Error('Tipo de imagem inválido. Use PNG, JPG, SVG ou WEBP.'));
      return;
    }
    cb(null, true);
  },
});

export async function saveBrandingLogo({ workspaceId, file }) {
  if (!file || !file.buffer) {
    throw new Error('Arquivo de logotipo não enviado.');
  }

  if (isReadOnlyServerlessRuntime()) {
    const error = new Error(
      'UPLOAD_STORAGE_NOT_CONFIGURED: envio de arquivo está desabilitado neste ambiente. Informe a URL pública do logo.',
    );
    error.code = 'UPLOAD_STORAGE_NOT_CONFIGURED';
    throw error;
  }

  const safeWorkspaceId = safeId(workspaceId);
  const extension = inferExtension(file);
  const fileName = `${safeWorkspaceId}-${Date.now()}.${extension}`;

  await fs.mkdir(BRANDING_UPLOAD_DIR, { recursive: true });

  const absolutePath = path.join(BRANDING_UPLOAD_DIR, fileName);
  await fs.writeFile(absolutePath, file.buffer);

  return {
    fileName,
    absolutePath,
    publicPath: `/uploads/branding/${fileName}`,
  };
}

export function buildLogoAbsoluteUrl(req, publicPath) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  if (!host) return publicPath;
  return `${proto}://${host}${publicPath}`;
}
