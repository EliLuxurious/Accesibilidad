const $ = id => document.getElementById(id);

let lastEvalData = null; 
let currentTranslations = {};
let currentLang = 'es';

async function changeLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    try {
        const res = await fetch(`locales/${lang}.json`);
        currentTranslations = await res.json();
        applyTranslations();
    } catch (e) {
        console.error("Translation load failed:", e);
    }
}

function t(key) {
    return currentTranslations[key] || key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (currentTranslations[key]) {
            el.innerText = currentTranslations[key];
        }
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (currentTranslations[key]) {
            el.placeholder = currentTranslations[key];
        }
    });
    
    if (lastEvalData) {
        renderResults(lastEvalData);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    changeLanguage('es');
});

async function apiCall(endpoint, options = {}) {
    try {
        const res = await fetch(endpoint, options);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error desconocido');
        return data.data || data;
    } catch (e) {
        alert(t('errorMsg') + ": " + (e.message || JSON.stringify(e)));
        throw e;
    }
}

function enableStep(stepId) {
    $(stepId).style.opacity = "1";
    $(stepId).style.pointerEvents = "auto";
}

async function analyzeSrs() {
    const file = $('fileSrs').files[0];
    if (!file) return alert(t('errorMsg'));

    $('btnSrs').disabled = true;
    $('btnSrs').innerText = t('analyzing');

    const formData = new FormData();
    formData.append("archivo", file);

    try {
        const data = await apiCall('/api/srs', { method: 'POST', body: formData });
        $('b21Count').innerText = data.srs.B;
        $('resSrs').style.display = "block";
        enableStep('step2');
    } finally {
        $('btnSrs').disabled = false;
        $('btnSrs').innerText = t('btnSrs');
    }
}

async function openBrowser() {
    const url = $('urlInput').value;
    if (!url) return alert(t('errorMsg'));

    $('btnBrowser').disabled = true;
    $('btnBrowser').innerText = t('opening');

    try {
        await apiCall('/api/browser/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        $('btnBrowser').innerText = t('browserReady');
        $('btnSession').disabled = false;
    } catch (e) {
        $('btnBrowser').disabled = false;
        $('btnBrowser').innerText = t('btnBrowser');
    }
}

async function confirmSession() {
    $('btnSession').disabled = true;
    try {
        await apiCall('/api/browser/confirm-session', { method: 'POST' });
        $('resBrowser').style.display = "block";
        enableStep('step3');
    } catch (e) {
        $('btnSession').disabled = false;
    }
}

async function discoverAndMatch() {
    $('btnDiscover').disabled = true;
    $('btnDiscover').innerText = t('discovering');

    try {
        await apiCall('/api/system/discover', { method: 'POST' });
        enableStep('step4');
        $('btnDiscover').innerText = t('discoverDone');
    } catch (e) {
        $('btnDiscover').disabled = false;
        $('btnDiscover').innerText = t('btnDiscover');
    }
}

async function evaluateSystem() {
    $('btnEval').disabled = true;
    $('evalProgress').innerText = t('evalWait');

    const rigorLevel = document.querySelector('input[name="rigorLevel"]:checked').value;
    const modoPrueba = true;

    try {
        const response = await fetch('/api/system/evaluate', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rigorLevel, modoPrueba })
        });

        const responseJson = await response.json();
        
        console.log("RESPUESTA DEL SERVIDOR:");
        console.log(responseJson);

        if(!responseJson.success){
            throw new Error(responseJson.message || responseJson.error || "Error del servidor");
        }

        const result = responseJson.data;

        lastEvalData = result;
        lastEvalData.config = { rigorLevel, modoPrueba };
        
        renderResults(result);
        $('step5').style.display = "block";
        $('step6').style.display = "block";
        $('evalProgress').innerText = t('evalDone');
        
    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
        $('btnEval').disabled = false;
        $('evalProgress').innerText = t('evalError');
    }
}

function renderResults(data) {
    const m21 = data.metric21;
    const m22 = data.metric22;
    
    // Métrica 21 general
    $('valA21').innerText = m21.A21;
    $('valB21').innerText = m21.B21_Implementadas;
    $('valFraction').innerText = m21.x21Fraction;
    $('valDecimal').innerText = m21.X21_decimal !== null ? m21.X21_decimal.toFixed(4) : "N/D";
    $('valPorcentaje').innerText = m21.porcentaje;
    
    const estadoElem = $('valEstado');
    if (m21.preliminary) {
        if (m21.funcionesEvaluadas === 0) {
            estadoElem.innerText = t('statusInconclusive');
            estadoElem.style.backgroundColor = "var(--warning)";
            estadoElem.style.color = "#000";
        } else {
            estadoElem.innerText = t('statusPrelim');
            estadoElem.style.backgroundColor = "var(--warning)";
            estadoElem.style.color = "#000";
        }
    } else {
        estadoElem.innerText = t('statusFinal');
        estadoElem.style.backgroundColor = "var(--success)";
        estadoElem.style.color = "#fff";
    }

    $('rangoContainer').style.display = "none";
    $('valB21Srs').innerText = m21.B21_SRS;
    $('valB_aux').innerText = m21.B21_Implementadas;
    $('valA_aux').innerText = m21.A21;
    $('valFuncEval').innerText = m21.funcionesEvaluadas;

    $('valCobImpFrac').innerText = m21.cobImpFrac;
    $('valCobImp').innerText = m21.coberturaImplementacion;
    $('valCobEvaFrac').innerText = m21.cobEvaFrac;
    $('valCobEva').innerText = m21.coberturaEvaluacion;

    const tbody = document.querySelector('#finalTable tbody');
    tbody.innerHTML = '';
    
    data.resultados.forEach((res, index) => {
        const tr = document.createElement('tr');
        
        // La puntuación WCAG global para la función se unifica en cualquiera de sus perfiles
        // ya que el nivel de rigor es igual para todos.
        const wc = res.profiles.Visual?.wcagScore || res.wcagScore;
        
        let wcCump = "N/D";
        let wcPct = "N/D";
        let wcNivelAlc = "N/D";
        let wcNivelSol = "N/D";
        
        if (wc) {
            wcCump = `${wc.criteriosCumplidos}/${wc.criteriosEvaluados}`;
            wcPct = `${wc.porcentaje}%`;
            wcNivelAlc = wc.nivelAlcanzado;
            wcNivelSol = wc.rigorSolicitado;
        }

        let htmlCuentaA = '0';
        if (res.implementation.matchingStatus === 'asignado') {
            htmlCuentaA = res.overallCuentaA21 ? '1' : '0';
        } else {
            htmlCuentaA = 'N/A';
        }

        const flowHtml = `<button class="btn-sm" onclick="verFlujo(${index})">${t('thFlow')}</button>`;

        tr.innerHTML = `
            <td><strong>${res.rf}</strong><br><small>${res.funcionSRS}</small></td>
            <td>${wcCump}</td>
            <td>${wcPct}</td>
            <td>${wcNivelAlc}</td>
            <td>${wcNivelSol}</td>
            <td><strong>${htmlCuentaA}</strong></td>
            <td>${flowHtml}</td>
        `;
        tbody.appendChild(tr);
    });

    // Métrica 22
    if (m22) {
        $('valB22').innerText = m22.B22;
        $('valA22').innerText = m22.A22;
        $('valLocales').innerText = m22.locales.join(", ");
        $('valPct22').innerText = m22.porcentaje;

        const wcagTbody = document.querySelector('#wcagTable');
        wcagTbody.innerHTML = '';
        for (const [criterio, val] of Object.entries(m22.wcag)) {
            wcagTbody.innerHTML += `<tr><td>${criterio}</td><td><strong>${val}</strong></td></tr>`;
        }
        $('valGlobalAccess').innerText = (data.globalAccesibilidad !== undefined ? data.globalAccesibilidad.toFixed(2) : '0.00') + '%';
    }
}

function verFlujo(index) {
    if (!lastEvalData) return;
    const info = lastEvalData.resultados[index];
    const res = info.profiles.Visual || {}; // Usar perfil visual como referencia base para la traza
    const task = res.taskModel || {};
    const cfg = lastEvalData.config;
    
    let html = `<h3>${info.rf} - ${info.funcionSRS}</h3>`;
    
    html += `<ul class="flow-list">`;
    html += `<li><strong>IMPLEMENTACIÓN</strong><br>`;
    html += `<div class="indent">`;
    html += `Confirmada: ${info.implementation.confirmed ? 'Sí' : 'No'}<br>`;
    html += `Ruta: ${info.implementation.route || 'N/D'}<br>`;
    html += `Score: ${info.implementation.score}<br>`;
    html += `</div></li>`;

    if (res.estado === 'ERROR_TECNICO') {
        html += `<li><strong>EVALUACIÓN FALLIDA (ERROR TÉCNICO)</strong><br>`;
        html += `<div class="indent" style="color:red">`;
        html += `<strong>Motivo:</strong> ${res.motivo}<br>`;
        html += `<strong>Error:</strong> ${res.error}<br>`;
        html += `<strong>URL:</strong> ${info.implementation.route}<br>`;
        if (res.stack) {
            html += `<strong>Stack:</strong> <pre style="font-size:0.8em; overflow-x:auto;">${res.stack}</pre><br>`;
        }
        html += `</div></li></ul>`;
        $('modalTitle').innerText = "Trazabilidad (Error Técnico)";
        $('modalBody').innerHTML = html;
        $('detailModal').style.display = "block";
        $('detailModal').focus();
        return;
    }

    html += `<p><strong>Configuración de Prueba:</strong> Rigor: ${cfg.rigorLevel} | Perfil: <strong>${cfg.perfil}</strong></p>`;
    
    html += `<li><strong>Paso 1: Task Model y Ejecución</strong><br>`;
    html += `<div class="indent">`;
    html += `<strong>Tipo:</strong> ${task.tipoOperacion}<br>`;
    html += `<strong>Ruta:</strong> ${task.rutaInicial}<br>`;
    html += `<strong><span lang="en">Inputs</span>:</strong> ${task.inputs.join(", ") || "Ninguno"}<br>`;
    html += `<strong><span lang="en">Actions</span>:</strong> ${task.actions.join(", ") || "Click"}<br>`;
    html += `<strong><span lang="en">Outputs</span>:</strong> ${task.outputsDetectados.length > 0 ? task.outputsDetectados.join(", ") : "Ninguno"}<br>`;
    html += `<strong><span lang="en">WRITE</span> Permitido:</strong> ${res.writeAllowed ? "Sí" : "No"}<br>`;
    html += `<strong><span lang="en">WRITE</span> Ejecutado:</strong> ${res.writeExecuted ? "Sí" : "No"}<br>`;
    html += `</div></li>`;
    
    if(res.allFindings) {
        html += `<li><strong>Paso 2: Unified Evidence (<span lang="en">Axe, ARIA, Keyboard</span>)</strong><br>`;
        html += `<div class="indent">`;
        
        const globalFindings = res.allFindings.filter(f => f.scope === 'GLOBAL');
        const relatedFindings = res.allFindings.filter(f => f.scope === 'TASK_RELATED');
        const essentialFindings = res.allFindings.filter(f => f.scope === 'CURRENT_STEP_ESSENTIAL' || f.scope === 'TASK_ESSENTIAL');
        
        html += `<strong>Hallazgos CURRENT_STEP_ESSENTIAL:</strong> ${essentialFindings.length} <small>(Afectan controles requeridos para la tarea en la etapa actual)</small><br>`;
        if (res.barrerasBloqueantes && res.barrerasBloqueantes.length > 0) {
            html += `<strong style="color:red">Barreras Bloqueantes Funcionales:</strong><br>`;
            res.barrerasBloqueantes.forEach(b => {
                html += `- [${b.source}] ${b.ruleId || b.status} | Selector: ${b.selector.slice(0, 50)}<br>  <small><em>${b.reason || "Regla de perfil prioritaria incumplida."}</em></small><br>`;
            });
        } else {
             html += `<strong style="color:green">Sin barreras bloqueantes para este perfil.</strong><br>`;
        }
        
        html += `<br><strong>Hallazgos TASK_RELATED:</strong> ${relatedFindings.length} <small>(Controles opcionales, filtros no obligatorios)</small><br>`;
        html += `<strong>Hallazgos GLOBAL:</strong> ${globalFindings.length} <small>(Menús, Headers, UI general)</small><br>`;
        html += `</div></li>`;
    }
    
    html += `<li><strong>Paso 3: Task Output & Minimal Path</strong><br>`;
    html += `<div class="indent">`;
    html += `<strong>businessTaskCompleted:</strong> ${res.tareaCompletada ? 'true' : 'false'}<br>`;
    
    let pathLabel = res.accessiblePathCompleted === null ? 'null (inconcluso)' : (res.accessiblePathCompleted ? 'true' : 'false');
    html += `<strong>accessiblePathCompleted:</strong> ${pathLabel}<br>`;
    html += `<strong>minimalSuccessfulPath:</strong> ${res.minimalSuccessfulPath ? 'true (Inputs convertidos a TASK_RELATED)' : 'false'}<br>`;
    html += `</div></li>`;
    
    html += `<li><strong>DECISIÓN FINAL ACCESIBILIDAD (X21): ${res.estado}</strong><br>`;
    html += `<p style="margin: 5px 0;"><em>${res.razon}</em></p>`;
    html += `<strong>Cuenta en A: </strong> ${res.countsInA21 ? '<span style="color:green">SÍ</span>' : '<span style="color:red">NO</span>'}`;
    html += `</li>`;

    if (res.wcagScore) {
        const wc = res.wcagScore;
        html += `<li style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 5px; margin-top: 15px;">`;
        html += `<h4 style="margin-top:0;">${t('rigorTitleModal') || "EVALUACIÓN DE RIGOR WCAG 2.2"}</h4>`;
        
        html += `<div style="display:flex; justify-content: space-between; margin-bottom: 15px;">`;
        html += `<div><strong>${t('rigorReq') || "Nivel solicitado:"}</strong> ${wc.rigorSolicitado}</div>`;
        html += `<div><strong>${t('rigorAchieved') || "Nivel alcanzado:"}</strong> ${wc.nivelAlcanzado}</div>`;
        html += `<div><strong>${t('wcagPercent') || "Porcentaje WCAG:"}</strong> ${wc.porcentaje}%</div>`;
        
        const statusColor = wc.cumpleRigor ? 'green' : 'red';
        const statusText = wc.cumpleRigor ? (t('rigorPass') || 'CUMPLE') : (t('rigorFail') || 'NO CUMPLE');
        html += `<div style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px;"><strong>${t('rigorState') || "Estado:"} ${statusText}</strong></div>`;
        html += `</div>`;
        
        html += `<table style="width:100%; font-size:0.9em; text-align: left; background: white;">`;
        html += `<thead><tr><th>${t('thCrit') || "Criterio"}</th><th>${t('thRes') || "Resultado"}</th><th>${t('thEvid') || "Evidencia"}</th></tr></thead><tbody>`;
        
        wc.tablaWCAG.forEach(c => {
            const resHtml = c.cumple ? `<span style="color:green;">1 - ${t('cumple') || 'Cumple'}</span>` : `<span style="color:red;">0 - ${t('noCumple') || 'No cumple'}</span>`;
            html += `<tr><td>${c.code} ${c.name}</td><td>${resHtml}</td><td><small>${c.evidencia}</small></td></tr>`;
        });
        
        html += `</tbody></table>`;
        html += `</li>`;
    }
    
    html += `</ul>`;

    $('modalTitle').innerText = t('modalTitle');
    $('modalBody').innerHTML = html;
    $('detailModal').style.display = "block";
    
    // WCAG 2.4.3 Manage focus on open
    $('detailModal').focus();
}

function closeModal() {
    $('detailModal').style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
