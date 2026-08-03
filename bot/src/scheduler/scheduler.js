/**
 * Planificador de tareas periódicas — PRD secciones 0.5 y 12.4
 *
 * Reglas del PRD que debe cumplir este módulo:
 * 1. Nunca recorre grupos de forma secuencial y bloqueante (sección 0.5).
 * 2. Todo envío pasa por la cola central, nunca directo al socket (sección 0.3).
 * 3. Concurrencia acotada: evalúa grupos en paralelo pero con tope (sección 0.5).
 * 4. Préstamos vencidos → Infocorp (sección 8).
 * 5. Persecución de cobro: cualquier ingreso nuevo va primero a la deuda.
 */

import {
  getAllActiveGroups,
  getAlertsForGroup,
  updateAlert,
  getAllMembers,
  upsertMember,
} from '../firebase/firebaseClient.js';
import { getGroupParticipants } from '../services/moderationService.js';
import { enqueueMessage } from '../queue/sendQueue.js';
import { buildAlertMessage } from '../utils/format.js';

const CHECK_ALERTS_INTERVAL = 60 * 1000;       // 1 min
const CHECK_LOANS_INTERVAL = 5 * 60 * 1000;    // 5 min
const CLEANUP_ITEMS_INTERVAL = 10 * 60 * 1000; // 10 min
const CONCURRENCY_LIMIT = 5; // Máximo de grupos evaluados en paralelo (PRD 0.5)

let sock = null;

export function startScheduler(socketInstance) {
  sock = socketInstance;
  console.log('⏰ Scheduler started.');

  setInterval(() => runWithoutThrow(checkAlerts), CHECK_ALERTS_INTERVAL);
  setInterval(() => runWithoutThrow(checkLoans), CHECK_LOANS_INTERVAL);
  setInterval(() => runWithoutThrow(cleanupExpiredItems), CLEANUP_ITEMS_INTERVAL);
}

/** Ejecuta una función async sin dejar que errores derriben el proceso */
async function runWithoutThrow(fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`[scheduler] Unhandled error in ${fn.name}:`, err.message);
  }
}

// ─── Evaluación asíncrona de N grupos con tope de concurrencia ────────────────
async function runConcurrent(items, fn, limit = CONCURRENCY_LIMIT) {
  const results = [];
  let index = 0;

  async function runNext() {
    while (index < items.length) {
      const current = index++;
      try {
        results.push(await fn(items[current]));
      } catch (err) {
        console.error(`[scheduler:concurrent] Error processing item ${current}:`, err.message);
      }
    }
  }

  // Arrancar N tareas en paralelo, cada una drena la cola hasta vaciarla
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

// ─── Alertas programadas ──────────────────────────────────────────────────────
async function checkAlerts() {
  const groups = await getAllActiveGroups();
  const activeGroups = groups.filter((g) => g.alertsActive);
  if (activeGroups.length === 0) return;

  await runConcurrent(activeGroups, async (group) => {
    const alerts = await getAlertsForGroup(group.jid);
    for (const alert of alerts) {
      if (shouldFireAlert(alert)) {
        await fireAlert(group.jid, alert);
      }
    }
  });
}

function shouldFireAlert(alert) {
  if (!alert.active) return false;
  const now = Date.now();
  const scheduled = alert.nextFireAt || (alert.scheduledAt ? new Date(alert.scheduledAt).getTime() : 0);
  return scheduled > 0 && scheduled <= now;
}

async function fireAlert(groupJid, alert) {
  if (!sock) return;

  try {
    const text = buildAlertMessage({ text: alert.text, link: alert.link });
    const mentions = [];

    // Mención silenciosa a todos si el interruptor está activo
    if (alert.mentionAll) {
      try {
        const participants = await getGroupParticipants(sock, groupJid);
        participants.forEach((p) => {
          if (p.id) mentions.push(p.id);
        });
      } catch (e) {
        console.error('[scheduler:fireAlert] Failed to get participants:', e.message);
      }
    }

    // Construir el contenido del mensaje
    const content = alert.imageUrl
      ? { image: { url: alert.imageUrl }, caption: text, mentions }
      : { text, mentions };

    // PRD 0.3: Todo envío pasa por la cola central — prioridad baja (alertas)
    await enqueueMessage(groupJid, content, {}, 2);

    // Actualizar timestamp del próximo disparo
    const nextFireAt = calculateNextFireAt(alert);
    // Si no hay próximo disparo (once / custom sin intervalMs), desactivar la alerta
    // para que no vuelva a dispararse en el siguiente ciclo del scheduler
    const updatePayload = { nextFireAt, lastFiredAt: Date.now() };
    if (nextFireAt === null) updatePayload.active = false;
    await updateAlert(alert.id, updatePayload);

    console.log(`[scheduler] Alert "${alert.title}" fired in ${groupJid}`);
  } catch (err) {
    console.error(`[scheduler:fireAlert] Error:`, err.message);
  }
}

function calculateNextFireAt(alert) {
  const now = Date.now();
  switch (alert.frequency) {
    case 'once':    return null;
    case 'hourly':  return now + 60 * 60 * 1000;
    case 'daily':   return now + 24 * 60 * 60 * 1000;
    case 'weekly':  return now + 7 * 24 * 60 * 60 * 1000;
    case 'custom':  return alert.intervalMs ? now + alert.intervalMs : null;
    default:        return null;
  }
}

// ─── Préstamos vencidos → Infocorp ─────────────────────────────────────────────
async function checkLoans() {
  const groups = await getAllActiveGroups();

  await runConcurrent(groups, async (group) => {
    const members = await getAllMembers(group.jid);
    const now = Date.now();

    // Procesar todos los miembros con préstamos activos
    await Promise.all(
      members
        .filter((m) => (m.loans || []).some((l) => l.type === 'loan' && l.status === 'active'))
        .map(async (member) => {
          const updatedLoans = (member.loans || []).map((loan) => {
            if (loan.type === 'loan' && loan.status === 'active' && now > loan.dueAt) {
              return { ...loan, status: 'infocorp' };
            }
            return loan;
          });

          // Solo escribir si algo cambió
          if (JSON.stringify(updatedLoans) !== JSON.stringify(member.loans)) {
            await upsertMember(group.jid, member.jid, { loans: updatedLoans });
          }
        })
    );
  });
}

// ─── Limpieza de ítems de inventario expirados ──────────────────────────────────
async function cleanupExpiredItems() {
  const groups = await getAllActiveGroups();
  const now = Date.now();

  await runConcurrent(groups, async (group) => {
    const members = await getAllMembers(group.jid);

    await Promise.all(
      members
        .filter((m) => m.inventory?.some((i) => i.active && i.expiresAt && i.expiresAt <= now))
        .map(async (member) => {
          const inventory = member.inventory.map((item) =>
            item.active && item.expiresAt && item.expiresAt <= now
              ? { ...item, active: false, expired: true }
              : item
          );
          await upsertMember(group.jid, member.jid, { inventory });
        })
    );
  });
}
