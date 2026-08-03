import { getMember, upsertMember, SHOP_ITEMS } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';

export async function buyCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const itemId = args[0]?.toLowerCase();
  const item = SHOP_ITEMS[itemId];

  if (!item) {
    await sock.sendMessage(remoteJid, {
      text: `❌ Artículo no encontrado.\nUsa *!shop* para ver los artículos disponibles.`,
    }, { quoted: msg });
    return;
  }

  const member = memberData || await getMember(groupJid, senderJid);
  const cash = member?.cash || 0;

  if (cash < item.price) {
    await sock.sendMessage(remoteJid, {
      text: `❌ No tienes suficiente dinero.\n💰 Precio: *${formatCoins(item.price)}*\n💵 Tu efectivo: *${formatCoins(cash)}*`,
    }, { quoted: msg });
    return;
  }

  // Deduct price
  await upsertMember(groupJid, senderJid, { cash: cash - item.price });

  // Add to inventory
  const inventory = [...(member.inventory || [])];
  const newItem = {
    itemId: item.id,
    name: item.name,
    purchasedAt: new Date().toISOString(),
    active: false,
    permanent: !item.duration,
    expiresAt: null,
  };
  inventory.push(newItem);
  await upsertMember(groupJid, senderJid, { inventory });

  await sock.sendMessage(remoteJid, {
    text: `✅ *Compra exitosa*\n\n${item.name}\n💰 Pagaste: *${formatCoins(item.price)}*\n💵 Efectivo restante: *${formatCoins(cash - item.price)}*\n\n${item.duration ? `💡 Usa *!use ${item.id}* para activarlo cuando quieras.` : `✅ Ya está disponible en tu inventario.`}`,
  }, { quoted: msg });
}
