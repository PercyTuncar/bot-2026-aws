import { getMember, upsertMember } from '../../firebase/firebaseClient.js';
import { deductCash, creditCash, setCooldown } from '../../services/economyService.js';
import { formatCoins, randomInt, isCooldownExpired, getCooldownRemaining, cleanJidForDisplay } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos

// Crímenes en Ravehub City (cuando NO se menciona a nadie)
const CITY_CRIMES = [
  { desc: 'Falsificaste billetes en el mercado negro de Ravehub City', success: '¡Nadie sospechó nada en las calles!', fail: 'La policía de Ravehub te atrapó in fraganti' },
  { desc: 'Hackeaste el sistema bancario central de Ravehub City', success: '¡Transferencia exitosa desde las sombras!', fail: 'El cibercrimen de Ravehub rastreó tu IP' },
  { desc: 'Vendiste artículos robados en el mercado clandestino', success: '¡Transacción exitosa en los bajos fondos!', fail: 'El comprador era policía encubierto' },
  { desc: 'Organizaste una estafa telefónica en todo Ravehub', success: '¡Depósito recibido sin complicaciones!', fail: 'Las víctimas llamaron a las autoridades' },
  { desc: 'Robaste un cargamento en el puerto de Ravehub City', success: '¡Nadie vigilaba los muelles!', fail: 'Las cámaras de seguridad te captaron' },
  { desc: 'Asaltaste un casino en el distrito de lujo de Ravehub', success: '¡Escapaste con el botín por los túneles!', fail: 'Los guardias activaron la alarma silenciosa' },
  { desc: 'Secuestraste un camión blindado en la autopista', success: '¡El conductor ni siquiera resistió!', fail: 'El GPS alertó a la policía de inmediato' },
  { desc: 'Traficaste mercancía prohibida por los callejones', success: '¡El cliente pagó en efectivo sin preguntas!', fail: 'Era una trampa de la DEA de Ravehub' },
  { desc: 'Saboteaste la red eléctrica para robar durante el apagón', success: '¡El caos fue la cobertura perfecta!', fail: 'Los generadores de emergencia arruinaron el plan' },
  { desc: 'Organizaste peleas clandestinas en el subterráneo', success: '¡Las apuestas fueron millonarias!', fail: 'Una redada policial irrumpió en el lugar' },
  { desc: 'Clonaste tarjetas de crédito en cajeros automáticos', success: '¡Retiros exitosos en toda la ciudad!', fail: 'El banco detectó la actividad sospechosa' },
  { desc: 'Incendiaste un negocio para cobrar el seguro', success: '¡Parecía un accidente eléctrico!', fail: 'Los investigadores encontraron evidencia de incendio provocado' },
  { desc: 'Extorsionaste a comerciantes del barrio chino', success: '¡Todos pagaron por "protección"!', fail: 'Los comerciantes se organizaron y te denunciaron' },
  { desc: 'Robaste obras de arte del museo de Ravehub', success: '¡El coleccionista pagó sin hacer preguntas!', fail: 'Las alarmas láser te atraparon' },
  { desc: 'Contrabandiste armas por la frontera de Ravehub', success: '¡Los guardias estaban sobornados!', fail: 'Un informante alertó a las autoridades' },
  { desc: 'Pirateaste señales de TV para exigir rescate', success: '¡Las cadenas pagaron por el silencio!', fail: 'La señal fue rastreada hasta tu ubicación' },
  { desc: 'Adulteraste medicamentos en farmacias clandestinas', success: '¡Las ventas fueron excelentes!', fail: 'La FDA de Ravehub cerró tu operación' },
  { desc: 'Asaltaste una joyería en pleno día en Ravehub', success: '¡Escapaste en moto por las azoteas!', fail: 'Un héroe civil te tacleó en la salida' },
  { desc: 'Instalaste máquinas tragamonedas ilegales en bares', success: '¡La comisión fue jugosa!', fail: 'Los dueños te delataron con las autoridades' },
  { desc: 'Secuestraste la señal de radio para pedir rescate', success: '¡La emisora pagó en bitcoins!', fail: 'Los técnicos triangularon tu ubicación' },
];

// Crímenes contra un usuario específico (cuando se menciona a alguien)
const PERSONAL_CRIMES = [
  { desc: 'Hackeaste la cuenta bancaria de @victim', success: '¡Vaciaste sus ahorros sin dejar rastro!', fail: '@victim activó la autenticación de dos factores' },
  { desc: 'Robaste la identidad digital de @victim', success: '¡Usaste sus datos para estafas!', fail: '@victim notó los movimientos sospechosos' },
  { desc: 'Clonaste las tarjetas de crédito de @victim', success: '¡Compraste de todo antes de que se diera cuenta!', fail: 'El banco de @victim bloqueó las transacciones' },
  { desc: 'Extorsionaste a @victim con información comprometedora', success: '¡Pagó todo para mantener el secreto!', fail: '@victim fue directo a la policía' },
  { desc: 'Asaltaste la casa de @victim mientras no estaba', success: '¡Te llevaste todo lo de valor!', fail: '@victim tenía cámaras de seguridad ocultas' },
  { desc: 'Saboteaste el auto de @victim para robar el seguro', success: '¡El "accidente" pareció real!', fail: '@victim descubrió las marcas de manipulación' },
  { desc: 'Falsificaste la firma de @victim en documentos legales', success: '¡Transferiste propiedades a tu nombre!', fail: 'Un notario verificó y descubrió el fraude' },
  { desc: 'Vendiste los datos personales de @victim en la deep web', success: '¡Los compradores pagaron en criptomonedas!', fail: '@victim recibió alertas de fraude y te rastreó' },
  { desc: 'Suplantaste a @victim en redes sociales para estafar', success: '¡Sus contactos cayeron en la trampa!', fail: '@victim recuperó su cuenta a tiempo' },
  { desc: 'Drogaste a @victim para robarle en un bar', success: '¡Despertó sin recordar nada!', fail: 'El bartender te grabó en video' },
  { desc: 'Secuestraste la mascota de @victim para pedir rescate', success: '¡Pagó sin pensarlo dos veces!', fail: '@victim llamó a la policía en lugar de pagar' },
  { desc: 'Infectaste con malware la computadora de @victim', success: '¡Encriptaste sus archivos y exigiste rescate!', fail: '@victim tenía backups en la nube' },
  { desc: 'Destruiste la reputación online de @victim con fake news', success: '¡Perdió su trabajo por las acusaciones!', fail: '@victim demostró que todo era falso' },
  { desc: 'Pirateaste las cuentas de streaming de @victim', success: '¡Las vendiste en el mercado negro!', fail: '@victim cambió todas sus contraseñas' },
  { desc: 'Estafaste a @victim con una inversión falsa', success: '¡Desapareciste con todo su dinero!', fail: '@victim investigó y descubrió la estafa' },
  { desc: 'Chantajeaste a @victim con fotos comprometedoras', success: '¡Pagó cada centavo para que las borraras!', fail: '@victim te denunció por extorsión' },
  { desc: 'Manipulaste emocionalmente a @victim para sacarle dinero', success: '¡Te envió transferencias durante meses!', fail: '@victim despertó y cortó todo contacto' },
  { desc: 'Robaste el negocio de @victim desde adentro', success: '¡Desviaste fondos sin que lo notara!', fail: 'La auditoría reveló todas las irregularidades' },
  { desc: 'Saboteaste el proyecto laboral de @victim', success: '¡Lo despidieron y tú tomaste su puesto!', fail: '@victim presentó pruebas de tu sabotaje' },
  { desc: 'Usaste ingeniería social para acceder a las cuentas de @victim', success: '¡El soporte técnico cayó en la trampa!', fail: '@victim tenía alertas de seguridad activas' },
];

export async function crimeCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  // Verificar si hay una mención
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const targetJid = mentions[0];

  // Validar que no se mencione a sí mismo
  if (targetJid && targetJid === senderJid) {
    await enqueueMessage(remoteJid, { text: '❌ No puedes cometer un crimen contra ti mismo.' }, { quoted: msg }, 1);
    return;
  }

  const member = memberData || await getMember(groupJid, senderJid);
  const expiresAt = member?.cooldowns?.crime || 0;

  if (!isCooldownExpired(expiresAt)) {
    const { text } = getCooldownRemaining(expiresAt);
    await enqueueMessage(remoteJid,
      { text: `⏳ Mantén un perfil bajo. Espera *${text}* para cometer otro crimen.` },
      { quoted: msg }, 1);
    return;
  }

  // Guardar cooldown usando update() — dot notation correcto en Firestore
  await setCooldown(groupJid, senderJid, 'crime', COOLDOWN_MS);

  // Elegir escenarios según si hay víctima o no
  let scenario;
  let targetName = '';

  if (targetJid) {
    // Verificar que la víctima exista en el grupo
    const target = await getMember(groupJid, targetJid);
    if (!target) {
      await enqueueMessage(remoteJid, { text: '❌ No encontré a ese usuario en el grupo.' }, { quoted: msg }, 1);
      return;
    }

    // Crimen contra usuario específico
    scenario = PERSONAL_CRIMES[randomInt(0, PERSONAL_CRIMES.length - 1)];
    targetName = cleanJidForDisplay(targetJid);

    // Reemplazar @victim con el nombre real
    scenario = {
      desc: scenario.desc.replace('@victim', `@${targetName}`),
      success: scenario.success.replace(/@victim/g, `@${targetName}`),
      fail: scenario.fail.replace(/@victim/g, `@${targetName}`),
    };
  } else {
    // Crimen en la ciudad (sin víctima específica)
    scenario = CITY_CRIMES[randomInt(0, CITY_CRIMES.length - 1)];
  }

  const success = Math.random() < 0.55; // 55% de éxito

  if (success) {
    const reward = randomInt(5, 15);
    await creditCash(groupJid, senderJid, reward);
    const updated = await getMember(groupJid, senderJid);

    const responseText = `🦹 _${scenario.desc}_\n> ✅ ${scenario.success}\n\n• 💰 Ganaste *${formatCoins(reward)}*\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`;

    await enqueueMessage(remoteJid, {
      text: responseText,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: msg }, 1);
  } else {
    const fine = randomInt(3, 10);
    await deductCash(groupJid, senderJid, fine);
    const updated = await getMember(groupJid, senderJid);

    const responseText = `👮 _${scenario.desc}_\n> ❌ ${scenario.fail}\n\n• 💸 Multa: *${formatCoins(fine)}*\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`;

    await enqueueMessage(remoteJid, {
      text: responseText,
      mentions: targetJid ? [targetJid] : [],
    }, { quoted: msg }, 1);
  }
}
