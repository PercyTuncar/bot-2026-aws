/**
 * Worker para conversión de stickers — PRD sección 0.5
 * 
 * La conversión de imagen/video con sharp es CPU-intensiva.
 * Se ejecuta en un worker_threads separado para no bloquear el
 * hilo principal que sostiene la conexión de WhatsApp.
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);

// ─── API para el hilo principal ───────────────────────────────────────────────

/**
 * Convierte un Buffer (imagen/video/gif) en un sticker WebP de 512x512.
 * @param {Buffer} inputBuffer - Datos del medio a convertir
 * @returns {Promise<Buffer>} - Buffer WebP resultante
 */
export function convertToSticker(inputBuffer) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { buffer: inputBuffer.buffer, byteOffset: inputBuffer.byteOffset, byteLength: inputBuffer.byteLength },
    });

    worker.on('message', (result) => {
      if (result.error) reject(new Error(result.error));
      else resolve(Buffer.from(result.buffer));
    });

    worker.on('error', reject);

    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Sticker worker exited with code ${code}`));
    });
  });
}

// ─── Lógica del worker (corre en el hilo secundario) ─────────────────────────

if (!isMainThread) {
  (async () => {
    try {
      const { buffer, byteOffset, byteLength } = workerData;
      const inputBuffer = Buffer.from(buffer, byteOffset, byteLength);

      const sharp = (await import('sharp')).default;
      const webpBuffer = await sharp(inputBuffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toBuffer();

      parentPort.postMessage({ buffer: webpBuffer.buffer });
    } catch (err) {
      parentPort.postMessage({ error: err.message });
    }
  })();
}
