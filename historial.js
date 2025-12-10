/**
 * Historial.js - Gestión completa del historial de órdenes de producción EN TIEMPO REAL
 * 
 * Funcionalidades:
 * - Muestra las últimas 5 órdenes de producción desde Firebase
 * - Calcula y muestra tiempos de solicitud y entrega
 * - Se sincroniza en TIEMPO REAL entre todas las pestañas
 * - Exporta historial a JSON
 */

(function(){
    'use strict';

    // Esperar a que Firebase esté listo
    const initWhenReady = () => {
        if(window.db && window.firebaseInitPromise){
            window.firebaseInitPromise.then(() => {
                console.log('🔥 Firebase listo - Iniciando módulo de historial en tiempo real');
                initHistorialModule();
            }).catch(err => {
                console.error('❌ Error al inicializar Firebase para historial:', err);
            });
        } else {
            console.log('⏳ Esperando Firebase...');
            setTimeout(initWhenReady, 500);
        }
    };

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }

    function initHistorialModule(){
        console.log('✅ Historial.js - Módulo inicializado (TIEMPO REAL)');
        
        // Referencias a elementos del DOM
        const recentHistoryContainer = document.getElementById('recent-history');
        const recentHistoryList = document.getElementById('recent-history-list');

        if(!recentHistoryContainer || !recentHistoryList){
            console.warn('Historial.js: Elementos del DOM no encontrados');
            return;
        }

        // Mostrar estado de carga inicial
        function mostrarCargando(){
            recentHistoryList.innerHTML = '';
            const loading = document.createElement('div');
            loading.style.cssText = 'padding:12px;text-align:center;color:#999;font-size:13px;opacity:0.8';
            loading.innerHTML = '⏳ Cargando historial desde Firebase...';
            recentHistoryList.appendChild(loading);
        }

        mostrarCargando();

        /**
         * Formatea duración en ms a formato legible (ej: "2m 35s")
         */
        function formatDurationShort(ms){
            if(!ms || ms < 0) return '0s';
            const s = Math.floor(ms/1000);
            const hh = Math.floor(s/3600);
            const mm = Math.floor((s%3600)/60);
            const ss = s%60;
            if(hh > 0) return `${hh}h ${mm}m ${ss}s`;
            if(mm > 0) return `${mm}m ${ss}s`;
            return `${ss}s`;
        }

        /**
         * Formatea duración en formato más detallado
         */
        function formatDurationFull(ms){
            if(!ms || ms < 0) return '0 segundos';
            const s = Math.floor(ms/1000);
            const hh = Math.floor(s/3600);
            const mm = Math.floor((s%3600)/60);
            const ss = s%60;
            
            const parts = [];
            if(hh > 0) parts.push(`${hh} hora${hh > 1 ? 's' : ''}`);
            if(mm > 0) parts.push(`${mm} minuto${mm > 1 ? 's' : ''}`);
            if(ss > 0) parts.push(`${ss} segundo${ss > 1 ? 's' : ''}`);
            
            return parts.length > 0 ? parts.join(', ') : '0 segundos';
        }

        /**
         * Renderiza el historial en la UI desde datos de Firebase
         */
        function renderizarHistorial(ordenes){
            try{
                recentHistoryList.innerHTML = '';

                if(!ordenes || ordenes.length === 0){
                    const empty = document.createElement('div');
                    empty.style.cssText = 'padding:12px;text-align:center;color:#999;font-size:13px;opacity:0.8';
                    empty.textContent = '📭 Sin órdenes registradas aún';
                    recentHistoryList.appendChild(empty);
                    return;
                }

                ordenes.forEach((orden, idx) => {
                    try{
                        const li = document.createElement('li');
                        li.style.cssText = `
                            padding: 12px;
                            margin: 8px 0;
                            border-left: 4px solid #3b82f6;
                            background: #f8fafc;
                            border-radius: 6px;
                            list-style: none;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                            transition: all 200ms ease;
                        `;
                        li.onmouseenter = () => { li.style.background = '#eff6ff'; li.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'; };
                        li.onmouseleave = () => { li.style.background = '#f8fafc'; li.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; };

                        // Número de orden (índice)
                        const numOrder = document.createElement('div');
                        numOrder.style.cssText = 'font-weight:800;font-size:14px;color:#1e40af;margin-bottom:6px';
                        numOrder.textContent = `📦 Orden: ${orden.name || orden.line + '#' + orden.index}`;

                        // Línea de producción
                        const linea = document.createElement('div');
                        linea.style.cssText = 'font-size:12px;color:#666;margin-bottom:4px';
                        linea.textContent = `Línea: ${orden.line || 'N/A'}`;

                        // Tiempos
                        const tiempoDiv = document.createElement('div');
                        tiempoDiv.style.cssText = 'font-size:12px;color:#666;margin:6px 0;line-height:1.6';
                        
                        const requestedAt = orden.requestedAt ? new Date(orden.requestedAt).toLocaleString('es-ES') : 'N/A';
                        const suppliedAt = orden.suppliedAt ? new Date(orden.suppliedAt).toLocaleString('es-ES') : 'N/A';
                        const duracionCorta = formatDurationShort(orden.duration || 0);
                        const duracionLarga = formatDurationFull(orden.duration || 0);

                        tiempoDiv.innerHTML = `
                            <div style="display:flex;gap:8px;margin:4px 0">
                                <span style="color:#0f766e">📤 Solicitud:</span>
                                <span style="color:#333">${requestedAt}</span>
                            </div>
                            <div style="display:flex;gap:8px;margin:4px 0">
                                <span style="color:#7c2d12">📥 Entrega:</span>
                                <span style="color:#333">${suppliedAt}</span>
                            </div>
                            <div style="display:flex;gap:8px;margin:6px 0;padding-top:6px;border-top:1px solid #ddd;font-weight:700">
                                <span style="color:#dc2626">⏱️ Tiempo:</span>
                                <span style="color:#dc2626">${duracionCorta}</span>
                                <span style="color:#999;font-weight:400;font-size:11px">(${duracionLarga})</span>
                            </div>
                        `;

                        li.appendChild(numOrder);
                        li.appendChild(linea);
                        li.appendChild(tiempoDiv);
                        recentHistoryList.appendChild(li);
                    }catch(e){
                        console.error('Error al renderizar orden:', e);
                    }
                });
            }catch(e){
                console.error('Error en renderizarHistorial:', e);
                recentHistoryList.innerHTML = '<div style="color:red">❌ Error al cargar historial</div>';
            }
        }

        /**
         * Obtiene estadísticas del historial
         */
        function obtenerEstadisticas(){
            const historial = getHistorial();
            if(historial.length === 0) return null;

            let totalDuracion = 0;
            let minDuracion = Infinity;
            let maxDuracion = 0;

            historial.forEach(orden => {
                const dur = orden.duration || 0;
                totalDuracion += dur;
                minDuracion = Math.min(minDuracion, dur);
                maxDuracion = Math.max(maxDuracion, dur);
            });

            return {
                totalOrdenes: historial.length,
                duracionPromedio: Math.floor(totalDuracion / historial.length),
                duracionMinima: minDuracion === Infinity ? 0 : minDuracion,
                duracionMaxima: maxDuracion,
                duracionTotal: totalDuracion
            };
        }

        /**
         * Exporta el historial como JSON descargable
         */
        function exportarHistorialJSON(){
            try{
                const historial = getHistorial();
                const stats = obtenerEstadisticas();
                
                const data = {
                    historial: historial,
                    ultimas5: getUltimasOrdenes(5),
                    estadisticas: stats,
                    exportadoEn: new Date().toISOString()
                };

                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                
                const dateStr = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
                const filename = `historial-ordenes-${dateStr}.json`;
                
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(url), 100);
                
                console.log(`✅ Historial exportado: ${filename}`);
                alert(`✅ Archivo descargado: ${filename}`);
            }catch(e){
                alert(`❌ Error al exportar: ${e.message}`);
                console.error('exportarHistorialJSON error:', e);
            }
        }

        /**
         * Exporta el historial como CSV (abre en Excel)
         */
        function exportarHistorialCSV(){
            try{
                const historial = getHistorial();
                if(!historial || historial.length === 0){ alert('No hay registros en el historial para exportar.'); return; }

                const headers = [ 'orden', 'linea', 'index', 'requestedAt', 'suppliedAt', 'duration_ms' ];
                const rows = historial.map(item => {
                    return [
                        item.name || '',
                        item.line || '',
                        (item.index != null) ? item.index : '',
                        item.requestedAt ? new Date(item.requestedAt).toISOString() : '',
                        item.suppliedAt ? new Date(item.suppliedAt).toISOString() : '',
                        item.duration != null ? String(item.duration) : ''
                    ];
                });

                // construir CSV
                const escapeCell = (v) => {
                    if(v == null) return '';
                    const s = String(v);
                    if(s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1){
                        return '"' + s.replace(/"/g, '""') + '"';
                    }
                    return s;
                };

                const lines = [ headers.join(',') ];
                rows.forEach(r => lines.push(r.map(escapeCell).join(',')));
                const csv = lines.join('\r\n');

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const dateStr = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
                const filename = `historial-ordenes-${dateStr}.csv`;
                const a = document.createElement('a');
                a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(()=> URL.revokeObjectURL(url), 150);
                console.log('✅ Historial exportado CSV:', filename);
                alert('✅ Archivo CSV descargado: ' + filename);
            }catch(e){ alert('❌ Error exportando CSV: ' + (e && e.message)); console.error(e); }
        }

        /**
         * Limpia el historial (con confirmación)
         */
        function limpiarHistorial(){
            if(confirm('⚠️ ¿Estás seguro de que quieres eliminar TODOS los registros del historial?\n\nEsta acción no se puede deshacer.')){
                try{
                    localStorage.removeItem('pk_history');
                    renderizarHistorial();
                    console.log('✅ Historial eliminado');
                    alert('✅ Historial limpiado correctamente');
                }catch(e){
                    alert(`❌ Error al limpiar: ${e.message}`);
                }
            }
        }

        /**
         * 🔥 CONECTAR A FIREBASE EN TIEMPO REAL
         * Escucha cambios en /historial (que ya tiene toda la información procesada)
         */
        async function conectarFirebaseRealTime(){
            try{
                console.log('🔥 Conectando historial a Firebase en tiempo real desde /historial...');
                
                // Esperar a que Firebase esté completamente inicializado
                if(!window.db){
                    console.warn('⏳ Esperando a que Firebase se inicialice...');
                    await new Promise(resolve => {
                        const checkDB = setInterval(() => {
                            if(window.db){
                                clearInterval(checkDB);
                                resolve();
                            }
                        }, 100);
                    });
                }
                
                console.log('✅ Firebase disponible, inicializando listener...');
                
                let isFirstLoad = true;
                
                // 🎯 Escuchar cambios en /historial en tiempo real
                window.db.ref('historial').on('value', (snapshot) => {
                    try{
                        const historialData = snapshot.val() || {};
                        const historialArray = [];
                        
                        console.log('📦 Historial actualizado desde Firebase /historial, items:', Object.keys(historialData).length);
                        
                        // Convertir objeto de Firebase a array
                        Object.keys(historialData).forEach(key => {
                            try{
                                const item = historialData[key];
                                
                                // Extraer información
                                const line = item.pk || item.line || 'N/A';
                                const parcial = item.parcial || item.orden_produccion || 'N/A';
                                
                                // Timestamps ya vienen procesados desde addAbastecimiento
                                const suppliedAt = item.suppliedAt || (item.timestamp ? new Date(item.timestamp).getTime() : Date.now());
                                const requestedAt = item.requestedAt || suppliedAt;
                                const duration = item.duration || Math.max(0, suppliedAt - requestedAt);
                                
                                historialArray.push({
                                    key: key,
                                    name: parcial,
                                    line: line,
                                    requestedAt: requestedAt,
                                    suppliedAt: suppliedAt,
                                    duration: duration,
                                    fecha: item.fecha,
                                    hora: item.hora
                                });
                                
                            }catch(e){
                                console.warn('Error procesando item de historial:', e);
                            }
                        });
                        
                        // Ordenar por timestamp de entrega (más reciente primero)
                        historialArray.sort((a, b) => b.suppliedAt - a.suppliedAt);
                        
                        // Firebase ya mantiene solo los últimos 5, pero por si acaso
                        const ultimas5 = historialArray.slice(0, 5);
                        
                        if(isFirstLoad){
                            console.log(`%c✅ Historial CARGADO: ${ultimas5.length} órdenes`, 'background: #4CAF50; color: white; font-weight: bold;', ultimas5.map(o => `${o.name} (${o.line})`));
                            isFirstLoad = false;
                        } else {
                            console.log(`%c🔄 Historial ACTUALIZADO: ${ultimas5.length} órdenes`, 'background: #2196F3; color: white; font-weight: bold;', ultimas5.map(o => `${o.name} (${o.line})`));
                        }
                        
                        // Renderizar
                        renderizarHistorial(ultimas5);
                        
                    }catch(e){
                        console.error('❌ Error procesando datos de Firebase /historial:', e);
                        // Mostrar error pero mantener la UI visible
                        recentHistoryList.innerHTML = '';
                        const error = document.createElement('div');
                        error.style.cssText = 'padding:12px;text-align:center;color:#d32f2f;font-size:13px';
                        error.textContent = '⚠️ Error cargando historial';
                        recentHistoryList.appendChild(error);
                    }
                }, (error) => {
                    console.error('❌ Error en listener de Firebase:', error);
                    recentHistoryList.innerHTML = '';
                    const errDiv = document.createElement('div');
                    errDiv.style.cssText = 'padding:12px;text-align:center;color:#d32f2f;font-size:13px';
                    errDiv.textContent = '❌ Error de conexión con Firebase';
                    recentHistoryList.appendChild(errDiv);
                });
                
                console.log('✅ Historial conectado a Firebase /historial');
                console.log('🔄 Se actualizará automáticamente en TODAS las pestañas');
                
            }catch(e){
                console.error('❌ Error crítico conectando historial a Firebase:', e);
                recentHistoryList.innerHTML = '';
                const errDiv = document.createElement('div');
                errDiv.style.cssText = 'padding:12px;text-align:center;color:#d32f2f;font-size:13px';
                errDiv.textContent = '❌ Error inicializando historial';
                recentHistoryList.appendChild(errDiv);
            }
        }

        /**
         * Interfaz pública del módulo
         */
        window.historialModule = {
            renderizar: renderizarHistorial,
            formatDuration: formatDurationShort,
            conectarFirebase: conectarFirebaseRealTime
        };

        // 🔥 INICIALIZAR CONEXIÓN EN TIEMPO REAL
        conectarFirebaseRealTime();

        console.log('✅ Historial.js - TIEMPO REAL activado');
        console.log('📡 Escuchando cambios en Firebase /historial');
        console.log('🔄 Todas las pestañas se sincronizarán automáticamente');
        console.log('💡 Mostrando: Línea, Orden, Hora Solicitud, Hora Entrega, Tiempo Transcurrido');
    }
})();
