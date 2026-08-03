import { enqueueMessage } from '../../queue/sendQueue.js';
import { getMember } from '../../firebase/firebaseClient.js';
import { getAllCommands } from '../../registry/commandRegistry.js';

/**
 * !help — Muestra comandos disponibles según el rol del usuario
 */
export async function helpCommand(sock, msg, context) {
  const { senderJid, groupJid, isAdmin, isOwner, isGroup } = context;
  const remoteJid = msg.key.remoteJid;

  if (!isGroup) {
    await enqueueMessage(remoteJid, {
      text: '❌ Este comando solo funciona en grupos.',
    }, { quoted: msg }, 1);
    return;
  }

  // Obtener datos del usuario para verificar comandos comprados
  const member = await getMember(groupJid, senderJid);
  const purchasedItems = (member?.inventory || []).map(item => item.itemId);

  // Obtener todos los comandos registrados
  const allCommands = getAllCommands();

  // Categorizar comandos
  const categories = {
    utility: { name: '🔧 Utilidad', commands: [] },
    economy: { name: '💰 Economía', commands: [] },
    games: { name: '🎮 Juegos', commands: [] },
    shop: { name: '🛒 Tienda', commands: [] },
    moderation: { name: '🛡️ Moderación', commands: [] },
  };

  // Clasificar comandos según permisos
  allCommands.forEach(cmd => {
    const category = categories[cmd.category];
    if (!category) return;

    let accessible = false;
    let locked = false;

    // Verificar permisos
    if (cmd.permission === 'all') {
      accessible = true;
    } else if (cmd.permission === 'admin' && isAdmin) {
      accessible = true;
    } else if (cmd.permission === 'owner' && isOwner) {
      accessible = true;
    } else if (cmd.permission === 'bought') {
      // Verificar si el usuario compró el item
      if (cmd.shopItemId && purchasedItems.includes(cmd.shopItemId)) {
        accessible = true;
      } else {
        locked = true; // Comando premium bloqueado
      }
    }

    // Solo agregar si es accesible O si está bloqueado (para mostrarlo como premium)
    if (accessible || locked) {
      category.commands.push({
        name: cmd.name,
        aliases: cmd.aliases || [],
        accessible,
        locked,
        shopItemId: cmd.shopItemId,
      });
    }
  });

  // Construir mensaje
  let text = `📚 *Comandos Disponibles*\n\n`;

  // Agregar rol del usuario
  if (isOwner) {
    text += `👑 *Tu rol:* Propietario\n\n`;
  } else if (isAdmin) {
    text += `🛡️ *Tu rol:* Administrador\n\n`;
  } else {
    text += `👤 *Tu rol:* Miembro\n\n`;
  }

  // Agregar comandos por categoría
  Object.values(categories).forEach(category => {
    if (category.commands.length === 0) return;

    text += `${category.name}\n`;

    category.commands.forEach(cmd => {
      const aliases = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';

      if (cmd.locked) {
        // Comando premium bloqueado
        text += `  🔒 !${cmd.name}${aliases} — _Premium_\n`;
      } else {
        // Comando accesible
        text += `  ✅ !${cmd.name}${aliases}\n`;
      }
    });

    text += `\n`;
  });

  // Agregar nota sobre comandos premium
  const hasLockedCommands = Object.values(categories).some(cat =>
    cat.commands.some(cmd => cmd.locked)
  );

  if (hasLockedCommands) {
    text += `💡 _Los comandos 🔒 son premium._\n`;
    text += `_Cómpralos con: !shop_\n\n`;
  }

  // Agregar footer
  text += `📖 Usa *!comando* para ejecutarlo\n`;
  text += `🆔 Usa *!id* para actualizar tu perfil web`;

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
