# 🔍 ANÁLISIS COMPLETO: Sistema de Deudas y Pagos

## 📊 ESTADO ACTUAL DEL SISTEMA

### ✅ Funciones que SÍ cobran deuda automáticamente

**Comandos que usan `creditCash()`:**
1. ✅ `!work` - Paga deuda automáticamente
2. ✅ `!crime` - Paga deuda automáticamente  
3. ✅ `!rob` - Paga deuda automáticamente
4. ✅ `!coinflip` - Paga deuda automáticamente (juegos)
5. ✅ `!dado` - Paga deuda automáticamente
6. ✅ `!fstudio` - Paga deuda automáticamente
7. ✅ `!ppt` - Paga deuda automáticamente
8. ✅ `!roulette` - Paga deuda automáticamente
9. ✅ `!slot` - Paga deuda automáticamente

**Todos estos comandos llaman a `creditCash()` que:**
```javascript
// economyService.js líneas 35-66
export async function creditCash(groupJid, memberJid, amount) {
  const member = await getMember(groupJid, memberJid);
  if (!member) return { credited: 0, debtPaid: 0 };

  let remaining = Math.round(amount);
  let debtPaid = 0;
  const loans = [...(member.loans || [])];

  // Pagar deudas primero (multas y préstamos)
  for (let i = loans.length - 1; i >= 0; i--) {
    if (remaining <= 0) break;
    const loan = loans[i];
    if (loan.amount > 0) {
      if (loan.amount <= remaining) {
        debtPaid += loan.amount;
        remaining -= loan.amount;
        loans.splice(i, 1);  // Eliminar deuda completamente pagada
      } else {
        loan.amount = Math.round(loan.amount - remaining);
        debtPaid += remaining;
        remaining = 0;
        break;
      }
    }
  }

  // Lo que sobra va al efectivo
  const currentCash = member.cash || 0;
  await upsertMember(groupJid, memberJid, {
    cash: Math.round(currentCash + remaining),
    loans,
  });

  return { credited: remaining, debtPaid };
}
```

---

### ❌ PROBLEMA CRÍTICO: Comandos que NO cobran deuda

**1. `!withdraw` (Retirar del banco)**
```javascript
// withdraw.js línea 37
await upsertMember(groupJid, senderJid, { 
  cash: Math.round(cash + amount), 
  bank: Math.round(bank - amount) 
});
```

❌ **Problema:** Retira directo del banco a efectivo SIN pasar por `creditCash()`
❌ **Consecuencia:** Usuario con deuda puede guardar dinero en el banco y retirarlo sin pagar

**2. `!deposit` (Depositar al banco)**
```javascript
// deposit.js línea 37
await upsertMember(groupJid, senderJid, { 
  cash: Math.round(cash - amount), 
  bank: Math.round(bank + amount) 
});
```

✅ **Este está bien** - Solo mueve efectivo al banco, no genera dinero nuevo

---

## 🐛 VULNERABILIDAD DETECTADA

### Escenario de Abuso:

1. Usuario tiene deuda de $500 RC
2. Trabaja y gana $100 RC → Paga $100 de deuda ✅ (efectivo: $0)
3. Roba $200 RC → Paga $200 de deuda ✅ (efectivo: $0, deuda: $200)
4. Gana $500 en casino → Paga $200 de deuda ✅ (efectivo: $300, deuda: $0)
5. **Deposita $300 al banco** → (efectivo: $0, banco: $300) ✅
6. Comete crimen, falla, multa $50 → (deuda: $50, efectivo: $0)
7. **Retira $300 del banco** → ❌ **BYPASS: dinero va directo a efectivo SIN pagar deuda**
   - Resultado: efectivo: $300, deuda: $50 ❌❌❌

**El usuario puede acumular dinero en el banco y retirarlo sin pagar deudas.**

---

## ✅ SOLUCIÓN PROPUESTA

### Opción 1: `withdraw` debe usar `creditCash()` (RECOMENDADA)

```javascript
// withdraw.js
export async function withdrawCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const member = memberData || await getMember(groupJid, senderJid);
  const cash = member?.cash || 0;
  const bank = member?.bank || 0;
  const input = args[0]?.toLowerCase();

  if (!input) {
    await enqueueMessage(remoteJid, { text: '❌ Uso: *!withdraw [monto]* o *!withdraw all*' }, { quoted: msg }, 1);
    return;
  }

  const amount = (input === 'all' || input === 'todo') ? bank : parseInt(input, 10);

  if (isNaN(amount) || amount <= 0) {
    await enqueueMessage(remoteJid, { text: '❌ Uso: *!withdraw [monto]* o *!withdraw all*' }, { quoted: msg }, 1);
    return;
  }

  if (amount > bank) {
    await enqueueMessage(remoteJid, {
      text: `❌ Saldo bancario insuficiente.\n• 🏦 Banco disponible: *${formatCoins(bank)}*`,
    }, { quoted: msg }, 1);
    return;
  }

  // ✅ NUEVA LÓGICA: Primero actualizar banco
  await upsertMember(groupJid, senderJid, { bank: Math.round(bank - amount) });

  // ✅ NUEVA LÓGICA: Luego acreditar el efectivo (paga deudas automáticamente)
  const { credited, debtPaid } = await creditCash(groupJid, senderJid, amount);

  const updated = await getMember(groupJid, senderJid);

  let text = `💵 *Retiro exitoso*\n\n> Retiraste *${formatCoins(amount)}* del banco`;
  if (debtPaid > 0) {
    text += `\n> 💸 Se descontaron *${formatCoins(debtPaid)}* de tu deuda`;
  }
  text += `\n\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`;
  text += `\n• 🏦 Banco: *${formatCoins(updated?.bank || 0)}*`;

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
```

**Ventajas:**
- ✅ Consistente con todos los demás ingresos
- ✅ No permite bypass de deudas
- ✅ Transparente para el usuario (le muestra cuánto se descontó)
- ✅ Lógico: cualquier dinero que llegue a efectivo paga deudas primero

---

## 📋 REGLAS DEL SISTEMA DE DEUDAS

### Regla 1: Todo ingreso paga deudas primero
**Aplicada en:**
- ✅ work, crime, rob
- ✅ Todos los juegos (casino)
- ✅ **NUEVO:** withdraw

### Regla 2: Tipos de deuda
1. **Multas (type: 'fine')** - Por fallar robos/crímenes sin efectivo
2. **Préstamos (type: 'loan')** - Con estados:
   - `active` - En plazo
   - `overdue` - Vencido
   - `infocorp` - En Infocorp
   - `cleared` - Pagado (restri

cción 72h)

### Regla 3: Orden de pago
El scheduler (líneas 123-173 de scheduler.js) convierte préstamos `active` a `overdue` o `infocorp` al vencer.

### Regla 4: El banco es "seguro" SOLO para depositar
- Depositar: Mueve efectivo → banco (sin generar dinero)
- Retirar: **DEBE** pasar por `creditCash()` para pagar deudas

---

## 🎯 COMANDOS A ACTUALIZAR

1. ✅ **withdraw.js** - Usar `creditCash()` al retirar
2. ✅ **Agregar import** `creditCash` a withdraw.js

---

## ✅ TESTING

### Casos de prueba después del fix:

**Test 1: Retiro sin deuda**
```
Estado: efectivo: $0, banco: $100, deuda: $0
Comando: !withdraw all
Resultado esperado: efectivo: $100, banco: $0, deuda: $0 ✅
```

**Test 2: Retiro con deuda menor**
```
Estado: efectivo: $0, banco: $100, deuda: $50
Comando: !withdraw all
Resultado esperado: efectivo: $50, banco: $0, deuda: $0 ✅
Mensaje: "Se descontaron $50 de tu deuda"
```

**Test 3: Retiro con deuda mayor**
```
Estado: efectivo: $0, banco: $50, deuda: $200
Comando: !withdraw all
Resultado esperado: efectivo: $0, banco: $0, deuda: $150 ✅
Mensaje: "Se descontaron $50 de tu deuda"
```

**Test 4: Retiro parcial con deuda**
```
Estado: efectivo: $10, banco: $100, deuda: $30
Comando: !withdraw 50
Resultado esperado: efectivo: $30, banco: $50, deuda: $0 ✅
(pagó $30 de deuda, quedaron $20 en efectivo + $10 previos)
```

---

## 📊 IMPACTO DE LA CORRECCIÓN

### Cambios mínimos:
- ✅ Solo 1 archivo modificado: `withdraw.js`
- ✅ No afecta otros comandos
- ✅ No cambia estructura de datos
- ✅ No rompe funcionalidad existente

### Beneficios:
- ✅ Cierra vulnerabilidad de bypass
- ✅ Sistema consistente en todos los ingresos
- ✅ Usuario ve claramente cuánto se descontó
- ✅ Más justo para la economía del bot

---

**Fecha:** 6 de Agosto, 2026  
**Estado:** LISTO PARA IMPLEMENTAR
