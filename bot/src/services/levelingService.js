import { upsertMember, getMember } from '../firebase/firebaseClient.js';

const MAX_LEVEL = 100;

// XP needed per level: level * 50 messages
function xpRequiredForLevel(level) {
  return level * 50;
}

export async function recalculateLevel(groupJid, memberJid, memberData) {
  const currentLevel = memberData.level || 1;
  if (currentLevel >= MAX_LEVEL) return;

  const messageCount = memberData.messageCount || 0;
  let totalXpUsed = 0;
  for (let lvl = 1; lvl < currentLevel; lvl++) {
    totalXpUsed += xpRequiredForLevel(lvl);
  }

  const xpForNext = xpRequiredForLevel(currentLevel);
  const xpInCurrentLevel = messageCount - totalXpUsed;

  if (xpInCurrentLevel >= xpForNext) {
    const newLevel = Math.min(currentLevel + 1, MAX_LEVEL);
    await upsertMember(groupJid, memberJid, {
      level: newLevel,
      xp: xpInCurrentLevel - xpForNext,
    });
  } else {
    await upsertMember(groupJid, memberJid, {
      xp: Math.max(0, xpInCurrentLevel),
    });
  }
}

export function getLevelProgress(memberData) {
  const level = memberData.level || 1;
  const messageCount = memberData.messageCount || 0;
  const xpForNext = xpRequiredForLevel(level);

  let totalXpUsed = 0;
  for (let lvl = 1; lvl < level; lvl++) {
    totalXpUsed += xpRequiredForLevel(lvl);
  }

  const xpInCurrentLevel = messageCount - totalXpUsed;
  const progress = Math.min(xpInCurrentLevel, xpForNext);
  return { level, progress, required: xpForNext, isMax: level >= MAX_LEVEL };
}
