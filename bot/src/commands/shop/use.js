import { getMember, upsertMember, SHOP_ITEMS } from '../../firebase/firebaseClient.js';
import { removeLastWarning } from '../../services/moderationService.js';
import { formatCoins } from '../../utils/helpers.js';

export async function useCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const itemId = args[0]?.toLowerCase();
  if (!itemId) {
    await sock.sendMessage(remoteJid, {
      text: '❌ Uso: *!use [id del artículo]*\nUsa *!inventory* para ver tus artículos.\n\nEjemplos:\n• `!use multiplier2x`\n• `!use multiplier5x`\n• `!use shield`',
    }, { quoted: msg });
    return;
  }

  const member = memberData || await getMember(groupJid, senderJid);
  const inventory = [...(member?.inventory || [])];

  // Check if trying to activate a multiplier
  const isMultiplier = itemId.startsWith('multiplier');

  if (isMultiplier) {
    // Deactivate any currently active multiplier first
    const activeMultiplierIndex = inventory.findIndex((i) =>
      i.itemId?.startsWith('multiplier') && i.active
    );

    if (activeMultiplierIndex !== -1) {
      inventory[activeMultiplierIndex].active = false;
      inventory[activeMultiplierIndex].expiresAt = null;
    }
  }

  const itemIndex = inventory.findIndex((i) => i.itemId === itemId && !i.active && !i.permanent);

  // For permanent items, check if they exist
  const permanentItem = inventory.find((i) => i.itemId === itemId && i.permanent);

  if (itemIndex === -1 && !permanentItem) {
    await sock.sendMessage(remoteJid, {
      text: `❌ No tienes *${itemId}* en tu inventario o ya está activo.\nUsa *!inventory* para ver tus artículos.`,
    }, { quoted: msg });
    return;
  }

  const shopItem = SHOP_ITEMS[itemId];

  // Special case: eraser (borrador) — immediately removes a warning
  if (itemId === 'eraser') {
    const remaining = await removeLastWarning(groupJid, senderJid);
    // Remove item from inventory
    const eraserIndex = inventory.findIndex((i) => i.itemId === 'eraser');
    if (eraserIndex > -1) inventory.splice(eraserIndex, 1);
    await upsertMember(groupJid, senderJid, { inventory });
    await sock.sendMessage(remoteJid, {
      text: `🧹 *Borrador de Advertencias usado*\nEliminaste una advertencia. Advertencias restantes: *${remaining}/3*`,
    }, { quoted: msg });
    return;
  }

  // For timed items (shield, multiplier)
  if (shopItem?.duration) {
    const expiresAt = Date.now() + shopItem.duration;
    inventory[itemIndex] = { ...inventory[itemIndex], active: true, expiresAt };
    await upsertMember(groupJid, senderJid, { inventory });

    const hrs = shopItem.duration / (1000 * 60 * 60);

    // Special message for multipliers
    if (shopItem.multiplier) {
      await sock.sendMessage(remoteJid, {
        text: `✅ *${shopItem.name} activado*\n\n💰 Tus ganancias de !work se multiplicarán por *${shopItem.multiplier}x*\n⏰ Duración: *${hrs}h*\n\n_Si tienes otros multiplicadores, este reemplazó al anterior._`,
      }, { quoted: msg });
    } else {
      await sock.sendMessage(remoteJid, {
        text: `✅ *${shopItem.name} activado*\nDuración: *${hrs}h*\nExpira en ${hrs} horas.`,
      }, { quoted: msg });
    }
    return;
  }

  // For permanent/already-available items like vv, lock, unlock, insta
  await sock.sendMessage(remoteJid, {
    text: `✅ *${shopItem?.name || itemId}* está disponible en tu inventario y listo para usar.`,
  }, { quoted: msg });
}
