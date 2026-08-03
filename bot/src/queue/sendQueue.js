/**
 * Cola central de envío de mensajes — PRD sección 0.3 (anti-baneo)
 * 
 * Todas las salidas del bot DEBEN pasar por aquí:
 * - Respuestas de comandos
 * - Avisos de moderación
 * - Mensaje de bienvenida
 * - Alertas programadas
 * - !tagall / !tagnoadmin
 * 
 * Funciones:
 * - Espaciado aleatorio (jitter) entre envíos
 * - Reintentos con backoff exponencial
 * - Pausa automática ante señales de riesgo
 * - Registro de fallos para monitoreo
 */

import { randomInt } from '../utils/helpers.js';

let sock = null;
const queue = [];
let processing = false;
let paused = false;
let consecutiveFailures = 0;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1-3 segundos de jitter entre mensajes
const MAX_DELAY_MS = 3000;
const RISK_THRESHOLD = 5; // Pausar tras 5 fallos consecutivos

export function initSendQueue(socketInstance) {
  sock = socketInstance;
  console.log('📨 Send queue initialized.');
}

/**
 * Encolar un mensaje para envío controlado.
 * 
 * @param {string} remoteJid - Destino
 * @param {object} content - Contenido del mensaje (text, image, sticker, etc)
 * @param {object} options - Opciones adicionales (quoted, mentions, etc)
 * @param {number} priority - 0 = normal, 1 = alta (comandos directos), 2 = baja (alertas)
 * @returns {Promise<object>} - Mensaje enviado
 */
export async function enqueueMessage(remoteJid, content, options = {}, priority = 0) {
  return new Promise((resolve, reject) => {
    const task = {
      remoteJid,
      content,
      options,
      priority,
      retries: 0,
      resolve,
      reject,
      enqueuedAt: Date.now(),
    };

    // Insertar según prioridad
    if (priority === 1) {
      // Alta prioridad al inicio (respuestas a comandos)
      const firstLowPriority = queue.findIndex((t) => t.priority !== 1);
      if (firstLowPriority === -1) queue.push(task);
      else queue.splice(firstLowPriority, 0, task);
    } else if (priority === 2) {
      // Baja prioridad al final (alertas, tagall)
      queue.push(task);
    } else {
      // Prioridad normal
      queue.push(task);
    }

    processQueue();
  });
}

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    if (paused) {
      console.warn('[sendQueue] Paused due to risk signals. Retrying in 30s...');
      setTimeout(() => {
        paused = false;
        processing = false;
        processQueue();
      }, 30000);
      return;
    }

    const task = queue.shift();

    try {
      const result = await sock.sendMessage(task.remoteJid, task.content, task.options);
      task.resolve(result);
      consecutiveFailures = 0; // Reset en éxito

      // Jitter humano: espera aleatoria entre mensajes
      const delay = randomInt(BASE_DELAY_MS, MAX_DELAY_MS);
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      console.error(`[sendQueue] Error sending to ${task.remoteJid}:`, err.message);

      // Reintentar con backoff exponencial
      if (task.retries < MAX_RETRIES) {
        task.retries++;
        const backoffDelay = Math.min(1000 * Math.pow(2, task.retries), 30000);
        console.log(`[sendQueue] Retrying in ${backoffDelay}ms (attempt ${task.retries}/${MAX_RETRIES})`);
        
        await new Promise((r) => setTimeout(r, backoffDelay));
        queue.unshift(task); // Reinsertar al inicio
        continue;
      }

      // Falló definitivamente
      task.reject(err);
      consecutiveFailures++;

      // Activar pausa automática si hay muchos fallos
      if (consecutiveFailures >= RISK_THRESHOLD) {
        console.error(`[sendQueue] RISK: ${consecutiveFailures} consecutive failures. Pausing queue for 30s.`);
        paused = true;
      }
    }
  }

  processing = false;
}

/**
 * Pausar manualmente la cola (para mantenimiento o al detectar baneo)
 */
export function pauseQueue() {
  paused = true;
  console.warn('[sendQueue] Queue paused manually.');
}

/**
 * Reanudar la cola
 */
export function resumeQueue() {
  paused = false;
  consecutiveFailures = 0;
  console.log('[sendQueue] Queue resumed.');
  processQueue();
}

/**
 * Estado de la cola (para monitoreo)
 */
export function getQueueStatus() {
  return {
    length: queue.length,
    processing,
    paused,
    consecutiveFailures,
  };
}
