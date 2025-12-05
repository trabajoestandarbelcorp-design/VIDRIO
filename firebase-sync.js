// ============================================
// Firebase Realtime Database Sync Module
// ============================================
// Maneja: solicitudes, abastecimientos, anulaciones, kanban_estado, historial

// Esperar a que Firebase esté disponible globalmente desde el CDN
window.firebaseInitPromise = new Promise((resolve) => {
  const checkFirebase = () => {
    if (window.firebase && window.firebase.database) {
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
        const app = window.firebase.initializeApp(firebaseConfig);
        window.db = window.firebase.database(app);
        console.log('✅ Firebase compat inicializado correctamente');
        resolve(true);
      } catch (e) {
        if (!e.message.includes('duplicate')) {
          console.error('Error inicializando Firebase:', e);
        } else {
          window.db = window.firebase.database();
          console.log('✅ Firebase ya estaba inicializado');
          resolve(true);
        }
      }
    } else {
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
      
      // Agregar a /abastecimientos
      const ref = window.db.ref('abastecimientos').push();
      await ref.set(entry);
      
      // Agregar a historial
      const histRef = window.db.ref('historial').push();
      await histRef.set(entry);
      
      // Mantener solo últimos 5
      window.db.ref('historial').once('value', (histSnap) => {
        const items = [];
        histSnap.forEach(child => {
          items.push({ id: child.key, ...child.val() });
        });
        
        if (items.length > 5) {
          items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
          const toRemove = items.slice(5);
          toRemove.forEach(item => {
            window.db.ref(`historial/${item.id}`).remove();
          });
        }
      });
      
      console.log('✅ ABASTECIMIENTO GUARDADO EN FIREBASE:', entry);
      return { success: true, entry };
    } catch (e) {
      console.error('❌ Error al guardar abastecimiento:', e.message);
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
        console.warn('Firebase no inicializado aún');
        return { success: false, error: 'Firebase no disponible' };
      }
      
      await window.db.ref('kanban_estado').set(stateObj);
      console.log('✅ KANBAN STATE ACTUALIZADO EN FIREBASE');
      return { success: true };
    } catch (e) {
      console.error('❌ Error al actualizar kanban state:', e.message);
      return { success: false, error: e.message };
    }
  },

  // Leer solicitudes en tiempo real
  onSolicitudesChange(callback) {
    if (!window.db) return;
    window.db.ref('solicitudes').on('value', (snap) => {
      const solicitudes = {};
      snap.forEach(child => {
        solicitudes[child.key] = child.val();
      });
      callback(solicitudes);
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
      callback(anulaciones);
    });
  },

  // Leer kanban state en tiempo real
  onKanbanStateChange(callback) {
    if (!window.db) return;
    window.db.ref('kanban_estado').on('value', (snap) => {
      const state = snap.val() || {};
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
      callback(historial);
    });
  }
};

console.log('✅ FirebaseSync module loaded - waiting for Firebase initialization');
