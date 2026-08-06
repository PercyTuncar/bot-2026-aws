import { enqueueMessage } from '../../queue/sendQueue.js';
import { getQueueStatus } from '../../queue/sendQueue.js';
import os from 'os';

export async function pingCommand(sock, msg, context) {
  const startTime = Date.now();
  const remoteJid = msg.key.remoteJid;

  // Obtener información del sistema
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || 'Unknown';
  const cpuCount = cpus.length;

  // Calcular uso promedio de CPU
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total);
  }, 0) / cpus.length;
  const cpuUsagePercent = (cpuUsage * 100).toFixed(1);

  // Uptime del proceso
  const processUptime = process.uptime();
  const hours = Math.floor(processUptime / 3600);
  const minutes = Math.floor((processUptime % 3600) / 60);
  const seconds = Math.floor(processUptime % 60);
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

  // Uptime del sistema
  const systemUptime = os.uptime();
  const sysHours = Math.floor(systemUptime / 3600);
  const sysMinutes = Math.floor((systemUptime % 3600) / 60);
  const systemUptimeStr = `${sysHours}h ${sysMinutes}m`;

  // Estado de la cola de mensajes
  const queueStatus = getQueueStatus();
  const queueHealth = queueStatus.paused ? '🔴 Pausada' :
                      queueStatus.length > 10 ? '🟡 Acumulada' :
                      '🟢 Normal';

  // Latencia de respuesta
  const latency = Date.now() - startTime;

  // Construir mensaje con información completa
  const responseText = `🏓 *Pong!*

📊 *Estado del Bot*
• Latencia: *${latency}ms*
• Uptime Bot: *${uptimeStr}*
• Cola de mensajes: *${queueHealth}* (${queueStatus.length} pendientes)
${queueStatus.paused ? '• ⚠️ Cola pausada por seguridad\n' : ''}
🖥️ *Servidor AWS EC2*
• CPU: *${cpuUsagePercent}%* uso (${cpuCount} cores)
• Modelo: _${cpuModel}_
• RAM: *${memUsagePercent}%* uso
  └ Usado: ${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB
  └ Total: ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB
• Uptime Sistema: *${systemUptimeStr}*
• Plataforma: ${os.platform()} ${os.arch()}

${memUsagePercent > 80 ? '⚠️ _Advertencia: Memoria alta_\n' : ''}${cpuUsagePercent > 80 ? '⚠️ _Advertencia: CPU alta_\n' : ''}✅ _Bot operativo_`;

  // Responder a través de la cola central
  await enqueueMessage(remoteJid, { text: responseText }, { quoted: msg }, 1);
}

