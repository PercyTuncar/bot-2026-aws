/**
 * Señal de salud (heartbeat) — PRD sección 0.4
 * 
 * Escribe periódicamente una marca de tiempo en Firestore para que el panel
 * o un sistema externo pueda verificar que el bot está realmente respondiendo,
 * no solo que el proceso de PM2 está corriendo.
 */

import { upsertGroup } from '../firebase/firebaseClient.js';

const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minuto
let intervalHandle = null;

export function startHealthSignal() {
  console.log('💓 Health signal started.');

  intervalHandle = setInterval(async () => {
    try {
      // Escribir marca de tiempo en una colección/documento dedicado
      const db = (await import('../firebase/firebaseClient.js')).getDb?.();
      if (!db) return;

      await db.collection('monitoring').doc('bot-health').set({
        lastHeartbeat: new Date().toISOString(),
        timestamp: Date.now(),
      }, { merge: true });
    } catch (err) {
      console.error('[healthSignal] Failed to write heartbeat:', err.message);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

export function stopHealthSignal() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('💓 Health signal stopped.');
  }
}
