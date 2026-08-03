import { getMember, SHOP_ITEMS } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';

export async function inventoryCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const member = memberData || await getMember(groupJid, senderJid);
  const inventory = member?.inventory || [];

  if (inventory.length === 0) {
    await sock.sendMessage(remoteJid, {
      text: `🎒 Tu inventario está vacío.\nUsa *!shop* para ver los artículos disponibles.`,
    }, { quoted: msg });
    return;
  }

  let text = `🎒 *Tu Inventario*\n\n`;
  const now = Date.now();

  for (const item of inventory) {
    const shopItem = SHOP_ITEMS[item.itemId];
    const name = shopItem?.name || item.name || item.itemId;

    if (item.permanent) {
      text += `• ${name} — ✅ Disponible\n`;
    } else if (item.active && item.expiresAt) {
      if (item.expiresAt > now) {
        const remaining = item.expiresAt - now;
        const hrs = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        text += `• ${name} — ⏳ Activo (${hrs}h ${mins}m restantes)\n`;
      } else {
        text += `• ${name} — ❌ Expirado\n`;
      }
    } else {
      text += `• ${name} — 💤 Sin activar\n`;
    }
  }

  text += `\n💡 Usa *!use [id]* para activar un artículo.`;
  await sock.sendMessage(remoteJid, { text }, { quoted: msg });
}
