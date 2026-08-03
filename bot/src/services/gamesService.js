import { addGameResult } from '../firebase/firebaseClient.js';
import { randomInt } from '../utils/helpers.js';

// ─── Slot Machine ─────────────────────────────────────────────────────────────
const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];

export function spinSlot() {
  const r1 = SLOT_SYMBOLS[randomInt(0, SLOT_SYMBOLS.length - 1)];
  const r2 = SLOT_SYMBOLS[randomInt(0, SLOT_SYMBOLS.length - 1)];
  const r3 = SLOT_SYMBOLS[randomInt(0, SLOT_SYMBOLS.length - 1)];
  const isWin = r1 === r2 && r2 === r3;
  return { r1, r2, r3, isWin };
}

// ─── Football Studio ─────────────────────────────────────────────────────────
const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function drawCard() {
  const suit = CARD_SUITS[randomInt(0, 3)];
  const value = CARD_VALUES[randomInt(0, 12)];
  const numericValue = CARD_VALUES.indexOf(value) + 1; // A=1, 2=2,..., K=13
  return { suit, value, numericValue, display: `${value}${suit}` };
}

export function playFStudio(bet) {
  const homeCard = drawCard();
  const awayCard = drawCard();
  let result;
  if (homeCard.numericValue > awayCard.numericValue) result = 'home';
  else if (awayCard.numericValue > homeCard.numericValue) result = 'away';
  else result = 'ties';

  return { homeCard, awayCard, result };
}

// ─── Roulette ─────────────────────────────────────────────────────────────────
const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, i) => i); // 0-36
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK_NUMBERS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

export function spinRoulette() {
  const number = randomInt(0, 36);
  const color = number === 0 ? 'verde' : RED_NUMBERS.includes(number) ? 'rojo' : 'negro';
  const isEven = number !== 0 && number % 2 === 0;
  const dozen = number === 0 ? null : number <= 12 ? 1 : number <= 24 ? 2 : 3;
  const column = number === 0 ? null : ((number - 1) % 3) + 1;
  return { number, color, isEven, dozen, column };
}

export function resolveRouletteBet(betType, betValue, result) {
  const { number, color, isEven, dozen, column } = result;
  switch (betType) {
    case 'numero':
    case 'number':
      if (parseInt(betValue) === number) return { win: true, multiplier: 36 };
      break;
    case 'color':
      if (betValue === color) return { win: true, multiplier: 2 };
      break;
    case 'par':
    case 'even':
      if (isEven) return { win: true, multiplier: 2 };
      break;
    case 'impar':
    case 'odd':
      if (!isEven && number !== 0) return { win: true, multiplier: 2 };
      break;
    case 'docena':
    case 'dozen':
      if (parseInt(betValue) === dozen) return { win: true, multiplier: 3 };
      break;
    case 'columna':
    case 'column':
      if (parseInt(betValue) === column) return { win: true, multiplier: 3 };
      break;
    case 'mitad':
    case 'half':
      if (betValue === 'baja' || betValue === 'low') {
        if (number >= 1 && number <= 18) return { win: true, multiplier: 2 };
      } else {
        if (number >= 19 && number <= 36) return { win: true, multiplier: 2 };
      }
      break;
  }
  return { win: false, multiplier: 0 };
}

// ─── Coin Flip ────────────────────────────────────────────────────────────────
export function flipCoin() {
  return Math.random() < 0.5 ? 'cara' : 'sello';
}

// ─── Dice ─────────────────────────────────────────────────────────────────────
export function rollDice() {
  return randomInt(1, 6);
}

// ─── Rock Paper Scissors ──────────────────────────────────────────────────────
const PPT_OPTIONS = ['piedra', 'papel', 'tijera'];
const PPT_WIN_MAP = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };

export function playPPT(playerChoice) {
  const botChoice = PPT_OPTIONS[randomInt(0, 2)];
  let outcome;
  if (playerChoice === botChoice) outcome = 'empate';
  else if (PPT_WIN_MAP[playerChoice] === botChoice) outcome = 'win';
  else outcome = 'lose';
  return { botChoice, outcome };
}
