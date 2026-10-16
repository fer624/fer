/* =========================================================================
   db.js  —  Persistencia en IndexedDB
   -------------------------------------------------------------------------
   Todo vive en el navegador de esta PC. No hay servidor ni red.

   Stores:
     · casos          -> un caso por pedido + producto + ubicación
     · importaciones  -> histórico de cargas (para saber si ya cargaste el día)
     · config         -> preferencias (site elegido)
   ========================================================================= */

const DB = (() => {
  const DB_NAME = 'nilpicks';
  const DB_VERSION = 1;
  const CASOS = 'casos';
  const IMPORT = 'importaciones';
  const CONFIG = 'config';

  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(CASOS)) db.createObjectStore(CASOS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(IMPORT)) db.createObjectStore(IMPORT, { keyPath: 'ts' });
        if (!db.objectStoreNames.contains(CONFIG)) db.createObjectStore(CONFIG, { keyPath: 'clave' });
      };

      req.onsuccess = (ev) => { _db = ev.target.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  /** Corre una transacción de escritura y resuelve cuando terminó. */
  async function escribir(store, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      fn(tx.objectStore(store));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Lee todo un store. */
  async function leerTodo(store) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    open,

    getCasos: () => leerTodo(CASOS),
    putCasos: (casos) => escribir(CASOS, (st) => casos.forEach((c) => st.put(c))),
    vaciarCasos: () => escribir(CASOS, (st) => st.clear()),

    logImportacion: (entrada) => escribir(IMPORT, (st) => st.put(entrada)),
    getImportaciones: async () => (await leerTodo(IMPORT)).sort((a, b) => (a.ts < b.ts ? 1 : -1)),

    async getConfig(clave, porDefecto = null) {
      const todas = await leerTodo(CONFIG);
      const r = todas.find((x) => x.clave === clave);
      return r ? r.valor : porDefecto;
    },
    setConfig: (clave, valor) => escribir(CONFIG, (st) => st.put({ clave, valor })),
  };
})();
