/**
 * Historial.js - Gestión completa del historial de órdenes de producción
 * 
 * Funcionalidades:
 * - Muestra las últimas 5 órdenes de producción
 * - Calcula y muestra tiempos de solicitud y entrega
 * - Exporta historial a JSON
 * - Actualiza en tiempo real
 */

(function(){
    'use strict';

    // Esperar a que el DOM esté listo
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', initHistorialModule);
    } else {
        initHistorialModule();
    }

    function initHistorialModule(){
        console.log('✅ Historial.js - Módulo inicializado');
        
        // Referencias a elementos del DOM
        const recentHistoryContainer = document.getElementById('recent-history');
        const recentHistoryList = document.getElementById('recent-history-list');

        if(!recentHistoryContainer || !recentHistoryList){
            console.warn('Historial.js: Elementos del DOM no encontrados');
            return;
        }

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
         * Obtiene el historial completo de localStorage
         */
        function getHistorial(){
            try{
                const raw = localStorage.getItem('pk_history') || '[]';
                const hist = JSON.parse(raw);
                return Array.isArray(hist) ? hist : [];
            }catch(e){
                console.error('Error al leer historial:', e);
                return [];
            }
        }

        /**
         * Obtiene las últimas N órdenes
         */
        function getUltimasOrdenes(cantidad = 5){
            const historial = getHistorial();
            return historial.slice(-cantidad).reverse();
        }

        /**
         * Renderiza el historial en la UI
         */
        function renderizarHistorial(){
            try{
                recentHistoryList.innerHTML = '';
                const ordenes = getUltimasOrdenes(5);

                if(ordenes.length === 0){
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
         * Monitorea cambios en pk_history y actualiza la UI automáticamente
         */
        function monitorearCambios(){
            window.addEventListener('storage', (e) => {
                if(e.key === 'pk_history'){
                    console.log('📝 Historial actualizado desde otra pestaña');
                    renderizarHistorial();
                }
            });
        }

        /**
         * Interfaz pública del módulo
         */
        window.historialModule = {
            renderizar: renderizarHistorial,
            obtenerHistorial: getHistorial,
            obtenerUltimas: getUltimasOrdenes,
            obtenerStats: obtenerEstadisticas,
            exportar: exportarHistorialJSON,
            exportCSV: exportarHistorialCSV,
            limpiar: limpiarHistorial,
            formatDuration: formatDurationShort
        };

        // Inicializar
        renderizarHistorial();
        monitorearCambios();

        // Actualizar cada segundo por si hay cambios
        setInterval(renderizarHistorial, 1000);

        console.log('✅ Historial.js - Listo para usar');
        console.log('Funciones disponibles:');
        console.log('  - window.historialModule.renderizar() — Actualizar vista');
        console.log('  - window.historialModule.obtenerHistorial() — Obtener todo el historial');
        console.log('  - window.historialModule.obtenerStats() — Ver estadísticas');
        console.log('  - window.historialModule.exportar() — Descargar como JSON');
        console.log('  - window.historialModule.limpiar() — Borrar historial completo');
    }
})();
