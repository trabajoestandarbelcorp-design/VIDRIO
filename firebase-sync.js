// ============================================
// Firebase Realtime Database Sync Module
// ============================================
// Maneja: solicitudes, abastecimientos, anulaciones, kanban_estado, historial

// Esperar a que Firebase esté disponible globalmente desde el CDN
window.firebaseInitPromise = new Promise((resolve, reject) => {
  const checkFirebase = () => {
    console.log('🔍 Verificando Firebase...', { firebase: !!window.firebase, database: !!window.firebase?.database });
    
    if (window.firebase && window.firebase.database && window.firebase.auth) {
      const firebaseConfig = {
        apiKey: "AIzaSyAvvv7A9y91tyCC8fn26NZy9AlLOXultSg",
        authDomain: "vidrio-71ef2.firebaseapp.com",
        databaseURL: "https://vidrio-71ef2-default-rtdb.firebaseio.com",
        projectId: "vidrio-71ef2",
        storageBucket: "vidrio-71ef2.firebasestorage.app",
        messagingSenderId: "739643613018",
        appId: "1:739643613018:web:0b60c554ded49f32f19d63",
        measurementId: "G-1TTH9EP5N8"
      };

      try {
        console.log('🔧 Inicializando Firebase con config...');
        const app = window.firebase.initializeApp(firebaseConfig);
        window.db = window.firebase.database(app);
        window.auth = window.firebase.auth(app);
        
        console.log('✅ Firebase compat inicializado correctamente');
        console.log('🗄️ Database URL:', window.db.ref().toString());
        
        // TEST: Intentar leer acceso a la BD
        console.log('🧪 TEST: Intentando acceso de lectura a Firebase...');
        window.db.ref('.info/connected').on('value', (snap) => {
          if(snap.val() === true) {
            console.log('✅ CONECTADO A FIREBASE');
          } else {
            console.log('❌ DESCONECTADO DE FIREBASE');
          }
        });
        
        // Configurar autenticación anónima de forma más robusta
        const initAuth = () => {
          window.auth.onAuthStateChanged((user) => {
            if (user) {
              console.log('✅ Usuario autenticado:', user.uid);
              resolve(true);
            } else {
              console.log('🔐 Intentando autenticación anónima...');
              window.auth.signInAnonymously()
                .then((result) => {
                  console.log('✅ Autenticación anónima exitosa, UID:', result.user.uid);
                  resolve(true);
                })
                .catch((e) => {
                  console.warn('⚠️ Error en autenticación anónima:', e.message);
                  // Continuar de todas formas
                  resolve(true);
                });
            }
          });
        };
        
        setTimeout(initAuth, 100);
      } catch (e) {
        if (!e.message.includes('duplicate')) {
          console.error('❌ Error inicializando Firebase:', e);
          reject(e);
        } else {
          try {
            window.db = window.firebase.database();
            window.auth = window.firebase.auth();
            
            console.log('✅ Firebase ya estaba inicializado (duplicate)');
            console.log('🗄️ Database URL:', window.db.ref().toString());
            
            // Configurar listener de auth
            const initAuth = () => {
              window.auth.onAuthStateChanged((user) => {
                if (user) {
                  console.log('✅ Usuario autenticado:', user.uid);
                  resolve(true);
                } else {
                  console.log('🔐 Intentando autenticación anónima...');
                  window.auth.signInAnonymously()
                    .then((result) => {
                      console.log('✅ Autenticación anónima exitosa, UID:', result.user.uid);
                      resolve(true);
                    })
                    .catch((e) => {
                      console.warn('⚠️ Error en autenticación anónima:', e.message);
                      resolve(true);
                    });
                }
              });
            };
            
            setTimeout(initAuth, 100);
          } catch (e2) {
            console.error('❌ Error obteniendo DB existente:', e2);
            reject(e2);
          }
        }
      }
    } else {
      console.log('⏳ Firebase aún no cargado, esperando... (auth:', !!window.firebase?.auth, ')');
      setTimeout(checkFirebase, 100);
    }
  };
  checkFirebase();
});

// ============================================
// API para sincronización con Firebase
// ============================================

window.FirebaseSync = {
  // Guardar solicitud
  async addSolicitud(pk, parcial) {
    try {
      if (!window.db) {
        console.warn('Firebase no inicializado aún');
        return { success: false, error: 'Firebase no disponible' };
      }
      
      const now = new Date();
      const entry = {
        pk,
        parcial,
        fecha: now.toLocaleDateString('es-ES'),
        hora: now.toLocaleTimeString('es-ES', { hour12: false }),
        timestamp: now.toISOString()
      };
      
      // Agregar a /solicitudes
      const ref = window.db.ref('solicitudes').push();
      await ref.set(entry);
      
      console.log('✅ SOLICITUD GUARDADA EN FIREBASE:', entry);
      return { success: true, entry };
    } catch (e) {
      console.error('❌ Error al guardar solicitud:', e.message);
      return { success: false, error: e.message };
    }
  },

  // Guardar abastecimiento + actualizar historial (últimos 5)
  async addAbastecimiento(pk, parcial) {
    console.log(`%c🔥 addAbastecimiento LLAMADO`, 'background: #FF5722; color: white; font-weight: bold; font-size: 14px;', { pk, parcial });
    
    try {
      if (!window.db) {
        console.error('❌ Firebase NO inicializado - window.db no existe');
        return { success: false, error: 'Firebase no disponible' };
      }
      
      console.log('✅ Firebase disponible, continuando...');
      
      const now = new Date();
      const suppliedAt = now.getTime(); // Timestamp de entrega
      
      // 🔍 Obtener timestamp de solicitud desde solicitud_times
      let requestedAt = suppliedAt; // Por defecto, mismo tiempo
      try {
        if(window.firebaseTimestampsCache && window.firebaseTimestampsCache[pk]){
          requestedAt = window.firebaseTimestampsCache[pk];
          console.log(`⏱️ Solicitud encontrada para ${pk}: ${new Date(requestedAt).toLocaleTimeString()}`);
        } else {
          console.warn(`⚠️ No se encontró timestamp de solicitud para ${pk} en cache`);
        }
      } catch(e) {
        console.warn('No se pudo obtener timestamp de solicitud:', e);
      }
      
      // Calcular duración
      const duration = Math.max(0, suppliedAt - requestedAt);
      
      const entry = {
        pk,
        line: pk, // Alias para compatibilidad
        parcial,
        orden_produccion: parcial, // Alias
        fecha: now.toLocaleDateString('es-ES'),
        hora: now.toLocaleTimeString('es-ES', { hour12: false }),
        timestamp: now.toISOString(),
        suppliedAt: suppliedAt,      // 🔥 NUEVO: Timestamp de entrega
        requestedAt: requestedAt,     // 🔥 NUEVO: Timestamp de solicitud
        duration: duration            // 🔥 NUEVO: Duración en ms
      };
      
      console.log('💾 Guardando abastecimiento con tiempos:', {
        parcial,
        solicitud: new Date(requestedAt).toLocaleTimeString(),
        entrega: new Date(suppliedAt).toLocaleTimeString(),
        duracion: `${Math.floor(duration/1000)}s`
      });
      
      // Agregar a /abastecimientos
      console.log('📤 Guardando en /abastecimientos...');
      const ref = window.db.ref('abastecimientos').push();
      await ref.set(entry);
      console.log('✅ Guardado en /abastecimientos:', ref.key);
      
      // Agregar a historial
      console.log('📤 Guardando en /historial...');
      const histRef = window.db.ref('historial').push();
      await histRef.set(entry);
      console.log('✅ Guardado en /historial:', histRef.key);
      
      // Mantener solo últimos 5 en historial
      console.log('🧹 Limpiando historial (manteniendo solo últimos 5)...');
      window.db.ref('historial').once('value', (histSnap) => {
        const items = [];
        histSnap.forEach(child => {
          items.push({ id: child.key, ...child.val() });
        });
        
        console.log(`📊 Total items en historial: ${items.length}`);
        
        if (items.length > 5) {
          items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
          const toRemove = items.slice(5);
          console.log(`🗑️ Eliminando ${toRemove.length} items antiguos del historial`);
          toRemove.forEach(item => {
            window.db.ref(`historial/${item.id}`).remove();
          });
        }
      });
      
      console.log(`%c✅ ABASTECIMIENTO GUARDADO EXITOSAMENTE EN FIREBASE`, 'background: #4CAF50; color: white; font-weight: bold; font-size: 14px;', entry);
      return { success: true, entry };
    } catch (e) {
      console.error(`%c❌ ERROR CRÍTICO al guardar abastecimiento`, 'background: #f44336; color: white; font-weight: bold; font-size: 14px;', e);
      return { success: false, error: e.message };
    }
  },

  // Guardar anulación
  async addAnulacion(pk, parcial) {
    try {
      if (!window.db) {
        console.warn('Firebase no inicializado aún');
        return { success: false, error: 'Firebase no disponible' };
      }
      
      const now = new Date();
      const entry = {
        pk,
        parcial,
        fecha: now.toLocaleDateString('es-ES'),
        hora: now.toLocaleTimeString('es-ES', { hour12: false }),
        timestamp: now.toISOString()
      };
      
      // Agregar a /anulaciones
      const ref = window.db.ref('anulaciones').push();
      await ref.set(entry);
      
      console.log('✅ ANULACIÓN GUARDADA EN FIREBASE:', entry);
      return { success: true, entry };
    } catch (e) {
      console.error('❌ Error al guardar anulación:', e.message);
      return { success: false, error: e.message };
    }
  },

  // Actualizar estado del kanban
  async updateKanbanState(stateObj) {
    try {
      if (!window.db) {
        console.warn('⚠️ Firebase no inicializado aún');
        return { success: false, error: 'Firebase no disponible' };
      }
      
      console.log('📤 FirebaseSync.updateKanbanState - Enviando a Firebase...');
      console.log('📦 Objeto a enviar:', JSON.stringify(stateObj, null, 2));
      console.log('🎯 Ruta de Firebase:', window.db.ref('kanban_estado').toString());
      
      await window.db.ref('kanban_estado').set(stateObj);
      
      console.log('✅ KANBAN STATE ACTUALIZADO EN FIREBASE EXITOSAMENTE');
      console.log('📊 Total de líneas escritas:', Object.keys(stateObj).length);
      
      return { success: true };
    } catch (e) {
      console.error('❌ Error al actualizar kanban state:', e.message);
      console.error('❌ Detalle del error:', e);
      return { success: false, error: e.message };
    }
  },

  // Leer solicitudes en tiempo real y aplicar titilado automáticamente
  onSolicitudesChange(callback) {
    if (!window.db) return;
    
    // 🎯 Listener principal que detecta TODA la estructura de solicitudes
    window.db.ref('solicitudes').on('value', (snap) => {
      console.log('🔥 FIREBASE: Cambio detectado en solicitudes');
      
      const solicitudesCompletas = {};
      snap.forEach(child => {
        solicitudesCompletas[child.key] = child.val();
      });

      try{
        // Persist raw json for debugging/export
        try{ localStorage.setItem('json_solicitudes', JSON.stringify(solicitudesCompletas, null, 2)); }catch(e){}

        // 🎯 CONSTRUIR MAPA DE TITILADO (requested) desde Firebase
        const requestedMap = {}; // linea -> [índices]
        const solicitudMap = {}; // linea -> { solicitud: timestamp }

        // Iterar por cada LÍNEA en solicitudes/
        Object.keys(solicitudesCompletas).forEach(lineName => {
          try{
            const lineData = solicitudesCompletas[lineName];
            if(typeof lineData !== 'object') return;

            solicitudMap[lineName] = { solicitud: Date.now() };
            requestedMap[lineName] = [];

            // Iterar por cada ÍNDICE dentro de la línea
            Object.keys(lineData).forEach(idx => {
              try{
                const blockIdx = parseInt(idx, 10);
                if(!Number.isFinite(blockIdx)) return;
                
                // Agregar índice al mapa de titilado
                requestedMap[lineName].push(blockIdx);
                console.log(`🟠 Titilado detectado: ${lineName}[${blockIdx}]`);
              }catch(e){ console.warn('Error procesando índice', idx, e); }
            });

            // Ordenar índices
            if(requestedMap[lineName].length > 0){
              requestedMap[lineName].sort((a,b) => a - b);
            } else {
              delete requestedMap[lineName];
            }
          }catch(e){ console.warn('Error procesando línea', lineName, e); }
        });

        console.log('🎨 MAPA DE TITILADO CONSTRUIDO:', requestedMap);

        // Guardar en localStorage
        try{ localStorage.setItem('pk_solicitud_salida', JSON.stringify(solicitudMap)); }catch(e){}
        try{ localStorage.setItem('pk_requested', JSON.stringify(requestedMap)); }catch(e){}

        // 🎯 APLICAR TITILADO AL DOM INMEDIATAMENTE
        try{
          const blocks = document.querySelectorAll('.container .column .block');
          blocks.forEach(block => {
            try{
              const lineName = block.getAttribute('data-line') || 
                             ((block.closest('.column')||{}).querySelector('.column-header')||{textContent:''}).textContent.trim();
              const idx = parseInt(block.getAttribute('data-index') || '-1', 10);

              if(!lineName || !Number.isFinite(idx)) return;

              const lineRequested = requestedMap[lineName] || [];
              if(lineRequested.includes(idx)){
                // ✅ Debe titilar
                if(!block.classList.contains('requested')){
                  block.classList.add('requested');
                  console.log(`✨ TITILADO APLICADO: ${lineName}[${idx}]`);
                }
              } else {
                // ❌ NO debe titilar
                if(block.classList.contains('requested')){
                  block.classList.remove('requested');
                  console.log(`🔇 TITILADO REMOVIDO: ${lineName}[${idx}]`);
                }
              }
            }catch(e){ console.warn('Error aplicando titilado a bloque', e); }
          });
        }catch(e){ console.error('Error aplicando titilado al DOM', e); }

        // Actualizar timers y UI
        try{ if(window.ensureTimerElements) window.ensureTimerElements(); }catch(e){}
        try{ if(window.updateColumnTimers) window.updateColumnTimers(); }catch(e){}
        try{ if(window.updateSolicitudDurationsDisplay) window.updateSolicitudDurationsDisplay(); }catch(e){}

      }catch(e){ console.error('❌ onSolicitudesChange handler failed', e); }
      
      callback(solicitudesCompletas);
    });
  },

  // Leer abastecimientos en tiempo real
  onAbastecimientosChange(callback) {
    if (!window.db) return;
    window.db.ref('abastecimientos').on('value', (snap) => {
      const abastecimientos = {};
      snap.forEach(child => {
        abastecimientos[child.key] = child.val();
      });
      try{
        // persist raw
        try{ localStorage.setItem('json_abastecimientos', JSON.stringify(abastecimientos, null, 2)); }catch(e){}

        // Update local history / pk_history: merge abastecimientos as supplied entries
        let hist = [];
        try{ hist = JSON.parse(localStorage.getItem('pk_history')||'[]'); }catch(e){ hist = []; }
        // convert existing abastecimientos into simple history entries
        Object.keys(abastecimientos).forEach(k => {
          try{
            const it = abastecimientos[k];
            const ts = it.timestamp ? Date.parse(it.timestamp) : Date.now();
            const existing = hist.find(h => (h.suppliedAt && String(h.suppliedAt) === String(ts) && h.line === (it.pk||it.line)));
            if(!existing){
              hist.unshift({ name: it.parcial || it.orden_produccion || '', line: it.pk || it.line || '', suppliedAt: ts, fecha: it.fecha, hora: it.hora });
            }
          }catch(e){}
        });
        // keep last 500 entries
        hist = hist.slice(0,500);
        try{ localStorage.setItem('pk_history', JSON.stringify(hist)); }catch(e){}
        try{ localStorage.setItem('json_abastecimientos', JSON.stringify(abastecimientos, null, 2)); }catch(e){}

        try{ window.dispatchEvent(new StorageEvent('storage', { key: 'pk_history', newValue: JSON.stringify(hist) })); }catch(e){}
        try{ if(window.historialModule && window.historialModule.setRemoteData) window.historialModule.setRemoteData(hist); }catch(e){}
        // After abastecimiento, some requested items may be fulfilled: attempt to remove matching requested indices
        try{
          const reqRaw = localStorage.getItem('pk_requested') || '{}';
          let reqMap = reqRaw ? JSON.parse(reqRaw) : {};
          let namesMap = {};
          try{ namesMap = JSON.parse(localStorage.getItem('pk_block_names')||'{}'); }catch(e){ namesMap = {}; }
          // For each abastecimiento try to clear requested indices for that line matching parcial names
          Object.keys(abastecimientos).forEach(k => {
            try{
              const it = abastecimientos[k];
              const line = it.pk || it.line || '';
              const parcial = it.parcial || it.orden_produccion || '';
              if(!line) return;
              const lineNames = namesMap[line] || {};
              const toRemove = [];
              Object.keys(lineNames).forEach(idx => { if(String(lineNames[idx]).trim() === String(parcial).trim()) toRemove.push(parseInt(idx,10)); });
              if(toRemove.length && reqMap[line]){
                reqMap[line] = reqMap[line].filter(i => !toRemove.includes(i));
                if(reqMap[line].length === 0) delete reqMap[line];
              }
            }catch(e){}
          });
          try{ localStorage.setItem('pk_requested', JSON.stringify(reqMap)); }catch(e){}
          try{ window.dispatchEvent(new StorageEvent('storage', { key: 'pk_requested', newValue: JSON.stringify(reqMap) })); }catch(e){}
          try{ if(window.applyRequestedToDOM) window.applyRequestedToDOM(); }catch(e){}
        }catch(e){ }
      }catch(e){ console.warn('onAbastecimientosChange handler failed', e); }
      callback(abastecimientos);
    });
  },

  // Leer anulaciones en tiempo real
  onAnulacionesChange(callback) {
    if (!window.db) return;
    window.db.ref('anulaciones').on('value', (snap) => {
      const anulaciones = {};
      snap.forEach(child => {
        anulaciones[child.key] = child.val();
      });
      try{ localStorage.setItem('json_anulaciones', JSON.stringify(anulaciones, null, 2)); }catch(e){}
      try{ window.dispatchEvent(new StorageEvent('storage', { key: 'json_anulaciones', newValue: JSON.stringify(anulaciones, null, 2) })); }catch(e){}
      callback(anulaciones);
    });
  },

  // Leer kanban state en tiempo real
  onKanbanStateChange(callback) {
    if (!window.db) return;
    window.db.ref('kanban_estado').on('value', (snap) => {
      const state = snap.val() || {};
      try{
        // Convertir el estado de Firebase (mapa: linea -> [parcialText,...])
        // a las estructuras locales esperadas por la app: `pk_lines` y `pk_block_names`.
        // pk_lines: [{ name, count, active }]
        // pk_block_names: { linea: { index: nombreParcial, ... }, ... }
        const pk_lines = [];
        const pk_block_names = {};
        Object.keys(state).forEach(lineName => {
          const blocks = Array.isArray(state[lineName]) ? state[lineName] : (state[lineName] && typeof state[lineName] === 'object' ? Object.values(state[lineName]) : []);
          const cleanBlocks = blocks.map(b => (b==null? '': String(b)));
          pk_lines.push({ name: lineName, count: cleanBlocks.length, active: true });
          if(cleanBlocks.length){
            pk_block_names[lineName] = {};
            cleanBlocks.forEach((txt, i) => { if(txt) pk_block_names[lineName][String(i)] = txt; });
          }
        });
        try{ localStorage.setItem('pk_lines', JSON.stringify(pk_lines)); }catch(e){ console.warn('FirebaseSync: could not save pk_lines', e); }
        try{ localStorage.setItem('pk_block_names', JSON.stringify(pk_block_names)); }catch(e){ console.warn('FirebaseSync: could not save pk_block_names', e); }
        // notify other tabs/listeners using storage events
        try{ window.dispatchEvent(new StorageEvent('storage', { key: 'pk_lines', newValue: JSON.stringify(pk_lines) })); }catch(e){ /* some browsers may restrict synthetic events */ }
        try{ window.dispatchEvent(new StorageEvent('storage', { key: 'pk_block_names', newValue: JSON.stringify(pk_block_names) })); }catch(e){}
        // If the page exposes an applyLinesToDOM helper, call it to update immediately
        try{ if(window.applyLinesToDOM) window.applyLinesToDOM(pk_lines); }catch(e){ /* non-fatal */ }
      }catch(e){ console.warn('Error aplicando kanban desde Firebase al storage local', e); }
      callback(state);
    });
  },

  // Leer historial en tiempo real
  onHistorialChange(callback) {
    if (!window.db) return;
    window.db.ref('historial').on('value', (snap) => {
      const historial = {};
      snap.forEach(child => {
        historial[child.key] = child.val();
      });
      try{
        // persist raw
        try{ localStorage.setItem('json_historial', JSON.stringify(historial, null, 2)); }catch(e){}
        // convert to pk_history array (most recent first)
        const arr = Object.keys(historial).map(k => ({ id: k, ...historial[k] }));
        arr.sort((a,b)=> (new Date(b.timestamp||0)) - (new Date(a.timestamp||0)));
        const out = arr.map(it => ({ name: it.parcial || it.name || it.order || '', line: it.pk || it.line || it.linea || '', requestedAt: it.requestedAt || it.timestamp || undefined, suppliedAt: it.timestamp || undefined, fecha: it.fecha, hora: it.hora }));
        try{ localStorage.setItem('pk_history', JSON.stringify(out)); }catch(e){}
        try{ window.dispatchEvent(new StorageEvent('storage', { key: 'pk_history', newValue: JSON.stringify(out) })); }catch(e){}
        try{ if(window.historialModule && window.historialModule.setRemoteData) window.historialModule.setRemoteData(out); }catch(e){}
      }catch(e){ console.warn('onHistorialChange handler failed', e); }
      callback(historial);
    });
  }
};

console.log('✅ FirebaseSync module loaded - waiting for Firebase initialization');

// --- Fallback polling para entornos file:// ---
async function fetchAndApplyAllFromFirebase() {
  try {
    if (!window.db) return;
    
    // Cargar en paralelo
    const [kanbanSnap, solicSnap, abastSnap, anulSnap, histSnap] = await Promise.all([
      window.db.ref('kanban_estado').once('value'),
      window.db.ref('solicitudes').once('value'),
      window.db.ref('abastecimientos').once('value'),
      window.db.ref('anulaciones').once('value'),
      window.db.ref('historial').once('value')
    ]);

    const kanban = kanbanSnap.val() || {};
    const solicitudes = {};
    const abastecimientos = {};
    const anulaciones = {};
    const historial = {};

    solicSnap.forEach(c => { solicitudes[c.key] = c.val(); });
    abastSnap.forEach(c => { abastecimientos[c.key] = c.val(); });
    anulSnap.forEach(c => { anulaciones[c.key] = c.val(); });
    histSnap.forEach(c => { historial[c.key] = c.val(); });

    // Aplicar kanban -> pk_lines + pk_block_names
    try {
      const pk_lines = [];
      const pk_block_names = {};
      Object.keys(kanban).forEach(lineName => {
        const blocks = Array.isArray(kanban[lineName]) ? kanban[lineName] : (kanban[lineName] && typeof kanban[lineName] === 'object' ? Object.values(kanban[lineName]) : []);
        const cleanBlocks = blocks.map(b => (b == null ? '' : String(b)));
        pk_lines.push({ name: lineName, count: cleanBlocks.length, active: true });
        if (cleanBlocks.length) {
          pk_block_names[lineName] = {};
          cleanBlocks.forEach((txt, i) => { if (txt) pk_block_names[lineName][String(i)] = txt; });
        }
      });
      try { localStorage.setItem('pk_lines', JSON.stringify(pk_lines)); } catch (e) { }
      try { localStorage.setItem('pk_block_names', JSON.stringify(pk_block_names)); } catch (e) { }
      try { if (window.applyLinesToDOM) window.applyLinesToDOM(pk_lines); } catch (e) { }
    } catch (e) { console.warn('fetchAndApplyAllFromFirebase kanban apply failed', e); }

    // Aplicar solicitudes -> pk_solicitud_salida + pk_requested
    try {
      try { localStorage.setItem('json_solicitudes', JSON.stringify(solicitudes, null, 2)); } catch (e) { }
      const solicitudMap = {};
      const requestedMap = {};
      let namesMap = {};
      try { namesMap = JSON.parse(localStorage.getItem('pk_block_names') || '{}'); } catch (e) { namesMap = {}; }
      
      Object.keys(solicitudes).forEach(k => {
        try {
          const it = solicitudes[k];
          const line = it.pk || it.linea || it.line || '';
          const parcial = it.parcial || it.orden_produccion || it.name || '';
          const ts = it.timestamp ? Date.parse(it.timestamp) : (it.ts ? Date.parse(it.ts) : Date.now());
          if (!line) return;
          solicitudMap[line] = solicitudMap[line] || {};
          solicitudMap[line].solicitud = ts;
          
          const lineNames = namesMap[line] || {};
          const indices = [];
          Object.keys(lineNames).forEach(idx => {
            try {
              if (String(lineNames[idx]).trim() === String(parcial).trim()) {
                indices.push(parseInt(idx, 10));
              }
            } catch (e) { }
          });
          
          if (indices.length > 0) {
            requestedMap[line] = Array.from(new Set((requestedMap[line] || []).concat(indices))).sort((a, b) => a - b);
          }
        } catch (e) { }
      });
      
      try { localStorage.setItem('pk_solicitud_salida', JSON.stringify(solicitudMap)); } catch (e) { }
      try { localStorage.setItem('pk_requested', JSON.stringify(requestedMap)); } catch (e) { }
      try { if (window.ensureBlockDataAttributes) window.ensureBlockDataAttributes(); } catch (e) { }
      try { if (window.applyRequestedToDOM) window.applyRequestedToDOM(); } catch (e) { }
      try { if (window.ensureTimerElements) window.ensureTimerElements(); } catch (e) { }
      try { if (window.updateColumnTimers) window.updateColumnTimers(); } catch (e) { }
      try { if (window.updateSolicitudDurationsDisplay) window.updateSolicitudDurationsDisplay(); } catch (e) { }
    } catch (e) { console.warn('fetchAndApplyAllFromFirebase solicitudes apply failed', e); }

    // Aplicar abastecimientos -> pk_history + limpiar requested
    try {
      try { localStorage.setItem('json_abastecimientos', JSON.stringify(abastecimientos, null, 2)); } catch (e) { }
      let hist = [];
      try { hist = JSON.parse(localStorage.getItem('pk_history') || '[]'); } catch (e) { hist = []; }
      
      Object.keys(abastecimientos).forEach(k => {
        try {
          const it = abastecimientos[k];
          const ts = it.timestamp ? Date.parse(it.timestamp) : Date.now();
          const exists = hist.find(h => (h.suppliedAt && String(h.suppliedAt) === String(ts) && h.line === (it.pk || it.line)));
          if (!exists) {
            hist.unshift({
              name: it.parcial || it.orden_produccion || '',
              line: it.pk || it.line || '',
              suppliedAt: ts,
              fecha: it.fecha,
              hora: it.hora
            });
          }
        } catch (e) { }
      });
      
      hist = hist.slice(0, 500);
      try { localStorage.setItem('pk_history', JSON.stringify(hist)); } catch (e) { }
      try { if (window.historialModule && window.historialModule.setRemoteData) window.historialModule.setRemoteData(hist); } catch (e) { }
    } catch (e) { console.warn('fetchAndApplyAllFromFirebase abastecimientos apply failed', e); }

    // Aplicar anulaciones
    try { localStorage.setItem('json_anulaciones', JSON.stringify(anulaciones, null, 2)); } catch (e) { }

    // Aplicar historial
    try {
      try { localStorage.setItem('json_historial', JSON.stringify(historial, null, 2)); } catch (e) { }
      const arr = Object.keys(historial).map(k => ({ id: k, ...historial[k] }));
      arr.sort((a, b) => (new Date(b.timestamp || 0)) - (new Date(a.timestamp || 0)));
      const out = arr.map(it => ({
        name: it.parcial || it.name || '',
        line: it.pk || it.line || it.linea || '',
        requestedAt: it.requestedAt || it.timestamp || undefined,
        suppliedAt: it.timestamp || undefined,
        fecha: it.fecha,
        hora: it.hora
      }));
      try { localStorage.setItem('pk_history', JSON.stringify(out)); } catch (e) { }
      try { window.dispatchEvent(new StorageEvent('storage', { key: 'pk_history', newValue: JSON.stringify(out) })); } catch (e) { }
      try { if (window.historialModule && window.historialModule.setRemoteData) window.historialModule.setRemoteData(out); } catch (e) { }
    } catch (e) { console.warn('fetchAndApplyAllFromFirebase historial apply failed', e); }

  } catch (e) { console.warn('fetchAndApplyAllFromFirebase failed', e); }
}

// Si la app se abre con file://, arrancar polling para aplicar cambios periódicamente
try{
  if(typeof window !== 'undefined' && typeof location !== 'undefined' && location && location.protocol === 'file:'){
    window.firebaseInitPromise && window.firebaseInitPromise.then(()=>{
      try{
        // run once immediately then every 3s
        fetchAndApplyAllFromFirebase().catch(()=>{});
        window._fileProtocolFirebasePoll = setInterval(()=>{ fetchAndApplyAllFromFirebase().catch(()=>{}); }, 3000);
        console.log('⚠️ Modo file:// detectado — iniciando polling a Firebase cada 3s como fallback');
      }catch(e){ console.warn('Could not start file:// polling', e); }
    }).catch(()=>{});
  }
}catch(e){ console.warn('File protocol check failed', e); }
