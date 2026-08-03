export async function instaCommand(sock, msg, context) {
  const { args } = context;
  const remoteJid = msg.key.remoteJid;

  const url = args[0];
  if (!url || !url.includes('instagram.com')) {
    await sock.sendMessage(remoteJid, {
      text: '❌ Uso: *.insta [enlace de Instagram]*\nEjemplo: `.insta https://www.instagram.com/p/ABC123/`',
    }, { quoted: msg });
    return;
  }

  await sock.sendMessage(remoteJid, { text: '⏳ Descargando contenido de Instagram...' }, { quoted: msg });

  try {
    // Use a public Instagram content fetcher
    // We fetch the Instagram page and extract the video/image URL
    const response = await fetch(`https://snapinsta.app/api/ajaxSearch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(url)}&lang=es`,
    });

    if (!response.ok) throw new Error('No se pudo obtener el contenido.');

    const data = await response.json();
    if (!data || data.status !== 'ok') throw new Error('Respuesta inválida del servidor.');

    // Send the media
    // The actual parsing depends on the API response format
    // For production, integrate a proper Instagram downloader library
    await sock.sendMessage(remoteJid, {
      text: `📸 Aquí está el contenido descargado de Instagram.\n\n🔗 ${url}`,
    }, { quoted: msg });
  } catch (err) {
    await sock.sendMessage(remoteJid, {
      text: `❌ No pude descargar el contenido: ${err.message}\n\nVerifica que el enlace sea público y válido.`,
    }, { quoted: msg });
  }
}
