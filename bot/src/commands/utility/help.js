import { enqueueMessage } from '../../queue/sendQueue.js';
import { getMember } from '../../firebase/firebaseClient.js';
import { getAllCommands, getCommand } from '../../registry/commandRegistry.js';
import { commandHelp } from '../../registry/commandHelp.js';

/**
 * !help — Muestra comandos disponibles o ayuda detallada de un comando específico
 */
export async function helpCommand(sock, msg, context) {
  const { args, senderJid, groupJid, isAdmin, isOwner, isGroup } = context;
  const remoteJid = msg.key.remoteJid;

  if (!isGroup) {
    await enqueueMessage(remoteJid, {
      text: '❌ Este comando solo funciona en grupos.',
    }, { quoted: msg }, 1);
    return;
  }

  // Si se especificó un comando, mostrar ayuda detallada
  if (args.length > 0) {
    const commandName = args[0].toLowerCase().replace('!', '');
    const cmd = getCommand(commandName);

    if (!cmd) {
      await enqueueMessage(remoteJid, {
        text: `❌ El comando *!${commandName}* no existe.\n\nUsa *!help* para ver todos los comandos disponibles.`,
      }, { quoted: msg }, 1);
      return;
    }

    // Verificar si el usuario tiene acceso al comando
    const member = await getMember(groupJid, senderJid);
    const purchasedItems = (member?.inventory || []).map(item => item.itemId);

    let hasAccess = false;
    if (cmd.permission === 'all') {
      hasAccess = true;
    } else if (cmd.permission === 'admin' && isAdmin) {
      hasAccess = true;
    } else if (cmd.permission === 'owner' && isOwner) {
      hasAccess = true;
    } else if (cmd.permission === 'bought' && cmd.shopItemId && purchasedItems.includes(cmd.shopItemId)) {
      hasAccess = true;
    }

    // Mostrar ayuda detallada del comando
    await showCommandHelp(sock, msg, cmd, hasAccess);
    return;
  }

  // Mostrar lista general de comandos
  await showGeneralHelp(sock, msg, context);
}

async function showCommandHelp(sock, msg, cmd, hasAccess) {
  const remoteJid = msg.key.remoteJid;

  // Obtener metadata de ayuda
  const helpData = commandHelp[cmd.name] || {};

  let text = `📖 *Ayuda: !${cmd.name}*\n\n`;

  // Descripción
  text += `${helpData.description || 'Sin descripción disponible.'}\n\n`;

  // Aliases
  if (cmd.aliases && cmd.aliases.length > 0) {
    text += `*Aliases:* ${cmd.aliases.map(a => `!${a}`).join(', ')}\n\n`;
  }

  // Categoría
  const categoryEmojis = {
    utility: '🔧',
    economy: '💰',
    games: '🎮',
    shop: '🛒',
    moderation: '🛡️',
  };
  const emoji = categoryEmojis[cmd.category] || '📌';
  text += `*Categoría:* ${emoji} ${cmd.category.charAt(0).toUpperCase() + cmd.category.slice(1)}\n\n`;

  // Uso
  if (helpData.usage) {
    text += `*Uso:*\n${helpData.usage}\n\n`;
  }

  // Ejemplos
  if (helpData.examples && helpData.examples.length > 0) {
    text += `*Ejemplos:*\n`;
    helpData.examples.forEach(example => {
      text += `  • ${example}\n`;
    });
    text += `\n`;
  }

  // Cooldown
  if (cmd.cooldown) {
    text += `⏱️ *Cooldown:* Este comando tiene tiempo de espera entre usos.\n\n`;
  }

  // Acceso
  if (!hasAccess) {
    if (cmd.permission === 'bought') {
      text += `🔒 *Este comando es premium.*\n`;
      text += `Cómpralo con: *!shop*\n`;
    } else if (cmd.permission === 'admin') {
      text += `🛡️ *Requiere permisos de administrador.*\n`;
    } else if (cmd.permission === 'owner') {
      text += `👑 *Solo para el propietario del bot.*\n`;
    }
  } else {
    text += `✅ *Tienes acceso a este comando.*\n`;
  }

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}

async function showGeneralHelp(sock, msg, context) {
  const { senderJid, groupJid, isAdmin, isOwner } = context;
  const remoteJid = msg.key.remoteJid;

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
  text += `📖 Usa *!help [comando]* para ver detalles\n`;
  text += `🆔 Usa *!id* para actualizar tu perfil web`;

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
