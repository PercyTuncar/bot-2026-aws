// Command registry — all commands are registered here.
// Each command defines: name, aliases, category, permission, cooldown, shopRequired, handler.

import { pingCommand } from '../commands/utility/ping.js';
import { groupsCommand } from '../commands/utility/groups.js';
import { stickerCommand } from '../commands/utility/sticker.js';
import { meCommand } from '../commands/utility/me.js';
import { idCommand } from '../commands/utility/id.js';
import { helpCommand } from '../commands/utility/help.js';
import { instaCommand } from '../commands/utility/insta.js';
import { vvCommand } from '../commands/utility/vv.js';
import { warnCommand } from '../commands/moderation/warn.js';
import { unwarnCommand } from '../commands/moderation/unwarn.js';
import { warnlistCommand } from '../commands/moderation/warnlist.js';
import { kickCommand } from '../commands/moderation/kick.js';
import { antilinkCommand } from '../commands/moderation/antilink.js';
import { antiwordsCommand } from '../commands/moderation/antiwords.js';
import { welcomeCommand } from '../commands/moderation/welcome.js';
import { lockCommand } from '../commands/moderation/lock.js';
import { unlockCommand } from '../commands/moderation/unlock.js';
import { groupidCommand } from '../commands/moderation/groupid.js';
import { tagallCommand } from '../commands/moderation/tagall.js';
import { tagnoadminCommand } from '../commands/moderation/tagnoadmin.js';
import { botCommand } from '../commands/moderation/bot.js';
import { workCommand } from '../commands/economy/work.js';
import { balanceCommand } from '../commands/economy/balance.js';
import { bankCommand } from '../commands/economy/bank.js';
import { depositCommand } from '../commands/economy/deposit.js';
import { withdrawCommand } from '../commands/economy/withdraw.js';
import { transferCommand } from '../commands/economy/transfer.js';
import { robCommand } from '../commands/economy/rob.js';
import { crimeCommand } from '../commands/economy/crime.js';
import { loanCommand } from '../commands/economy/loan.js';
import { infocorpCommand } from '../commands/economy/infocorp.js';
import { topCommand } from '../commands/economy/top.js';
import { topdebtCommand } from '../commands/economy/topdebt.js';
import { shopCommand } from '../commands/shop/shop.js';
import { buyCommand } from '../commands/shop/buy.js';
import { inventoryCommand } from '../commands/shop/inventory.js';
import { useCommand } from '../commands/shop/use.js';
import { slotCommand } from '../commands/games/slot.js';
import { fstudioCommand } from '../commands/games/fstudio.js';
import { rouletteCommand } from '../commands/games/roulette.js';
import { coinflipCommand } from '../commands/games/coinflip.js';
import { dadoCommand } from '../commands/games/dado.js';
import { pptCommand } from '../commands/games/ppt.js';
import { statsCommand } from '../commands/games/stats.js';
import { alertsCommand } from '../commands/moderation/alerts.js';
import { shipCommand } from '../commands/social/ship.js';
import { maricometroCommand } from '../commands/social/maricometro.js';

/**
 * Permission levels:
 * 'all'     - any member of an active group
 * 'bought'  - must have purchased this item in the group shop
 * 'admin'   - must be group admin (or owner)
 * 'owner'   - only the bot owner
 */

const commands = [
  // ─── Utility ────────────────────────────────────────────────────────────────
  { name: 'ping', aliases: [], category: 'utility', permission: 'all', handler: pingCommand },
  { name: 'groups', aliases: [], category: 'utility', permission: 'owner', handler: groupsCommand },
  { name: 'sticker', aliases: ['s'], category: 'utility', permission: 'all', handler: stickerCommand },
  { name: 'me', aliases: [], category: 'utility', permission: 'all', handler: meCommand },
  { name: 'id', aliases: [], category: 'utility', permission: 'all', handler: idCommand },
  { name: 'help', aliases: ['ayuda', 'comandos'], category: 'utility', permission: 'all', handler: helpCommand },
  { name: 'insta', aliases: [], category: 'utility', permission: 'bought', shopItemId: 'insta', handler: instaCommand },
  { name: 'vv', aliases: [], category: 'utility', permission: 'bought', shopItemId: 'vv', handler: vvCommand },

  // ─── Moderation ─────────────────────────────────────────────────────────────
  { name: 'warn', aliases: [], category: 'moderation', permission: 'admin', handler: warnCommand },
  { name: 'unwarn', aliases: [], category: 'moderation', permission: 'admin', handler: unwarnCommand },
  { name: 'warnlist', aliases: [], category: 'moderation', permission: 'all', handler: warnlistCommand },
  { name: 'kick', aliases: [], category: 'moderation', permission: 'admin', handler: kickCommand },
  { name: 'antilink', aliases: [], category: 'moderation', permission: 'admin', handler: antilinkCommand },
  { name: 'antiwords', aliases: [], category: 'moderation', permission: 'admin', handler: antiwordsCommand },
  { name: 'welcome', aliases: [], category: 'moderation', permission: 'admin', handler: welcomeCommand },
  { name: 'lock', aliases: [], category: 'moderation', permission: 'bought', shopItemId: 'lock', handler: lockCommand },
  { name: 'unlock', aliases: [], category: 'moderation', permission: 'bought', shopItemId: 'unlock', handler: unlockCommand },
  { name: 'groupid', aliases: ['idgrupo'], category: 'moderation', permission: 'admin', handler: groupidCommand },
  { name: 'tagall', aliases: [], category: 'moderation', permission: 'admin', handler: tagallCommand },
  { name: 'tagnoadmin', aliases: [], category: 'moderation', permission: 'admin', handler: tagnoadminCommand },
  { name: 'bot', aliases: [], category: 'moderation', permission: 'owner', handler: botCommand },
  { name: 'alerts', aliases: [], category: 'moderation', permission: 'admin', handler: alertsCommand },

  // ─── Economy ─────────────────────────────────────────────────────────────────
  { name: 'work', aliases: [], category: 'economy', permission: 'all', handler: workCommand },
  { name: 'balance', aliases: ['wallet', 'bal'], category: 'economy', permission: 'all', handler: balanceCommand },
  { name: 'bank', aliases: [], category: 'economy', permission: 'all', handler: bankCommand },
  { name: 'deposit', aliases: ['dep'], category: 'economy', permission: 'all', handler: depositCommand },
  { name: 'withdraw', aliases: ['with', 'retirar'], category: 'economy', permission: 'all', handler: withdrawCommand },
  { name: 'transfer', aliases: ['yapear', 'yape'], category: 'economy', permission: 'all', handler: transferCommand },
  { name: 'rob', aliases: ['robar'], category: 'economy', permission: 'all', handler: robCommand },
  { name: 'crime', aliases: ['crimen'], category: 'economy', permission: 'all', handler: crimeCommand },
  { name: 'loan', aliases: ['prestamo', 'préstamo'], category: 'economy', permission: 'all', handler: loanCommand },
  { name: 'infocorp', aliases: [], category: 'economy', permission: 'all', handler: infocorpCommand },
  { name: 'top', aliases: ['ranking'], category: 'economy', permission: 'all', handler: topCommand },
  { name: 'topdebt', aliases: ['topdeuda', 'deudores'], category: 'economy', permission: 'all', handler: topdebtCommand },

  // ─── Shop ────────────────────────────────────────────────────────────────────
  { name: 'shop', aliases: ['tienda'], category: 'shop', permission: 'all', handler: shopCommand },
  { name: 'buy', aliases: ['comprar'], category: 'shop', permission: 'all', handler: buyCommand },
  { name: 'inventory', aliases: ['inventario', 'inv'], category: 'shop', permission: 'all', handler: inventoryCommand },
  { name: 'use', aliases: ['usar'], category: 'shop', permission: 'all', handler: useCommand },

  // ─── Games ───────────────────────────────────────────────────────────────────
  { name: 'slot', aliases: [], category: 'games', permission: 'all', handler: slotCommand },
  { name: 'fstudio', aliases: ['fstudio2'], category: 'games', permission: 'all', handler: fstudioCommand },
  { name: 'roulette', aliases: ['ruleta'], category: 'games', permission: 'all', handler: rouletteCommand },
  { name: 'coinflip', aliases: ['moneda'], category: 'games', permission: 'all', handler: coinflipCommand },
  { name: 'dado', aliases: ['dice'], category: 'games', permission: 'all', handler: dadoCommand },
  { name: 'ppt', aliases: ['rps'], category: 'games', permission: 'all', handler: pptCommand },
  { name: 'stats', aliases: ['estadisticas'], category: 'games', permission: 'all', handler: statsCommand },

  // ─── Social ─────────────────────────────────────────────────────────────────
  { name: 'ship', aliases: [], category: 'social', permission: 'all', handler: shipCommand },
  { name: 'maricometro', aliases: ['mariposometro'], category: 'social', permission: 'all', handler: maricometroCommand },
];

// Build lookup map (name + all aliases)
const commandMap = new Map();
for (const cmd of commands) {
  commandMap.set(cmd.name, cmd);
  for (const alias of cmd.aliases) {
    commandMap.set(alias, cmd);
  }
}

export function getCommand(name) {
  return commandMap.get(name?.toLowerCase()) || null;
}

export function getAllCommands() {
  return commands;
}
