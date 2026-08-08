import { getMember, upsertMember, updateMember, FieldValue } from '../firebase/firebaseClient.js';
import { randomInt } from '../utils/helpers.js';

/**
 * Deduct coins from a member's cash. If insufficient, records a debt.
 * Returns { success, deducted, debt }
 */
export async function deductCash(groupJid, memberJid, amount) {
  const member = await getMember(groupJid, memberJid);
  if (!member) return { success: false, deducted: 0, debt: 0 };

  const cash = member.cash || 0;
  const amt = Math.round(amount);
  if (cash >= amt) {
    await upsertMember(groupJid, memberJid, { cash: Math.round(cash - amt) });
    return { success: true, deducted: amt, debt: 0 };
  } else {
    const debt = Math.round(amt - cash);
    const existingDebt = (member.loans || []).find((l) => l.type === 'fine');
    const loans = [...(member.loans || [])];
    if (existingDebt) {
      existingDebt.amount = Math.round(existingDebt.amount + debt);
    } else {
      loans.push({ type: 'fine', amount: debt, createdAt: new Date().toISOString() });
    }
    await upsertMember(groupJid, memberJid, { cash: 0, loans });
    return { success: true, deducted: cash, debt };
  }
}

/**
 * Credit coins to a member's cash, applying any pending debts first.
 */
export async function creditCash(groupJid, memberJid, amount) {
  const member = await getMember(groupJid, memberJid);
  if (!member) return { credited: 0, debtPaid: 0 };

  let remaining = Math.round(amount);
  let debtPaid = 0;
  const loans = [...(member.loans || [])];

  for (let i = loans.length - 1; i >= 0; i--) {
    const loan = loans[i];
    if (!loan.amount || loan.amount <= 0) continue;
    if (loan.type === 'fine' || loan.type === 'loan') {
      if (remaining >= loan.amount) {
        remaining -= loan.amount;
        debtPaid += loan.amount;
        loans.splice(i, 1);
      } else {
        loan.amount = Math.round(loan.amount - remaining);
        debtPaid += remaining;
        remaining = 0;
        break;
      }
    }
  }

  const currentCash = member.cash || 0;
  await upsertMember(groupJid, memberJid, {
    cash: Math.round(currentCash + remaining),
    loans,
  });

  return { credited: remaining, debtPaid };
}

/**
 * Transfer cash between two members in the same group.
 */
export async function transferCash(groupJid, fromJid, toJid, amount) {
  const from = await getMember(groupJid, fromJid);
  if (!from) return { success: false, reason: 'Remitente no encontrado.' };
  const amt = Math.round(amount);

  const cash = from.cash || 0;
  const bank = from.bank || 0;
  const total = cash + bank;

  if (total < amt) {
    return { success: false, reason: `Saldo insuficiente. Tienes ${formatCoins(cash)} en efectivo + ${formatCoins(bank)} en banco = ${formatCoins(total)} total.` };
  }

  // Deducir: primero de efectivo, luego del banco
  let fromCash = 0;
  let fromBank = 0;

  if (cash >= amt) {
    fromCash = amt;
  } else {
    fromCash = cash;
    fromBank = amt - cash;
  }

  await upsertMember(groupJid, fromJid, {
    cash: Math.round(cash - fromCash),
    bank: Math.round(bank - fromBank),
  });

  // Depositar directamente al banco del destinatario
  const to = await getMember(groupJid, toJid);
  await upsertMember(groupJid, toJid, {
    bank: Math.round((to?.bank || 0) + amt),
  });

  return { success: true, fromCash, fromBank };
}

/**
 * Grant a loan to a member.
 */
export async function grantLoan(groupJid, memberJid, principal) {
  const member = await getMember(groupJid, memberJid);
  if (!member) return { success: false, reason: 'Usuario no encontrado.' };

  const interest = 0.2; // 20%
  const totalOwed = Math.floor(principal * (1 + interest));
  const dueAt = Date.now() + 24 * 60 * 60 * 1000;

  const loans = [...(member.loans || []), {
    type: 'loan',
    principal,
    amount: totalOwed,
    createdAt: new Date().toISOString(),
    dueAt,
    status: 'active',
  }];

  const newCash = Math.round((member.cash || 0) + principal);
  await upsertMember(groupJid, memberJid, { cash: newCash, loans });
  return { success: true, principal, totalOwed, dueAt };
}

/**
 * Check if a member has an active loan.
 */
export function hasActiveLoan(member) {
  return (member?.loans || []).some((l) => l.type === 'loan' && l.status === 'active');
}

/**
 * Check if a member is in Infocorp (overdue loan).
 */
export function isInInfocorp(member) {
  return (member?.loans || []).some(
    (l) => l.type === 'loan' && (l.status === 'overdue' || l.status === 'infocorp')
  );
}

/**
 * Check if member was recently cleared from Infocorp (within 72h).
 */
export function isRecentlyCleared(member) {
  const cleared = (member?.loans || []).find(
    (l) => l.type === 'loan' && l.status === 'cleared'
  );
  if (!cleared) return false;
  const clearedAt = new Date(cleared.clearedAt).getTime();
  return Date.now() - clearedAt < 72 * 60 * 60 * 1000;
}

/**
 * Check inventory for active item.
 */
export function getActiveItem(member, itemId) {
  return (member?.inventory || []).find(
    (item) => item.itemId === itemId && (item.active || item.permanent) && (!item.expiresAt || item.expiresAt > Date.now())
  );
}

/**
 * Update the work cooldown for a member.
 * Cooldown is random between 5-10 minutes.
 */
export async function setWorkCooldown(groupJid, memberJid) {
  const cooldownMs = randomInt(5, 10) * 60 * 1000;
  const nextWorkAt = Date.now() + cooldownMs;
  await upsertMember(groupJid, memberJid, { 'cooldowns.work': nextWorkAt });
  return cooldownMs;
}

/**
 * Establece un cooldown para un comando específico.
 * Usa update() en lugar de set+merge para que el dot notation funcione correctamente.
 * @param {string} groupJid
 * @param {string} memberJid
 * @param {string} key - Nombre del cooldown (ej: 'work', 'crime', 'rob')
 * @param {number} ms - Duración del cooldown en milisegundos
 */
export async function setCooldown(groupJid, memberJid, key, ms) {
  const expiresAt = Date.now() + ms;
  await updateMember(groupJid, memberJid, { [`cooldowns.${key}`]: expiresAt });
}

/**
 * Deduct coins from cash first, then from bank if needed.
 * If insufficient in both, returns { success: false }.
 * Returns { success, fromCash, fromBank, total }
 */
export async function deductCashOrBank(groupJid, memberJid, amount) {
  const member = await getMember(groupJid, memberJid);
  if (!member) return { success: false, fromCash: 0, fromBank: 0, total: 0 };

  const cash = member.cash || 0;
  const bank = member.bank || 0;
  const amt = Math.round(amount);

  // Check if user has enough in cash + bank
  if (cash + bank < amt) {
    return { success: false, fromCash: 0, fromBank: 0, total: 0 };
  }

  let fromCash = 0;
  let fromBank = 0;

  // Deduct from cash first
  if (cash >= amt) {
    fromCash = amt;
    await upsertMember(groupJid, memberJid, { cash: Math.round(cash - amt) });
  } else {
    // Take all from cash, rest from bank
    fromCash = cash;
    fromBank = amt - cash;
    await upsertMember(groupJid, memberJid, {
      cash: 0,
      bank: Math.round(bank - fromBank),
    });
  }

  return { success: true, fromCash, fromBank, total: amt };
}
