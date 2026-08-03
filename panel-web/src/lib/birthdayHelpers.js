/**
 * Convierte un Timestamp de Firebase a formato DD/MM/AAAA
 * @param {*} timestamp - Puede ser Timestamp de Firebase, objeto con _seconds, o string
 * @returns {string} Fecha en formato DD/MM/AAAA o string vacío si es inválido
 */
export function formatBirthdayFromTimestamp(timestamp) {
  if (!timestamp) return '';

  try {
    let date;

    // Si ya es un string en formato DD/MM/AAAA, devolverlo tal cual
    if (typeof timestamp === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(timestamp)) {
      return timestamp;
    }

    // Si tiene el método toDate() (Timestamp de Firebase)
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    }
    // Si es un objeto con _seconds (Timestamp serializado)
    else if (timestamp._seconds !== undefined) {
      date = new Date(timestamp._seconds * 1000);
    }
    // Si es un objeto con seconds (Timestamp serializado alternativo)
    else if (timestamp.seconds !== undefined) {
      date = new Date(timestamp.seconds * 1000);
    }
    // Si es un número (milisegundos)
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    // Intentar crear Date directamente
    else {
      date = new Date(timestamp);
    }

    // Validar que la fecha sea válida
    if (isNaN(date.getTime())) {
      return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting birthday:', error);
    return '';
  }
}

/**
 * Calcula la edad a partir de una fecha de nacimiento
 * @param {*} timestamp - Timestamp de Firebase o fecha
 * @returns {number} Edad en años
 */
export function calculateAge(timestamp) {
  if (!timestamp) return 0;

  try {
    let birthDate;

    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      birthDate = timestamp.toDate();
    } else if (timestamp._seconds !== undefined) {
      birthDate = new Date(timestamp._seconds * 1000);
    } else if (timestamp.seconds !== undefined) {
      birthDate = new Date(timestamp.seconds * 1000);
    } else {
      birthDate = new Date(timestamp);
    }

    if (isNaN(birthDate.getTime())) {
      return 0;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
}

/**
 * Verifica si hoy es el cumpleaños
 * @param {*} timestamp - Timestamp de Firebase o fecha
 * @returns {boolean}
 */
export function isBirthdayToday(timestamp) {
  if (!timestamp) return false;

  try {
    let birthDate;

    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      birthDate = timestamp.toDate();
    } else if (timestamp._seconds !== undefined) {
      birthDate = new Date(timestamp._seconds * 1000);
    } else if (timestamp.seconds !== undefined) {
      birthDate = new Date(timestamp.seconds * 1000);
    } else {
      birthDate = new Date(timestamp);
    }

    if (isNaN(birthDate.getTime())) {
      return false;
    }

    const today = new Date();
    return birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
  } catch (error) {
    console.error('Error checking birthday:', error);
    return false;
  }
}
