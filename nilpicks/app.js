/* =========================================================================
   app.js — Nil Picks y Repicking (SAP EWM)
   -------------------------------------------------------------------------
   Para qué sirve:
     1. Medir Nil Picks y Repickings de la operación, mes a mes.
     2. Sacar los cíclicos que hay que contar para gestionar los ajustes.

   Una sola regla de clasificación, tres estados. Nada más.
   ========================================================================= */

/* =========================================================================
   1. Reglas de negocio
   ========================================================================= */

/* Códigos de excepción que generan caso. En los reportes también aparece
   BIDP: si alguna vez se quiere seguir, se agrega acá y listo. */
/* Códigos de excepción que generan caso, y qué tipo de falla es cada uno.
   Sale de los datos: en las 138 filas BIDF del reporte la cantidad real es
   siempre 0, y en las 15 BIDP está siempre entre 1 y la prevista.

     · total   -> no sacó nada. Puede terminar en Nil Pick o en Repicking,
                  según haya o no una retoma.
     · parcial -> sacó menos de lo pedido. La diferencia ya está medida y la
                  gaveta quedó con faltante, así que siempre va a cíclico:
                  nunca se cierra sola, aunque el resto de la cantidad se
                  haya completado desde otra gaveta. */
const COD_EXCEPCION = {
  BIDF: 'total',
  BIDP: 'parcial',
};

const CLASIFICACIONES = ['Nil Pick', 'Repicking', 'Diferencia parcial'];

/** Clase CSS de la etiqueta de cada clasificación. */
function claseTag(clasificacion) {
  if (clasificacion === 'Nil Pick') return 'tag--nil';
  if (clasificacion === 'Diferencia parcial') return 'tag--parcial';
  return 'tag--repick';
}

/* A contar → Contado → Cerrado. El cierre es el ajuste (o la decisión de que
   no hace falta ajustar). El repicking en la misma gaveta nace cerrado. */
const ESTADOS = ['A contar', 'Contado', 'Cerrado'];

const SITES = [
  { id: 'finning', nombre: 'Finning CAT', detalle: 'Tortuguitas', logo: 'finning' },
  { id: 'otro', nombre: 'Otro site', detalle: '', logo: '' },
];

/* Alias de columnas. Las claves son nombres normalizados (sin acentos, sin
   puntos, sin espacios, en minúsculas), así el mapeo aguanta las variantes
   de encabezado que devuelve SAP según el layout. */
const COLS_PICKING = {
  documento: ['documento'],
  tareaAlmacen: ['tareadealmacen', 'tareaalmacen'],
  codigoExcepcion: ['codigodeexcepcion', 'codigoexcepcion', 'codexcepcion'],
  producto: ['producto', 'material'],
  descripcion: ['descripciondeproducto', 'descripcionproducto', 'textobreve'],
  cantidad: ['ctdprevprocedumb', 'ctdprevprocumb', 'cantidadprevista'],
  cantidadReal: ['ctdrealdestumb', 'ctdrealdestinoumb', 'cantidadreal'],
  /* Faltante que calcula SAP en una toma parcial. Si no viene, se saca de
     la resta entre la cantidad prevista y la real. */
  diferencia: ['ctddifdestenumb', 'ctddifdestumb', 'ctddiferenciaumb', 'cantidaddiferencia'],
  ubicacion: ['ubicprocedencia', 'ubicaciondeprocedencia', 'ubicacionprocedencia'],
  fechaConfirmacion: ['fechaconfirmacion', 'fechadeconfirmacion'],
  horaConfirmacion: ['horadeconfirmacion', 'horaconfirmacion'],
  confirmadoPor: ['confirmadopor'],
  usuario: ['usuario'],
  autor: ['autor'],
  item: ['posiciondedocumento', 'posiciondocumento', 'posicion', 'item'],
  tipoStock: ['denominaciondetipodestocks', 'tipodestocks'],
  /* Tipo de almacén de la ubicación de origen. SAP lo exporta con nombres
     muy distintos según el layout, así que se prueban varios. Si no viene,
     el ranking por tipo de almacén queda en "(sin dato)" y la importación
     lo avisa. */
  tipoAlmacen: [
    // Primero los del origen: la gaveta que falló es la de procedencia.
    // "Tipo almacén origen" es el encabezado que trae el reporte.
    'tipoalmacenorigen', 'tipodealmacenorigen',
    'tipoalmacenprocedencia', 'tipodealmacenprocedencia', 'tipodealmacendeprocedencia',
    'tipoalmorigen', 'tipoalmprocedencia',
    // Y recién después los genéricos
    'tipodealmacen', 'tipoalmacen', 'tipoalm',
    'denominaciondetipodealmacen', 'denominaciontipodealmacen', 'descripciontipodealmacen',
  ],
};

/* El reporte de pedidos es opcional y solo aporta datos de contacto. */
const COLS_PEDIDOS = {
  documento: ['documento'],
  documentoErp: ['documentoerp', 'docerp'],
  documentoErpOriginal: ['documentooriginaldeerp'],
  destinatario: ['destinatariomcia', 'destinatariomercancia', 'destinatariodemercancia'],
  destinatarioNombre: ['descripciondestinatariodemercancias', 'descripciondeldestinatariodemercancias'],
};

/* =========================================================================
   2. Utilidades
   ========================================================================= */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/** Normaliza un encabezado: minúsculas, sin acentos, solo letras y números. */
function normalizar(txt) {
  return String(txt ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function limpiar(v) {
  return String(v ?? '').trim();
}

/** Escapa HTML para que un dato raro del reporte no rompa la tabla. */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * Convierte a fecha ISO (YYYY-MM-DD) lo que venga: objeto Date, número de
 * serie de Excel, o texto dd/mm/aaaa, dd.mm.aaaa, aaaa-mm-dd.
 */
function aFechaISO(valor) {
  if (valor === null || valor === undefined || valor === '') return '';

  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) {
    return [
      valor.getFullYear(),
      String(valor.getMonth() + 1).padStart(2, '0'),
      String(valor.getDate()).padStart(2, '0'),
    ].join('-');
  }

  if (typeof valor === 'number' && isFinite(valor)) {
    // Número de serie de Excel (base 1899-12-30)
    const d = new Date(Math.round((valor - 25569) * 86400 * 1000));
    if (isNaN(d)) return '';
    return [
      d.getUTCFullYear(),
      String(d.getUTCMonth() + 1).padStart(2, '0'),
      String(d.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  const txt = limpiar(valor);
  let m = txt.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

  m = txt.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let anio = m[3];
    if (anio.length === 2) anio = (Number(anio) > 70 ? '19' : '20') + anio;
    return `${anio}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return '';
}

/** Las horas de SAP vienen como celda con fecha base 1899. Devuelve HH:MM:SS. */
function aHora(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) {
    return [valor.getHours(), valor.getMinutes(), valor.getSeconds()]
      .map((n) => String(n).padStart(2, '0')).join(':');
  }
  if (typeof valor === 'number' && isFinite(valor)) {
    const seg = Math.round((valor % 1) * 86400);
    return [Math.floor(seg / 3600), Math.floor((seg % 3600) / 60), seg % 60]
      .map((n) => String(n).padStart(2, '0')).join(':');
  }
  const m = limpiar(valor).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}:${m[3] || '00'}` : limpiar(valor);
}

/** Momento de confirmación en milisegundos, para poder ordenar tareas. */
function aMomento(fechaISO, hora) {
  if (!fechaISO) return 0;
  const [a, m, d] = fechaISO.split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = String(hora || '').split(':').map(Number);
  return new Date(a, m - 1, d, hh || 0, mm || 0, ss || 0).getTime();
}

function fechaLinda(iso) {
  if (!iso) return '—';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function momentoLindo(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Nombre del mes para la tabla y el gráfico: "sep 2026". */
function mesLindo(clave) {
  if (!clave) return '—';
  const [a, m] = clave.split('-').map(Number);
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${nombres[m - 1] || '?'} ${a}`;
}

function aNumero(v) {
  if (typeof v === 'number') return v;
  const txt = limpiar(v).replace(/\s/g, '');
  if (!txt) return 0;
  // Tolera 1.234,56 y 1,234.56
  const normal = txt.lastIndexOf(',') > txt.lastIndexOf('.')
    ? txt.replace(/\./g, '').replace(',', '.')
    : txt.replace(/,/g, '');
  const n = parseFloat(normal);
  return isNaN(n) ? 0 : n;
}

function numeroLindo(n) {
  return Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

/** true si el campo tiene un número cargado (0 incluido), false si está vacío. */
function hayNumero(v) {
  return v !== '' && v !== null && v !== undefined && !isNaN(Number(v));
}

function hoyISO() {
  return aFechaISO(new Date());
}

function avisar(mensaje, tipo = '') {
  const div = document.createElement('div');
  div.className = 'aviso' + (tipo ? ` aviso--${tipo}` : '');
  div.textContent = mensaje;
  $('#avisos').appendChild(div);
  setTimeout(() => div.remove(), 4200);
}

/* =========================================================================
   3. Lectura de archivos
   ========================================================================= */

/**
 * Lee el archivo y devuelve { encabezados, filas }, con cada fila como un
 * array de celdas.
 *
 * Un export de SAP trae más de 120 columnas y la app usa 17. Armar un objeto
 * con todas las columnas por cada fila cuesta carísimo cuando se cargan
 * varios meses de una: con 32.000 filas eran 850 MB de memoria y medio minuto
 * con la pantalla congelada. Con arrays, y leyendo la hoja en modo denso, se
 * trabaja sobre lo mismo a una fracción del costo.
 */
function leerExcel(file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = (ev) => {
      try {
        const libro = XLSX.read(new Uint8Array(ev.target.result), {
          type: 'array',
          cellDates: true,
          dense: true,
          cellFormula: false,
          cellHTML: false,
          cellStyles: false,
        });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', blankrows: false });
        resolve({ encabezados: filas.length ? filas[0] : [], filas: filas.slice(1) });
      } catch (err) {
        reject(err);
      }
    };
    lector.onerror = () => reject(lector.error);
    lector.readAsArrayBuffer(file);
  });
}

/** Diccionario {campoLógico: índice de columna} según los encabezados. */
function mapearColumnas(encabezados, diccionario) {
  const reales = {};
  (encabezados || []).forEach((h, i) => {
    const n = normalizar(h);
    if (n && !(n in reales)) reales[n] = i;      // ante empate, gana la primera
  });

  const mapa = {};
  Object.entries(diccionario).forEach(([campo, alias]) => {
    const encontrado = alias.find((a) => a in reales);
    if (encontrado !== undefined) mapa[campo] = reales[encontrado];
  });
  return mapa;
}

function valor(fila, mapa, campo) {
  const i = mapa[campo];
  return i === undefined ? '' : fila[i];
}

/* =========================================================================
   4. Clasificación
   -------------------------------------------------------------------------
   La prueba de que una línea se recuperó está en el mismo reporte de
   picking: otra tarea de la misma línea, confirmada después y sin código de
   excepción. De ahí sale todo.
   ========================================================================= */

/** Índice de las tomas limpias (sin excepción) por documento|posición|producto. */
function indexarTomas(filas, mapa) {
  const idx = new Map();
  filas.forEach((f) => {
    if (limpiar(valor(f, mapa, 'codigoExcepcion'))) return;        // solo tomas limpias

    /* Una tarea puede venir partida en dos tramos, y el tramo interno llega
       sin documento y sin ubicación de procedencia. Ese no prueba nada: sin
       gaveta no se puede saber si la línea salió de la misma o de otra, y
       sin fecha de confirmación no hay toma confirmada. */
    const documento = limpiar(valor(f, mapa, 'documento'));
    const ubicacion = limpiar(valor(f, mapa, 'ubicacion'));
    const fecha = aFechaISO(valor(f, mapa, 'fechaConfirmacion'));
    if (!documento || !ubicacion || !fecha) return;

    const clave = [
      documento,
      limpiar(valor(f, mapa, 'item')),
      limpiar(valor(f, mapa, 'producto')),
    ].join('|');
    const hora = aHora(valor(f, mapa, 'horaConfirmacion'));
    const lista = idx.get(clave) || [];
    lista.push({
      tarea: limpiar(valor(f, mapa, 'tareaAlmacen')),
      ubicacion,
      cantidad: aNumero(valor(f, mapa, 'cantidadReal')),
      usuario: limpiar(valor(f, mapa, 'confirmadoPor')) || limpiar(valor(f, mapa, 'usuario')),
      fecha,
      hora,
      momento: aMomento(fecha, hora),
    });
    idx.set(clave, lista);
  });
  // De cada línea, la toma limpia más temprana primero
  idx.forEach((lista) => lista.sort((a, b) => a.momento - b.momento));
  return idx;
}

/** Datos de contacto por documento, del reporte de pedidos (si vino). */
function indexarPedidos(hoja) {
  if (!hoja || !hoja.filas.length) return new Map();
  const mapa = mapearColumnas(hoja.encabezados, COLS_PEDIDOS);
  const idx = new Map();
  hoja.filas.forEach((f) => {
    const doc = limpiar(valor(f, mapa, 'documento'));
    if (!doc) return;
    idx.set(doc, {
      // Si el ERP viene enmascarado como ***, sirve el original
      documentoErp: [valor(f, mapa, 'documentoErp'), valor(f, mapa, 'documentoErpOriginal')]
        .map(limpiar).find((v) => v && v !== '***') || '',
      destinatario: limpiar(valor(f, mapa, 'destinatarioNombre'))
        || limpiar(valor(f, mapa, 'destinatario')),
    });
  });
  return idx;
}

/**
 * Busca la retoma de un caso entre las tomas limpias: una tarea distinta a
 * las del caso, confirmada después del último intento fallido.
 */
function buscarRetoma(caso, tomas) {
  // La posición sale de los intentos, no de la cabecera: así funciona
  // también para un caso recién creado, antes de refrescarlo.
  const item = caso.intentos[caso.intentos.length - 1].item;
  const lista = tomas.get([caso.documento, item, caso.producto].join('|'));
  if (!lista) return null;
  const tareas = new Set(caso.intentos.map((i) => i.tarea));
  const ultimo = caso.intentos.reduce((a, i) => Math.max(a, i.momento), 0);
  return lista.find((t) => t.momento >= ultimo && !tareas.has(t.tarea)) || null;
}

/**
 * Clasifica el caso a partir de su retoma. Es la única regla de la app.
 * No pisa nada que ya se haya contado.
 */
function clasificar(caso) {
  /* Toma parcial: el pickeador sacó algo, pero menos de lo pedido. La gaveta
     quedó con un faltante ya medido, así que no se busca retoma ni se cierra
     sola: que el resto de la cantidad se haya completado desde otra gaveta no
     dice nada sobre la diferencia que quedó en esta. */
  if (caso.tipoFalla === 'parcial') {
    caso.clasificacion = 'Diferencia parcial';
    caso.tipoRepicking = '';
    caso.motivo = `Se pidieron ${numeroLindo(caso.cantidad)} y se sacaron ${numeroLindo(caso.sacado)}: faltaron ${numeroLindo(caso.faltante)} en la gaveta.`;
    return caso;
  }

  if (caso.retoma) {
    const enSitio = caso.retoma.ubicacion === caso.ubicacion;
    caso.clasificacion = 'Repicking';
    caso.tipoRepicking = enSitio ? 'En sitio' : 'Desde otra ubicación';
    caso.motivo = enSitio
      ? `Se retomó en la misma gaveta y salió (tarea ${caso.retoma.tarea}, ${fechaLinda(caso.retoma.fecha)} ${caso.retoma.hora}). No quedó diferencia para contar.`
      : `El material salió de ${caso.retoma.ubicacion} (tarea ${caso.retoma.tarea}, ${fechaLinda(caso.retoma.fecha)} ${caso.retoma.hora}). La gaveta original quedó con stock fantasma.`;
  } else {
    caso.clasificacion = 'Nil Pick';
    caso.tipoRepicking = '';
    caso.motivo = 'Nadie recuperó la línea. La gaveta decía que había stock y no estaba.';
  }
  return caso;
}

/** ¿Este caso genera trabajo de conteo? */
function requiereConteo(caso) {
  // La toma parcial siempre: dejó un faltante medido en la gaveta
  if (caso.tipoFalla === 'parcial') return true;
  return !(caso.clasificacion === 'Repicking' && caso.tipoRepicking === 'En sitio');
}

/**
 * Pone el estado que corresponde a la clasificación. Respeta el trabajo ya
 * hecho: si alguien contó o cerró el caso a mano, no lo toca.
 */
function aplicarRegla(caso) {
  if (caso.resultado || caso.cerradoAMano) return caso;

  if (requiereConteo(caso)) {
    caso.estado = 'A contar';
    caso.cierreAutomatico = false;
    caso.fechaCierre = '';
  } else {
    caso.estado = 'Cerrado';
    caso.cierreAutomatico = true;
    caso.fechaCierre = caso.fechaCierre || new Date().toISOString();
  }
  return caso;
}

/** Cabecera del caso: sale del último intento, que es el estado de hoy. */
function refrescar(caso) {
  caso.intentos.sort((a, b) => a.momento - b.momento);
  const primero = caso.intentos[0];
  const ultimo = caso.intentos[caso.intentos.length - 1];

  caso.item = ultimo.item;
  caso.descripcion = ultimo.descripcion;
  caso.cantidad = ultimo.cantidad;
  caso.tipoFalla = ultimo.tipoFalla;
  caso.codigoExcepcion = ultimo.codigoExcepcion;
  caso.sacado = ultimo.sacado;
  // El faltante de una toma parcial es el del último intento, no la suma:
  // cada intento mide el saldo de la gaveta en ese momento.
  caso.faltante = ultimo.faltante;
  caso.usuario = ultimo.usuario;
  caso.tipoStock = ultimo.tipoStock;
  caso.tipoAlmacen = ultimo.tipoAlmacen || caso.tipoAlmacen || '';
  caso.documentoErp = ultimo.documentoErp || caso.documentoErp || '';
  caso.destinatario = ultimo.destinatario || caso.destinatario || '';

  // La fecha del caso es la del primer intento: es cuando empezó el problema
  caso.fecha = primero.fecha;
  caso.hora = primero.hora;
  caso.fechaUltimo = ultimo.fecha;
  caso.horaUltimo = ultimo.hora;
  caso.intentosCant = caso.intentos.length;
  return caso;
}

/* =========================================================================
   5. Importación: del archivo a los casos
   ========================================================================= */

/** Saca del reporte de picking los intentos fallidos (las tareas BIDF). */
function construirIntentos(hoja, pedidos) {
  const { encabezados, filas } = hoja;
  const mapa = mapearColumnas(encabezados, COLS_PICKING);

  // Ojo: el índice puede ser 0 (la primera columna del archivo), que es
  // falsy. La pregunta es si el campo está mapeado, no si el índice es > 0.
  const tiene = (campo) => mapa[campo] !== undefined;

  if (!tiene('documento') || !tiene('codigoExcepcion')) {
    throw new Error('El reporte de picking no tiene las columnas Documento y Código de excepción.');
  }
  if (!tiene('ubicacion')) {
    throw new Error('El reporte de picking no tiene la columna Ubic.procedencia, y sin la gaveta no hay cíclico que pedir.');
  }

  const intentos = [];
  let bidf = 0;

  let incompletos = 0;
  let parciales = 0;

  filas.forEach((f) => {
    const cod = limpiar(valor(f, mapa, 'codigoExcepcion')).toUpperCase();
    const tipoFalla = COD_EXCEPCION[cod];
    if (!tipoFalla) return;
    bidf++;
    if (tipoFalla === 'parcial') parciales++;

    const documento = limpiar(valor(f, mapa, 'documento'));
    const producto = limpiar(valor(f, mapa, 'producto'));
    const ubicacion = limpiar(valor(f, mapa, 'ubicacion'));
    const fecha = aFechaISO(valor(f, mapa, 'fechaConfirmacion'));
    const hora = aHora(valor(f, mapa, 'horaConfirmacion'));

    /* Sin documento, producto, gaveta o fecha no hay caso que armar ni
       cíclico que pedir. Pasa con las filas en blanco del final del export
       y con los tramos internos de una tarea partida en dos. */
    if (!documento || !producto || !ubicacion || !fecha) { incompletos++; return; }

    const extra = pedidos.get(documento) || {};
    const cantidad = aNumero(valor(f, mapa, 'cantidad'));
    const sacado = aNumero(valor(f, mapa, 'cantidadReal'));
    const faltante = tiene('diferencia')
      ? Math.abs(aNumero(valor(f, mapa, 'diferencia')))
      : Math.max(0, cantidad - sacado);

    intentos.push({
      /* El caso es el problema: mismo pedido, mismo producto, misma gaveta.
         La toma parcial va en su propio caso: una línea puede tener un BIDP
         un día y un BIDF otro, y son dos problemas distintos. */
      grupo: [documento, producto, ubicacion].concat(tipoFalla === 'parcial' ? ['BIDP'] : []).join('|'),
      tipoFalla,
      codigoExcepcion: cod,
      documento,
      producto,
      ubicacion,
      item: limpiar(valor(f, mapa, 'item')),
      tarea: limpiar(valor(f, mapa, 'tareaAlmacen')),
      descripcion: limpiar(valor(f, mapa, 'descripcion')),
      cantidad,
      sacado,
      faltante,
      tipoStock: limpiar(valor(f, mapa, 'tipoStock')),
      tipoAlmacen: limpiar(valor(f, mapa, 'tipoAlmacen')),
      usuario: limpiar(valor(f, mapa, 'confirmadoPor'))
        || limpiar(valor(f, mapa, 'usuario'))
        || limpiar(valor(f, mapa, 'autor')),
      fecha,
      hora,
      momento: aMomento(fecha, hora),
      documentoErp: extra.documentoErp || '',
      destinatario: extra.destinatario || '',
    });
  });

  intentos.sort((a, b) => a.momento - b.momento);
  return { intentos, bidf, parciales, incompletos, mapa };
}

function casoNuevo(intento, secuencia) {
  return {
    id: secuencia > 1 ? `${intento.grupo}#${secuencia}` : intento.grupo,
    grupo: intento.grupo,
    secuencia,
    documento: intento.documento,
    producto: intento.producto,
    ubicacion: intento.ubicacion,
    intentos: [intento],
    retoma: null,
    estado: 'A contar',
    resultado: '',
    stockSistema: '',
    cantidadContada: '',
    fechaConteo: '',
    contadoPor: '',
    ajustado: false,
    unidadesAjuste: '',
    observaciones: '',
    cierreAutomatico: false,
    cerradoAMano: false,
    fechaCierre: '',
    creado: new Date().toISOString(),
  };
}

/**
 * Procesa el archivo: suma los intentos nuevos, busca retomas para todo lo
 * que está abierto (también para los casos de importaciones anteriores, que
 * es lo que permite que una retoma del día siguiente cierre el caso) y deja
 * cada caso con el estado que le corresponde.
 */
function procesar(hojaPicking, hojaPedidos, casosExistentes) {
  const pedidos = indexarPedidos(hojaPedidos);
  const { intentos, bidf, parciales, incompletos, mapa } = construirIntentos(hojaPicking, pedidos);
  const tomas = indexarTomas(hojaPicking.filas, mapa);

  const porGrupo = new Map();
  casosExistentes.forEach((c) => {
    const lista = porGrupo.get(c.grupo) || [];
    lista.push(c);
    porGrupo.set(c.grupo, lista);
  });

  // Cada tarea de almacén se registra una sola vez: reimportar no duplica
  const tareasVistas = new Set();
  casosExistentes.forEach((c) => c.intentos.forEach((i) => tareasVistas.add(i.tarea)));

  const tocados = new Map();
  let nuevos = 0;
  let reintentos = 0;
  let duplicados = 0;

  intentos.forEach((intento) => {
    if (tareasVistas.has(intento.tarea)) { duplicados++; return; }
    tareasVistas.add(intento.tarea);

    const hermanos = porGrupo.get(intento.grupo) || [];
    const abierto = hermanos
      .filter((c) => c.estado !== 'Cerrado')
      .sort((a, b) => b.secuencia - a.secuencia)[0];

    if (abierto) {
      // Mismo problema que volvió a fallar: se suma al caso
      abierto.intentos.push(intento);
      tocados.set(abierto.id, abierto);
      reintentos++;
      return;
    }

    // Si el grupo ya tuvo casos cerrados, este es uno nuevo (volvió a pasar)
    const secuencia = hermanos.length
      ? Math.max(...hermanos.map((c) => c.secuencia)) + 1
      : 1;
    const caso = casoNuevo(intento, secuencia);
    hermanos.push(caso);
    porGrupo.set(intento.grupo, hermanos);
    tocados.set(caso.id, caso);
    nuevos++;
  });

  // Primero la cabecera, que es de donde sale la posición con la que se
  // busca la retoma
  tocados.forEach(refrescar);

  /* Retomas. Se revisa todo lo abierto, no solo lo que llegó en este
     archivo: así una toma limpia de hoy cierra un caso de ayer. */
  let reclasificados = 0;
  const abiertos = new Map();
  casosExistentes.forEach((c) => { if (c.estado !== 'Cerrado' && !c.resultado) abiertos.set(c.id, c); });
  tocados.forEach((c) => { if (c.estado !== 'Cerrado' && !c.resultado) abiertos.set(c.id, c); });

  abiertos.forEach((caso) => {
    if (caso.tipoFalla === 'parcial') return;      // no aplica: ver clasificar()
    if (caso.retoma) return;                       // ya tenía evidencia
    const retoma = buscarRetoma(caso, tomas);
    if (!retoma) return;
    caso.retoma = retoma;
    if (!tocados.has(caso.id)) reclasificados++;   // caso viejo que cambió
    tocados.set(caso.id, caso);
  });

  // Clasificación y estado de todo lo que se tocó
  tocados.forEach((caso) => {
    refrescar(caso);
    clasificar(caso);
    aplicarRegla(caso);
  });

  /* Columnas que no son obligatorias pero que, si faltan, dejan un ranking
     o un dato en blanco. Se avisa en el resumen para que no parezca un bug. */
  const OPCIONALES = {
    tipoAlmacen: 'Tipo de almacén',
    tipoStock: 'Tipo de stocks',
    item: 'Posición de documento',
    confirmadoPor: 'Confirmado por',
  };
  const faltantes = Object.entries(OPCIONALES)
    .filter(([campo]) => mapa[campo] === undefined)
    .map(([, nombre]) => nombre);

  const casos = [...tocados.values()];
  return {
    casos,
    bidf,
    nuevos,
    reintentos,
    duplicados,
    reclasificados,
    faltantes,
    incompletos,
    parciales,
    cerradosAuto: casos.filter((c) => c.cierreAutomatico).length,
  };
}

/* =========================================================================
   6. Estado en memoria
   ========================================================================= */

const App = {
  casos: [],
  filtrados: [],
  pagina: 1,
  porPagina: 50,
  orden: { campo: 'fecha', dir: 'desc' },
  archivos: { picking: null, pedidos: null },
  vista: 'kpi',
  grafico: null,
  filtroClasificacion: new Set(),
  filtroEstado: new Set(),
  site: SITES[0],
};

async function recargar() {
  App.casos = await DB.getCasos();
  $('#navTotal').textContent = numeroLindo(App.casos.length);
  $('#navAContar').textContent = numeroLindo(
    new Set(App.casos.filter((c) => c.estado === 'A contar')
      .map((c) => `${c.ubicacion}|${c.producto}`)).size,
  );
  aplicarFiltros();
  pintarKpi();
  pintarCiclicos();
}

/* =========================================================================
   7. Importar
   ========================================================================= */

function prepararCarga() {
  const zonas = [
    { zona: '#zonaPicking', input: '#filePicking', nombre: '#nombrePicking', clave: 'picking', titulo: 'Reporte de picking' },
    { zona: '#zonaPedidos', input: '#filePedidos', nombre: '#nombrePedidos', clave: 'pedidos', titulo: 'Reporte de pedidos' },
  ];

  zonas.forEach(({ zona, input, nombre, clave, titulo }) => {
    const elZona = $(zona);
    const elInput = $(input);

    const tomar = (file) => {
      App.archivos[clave] = file || null;
      $(nombre).textContent = file ? file.name : titulo;
      elZona.classList.toggle('is-cargado', !!file);
      revisarCarga();
    };

    elInput.addEventListener('change', () => tomar(elInput.files[0]));

    ['dragenter', 'dragover'].forEach((ev) => elZona.addEventListener(ev, (e) => {
      e.preventDefault();
      elZona.classList.add('is-encima');
    }));
    ['dragleave', 'drop'].forEach((ev) => elZona.addEventListener(ev, (e) => {
      e.preventDefault();
      elZona.classList.remove('is-encima');
    }));
    elZona.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file) tomar(file);
    });
  });

  $('#btnLimpiarCarga').addEventListener('click', () => {
    App.archivos = { picking: null, pedidos: null };
    $('#filePicking').value = '';
    $('#filePedidos').value = '';
    $('#nombrePicking').textContent = 'Reporte de picking';
    $('#nombrePedidos').textContent = 'Reporte de pedidos';
    $('#zonaPicking').classList.remove('is-cargado');
    $('#zonaPedidos').classList.remove('is-cargado');
    revisarCarga();
  });

  $('#btnProcesar').addEventListener('click', procesarArchivos);
  $('#btnVaciar').addEventListener('click', vaciarBase);
}

function revisarCarga() {
  const listo = !!App.archivos.picking;
  $('#btnProcesar').disabled = !listo;
  $('#estadoCarga').textContent = listo
    ? 'Listo para procesar.'
    : 'Cargá el reporte de picking.';
}

async function procesarArchivos() {
  const btn = $('#btnProcesar');
  btn.disabled = true;
  btn.textContent = 'Procesando…';

  try {
    const [hojaPic, hojaPed] = await Promise.all([
      leerExcel(App.archivos.picking),
      App.archivos.pedidos ? leerExcel(App.archivos.pedidos) : Promise.resolve(null),
    ]);

    if (!hojaPic.filas.length) throw new Error('El reporte de picking no tiene filas.');

    const r = procesar(hojaPic, hojaPed, await DB.getCasos());
    await DB.putCasos(r.casos);

    const registro = {
      ts: new Date().toISOString(),
      archivo: App.archivos.picking.name,
      filas: hojaPic.filas.length,
      bidf: r.bidf,
      nuevos: r.nuevos,
      reintentos: r.reintentos,
      duplicados: r.duplicados,
      reclasificados: r.reclasificados,
      cerradosAuto: r.cerradosAuto,
    };
    await DB.logImportacion(registro);

    mostrarResumen(registro, hojaPic.filas.length - r.bidf, r.faltantes, r.incompletos);
    await recargar();
    await pintarImportaciones();
    avisar(`${r.nuevos} casos nuevos, ${r.reintentos} reintentos, ${r.cerradosAuto} cerrados solos.`, 'ok');
  } catch (err) {
    console.error(err);
    avisar(err.message || 'No se pudo leer el archivo.', 'error');
  } finally {
    btn.textContent = 'Procesar';
    revisarCarga();
  }
}

function mostrarResumen(r, tomasLimpias, faltantes = [], incompletos = 0) {
  const datos = [
    ['Tareas con excepción', numeroLindo(r.bidf)],
    ['Casos nuevos', numeroLindo(r.nuevos)],
    ['Reintentos sumados', numeroLindo(r.reintentos)],
    ['Cerrados solos', numeroLindo(r.cerradosAuto)],
    ['Reclasificados', numeroLindo(r.reclasificados)],
    ['Tareas ya cargadas', numeroLindo(r.duplicados)],
  ];
  $('#resumenImport').innerHTML = datos.map(([k, v]) => `
    <div class="resumen__dato">
      <div class="resumen__valor">${v}</div>
      <div class="resumen__clave">${k}</div>
    </div>`).join('');

  const avisos = [
    tomasLimpias > 0
      ? `El archivo trajo ${numeroLindo(tomasLimpias)} tareas sin excepción, que son las que permiten detectar las retomas.`
      : 'Atención: el archivo no trae ninguna tarea sin excepción. Sin esas filas no hay forma de detectar las retomas y todo va a quedar como Nil Pick. Exportá el reporte de picking completo, sin filtrar por código de excepción.',
  ];

  if (incompletos) {
    avisos.push(`Se saltearon ${numeroLindo(incompletos)} filas BIDF sin documento, producto, ubicación o fecha de confirmación. Suelen ser filas en blanco del export o tramos internos de una tarea partida en dos.`);
  }

  if (faltantes.length) {
    avisos.push(`El reporte no trae ${faltantes.join(', ')}. Los casos se cargan igual, pero el ranking o el dato que sale de esa columna va a quedar en "(sin dato)". Si la necesitás, agregala al layout del export de SAP.`);
  }

  $('#detalleImport').innerHTML = avisos.map((t) => `<p>${esc(t)}</p>`).join('');
  $('#bloqueResumen').hidden = false;
}

async function pintarImportaciones() {
  const lista = await DB.getImportaciones();
  $('#vacioImportaciones').hidden = lista.length > 0;
  $('#tablaImportaciones').style.display = lista.length ? '' : 'none';

  $('#tablaImportaciones tbody').innerHTML = lista.slice(0, 30).map((r) => `
    <tr>
      <td>${momentoLindo(r.ts)}</td>
      <td>${esc(r.archivo)}</td>
      <td class="num">${numeroLindo(r.bidf)}</td>
      <td class="num">${numeroLindo(r.nuevos)}</td>
      <td class="num">${numeroLindo(r.reintentos)}</td>
      <td class="num">${numeroLindo(r.cerradosAuto)}</td>
      <td class="num">${numeroLindo(r.duplicados)}</td>
    </tr>`).join('');

  if (lista.length) $('#navUltima').textContent = `Última carga: ${momentoLindo(lista[0].ts)}`;
}

async function vaciarBase() {
  if (!confirm('Se borran todos los casos y los conteos cargados. ¿Confirmás?')) return;
  await DB.vaciarCasos();
  await recargar();
  avisar('Base vaciada.', 'ok');
}

/* =========================================================================
   8. Cíclicos
   -------------------------------------------------------------------------
   La unidad de conteo es la gaveta y el producto, no el pedido: el contador
   va a una ubicación y cuenta un item. Si tres pedidos fallaron sobre la
   misma gaveta, es un cíclico, no tres.
   ========================================================================= */

function unidades() {
  const mapa = new Map();

  App.casos.filter(requiereConteo).forEach((c) => {
    const clave = `${c.ubicacion}|${c.producto}`;
    const u = mapa.get(clave) || {
      clave,
      ubicacion: c.ubicacion,
      producto: c.producto,
      descripcion: c.descripcion,
      casos: [],
      documentos: new Set(),
      cantidad: 0,
      desde: '',
      nil: 0,
      repick: 0,
      parcial: 0,
      faltante: 0,
    };
    u.casos.push(c);
    u.documentos.add(c.documento);
    u.cantidad += aNumero(c.cantidad);
    if (!u.desde || (c.fecha && c.fecha < u.desde)) u.desde = c.fecha;
    if (c.clasificacion === 'Nil Pick') u.nil++;
    else if (c.clasificacion === 'Diferencia parcial') { u.parcial++; u.faltante += aNumero(c.faltante); }
    else u.repick++;
    if (!u.descripcion) u.descripcion = c.descripcion;
    mapa.set(clave, u);
  });

  return [...mapa.values()].map((u) => {
    // El conteo y el ajuste son de la gaveta, así que valen para todos sus casos
    const conConteo = u.casos.find((c) => c.resultado);
    u.resultado = conConteo ? conConteo.resultado : '';
    u.stockSistema = conConteo ? conConteo.stockSistema : '';
    u.contado = conConteo ? conConteo.cantidadContada : '';
    u.fechaConteo = conConteo ? conConteo.fechaConteo : '';
    u.diferencia = (hayNumero(u.contado) && hayNumero(u.stockSistema))
      ? Number(u.contado) - Number(u.stockSistema)
      : '';
    u.abiertos = u.casos.filter((c) => c.estado !== 'Cerrado').length;
    u.ajustado = u.casos.some((c) => c.ajustado);
    u.unidadesAjuste = u.casos.reduce((a, c) => (c.ajustado ? aNumero(c.unidadesAjuste) : a), 0);

    u.estado = u.abiertos === 0 ? 'Cerrado' : (u.resultado ? 'Contado' : 'A contar');
    const partes = [];
    if (u.nil) partes.push('Nil Pick');
    if (u.repick) partes.push('Repicking de otra gaveta');
    if (u.parcial) partes.push('Diferencia parcial');
    u.motivo = partes.join(' + ');
    u.clasePrincipal = u.parcial && !u.nil && !u.repick ? 'tag--parcial'
      : (u.nil ? 'tag--nil' : 'tag--repick');
    return u;
  }).sort((a, b) => {
    const orden = { 'A contar': 0, Contado: 1, Cerrado: 2 };
    if (orden[a.estado] !== orden[b.estado]) return orden[a.estado] - orden[b.estado];
    return String(a.ubicacion).localeCompare(String(b.ubicacion), 'es', { numeric: true });
  });
}

function unidadesFiltradas() {
  const filtro = $('#ciclicosFiltro').value;
  const q = normalizar($('#ciclicosBusqueda').value);
  return unidades().filter((u) => {
    if (filtro === 'pendientes' && u.estado !== 'A contar') return false;
    if (filtro === 'contados' && u.estado !== 'Contado') return false;
    if (filtro === 'abiertos' && u.estado === 'Cerrado') return false;
    if (q && !normalizar(`${u.ubicacion} ${u.producto} ${u.descripcion}`).includes(q)) return false;
    return true;
  });
}

function pintarCiclicos() {
  const todas = unidades();
  const lista = unidadesFiltradas();

  const resumen = [
    ['A contar', numeroLindo(todas.filter((u) => u.estado === 'A contar').length)],
    ['Contadas, sin ajustar', numeroLindo(todas.filter((u) => u.estado === 'Contado').length)],
    ['Cerradas', numeroLindo(todas.filter((u) => u.estado === 'Cerrado').length)],
    ['Gavetas distintas', numeroLindo(new Set(todas.map((u) => u.ubicacion)).size)],
    ['Casos alcanzados', numeroLindo(todas.reduce((a, u) => a + u.casos.length, 0))],
  ];
  $('#ciclicosResumen').innerHTML = resumen.map(([k, v]) => `
    <div class="resumen__dato">
      <div class="resumen__valor">${v}</div>
      <div class="resumen__clave">${k}</div>
    </div>`).join('');

  $('#ciclicosCuerpo').innerHTML = lista.map((u) => {
    const docs = [...u.documentos];
    const clase = u.estado === 'Cerrado' ? 'tag--ok' : (u.estado === 'Contado' ? 'tag--azul' : 'tag--estado');
    const dif = hayNumero(u.diferencia) && u.diferencia !== ''
      ? `<span class="${Number(u.diferencia) === 0 ? '' : 'dif'}">${Number(u.diferencia) > 0 ? '+' : ''}${numeroLindo(u.diferencia)}</span>`
      : '—';
    return `
      <tr data-clave="${esc(u.clave)}">
        <td><strong>${esc(u.ubicacion)}</strong></td>
        <td>${esc(u.producto)}</td>
        <td class="desc">${esc(u.descripcion)}</td>
        <td class="num">${u.casos.length}</td>
        <td>
          <span class="tag ${u.clasePrincipal}">${esc(u.motivo)}</span>
          ${u.faltante ? `<div class="menudo">faltan ${numeroLindo(u.faltante)} un. según SAP</div>` : ''}
        </td>
        <td>${fechaLinda(u.desde)}</td>
        <td class="num">${numeroLindo(u.cantidad)}</td>
        <td class="num">${hayNumero(u.contado) ? numeroLindo(u.contado) : '—'}</td>
        <td class="num">${dif}</td>
        <td><span class="tag ${clase}">${esc(u.estado)}</span>${u.ajustado ? ' <span class="tag tag--azul">ajustado</span>' : ''}</td>
        <td><button class="btn btn--chico${u.estado === 'A contar' ? ' btn--primario' : ''}" data-accion="abrir">${u.estado === 'A contar' ? 'Cargar conteo' : 'Ver'}</button></td>
      </tr>`;
  }).join('');

  $$('#ciclicosCuerpo button[data-accion="abrir"]').forEach((btn) => {
    btn.addEventListener('click', () => abrirUnidad(btn.closest('tr').dataset.clave));
  });

  $('#ciclicosVacio').hidden = lista.length > 0;
  $('#tablaCiclicos').style.display = lista.length ? '' : 'none';
}

/* =========================================================================
   9. Conteo y ajuste (modal)
   ========================================================================= */

let unidadAbierta = null;

function abrirUnidad(clave) {
  const u = unidades().find((x) => x.clave === clave);
  if (!u) return;
  unidadAbierta = u;

  $('#modalTitulo').textContent = `${u.ubicacion} · ${u.producto}`;
  $('#modalSub').textContent = u.descripcion || '';
  $('#modalCuerpo').innerHTML = plantillaUnidad(u);
  $('#modal').classList.add('is-abierto');
  conectarModal(u);
}

function cerrarModal() {
  $('#modal').classList.remove('is-abierto');
  unidadAbierta = null;
}

function plantillaUnidad(u) {
  const ficha = [
    ['Ubicación', esc(u.ubicacion)],
    ['Producto', esc(u.producto)],
    ['Casos sobre esta gaveta', `${u.casos.length} (${u.abiertos} abiertos)`],
    ['Cantidad de las tareas', numeroLindo(u.cantidad)],
    ['Primer fallo', fechaLinda(u.desde)],
    ['Motivo', esc(u.motivo)],
  ];
  if (u.faltante) {
    ficha.push(['Faltante medido por SAP', `${numeroLindo(u.faltante)} un.`]);
  }

  const casos = u.casos
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    .map((c) => `
      <li>
        <strong>${esc(c.documento)}</strong>${c.documentoErp ? ` · ERP ${esc(c.documentoErp)}` : ''}
        · item ${esc(c.item || '—')}
        · ${numeroLindo(c.cantidad)} un.
        · <span class="tag ${claseTag(c.clasificacion)}">${esc(c.clasificacion)}</span>
        <span class="tag tag--estado">${esc(c.estado)}</span>
        <div class="menudo">${esc(c.motivo)}</div>
        <div class="menudo">${c.intentos.map((i) => `${fechaLinda(i.fecha)} ${i.hora} · tarea ${esc(i.tarea)} · ${esc(i.usuario)}`).join(' — ')}</div>
      </li>`).join('');

  const abierto = u.estado !== 'Cerrado';

  return `
    <div class="ficha">
      ${ficha.map(([k, v]) => `<div><div class="ficha__clave">${k}</div><div class="ficha__valor">${v}</div></div>`).join('')}
    </div>

    <div class="paso" data-activo="${u.estado === 'A contar' ? 'si' : 'no'}">
      <div class="paso__titulo">1. Conteo de la gaveta</div>
      <div class="paso__grilla">
        <div class="campo">
          <label class="campo__etiqueta" for="inResultado">Resultado</label>
          <select id="inResultado">
            <option value="">Elegir…</option>
            <option value="Encontrado"${u.resultado === 'Encontrado' ? ' selected' : ''}>Encontrado</option>
            <option value="No encontrado"${u.resultado === 'No encontrado' ? ' selected' : ''}>No encontrado</option>
          </select>
        </div>
        <div class="campo">
          <label class="campo__etiqueta" for="inSistema">Stock del sistema</label>
          <input type="number" step="any" id="inSistema" value="${hayNumero(u.stockSistema) ? u.stockSistema : ''}" placeholder="Saldo en SAP">
        </div>
        <div class="campo">
          <label class="campo__etiqueta" for="inContado">Contado</label>
          <input type="number" step="any" id="inContado" value="${hayNumero(u.contado) ? u.contado : ''}" placeholder="Lo que había">
        </div>
        <div class="campo">
          <label class="campo__etiqueta" for="inContadoPor">Contado por</label>
          <input type="text" id="inContadoPor" value="${esc(u.casos[0].contadoPor || '')}">
        </div>
      </div>
      <div class="campo">
        <label class="campo__etiqueta" for="inObs">Observaciones</label>
        <textarea id="inObs">${esc(u.casos[0].observaciones || '')}</textarea>
      </div>
      <div class="paso__acciones">
        <button class="btn btn--primario" id="btnGuardarConteo">Guardar conteo</button>
        ${u.fechaConteo ? `<span class="barra__sub">Contado el ${momentoLindo(u.fechaConteo)}</span>` : ''}
      </div>
    </div>

    <div class="paso" data-activo="${u.estado === 'Contado' ? 'si' : 'no'}">
      <div class="paso__titulo">2. Ajuste y cierre</div>
      <div class="paso__grilla">
        <div class="campo">
          <label class="campo__etiqueta" for="inAjuste">Unidades ajustadas</label>
          <input type="number" step="any" id="inAjuste" value="${hayNumero(u.unidadesAjuste) && u.ajustado ? u.unidadesAjuste : ''}" placeholder="${hayNumero(u.diferencia) && u.diferencia !== '' ? u.diferencia : (u.faltante ? -u.faltante : 'Diferencia aplicada')}">
        </div>
      </div>
      <div class="paso__acciones">
        <button class="btn btn--primario" id="btnAjustar" ${u.resultado ? '' : 'disabled'}>Registrar ajuste y cerrar</button>
        <button class="btn" id="btnCerrarSinAjuste">Cerrar sin ajustar</button>
        ${!abierto ? `<button class="btn" id="btnReabrir">Reabrir</button>` : ''}
      </div>
      ${u.ajustado ? `<p class="barra__sub">Ajustado por ${numeroLindo(u.unidadesAjuste)} unidades.</p>` : ''}
    </div>

    <div class="paso">
      <div class="paso__titulo">Casos sobre esta gaveta</div>
      <ul class="lista">${casos}</ul>
    </div>`;
}

/** Guarda cambios en todos los casos de la gaveta: el conteo es de la gaveta. */
async function guardarUnidad(u, cambios) {
  const lista = u.casos.map((c) => ({ ...c, ...cambios }));
  await DB.putCasos(lista);
  await recargar();
  abrirUnidad(u.clave);
}

function conectarModal(u) {
  $('#btnGuardarConteo').addEventListener('click', async () => {
    const resultado = $('#inResultado').value;
    if (!resultado) { avisar('Elegí si el material se encontró o no.', 'error'); return; }
    const contado = $('#inContado').value;
    const sistema = $('#inSistema').value;

    await guardarUnidad(u, {
      resultado,
      stockSistema: sistema === '' ? '' : Number(sistema),
      cantidadContada: contado === '' ? '' : Number(contado),
      contadoPor: $('#inContadoPor').value,
      observaciones: $('#inObs').value,
      fechaConteo: new Date().toISOString(),
      estado: 'Contado',
      cerradoAMano: false,
      fechaCierre: '',
    });
    avisar(`Conteo guardado para ${u.ubicacion}: ${resultado}.`, 'ok');
  });

  $('#btnAjustar').addEventListener('click', async () => {
    const campo = $('#inAjuste').value;
    const unidades = campo !== '' ? Number(campo)
      : (hayNumero(u.diferencia) && u.diferencia !== '' ? Number(u.diferencia)
        : (u.faltante ? -u.faltante : 0));

    await guardarUnidad(u, {
      ajustado: true,
      unidadesAjuste: unidades,
      estado: 'Cerrado',
      cerradoAMano: true,
      fechaCierre: new Date().toISOString(),
    });
    avisar(`Ajuste registrado: ${numeroLindo(unidades)} unidades.`, 'ok');
  });

  $('#btnCerrarSinAjuste').addEventListener('click', async () => {
    await guardarUnidad(u, {
      ajustado: false,
      unidadesAjuste: '',
      estado: 'Cerrado',
      cerradoAMano: true,
      fechaCierre: new Date().toISOString(),
    });
    avisar('Cerrado sin ajuste.', 'ok');
  });

  const btnReabrir = $('#btnReabrir');
  if (btnReabrir) {
    btnReabrir.addEventListener('click', async () => {
      await guardarUnidad(u, {
        estado: u.resultado ? 'Contado' : 'A contar',
        cerradoAMano: false,
        cierreAutomatico: false,
        fechaCierre: '',
      });
      avisar('Reabierto.', 'ok');
    });
  }
}

/* =========================================================================
   10. Casos: filtros y tabla
   ========================================================================= */

const CAMPOS_TEXTO = ['#fBusqueda', '#fDesde', '#fHasta'];

function pintarChips(contenedor, valores, seleccion) {
  $(contenedor).innerHTML = valores.map((v) => `
    <button type="button" class="chip${seleccion.has(v) ? ' is-activo' : ''}" data-valor="${esc(v)}" aria-pressed="${seleccion.has(v)}">${esc(v)}</button>`).join('');

  $$(`${contenedor} .chip`).forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.valor;
      if (seleccion.has(v)) seleccion.delete(v); else seleccion.add(v);
      pintarChips(contenedor, valores, seleccion);
      App.pagina = 1;
      aplicarFiltros();
    });
  });
}

function prepararFiltros() {
  pintarChips('#fClasificacion', CLASIFICACIONES, App.filtroClasificacion);
  pintarChips('#fEstado', ESTADOS, App.filtroEstado);

  CAMPOS_TEXTO.forEach((sel) => {
    $(sel).addEventListener('input', () => { App.pagina = 1; aplicarFiltros(); });
  });

  $('#btnLimpiarFiltros').addEventListener('click', () => {
    CAMPOS_TEXTO.forEach((sel) => { $(sel).value = ''; });
    App.filtroClasificacion.clear();
    App.filtroEstado.clear();
    pintarChips('#fClasificacion', CLASIFICACIONES, App.filtroClasificacion);
    pintarChips('#fEstado', ESTADOS, App.filtroEstado);
    App.pagina = 1;
    aplicarFiltros();
  });

  $$('#tablaCasos th[data-orden]').forEach((th) => {
    th.addEventListener('click', () => {
      const campo = th.dataset.orden;
      App.orden = {
        campo,
        dir: App.orden.campo === campo && App.orden.dir === 'asc' ? 'desc' : 'asc',
      };
      pintarCasos();
    });
  });

  $('#btnPrev').addEventListener('click', () => { if (App.pagina > 1) { App.pagina--; pintarCasos(); } });
  $('#btnNext').addEventListener('click', () => {
    const max = Math.max(1, Math.ceil(App.filtrados.length / App.porPagina));
    if (App.pagina < max) { App.pagina++; pintarCasos(); }
  });

  $('#ciclicosFiltro').addEventListener('change', pintarCiclicos);
  $('#ciclicosBusqueda').addEventListener('input', pintarCiclicos);
}

function aplicarFiltros() {
  const q = normalizar($('#fBusqueda').value);
  const desde = $('#fDesde').value;
  const hasta = $('#fHasta').value;

  App.filtrados = App.casos.filter((c) => {
    if (desde && (!c.fecha || c.fecha < desde)) return false;
    if (hasta && (!c.fecha || c.fecha > hasta)) return false;
    if (App.filtroClasificacion.size && !App.filtroClasificacion.has(c.clasificacion)) return false;
    if (App.filtroEstado.size && !App.filtroEstado.has(c.estado)) return false;
    if (q) {
      const todo = normalizar([
        c.documento, c.documentoErp, c.item, c.producto, c.descripcion,
        c.ubicacion, c.usuario, c.estado, c.clasificacion, c.destinatario, c.observaciones,
      ].join(' '));
      if (!todo.includes(q)) return false;
    }
    return true;
  });

  pintarCasos();
}

function pintarCasos() {
  const { campo, dir } = App.orden;
  const signo = dir === 'asc' ? 1 : -1;

  const lista = App.filtrados.slice().sort((a, b) => {
    const va = a[campo] ?? '';
    const vb = b[campo] ?? '';
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * signo;
    return String(va).localeCompare(String(vb), 'es', { numeric: true }) * signo;
  });

  const maxPag = Math.max(1, Math.ceil(lista.length / App.porPagina));
  if (App.pagina > maxPag) App.pagina = maxPag;
  const desde = (App.pagina - 1) * App.porPagina;

  $('#tablaCasos tbody').innerHTML = lista.slice(desde, desde + App.porPagina).map((c) => `
    <tr data-clave="${esc(`${c.ubicacion}|${c.producto}`)}">
      <td>${fechaLinda(c.fecha)}</td>
      <td>${esc(c.documento)}${c.documentoErp ? `<div class="menudo">${esc(c.documentoErp)}</div>` : ''}</td>
      <td class="num">${c.intentosCant}</td>
      <td>${esc(c.producto)}</td>
      <td class="desc">${esc(c.descripcion)}</td>
      <td class="num">${numeroLindo(c.cantidad)}</td>
      <td>${esc(c.ubicacion)}</td>
      <td>${esc(c.usuario)}</td>
      <td>
        <span class="tag ${claseTag(c.clasificacion)}">${esc(c.clasificacion)}</span>
        ${c.tipoRepicking ? `<div class="menudo">${esc(c.tipoRepicking)}</div>` : ''}
      </td>
      <td><span class="tag ${c.estado === 'Cerrado' ? 'tag--ok' : (c.estado === 'Contado' ? 'tag--azul' : 'tag--estado')}">${esc(c.estado)}</span>${c.cierreAutomatico ? '<div class="menudo">cerró solo</div>' : ''}</td>
      <td>${requiereConteo(c) ? '<button class="btn btn--chico" data-accion="abrir">Ver gaveta</button>' : ''}</td>
    </tr>`).join('');

  $$('#tablaCasos tbody button[data-accion="abrir"]').forEach((btn) => {
    btn.addEventListener('click', () => abrirUnidad(btn.closest('tr').dataset.clave));
  });

  $('#vacioCasos').hidden = lista.length > 0;
  $('#paginadoInfo').textContent = `${numeroLindo(lista.length)} casos de ${numeroLindo(App.casos.length)}`;
  $('#paginaActual').textContent = `Página ${App.pagina} de ${maxPag}`;
  $('#btnPrev').disabled = App.pagina <= 1;
  $('#btnNext').disabled = App.pagina >= maxPag;
}

/* =========================================================================
   11. KPI mensual
   -------------------------------------------------------------------------
   El número con el que te miden. Se puede contar por casos (un problema es
   uno, aunque haya fallado tres veces) o por tareas BIDF, que es lo que
   reconcilia contra SAP.
   ========================================================================= */

/** Agrupa todo el histórico por mes. */
function porMes() {
  const meses = new Map();

  App.casos.forEach((c) => {
    if (!c.fecha) return;
    const clave = c.fecha.slice(0, 7);
    const m = meses.get(clave) || {
      clave, nil: 0, repick: 0, parcial: 0, faltante: 0, total: 0, tareas: 0,
      enSitio: 0, otraGaveta: 0,
      gavetas: new Set(), contadas: new Set(), ajustadas: new Set(), encontradas: new Set(),
      unidades: 0,
    };

    if (c.clasificacion === 'Nil Pick') m.nil++;
    else if (c.clasificacion === 'Diferencia parcial') { m.parcial++; m.faltante += aNumero(c.faltante); }
    else m.repick++;
    if (c.tipoRepicking === 'En sitio') m.enSitio++;
    if (c.tipoRepicking === 'Desde otra ubicación') m.otraGaveta++;
    m.total++;
    m.tareas += c.intentosCant || c.intentos.length;

    if (requiereConteo(c)) {
      const gaveta = `${c.ubicacion}|${c.producto}`;
      m.gavetas.add(gaveta);
      if (c.resultado) m.contadas.add(gaveta);
      if (c.resultado === 'Encontrado') m.encontradas.add(gaveta);
      if (c.ajustado && !m.ajustadas.has(gaveta)) {
        m.ajustadas.add(gaveta);
        m.unidades += Math.abs(aNumero(c.unidadesAjuste));
      }
    }

    meses.set(clave, m);
  });

  return [...meses.values()].sort((a, b) => (a.clave < b.clave ? -1 : 1));
}

function kpisDelMes(m, unidad) {
  if (!m) return null;
  const factor = unidad === 'tareas';
  return {
    total: factor ? m.tareas : m.total,
    nil: m.nil,
    repick: m.repick,
    parcial: m.parcial,
    faltante: m.faltante,
    enSitio: m.enSitio,
    otraGaveta: m.otraGaveta,
    tareas: m.tareas,
    casos: m.total,
    gavetas: m.gavetas.size,
    contadas: m.contadas.size,
    pendientes: m.gavetas.size - m.contadas.size,
    ajustadas: m.ajustadas.size,
    unidades: m.unidades,
    hallazgo: m.contadas.size ? (m.encontradas.size / m.contadas.size) * 100 : null,
  };
}

/** Variación contra el mes anterior. Sin mes anterior cargado, no compara. */
function variacion(actual, previo) {
  if (previo === null || previo === undefined) return '';
  const dif = actual - previo;
  if (!dif) return '<span class="delta">igual que el mes anterior</span>';
  const clase = dif > 0 ? 'delta delta--sube' : 'delta delta--baja';
  return `<span class="${clase}">${dif > 0 ? '+' : ''}${numeroLindo(dif)} vs. mes anterior</span>`;
}

function tarjeta(clave, valor, pie = '', clase = '') {
  return `
    <div class="kpi ${clase}">
      <div>
        <div class="kpi__valor">${valor}</div>
        <div class="kpi__clave">${clave}</div>
        ${pie ? `<div class="kpi__pie">${pie}</div>` : ''}
      </div>
    </div>`;
}

function pintarKpi() {
  const meses = porMes();
  const unidad = $('#kpiUnidad').value;

  // Si no eligieron mes, se arranca en el último con datos
  if (!$('#kpiMes').value && meses.length) $('#kpiMes').value = meses[meses.length - 1].clave;
  const clave = $('#kpiMes').value;

  const m = meses.find((x) => x.clave === clave);
  const i = meses.findIndex((x) => x.clave === clave);
  const previo = i > 0 ? meses[i - 1] : null;
  const k = kpisDelMes(m, unidad);
  const kp = kpisDelMes(previo, unidad);

  $('#kpiRango').textContent = clave
    ? `${mesLindo(clave)}${previo ? ` · se compara contra ${mesLindo(previo.clave)}` : ' · sin mes anterior cargado'}`
    : 'Sin datos cargados';

  $('#kpis').innerHTML = !k ? '' : [
    tarjeta('Nil Picks', numeroLindo(k.nil), variacion(k.nil, kp ? kp.nil : null), 'kpi--nil'),
    tarjeta('Repicking', numeroLindo(k.repick),
      `${numeroLindo(k.enSitio)} en la misma gaveta · ${numeroLindo(k.otraGaveta)} de otra`
      + variacion(k.repick, kp ? kp.repick : null), 'kpi--repick'),
    tarjeta('Diferencia parcial', numeroLindo(k.parcial),
      `${numeroLindo(k.faltante)} unidades faltantes`
      + variacion(k.parcial, kp ? kp.parcial : null), 'kpi--parcial'),
    tarjeta(unidad === 'tareas' ? 'Tareas con excepción' : 'Casos con excepción', numeroLindo(k.total),
      unidad === 'tareas' ? `${numeroLindo(k.casos)} casos` : `${numeroLindo(k.tareas)} tareas en SAP`),
    tarjeta('Gavetas a cíclico', numeroLindo(k.gavetas),
      `${numeroLindo(k.pendientes)} sin contar todavía`),
    tarjeta('Contadas', numeroLindo(k.contadas),
      k.hallazgo === null ? 'Todavía no se contó nada' : `${k.hallazgo.toFixed(0)}% apareció`),
    tarjeta('Ajustadas', numeroLindo(k.ajustadas),
      `${numeroLindo(k.unidades)} unidades`, 'kpi--alerta'),
  ].join('');

  // Tabla mes a mes
  $('#mesesVacio').hidden = meses.length > 0;
  $('#tablaMeses').style.display = meses.length ? '' : 'none';
  $('#mesesCuerpo').innerHTML = meses.slice().reverse().map((x) => `
    <tr${x.clave === clave ? ' class="is-foco"' : ''}>
      <td><strong>${mesLindo(x.clave)}</strong></td>
      <td class="num">${numeroLindo(x.nil)}</td>
      <td class="num">${numeroLindo(x.repick)}</td>
      <td class="num">${numeroLindo(x.parcial)}</td>
      <td class="num">${numeroLindo(x.faltante)}</td>
      <td class="num"><strong>${numeroLindo(x.total)}</strong></td>
      <td class="num">${numeroLindo(x.tareas)}</td>
      <td class="num">${numeroLindo(x.gavetas.size)}</td>
      <td class="num">${numeroLindo(x.contadas.size)}</td>
      <td class="num">${numeroLindo(x.ajustadas.size)}</td>
      <td class="num">${numeroLindo(x.unidades)}</td>
    </tr>`).join('');

  dibujarGrafico(meses.slice(-12), unidad);
  pintarRankings();
}

/* ------------------------- Dónde se concentra -------------------------- */

/* Las cuatro dimensiones que sirven para saber dónde atacar el problema.
   `porIntento` marca las que cambian entre un intento y otro de la misma
   línea: el usuario puede ser distinto cada vez, la gaveta no. */
const DIMENSIONES = [
  { campo: 'usuario', titulo: 'Usuarios', etiqueta: 'Usuario', porIntento: true },
  { campo: 'tipoAlmacen', titulo: 'Tipos de almacén', etiqueta: 'Tipo', porIntento: false },
  { campo: 'ubicacion', titulo: 'Ubicaciones', etiqueta: 'Gaveta', porIntento: false },
  { campo: 'producto', titulo: 'Productos', etiqueta: 'Producto', porIntento: false },
];

/**
 * Cuenta ocurrencias por una dimensión, separando Nil Pick de Repicking.
 *
 * Por tareas se cuenta cada intento fallido; por casos, cada problema una
 * sola vez. Para el usuario, además, contar por tareas usa el usuario de
 * cada intento y no el del último, que es lo que corresponde cuando la misma
 * línea la pickearon personas distintas.
 */
function ranking(lista, dim, unidad, tope) {
  const cuenta = new Map();

  const sumar = (clave, clasificacion, cant) => {
    const r = cuenta.get(clave) || { clave, total: 0, nil: 0, repick: 0, parcial: 0 };
    r.total += cant;
    if (clasificacion === 'Nil Pick') r.nil += cant;
    else if (clasificacion === 'Diferencia parcial') r.parcial += cant;
    else r.repick += cant;
    cuenta.set(clave, r);
  };

  lista.forEach((c) => {
    if (unidad === 'tareas' && dim.porIntento) {
      c.intentos.forEach((i) => sumar(limpiar(i[dim.campo]) || '(sin dato)', c.clasificacion, 1));
    } else {
      const clave = limpiar(c[dim.campo]) || '(sin dato)';
      sumar(clave, c.clasificacion, unidad === 'tareas' ? (c.intentosCant || c.intentos.length) : 1);
    }
  });

  const filas = [...cuenta.values()].sort((a, b) => b.total - a.total || String(a.clave).localeCompare(String(b.clave), 'es', { numeric: true }));
  const total = filas.reduce((a, f) => a + f.total, 0);
  const mostradas = tope > 0 ? filas.slice(0, tope) : filas;

  return {
    dim,
    filas: mostradas,
    total,
    distintos: filas.length,
    resto: filas.length - mostradas.length,
    restoTotal: filas.slice(mostradas.length).reduce((a, f) => a + f.total, 0),
    maximo: filas.length ? filas[0].total : 0,
  };
}

/** Descripción del producto, para que el ranking no sea solo un código. */
function descripcionDe(lista, producto) {
  const c = lista.find((x) => x.producto === producto && x.descripcion);
  return c ? c.descripcion : '';
}

function rankingsDelPeriodo() {
  const alcance = $('#rankAlcance').value;
  const clave = $('#kpiMes').value;
  return alcance === 'todo'
    ? App.casos
    : App.casos.filter((c) => c.fecha && c.fecha.slice(0, 7) === clave);
}

function pintarRankings() {
  const lista = rankingsDelPeriodo();
  const unidad = $('#kpiUnidad').value;
  const tope = Number($('#rankTope').value);
  const palabra = unidad === 'tareas' ? 'tareas BIDF' : 'casos';

  $('#rankings').innerHTML = DIMENSIONES.map((dim) => {
    const r = ranking(lista, dim, unidad, tope);

    if (!r.filas.length) {
      return `
        <div class="rank">
          <div class="rank__titulo">${dim.titulo}</div>
          <div class="rank__vacio">Sin datos en el período.</div>
        </div>`;
    }

    const filas = r.filas.map((f) => {
      const ancho = r.maximo ? Math.max(2, (f.total / r.maximo) * 100) : 0;
      const porcentaje = r.total ? (f.total / r.total) * 100 : 0;
      const detalle = dim.campo === 'producto' ? descripcionDe(lista, f.clave) : '';
      return `
        <tr>
          <td class="rank__celda">
            <span class="rank__barra" style="width:${ancho.toFixed(1)}%"></span>
            <span class="rank__texto">${esc(f.clave)}</span>
            ${detalle ? `<div class="menudo">${esc(detalle)}</div>` : ''}
          </td>
          <td class="num"><strong>${numeroLindo(f.total)}</strong><div class="menudo">${porcentaje.toFixed(0)}%</div></td>
          <td class="num">${numeroLindo(f.nil)}</td>
          <td class="num">${numeroLindo(f.repick)}</td>
          <td class="num">${numeroLindo(f.parcial)}</td>
        </tr>`;
    }).join('');

    const pie = r.resto > 0
      ? `<tr class="rank__resto"><td>Otros ${numeroLindo(r.resto)}</td><td class="num">${numeroLindo(r.restoTotal)}</td><td colspan="3"></td></tr>`
      : '';

    return `
      <div class="rank">
        <div class="rank__titulo">${dim.titulo}
          <span class="rank__sub">${numeroLindo(r.distintos)} distintos · ${numeroLindo(r.total)} ${palabra}</span>
        </div>
        <table class="tabla tabla--rank">
          <thead>
            <tr>
              <th>${dim.etiqueta}</th>
              <th class="num">Total</th>
              <th class="num">Nil</th>
              <th class="num">Repick</th>
              <th class="num">Parc.</th>
            </tr>
          </thead>
          <tbody>${filas}${pie}</tbody>
        </table>
      </div>`;
  }).join('');
}

function dibujarGrafico(meses, unidad) {
  const canvas = $('#gMensual');
  if (!canvas || typeof Chart === 'undefined') return;

  const datos = {
    labels: meses.map((m) => mesLindo(m.clave)),
    datasets: [
      { label: 'Nil Picks', data: meses.map((m) => m.nil), backgroundColor: '#B26A00' },
      { label: 'Repicking', data: meses.map((m) => m.repick), backgroundColor: '#1F7A4C' },
      { label: 'Diferencia parcial', data: meses.map((m) => m.parcial), backgroundColor: '#6C4BA6' },
    ],
  };

  if (App.grafico) {
    App.grafico.data = datos;
    App.grafico.update();
    return;
  }

  App.grafico = new Chart(canvas, {
    type: 'bar',
    data: datos,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
      },
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

/* =========================================================================
   12. Exportación
   ========================================================================= */

function nombreArchivo(base, ext) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${base}_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}

function bajarExcel(hojas, base) {
  const libro = XLSX.utils.book_new();
  Object.entries(hojas).forEach(([nombre, filas]) => {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), nombre);
  });
  XLSX.writeFile(libro, nombreArchivo(base, 'xlsx'));
  avisar('Excel generado.', 'ok');
}

function bajarCsv(filas, base) {
  if (!filas.length) { avisar('No hay datos para exportar.', 'error'); return; }
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(filas), { FS: ';' });
  // Punto y coma y BOM: así Excel en español lo abre bien de una
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo(base, 'csv');
  a.click();
  URL.revokeObjectURL(url);
  avisar('CSV generado.', 'ok');
}

function filasCasos(lista) {
  return lista.map((c) => ({
    'Documento': c.documento,
    'Documento ERP': c.documentoErp || '',
    'Posición': c.item,
    'Producto': c.producto,
    'Descripción': c.descripcion,
    'Cantidad tarea': c.cantidad,
    'Cantidad sacada': c.tipoFalla === 'parcial' ? c.sacado : '',
    'Faltante medido por SAP': c.tipoFalla === 'parcial' ? c.faltante : '',
    'Código de excepción': c.codigoExcepcion || '',
    'Ubicación': c.ubicacion,
    'Usuario': c.usuario,
    'Clasificación': c.clasificacion,
    'Tipo de repicking': c.tipoRepicking || '',
    'Motivo': c.motivo,
    'Retoma desde': c.retoma ? c.retoma.ubicacion : '',
    'Tarea de la retoma': c.retoma ? c.retoma.tarea : '',
    'Primer intento': c.fecha,
    'Hora': c.hora,
    'Último intento': c.fechaUltimo,
    'Intentos': c.intentosCant,
    'Tareas BIDF': c.intentos.map((i) => i.tarea).join(' / '),
    'Estado': c.estado,
    'Resultado del conteo': c.resultado || '',
    'Stock sistema': hayNumero(c.stockSistema) ? c.stockSistema : '',
    'Contado': hayNumero(c.cantidadContada) ? c.cantidadContada : '',
    'Diferencia': (hayNumero(c.cantidadContada) && hayNumero(c.stockSistema))
      ? Number(c.cantidadContada) - Number(c.stockSistema) : '',
    'Ajustado': c.ajustado ? 'Sí' : 'No',
    'Unidades ajustadas': hayNumero(c.unidadesAjuste) ? c.unidadesAjuste : '',
    'Fecha de cierre': c.fechaCierre ? c.fechaCierre.slice(0, 10) : '',
    'Destinatario': c.destinatario || '',
    'Observaciones': c.observaciones || '',
  }));
}

function filasMeses() {
  return porMes().map((m) => ({
    'Mes': m.clave,
    'Nil Picks': m.nil,
    'Repicking': m.repick,
    'Repicking misma gaveta': m.enSitio,
    'Repicking otra gaveta': m.otraGaveta,
    'Diferencia parcial': m.parcial,
    'Unidades faltantes': m.faltante,
    'Total casos': m.total,
    'Tareas con excepción': m.tareas,
    'Gavetas a cíclico': m.gavetas.size,
    'Contadas': m.contadas.size,
    'Ajustadas': m.ajustadas.size,
    'Unidades ajustadas': m.unidades,
  }));
}

/** Los cuatro rankings, cada uno como una hoja del Excel. */
function hojasRankings() {
  const lista = rankingsDelPeriodo();
  const unidad = $('#kpiUnidad').value;
  const hojas = {};

  DIMENSIONES.forEach((dim) => {
    const r = ranking(lista, dim, unidad, 0);          // en el Excel va todo
    hojas[`Por ${dim.titulo.toLowerCase()}`] = r.filas.map((f) => ({
      [dim.etiqueta]: f.clave,
      ...(dim.campo === 'producto' ? { 'Descripción': descripcionDe(lista, f.clave) } : {}),
      'Total': f.total,
      'Nil Picks': f.nil,
      'Repicking': f.repick,
      'Diferencia parcial': f.parcial,
      '% del total': r.total ? Number(((f.total / r.total) * 100).toFixed(1)) : 0,
    }));
  });

  return hojas;
}

/** Planilla para imprimir y darle al contador: sin la cantidad del sistema. */
function filasPlanilla() {
  return unidadesFiltradas().map((u) => ({
    'Ubicación': u.ubicacion,
    'Producto': u.producto,
    'Descripción': u.descripcion,
    'Contado': '',
    'Contado por': '',
    'Fecha': '',
    'Observaciones': '',
  }));
}

function filasCiclicos() {
  return unidadesFiltradas().map((u) => ({
    'Ubicación': u.ubicacion,
    'Producto': u.producto,
    'Descripción': u.descripcion,
    'Motivo': u.motivo,
    'Casos': u.casos.length,
    'Documentos': [...u.documentos].join(' / '),
    'Primer fallo': u.desde,
    'Cantidad de las tareas': u.cantidad,
    'Faltante medido por SAP': u.faltante || '',
    'Estado': u.estado,
    'Resultado': u.resultado || '',
    'Stock sistema': hayNumero(u.stockSistema) ? u.stockSistema : '',
    'Contado': hayNumero(u.contado) ? u.contado : '',
    'Diferencia': u.diferencia === '' ? '' : u.diferencia,
    'Ajustado': u.ajustado ? 'Sí' : 'No',
    'Unidades ajustadas': u.ajustado ? u.unidadesAjuste : '',
  }));
}

/* =========================================================================
   13. Navegación y arranque
   ========================================================================= */

const VISTAS = {
  kpi: {
    titulo: 'KPI mensual',
    sub: 'Nil Picks y Repickings de la operación, mes a mes',
    acciones: `
      <button class="btn" data-exp="meses-csv">CSV</button>
      <button class="btn btn--primario" data-exp="meses-xlsx">Excel</button>`,
  },
  ciclicos: {
    titulo: 'Cíclicos',
    sub: 'Las gavetas a contar para gestionar los ajustes',
    acciones: `
      <button class="btn" data-exp="ciclicos-xlsx">Detalle (Excel)</button>
      <button class="btn" data-exp="planilla-xlsx">Planilla (Excel)</button>
      <button class="btn btn--primario" data-exp="imprimir">Imprimir planilla</button>`,
  },
  casos: {
    titulo: 'Casos',
    sub: 'Cada excepción BIDF, con su motivo y su evidencia',
    acciones: `
      <button class="btn" data-exp="casos-csv">CSV</button>
      <button class="btn btn--primario" data-exp="casos-xlsx">Excel</button>`,
  },
  importar: {
    titulo: 'Importar',
    sub: 'El reporte de picking del día',
    acciones: '',
  },
};

function irA(vista) {
  App.vista = vista;
  $$('.vista').forEach((v) => v.classList.toggle('is-activa', v.id === `vista-${vista}`));
  $$('.nav__item').forEach((b) => b.setAttribute('aria-current', String(b.dataset.vista === vista)));

  const def = VISTAS[vista];
  $('#barraTitulo').textContent = def.titulo;
  $('#barraSub').textContent = def.sub;
  $('#barraAcciones').innerHTML = def.acciones;

  $$('#barraAcciones button').forEach((btn) => {
    btn.addEventListener('click', () => {
      switch (btn.dataset.exp) {
        case 'meses-csv': bajarCsv(filasMeses(), 'NilPicks_KPI_mensual'); break;
        case 'meses-xlsx':
          bajarExcel({ 'KPI mensual': filasMeses(), ...hojasRankings() }, 'NilPicks_KPI_mensual');
          break;
        case 'casos-csv': bajarCsv(filasCasos(App.filtrados), 'NilPicks_Casos'); break;
        case 'casos-xlsx': bajarExcel({ Casos: filasCasos(App.filtrados), 'KPI mensual': filasMeses() }, 'NilPicks_Casos'); break;
        case 'ciclicos-xlsx': {
          const filas = filasCiclicos();
          if (!filas.length) { avisar('No hay cíclicos para exportar.', 'error'); break; }
          bajarExcel({ Cíclicos: filas }, 'Ciclicos_Detalle');
          break;
        }
        case 'planilla-xlsx': {
          const filas = filasPlanilla();
          if (!filas.length) { avisar('No hay cíclicos para exportar.', 'error'); break; }
          bajarExcel({ Planilla: filas }, 'Planilla_Conteo');
          break;
        }
        case 'imprimir': window.print(); break;
        default: break;
      }
    });
  });

  if (vista === 'kpi') pintarKpi();
  if (vista === 'ciclicos') pintarCiclicos();
}

function pintarSite() {
  const logo = App.site.logo && LOGOS[App.site.logo];
  $('#siteLogo').innerHTML = logo
    ? `<img src="${logo}" alt="${esc(App.site.nombre)}">`
    : `<span class="site__texto">${esc(App.site.nombre)}</span>`;
  $('#siteDetalle').textContent = App.site.detalle || '';
}

function prepararSite() {
  const sel = $('#siteSelector');
  sel.innerHTML = SITES.map((s) => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('');
  sel.addEventListener('change', async () => {
    App.site = SITES.find((s) => s.id === sel.value) || SITES[0];
    await DB.setConfig('site', App.site.id);
    pintarSite();
  });
}

async function iniciar() {
  $('#logoCeva').src = LOGOS.ceva;
  $('#logoInventario').src = LOGOS.inventario;

  $$('.nav__item').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
  $('#btnCerrarModal').addEventListener('click', cerrarModal);
  $('#btnCerrarModal2').addEventListener('click', cerrarModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

  prepararCarga();
  prepararFiltros();
  prepararSite();
  $('#kpiMes').addEventListener('change', pintarKpi);
  $('#kpiUnidad').addEventListener('change', pintarKpi);
  $('#rankAlcance').addEventListener('change', pintarRankings);
  $('#rankTope').addEventListener('change', pintarRankings);

  await DB.open();

  const siteId = await DB.getConfig('site', SITES[0].id);
  App.site = SITES.find((x) => x.id === siteId) || SITES[0];
  $('#siteSelector').value = App.site.id;
  pintarSite();

  await recargar();
  await pintarImportaciones();

  irA(App.casos.length ? 'kpi' : 'importar');
}

document.addEventListener('DOMContentLoaded', iniciar);
