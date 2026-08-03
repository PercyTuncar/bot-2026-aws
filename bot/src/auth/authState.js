import { proto } from 'baileys';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = process.env.AUTH_STATE_DIR
  ? path.resolve(process.env.AUTH_STATE_DIR)
  : path.join(__dirname, '../../auth_state');

/**
 * Sanitiza un ID de clave de Baileys para usarse como nombre de archivo en Windows.
 * Los IDs contienen caracteres inválidos para paths de Windows: \ / : * ? " < > |
 * También :: se interpreta como flujo alternativo NTFS.
 */
function sanitizeKeyId(id) {
  return id
    .replace(/\\/g, '_')
    .replace(/\//g, '_')
    .replace(/::/g, '__')
    .replace(/:/g, '_')
    .replace(/\*/g, '_')
    .replace(/\?/g, '_')
    .replace(/"/g, '_')
    .replace(/</g, '_')
    .replace(/>/g, '_')
    .replace(/\|/g, '_');
}

export async function loadAuthState() {
  await fs.mkdir(AUTH_DIR, { recursive: true });

  const credsFile = path.join(AUTH_DIR, 'creds.json');
  const keysDir = path.join(AUTH_DIR, 'keys');
  await fs.mkdir(keysDir, { recursive: true });

  let creds;
  try {
    const data = await fs.readFile(credsFile, 'utf-8');
    creds = JSON.parse(data, BufferJSON.reviver);
  } catch (e) {
    const { initAuthCreds } = await import('baileys');
    creds = initAuthCreds();
  }

  return {
    state: {
      creds,
      keys: {
        async get(type, ids) {
          const data = {};
          for (const id of ids) {
            const sanitized = sanitizeKeyId(id);
            const filename = `${type}-${sanitized}.json`;
            const filePath = path.join(keysDir, filename);
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              let value = JSON.parse(content, BufferJSON.reviver);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.create(value);
              }
              data[id] = value;
            } catch (e) {
              // No existe — devolver undefined para ese ID
            }
          }
          return data;
        },

        async set(data) {
          const writes = [];
          for (const [category, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              const sanitized = sanitizeKeyId(id);
              const filename = `${category}-${sanitized}.json`;
              const filePath = path.join(keysDir, filename);
              const serialized = JSON.stringify(value, BufferJSON.replacer, 2);
              writes.push(fs.writeFile(filePath, serialized, 'utf-8'));
            }
          }
          await Promise.all(writes);
        },
      },
    },

    async saveCreds() {
      await fs.writeFile(credsFile, JSON.stringify(creds, BufferJSON.replacer, 2), 'utf-8');
    },
  };
}

export async function clearAuth() {
  try {
    await fs.rm(AUTH_DIR, { recursive: true, force: true });
    await fs.mkdir(AUTH_DIR, { recursive: true });
    console.log('Auth state cleared.');
  } catch (e) {
    console.error('Failed to clear auth state:', e.message);
  }
}

const BufferJSON = {
  replacer: (k, value) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array || (value?.type === 'Buffer' && Array.isArray(value?.data))) {
      return { type: 'Buffer', data: Buffer.from(value?.data ?? value).toString('base64') };
    }
    return value;
  },
  reviver: (_, value) => {
    if (typeof value === 'object' && !!value && (value.buffer === true || value.type === 'Buffer')) {
      const val = value.data ?? value.value;
      return typeof val === 'string'
        ? Buffer.from(val, 'base64')
        : Buffer.from(val || []);
    }
    return value;
  },
};
