/**
 * Metadata de ayuda para cada comando
 * Incluye descripción, uso y ejemplos
 */

export const commandHelp = {
  // ─── Utility ────────────────────────────────────────────────────────────────
  ping: {
    description: 'Verifica la latencia del bot.',
    usage: '!ping',
    examples: ['!ping'],
  },

  me: {
    description: 'Muestra tu perfil en el grupo actual con estadísticas, nivel, efectivo y advertencias.',
    usage: '!me',
    examples: ['!me'],
  },

  id: {
    description: 'Obtén tu número de identificación para actualizar tu perfil en el panel web.',
    usage: '!id',
    examples: ['!id'],
  },

  help: {
    description: 'Muestra todos los comandos disponibles o ayuda detallada de un comando específico.',
    usage: '!help [comando]',
    examples: ['!help', '!help balance', '!help work'],
  },

  sticker: {
    description: 'Convierte una imagen o video en sticker. Responde a una imagen/video o envía el comando con una imagen.',
    usage: '!sticker (respondiendo a una imagen/video)\n!s (alias corto)',
    examples: ['[Responde a una imagen con] !sticker', '[Responde a un video con] !s'],
  },

  insta: {
    description: '🔒 PREMIUM - Descarga videos e imágenes de Instagram.',
    usage: '!insta [URL de Instagram]',
    examples: ['!insta https://instagram.com/p/ABC123'],
  },

  vv: {
    description: '🔒 PREMIUM - Permite ver mensajes de "ver una vez" sin notificar al remitente.',
    usage: '!vv (respondiendo al mensaje)',
    examples: ['[Responde a un mensaje VV con] !vv'],
  },

  // ─── Economy ─────────────────────────────────────────────────────────────────
  balance: {
    description: 'Muestra tu saldo de efectivo actual, o el de otro usuario si lo mencionas.',
    usage: '!balance [@usuario]',
    examples: ['!balance', '!balance @Juan', '!bal', '!wallet'],
  },

  bank: {
    description: 'Muestra tu saldo en el banco.',
    usage: '!bank',
    examples: ['!bank'],
  },

  work: {
    description: 'Trabaja para ganar RCoins. Disponible cada 30 minutos.',
    usage: '!work',
    examples: ['!work'],
  },

  deposit: {
    description: 'Deposita RCoins de tu efectivo al banco.',
    usage: '!deposit [cantidad|all]',
    examples: ['!deposit 500', '!deposit all', '!dep 1000'],
  },

  withdraw: {
    description: 'Retira RCoins de tu banco a efectivo.',
    usage: '!withdraw [cantidad|all]',
    examples: ['!withdraw 500', '!withdraw all', '!with 1000'],
  },

  transfer: {
    description: 'Transfiere RCoins a otro usuario del grupo.',
    usage: '!transfer @usuario [cantidad]',
    examples: ['!transfer @Juan 500', '!yape @María 1000'],
  },

  rob: {
    description: 'Intenta robar RCoins a otro usuario. Riesgo de perder dinero si fallas.',
    usage: '!rob @usuario',
    examples: ['!rob @Juan', '!robar @María'],
  },

  crime: {
    description: 'Comete un crimen en Ravehub City o contra un usuario específico. Alto riesgo, alta recompensa.',
    usage: '!crime - Crimen en la ciudad\n!crime @usuario - Crimen contra alguien',
    examples: ['!crime', '!crimen', '!crime @Juan'],
  },

  loan: {
    description: 'Solicita un préstamo o paga tus deudas.',
    usage: '!loan [cantidad] - Solicitar préstamo\n!loan pagar - Pagar deuda',
    examples: ['!loan 1000', '!loan pagar', '!prestamo 500'],
  },

  infocorp: {
    description: 'Consulta tus deudas y préstamos activos.',
    usage: '!infocorp',
    examples: ['!infocorp'],
  },

  top: {
    description: 'Muestra el ranking de usuarios más ricos del grupo.',
    usage: '!top',
    examples: ['!top', '!ranking'],
  },

  topdebt: {
    description: 'Muestra el ranking de los usuarios más endeudados de Ravehub City.',
    usage: '!topdebt',
    examples: ['!topdebt', '!topdeuda', '!deudores'],
  },

  // ─── Games ───────────────────────────────────────────────────────────────────
  slot: {
    description: 'Juega a la máquina tragamonedas y gana hasta 3x tu apuesta.',
    usage: '!slot [apuesta]',
    examples: ['!slot 100', '!slot 500'],
  },

  coinflip: {
    description: 'Apuesta a cara o cruz. Gana el doble si aciertas.',
    usage: '!coinflip [cara|cruz] [apuesta]',
    examples: ['!coinflip cara 100', '!moneda cruz 500'],
  },

  dado: {
    description: 'Lanza un dado de 6 caras.',
    usage: '!dado',
    examples: ['!dado', '!dice'],
  },

  ppt: {
    description: 'Juega piedra, papel o tijera contra el bot.',
    usage: '!ppt [piedra|papel|tijera]',
    examples: ['!ppt piedra', '!rps papel'],
  },

  roulette: {
    description: 'Juega a la ruleta. Apuesta a rojo, negro o un número específico.',
    usage: '!roulette [rojo|negro|0-36] [apuesta]',
    examples: ['!roulette rojo 100', '!ruleta negro 500', '!roulette 7 200'],
  },

  fstudio: {
    description: 'Simula el juego FStudio para ganar RCoins.',
    usage: '!fstudio',
    examples: ['!fstudio', '!fstudio2'],
  },

  stats: {
    description: 'Muestra tus estadísticas de juegos.',
    usage: '!stats',
    examples: ['!stats', '!estadisticas'],
  },

  // ─── Shop ────────────────────────────────────────────────────────────────────
  shop: {
    description: 'Muestra la tienda de items premium.',
    usage: '!shop',
    examples: ['!shop', '!tienda'],
  },

  buy: {
    description: 'Compra un item de la tienda.',
    usage: '!buy [id del item]',
    examples: ['!buy shield', '!buy bodyguard', '!comprar multiplier', '!buy insta'],
  },

  inventory: {
    description: 'Muestra tus items comprados.',
    usage: '!inventory',
    examples: ['!inventory'],
  },

  use: {
    description: 'Usa un item de tu inventario.',
    usage: '!use [id del item]',
    examples: ['!use shield', '!use bodyguard', '!use multiplier'],
  },

  // ─── Moderation ──────────────────────────────────────────────────────────────
  warn: {
    description: '🛡️ ADMIN - Advierte a un usuario. 3 advertencias = expulsión automática.',
    usage: '!warn @usuario [motivo]\n!warn (respondiendo a un mensaje) [motivo]',
    examples: ['!warn @Juan Spam', '[Responde a un mensaje con] !warn Lenguaje inapropiado'],
  },

  unwarn: {
    description: '🛡️ ADMIN - Quita una advertencia a un usuario.',
    usage: '!unwarn @usuario',
    examples: ['!unwarn @Juan'],
  },

  warnlist: {
    description: 'Muestra tus advertencias actuales.',
    usage: '!warnlist',
    examples: ['!warnlist'],
  },

  kick: {
    description: '🛡️ ADMIN - Expulsa a un usuario del grupo.',
    usage: '!kick @usuario [motivo]\n!kick (respondiendo a un mensaje) [motivo]',
    examples: ['!kick @Juan Violación de reglas', '[Responde a un mensaje con] !kick'],
  },

  antilink: {
    description: '🛡️ ADMIN - Configura el filtro de enlaces.',
    usage: '!antilink on - Activar\n!antilink off - Desactivar\n!antilink add [dominio] - Permitir dominio\n!antilink remove [dominio] - Quitar dominio',
    examples: ['!antilink on', '!antilink add youtube.com', '!antilink remove facebook.com'],
  },

  antiwords: {
    description: '🛡️ ADMIN - Configura el filtro de palabras prohibidas.',
    usage: '!antiwords on - Activar\n!antiwords off - Desactivar\n!antiwords add palabra1, palabra2 - Agregar\n!antiwords remove palabra - Quitar',
    examples: ['!antiwords on', '!antiwords add spam, estafa', '!antiwords remove spam'],
  },

  welcome: {
    description: '🛡️ ADMIN - Configura el mensaje de bienvenida.',
    usage: '!welcome on [texto] - Activar\n!welcome off - Desactivar\n!welcome text [nuevo texto] - Cambiar texto\n!welcome image [url] - Cambiar imagen',
    examples: ['!welcome on Bienvenido al grupo!', '!welcome text Hola @{{mention}}!', '!welcome off'],
  },

  tagall: {
    description: '🛡️ ADMIN - Menciona a todos los miembros del grupo.',
    usage: '!tagall [mensaje opcional]',
    examples: ['!tagall', '!tagall Reunión importante'],
  },

  tagnoadmin: {
    description: '🛡️ ADMIN - Menciona a todos los miembros que NO son admin.',
    usage: '!tagnoadmin [mensaje opcional]',
    examples: ['!tagnoadmin', '!tagnoadmin Aviso importante'],
  },

  lock: {
    description: '🔒 PREMIUM - Bloquea formatos específicos (imágenes, videos, stickers, etc.).',
    usage: '!lock [image|video|sticker|audio|document]',
    examples: ['!lock image', '!lock video', '!lock sticker'],
  },

  unlock: {
    description: '🔒 PREMIUM - Desbloquea formatos previamente bloqueados.',
    usage: '!unlock [image|video|sticker|audio|document]',
    examples: ['!unlock image', '!unlock video'],
  },

  alerts: {
    description: '🛡️ ADMIN - Gestiona alertas programadas del grupo.',
    usage: '!alerts on - Activar\n!alerts off - Desactivar\n!alerts list - Ver alertas\n!alerts update - Actualizar desde el panel',
    examples: ['!alerts on', '!alerts list', '!alerts off'],
  },

  groupid: {
    description: '🛡️ ADMIN - Muestra el ID del grupo actual.',
    usage: '!groupid',
    examples: ['!groupid', '!idgrupo'],
  },

  bot: {
    description: '👑 OWNER - Activa o desactiva el bot en un grupo específico.',
    usage: '!bot on [ID del grupo] - Activar\n!bot off [ID del grupo] - Desactivar',
    examples: ['!bot on 120363199955210379_g_us', '!bot off 120363199955210379_g_us'],
  },

  groups: {
    description: '👑 OWNER - Lista todos los grupos donde está el bot.',
    usage: '!groups',
    examples: ['!groups'],
  },

  // ─── Social ──────────────────────────────────────────────────────────────────
  ship: {
    description: 'Calcula el nivel de compatibilidad romántica entre dos personas usando algoritmos avanzados... o algo así. 💕',
    usage: '!ship @usuario1 @usuario2\n!ship @usuario',
    examples: [
      '!ship @Juan @María',
      '!ship @Pedro',
      '!ship (para ver las instrucciones)',
    ],
  },
};
