import { SHOP_ITEMS } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';

export async function shopCommand(sock, msg, context) {
  const remoteJid = msg.key.remoteJid;

  let text = `🏪 *Tienda de RCoins*\n\n`;
  for (const item of Object.values(SHOP_ITEMS)) {
    text += `*${item.name}*\n`;
    text += `   💬 ${item.description}\n`;
    text += `   💰 Precio: *${formatCoins(item.price)}*\n`;
    if (item.duration) {
      text += `   ⏱️ Duración: *${item.duration / (1000 * 60 * 60)}h* tras activar\n`;
    }
    text += `   🛒 Comprar: \`!buy ${item.id}\`\n\n`;
  }
  text += `💡 Usa *!buy [id]* para comprar y *!use [id]* para activar.`;

  await sock.sendMessage(remoteJid, { text }, { quoted: msg });
}
