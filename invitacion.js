// Datos y conexión de la invitación personal (prototipo 12): el código del enlace, la hoja de Google,
// el plazo y los detalles del evento. La página carga este archivo antes de su propio código.

// Dirección de la aplicación web de Apps Script (termina en /exec): da el saludo, los nombres, lo ya respondido
// y si el plazo sigue abierto, y anota las respuestas (cómo obtenerla: ../../confirmaciones/Code.gs).
// Vacía, la página usa las invitaciones de prueba de abajo.
const config = { urlConfirmaciones: 'https://script.google.com/macros/s/AKfycbywAE-1BmVcFjVKJ7U3lgV9duNat1lwlMuDaMA1WG1gqitt4Cfz3kyCpl0ySs95DEiyqA/exec' };

// Andamio del prototipo, solo sin hoja conectada: invitaciones de prueba (?i=uno, ?i=pareja, ?i=grupo),
// lo respondido queda en esta pestaña del navegador, y &hoy=AAAA-MM-DD simula otra fecha para ver el plazo cerrado
const PRUEBA = {
  uno: { grupo: 'Ana', nombres: ['Ana Prueba'] },
  pareja: { grupo: 'Ana y Luis', nombres: ['Ana Prueba', 'Luis Prueba'] },
  grupo: { grupo: 'Familia Prueba', nombres: ['Rosa Prueba', 'Pedro Prueba', 'Sofía Prueba', 'Isabel Prueba'] },
};
const PLAZO_PRUEBA = '2026-11-06'; // con la hoja conectada, el plazo lo decide Code.gs

// El lugar en Google Maps: abre la ficha del restaurante (en el teléfono, en la aplicación de mapas)
const MAPA = 'https://www.google.com/maps/search/?api=1&query='
  + encodeURIComponent('Museo Larco Café-Restaurant, Av. Simón Bolívar 1515, Pueblo Libre, Lima');

// Los detalles del evento, en un solo lugar
const DETALLES = [
  { etiqueta: 'Fecha', valor: 'Sábado 5 de diciembre de 2026' },
  { etiqueta: 'Hora', valor: '7:30 p. m.', aviso: 'Les agradeceremos mucho su puntualidad para poder disfrutar de nuestra reserva.' },
  { etiqueta: 'Lugar', valor: 'Museo Larco Café-Restaurant', enlace: MAPA, notas: ['Av. Simón Bolívar 1515, Pueblo Libre', 'Ingreso por calle Navarra 169'] },
  { etiqueta: 'Dress code', valor: 'Elegante casual' },
];

const parametros = new URLSearchParams(location.search);
const codigo = (parametros.get('i') || '').trim().toLowerCase();

function plazoDePruebaAbierto() {
  const d = new Date();
  const hoy = parametros.get('hoy') || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return hoy <= PLAZO_PRUEBA;
}

const guardadoDePrueba = {
  leer() {
    try { return JSON.parse(sessionStorage.getItem(`boda-${codigo}`)) || []; } catch { return []; }
  },
  escribir(respuestas) {
    try { sessionStorage.setItem(`boda-${codigo}`, JSON.stringify(respuestas)); } catch { /* sin guardado, igual sigue */ }
  },
};

// Devuelve { grupo, abierto, invitados: [{ nombre, viene, alergias }] }, o null si el código no existe.
// Si falla la conexión, lanza un error.
async function cargarInvitacion() {
  if (!config.urlConfirmaciones) {
    const prueba = PRUEBA[codigo];
    if (!prueba) return null;
    const respondido = guardadoDePrueba.leer();
    return {
      grupo: prueba.grupo,
      abierto: plazoDePruebaAbierto(),
      invitados: prueba.nombres.map((nombre) => ({ nombre, viene: '', alergias: '', ...respondido.find((r) => r.nombre === nombre) })),
    };
  }
  const respuesta = await fetch(`${config.urlConfirmaciones}?i=${encodeURIComponent(codigo)}`);
  const datos = await respuesta.json();
  return datos.ok ? datos : null;
}

// Anota las respuestas. Si no se pudo, lanza un error con el motivo («plazo cerrado», «no encontrado»…)
async function guardarRespuestas(respuestas, sitio = '') {
  const limpias = respuestas.map((r) => ({ ...r, alergias: r.viene === 'si' ? r.alergias : '' }));
  if (!config.urlConfirmaciones) {
    if (!plazoDePruebaAbierto()) throw new Error('plazo cerrado');
    guardadoDePrueba.escribir(limpias);
    return limpias;
  }
  const respuesta = await fetch(config.urlConfirmaciones, {
    method: 'POST',
    body: new URLSearchParams({ i: codigo, respuestas: JSON.stringify(limpias), sitio }),
  });
  const datos = await respuesta.json();
  if (!datos.ok) throw new Error(datos.error);
  return limpias;
}

// «Ana», «Ana y Luis», «Ana, Luis y Sofía»; antes de un nombre que suena «i» va «e»: «Luis e Isabel»
function unirNombres(nombres) {
  if (nombres.length < 2) return nombres.join('');
  const ultimo = nombres[nombres.length - 1];
  const y = /^h?[ií](?![aeiouáéíóú])/i.test(ultimo) ? 'e' : 'y';
  return `${nombres.slice(0, -1).join(', ')} ${y} ${ultimo}`;
}

// Llena una lista de datos (<dl class="datos">) con los detalles del evento
function dibujarDetalles(lista) {
  lista.replaceChildren(...DETALLES.map((d) => {
    const fila = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = d.etiqueta;
    if (d.enlace) {
      const a = document.createElement('a');
      a.href = d.enlace;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = d.valor;
      dd.append(a);
    } else {
      dd.append(d.valor);
    }
    for (const nota of d.notas || []) {
      const span = document.createElement('span');
      span.className = 'nota';
      span.textContent = nota;
      dd.append(span);
    }
    if (d.aviso) {
      const aviso = document.createElement('p');
      aviso.className = 'aviso';
      aviso.textContent = d.aviso;
      dd.append(aviso);
    }
    fila.append(dt, dd);
    return fila;
  }));
}
