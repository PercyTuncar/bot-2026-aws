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

  // Mensaje personalizado para bodyguard
  let successMessage = `✅ *Compra exitosa*\n\n${item.name}\n💰 Pagaste: *${formatCoins(item.price)}*\n💵 Efectivo restante: *${formatCoins(cash - item.price)}*`;

  if (item.id === 'bodyguard') {
    const bodyguardPurchaseMessages = [
      `\n\n💂 ¡Contrataste a un wachiman profesional! Ahora tienes protección 24/7.`,
      `\n\n💂 ¡Un wachiman veterano se unió a tu equipo! Nadie se te acercará.`,
      `\n\n💂 ¡Tu nuevo wachiman está listo para protegerte de criminales!`,
      `\n\n💂 ¡Contrataste al mejor wachiman de Ravehub City! Estás a salvo.`,
      `\n\n💂 ¡Tu wachiman personal ya está en su puesto vigilando!`,
    ];
    const randomMsg = bodyguardPurchaseMessages[Math.floor(Math.random() * bodyguardPurchaseMessages.length)];
    successMessage += randomMsg;
    successMessage += `\n💡 Usa *!use ${item.id}* para activarlo cuando quieras.`;
  } else {
    successMessage += `\n\n${item.duration ? `💡 Usa *!use ${item.id}* para activarlo cuando quieras.` : `✅ Ya está disponible en tu inventario.`}`;
  }

  await sock.sendMessage(remoteJid, {
    text: successMessage,
  }, { quoted: msg });
}
