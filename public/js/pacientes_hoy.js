const API_URL = "http://172.16.10.240:8080/api";
cargarPacientes();
let pacientesCache = [];
let pacientesFiltrados = [];
let paginaActual = 1;
let registrosPorPagina = 5;

document.addEventListener("DOMContentLoaded", () => {
    const fechaActual = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fechaEl = document.getElementById("fecha-actual");
    if (fechaEl) fechaEl.textContent = fechaActual;

    setInterval(cargarPacientes, 60000);

    // Evento selector de límite de registros
    document.getElementById("select-filas").addEventListener("change", (e) => {
        registrosPorPagina = parseInt(e.target.value);
        paginaActual = 1;
        actualizarVistaPaginada();
    });

    // Evento de búsqueda
    document.getElementById("input-busqueda").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        pacientesFiltrados = pacientesCache.filter(p => 
            p.paciente.toLowerCase().includes(query) ||
            p.dni.toLowerCase().includes(query) ||
            p.nro_historia_clinica.toLowerCase().includes(query) ||
            p.servicio_emergencia.toLowerCase().includes(query) ||
            p.medico_ingreso.toLowerCase().includes(query)
        );
        paginaActual = 1;
        actualizarVistaPaginada();
    });

    iniciarIntegridad();
});

async function cargarPacientes() {
    try {
        const res = await fetch(`${API_URL}/emergencia/pacientes-hoy`);
        if (!res.ok) throw new Error("Error al consultar el servidor");
        
        pacientesCache = await res.json();
        pacientesFiltrados = [...pacientesCache];
        document.getElementById("contador-ingresos").textContent = `${pacientesCache.length} Ingresos`;
        
        actualizarVistaPaginada();
    } catch (err) {
        console.error(err);
        document.getElementById("tablaBody").innerHTML = `
            <tr>
                <td colspan="8" class="p-6 text-center text-red-500 font-semibold">
                    <i class="bi bi-exclamation-triangle mr-2"></i> Error al sincronizar con el servidor Go.
                </td>
            </tr>`;
    }
}

function actualizarVistaPaginada() {
    const total = pacientesFiltrados.length;
    const totalPaginas = Math.ceil(total / registrosPorPagina) || 1;

    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = Math.min(inicio + registrosPorPagina, total);
    const registrosDePagina = pacientesFiltrados.slice(inicio, fin);

    // Contadores del pie
    document.getElementById("pag-desde").textContent = total > 0 ? (inicio + 1) : 0;
    document.getElementById("pag-hasta").textContent = fin;
    document.getElementById("pag-total").textContent = total;

    renderTabla(registrosDePagina);
    renderPaginador(totalPaginas);
}

function renderTabla(lista) {
    const tbody = document.getElementById("tablaBody");
    tbody.innerHTML = "";

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="p-6 text-center text-gray-400 font-medium text-xs">
                    No se encontraron registros.
                </td>
            </tr>`;
        return;
    }

    lista.forEach(item => {
        const seguroMayus = item.seguro.toUpperCase();
        let claseBadge = "bg-yellow-100 text-yellow-800 border-yellow-200";
        if (seguroMayus.includes("SIS")) {
            claseBadge = "bg-green-100 text-green-800 border-green-200";
        } else if (seguroMayus.includes("CONVENIO")) {
            claseBadge = "bg-blue-100 text-blue-800 border-blue-200";
        }

        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 border-b border-gray-100 transition duration-150 text-xs text-gray-700";
        tr.innerHTML = `
            <td class="p-3 text-center">
                <span class="inline-block bg-gray-900 text-white font-mono text-xs px-2.5 py-1 rounded-md shadow-sm">
                    <i class="bi bi-clock mr-1 text-red-400"></i>${item.hora_ingreso}
                </span>
            </td>
            <td class="p-3 font-bold text-gray-900 uppercase tracking-tight">${item.paciente}</td>
            <td class="p-3 text-center font-semibold text-gray-600">${item.dni || '-'}</td>
            <td class="p-3 text-center">
                <span class="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-[11px] font-semibold">${item.nro_historia_clinica || '-'}</span>
            </td>
            <td class="p-3 text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${claseBadge}">
                    <i class="bi bi-shield-check mr-1"></i> ${item.seguro}
                </span>
            </td>
            <td class="p-3 text-center">
                <span class="inline-block bg-red-50 text-red-700 border border-red-200 font-bold px-2 py-1 rounded text-[11px]">
                    ${item.servicio_emergencia}
                </span>
            </td>
            <td class="p-3 text-blue-700 font-semibold truncate max-w-xs">
                <i class="bi bi-person-badge mr-1"></i>${item.medico_ingreso}
            </td>
            <td class="p-3 text-center whitespace-nowrap">
                <div class="inline-flex items-center justify-center gap-2">
                    <button onclick="imprimirTicket('${item.nro_cuenta}')" title="Imprimir Ticket"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-lg text-[11px] font-extrabold tracking-wide transition duration-150 shadow-sm cursor-pointer">
                        <i class="bi bi-printer-fill"></i> TICKET
                    </button>
                    <button onclick="abrirHistoriaEmergencia('${item.nro_cuenta}')" title="Historia Clínica de Emergencia"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg text-[11px] font-extrabold tracking-wide transition duration-150 shadow-sm cursor-pointer">
                        <i class="bi bi-file-earmark-medical-fill"></i> H.C.
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPaginador(totalPaginas) {
    const contenedor = document.getElementById("contenedor-paginacion");
    contenedor.innerHTML = "";

    // Botón Anterior
    const btnAnt = document.createElement("button");
    btnAnt.className = `px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${
        paginaActual === 1 
            ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50" 
            : "border-gray-300 text-gray-700 hover:bg-gray-200 bg-white cursor-pointer"
    }`;
    btnAnt.innerHTML = '<i class="bi bi-chevron-left"></i>';
    btnAnt.disabled = (paginaActual === 1);
    btnAnt.onclick = () => {
        if (paginaActual > 1) {
            paginaActual--;
            actualizarVistaPaginada();
        }
    };
    contenedor.appendChild(btnAnt);

    // Botones de Páginas Numéricas
    for (let i = 1; i <= totalPaginas; i++) {
        const btnNum = document.createElement("button");
        if (i === paginaActual) {
            btnNum.className = "px-3 py-1.5 rounded-lg bg-red-600 text-white font-extrabold text-xs shadow-sm cursor-default";
        } else {
            btnNum.className = "px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 font-semibold text-xs transition cursor-pointer";
            btnNum.onclick = () => {
                paginaActual = i;
                actualizarVistaPaginada();
            };
        }
        btnNum.textContent = i;
        contenedor.appendChild(btnNum);
    }

    // Botón Siguiente
    const btnSig = document.createElement("button");
    btnSig.className = `px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${
        paginaActual === totalPaginas 
            ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50" 
            : "border-gray-300 text-gray-700 hover:bg-gray-200 bg-white cursor-pointer"
    }`;
    btnSig.innerHTML = '<i class="bi bi-chevron-right"></i>';
    btnSig.disabled = (paginaActual === totalPaginas);
    btnSig.onclick = () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            actualizarVistaPaginada();
        }
    };
    contenedor.appendChild(btnSig);
}

function imprimirTicket(nroCuenta) {
    const url = `ticket.html?cuenta=${nroCuenta}`;
    window.open(url, 'ImpresionTicket', 'width=450,height=650,toolbar=no,menubar=no');
}

let ocupacionesCache = null;

async function obtenerCatalogoOcupaciones() {
    if (ocupacionesCache) return ocupacionesCache;
    const res = await fetch(`${API_URL}/emergencia/ocupaciones`);
    if (!res.ok) throw new Error("No se pudo cargar catálogo de ocupaciones");
    ocupacionesCache = await res.json();
    return ocupacionesCache;
}

async function abrirHistoriaEmergencia(nroCuenta) {
    try {
        const [respHistoria, catalogo] = await Promise.all([
            fetch(`${API_URL}/emergencia/historia-clinica/${nroCuenta}`),
            obtenerCatalogoOcupaciones()
        ]);

        if (!respHistoria.ok) throw new Error("No se encontró la atención");
        const data = await respHistoria.json();

        const res = await Swal.fire({
            title: 'Historia Clínica de Emergencia',
            html: `
                <div class="text-left text-xs text-gray-700 space-y-2 mt-2 relative">
                    <p><b>Paciente:</b> ${data.apellidos_nombres}</p>
                    <p><b>Ocupación actual en SIGH:</b> <span class="text-indigo-700 font-bold">${data.ocupacion || 'NO REGISTRADA'}</span></p>
                    <label class="block font-bold text-gray-700 pt-1">Ocupación (escriba para buscar o agregar nueva):</label>
                    <div class="relative">
                        <input type="text" id="swal-ocupacion-input"
                            value="${data.ocupacion || ''}"
                            placeholder="Ej: AGRICULTOR, INGENIERO AEROESPACIAL..."
                            autocomplete="off"
                            class="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-bold text-gray-800 uppercase outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500">
                        <div id="sugerencias-ocupacion" class="hidden absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg z-50 divide-y divide-gray-100"></div>
                    </div>
                </div>
            `,
            didOpen: () => {
                const inp = document.getElementById('swal-ocupacion-input');
                const box = document.getElementById('sugerencias-ocupacion');
                inp.focus();
                inp.select();

                const filtrar = () => {
                    const q = inp.value.trim().toUpperCase();
                    if (!q) {
                        box.classList.add('hidden');
                        return;
                    }
                    const matches = catalogo.filter(o => o.descripcion.includes(q)).slice(0, 15);
                    if (matches.length === 0) {
                        box.classList.add('hidden');
                        return;
                    }
                    box.innerHTML = matches.map(m =>
                        `<div class="px-3 py-2 hover:bg-red-50 hover:text-red-700 cursor-pointer font-semibold text-xs text-gray-700" data-val="${m.descripcion}">${m.descripcion}</div>`
                    ).join('');
                    box.classList.remove('hidden');

                    box.querySelectorAll('div').forEach(el => {
                        el.onclick = () => {
                            inp.value = el.getAttribute('data-val');
                            box.classList.add('hidden');
                        };
                    });
                };

                inp.addEventListener('input', filtrar);
            },
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-printer"></i> Guardar e Imprimir PDF',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d93025',
            preConfirm: () => {
                return document.getElementById('swal-ocupacion-input').value.trim().toUpperCase();
            }
        });

        if (res.isConfirmed) {
            const nuevaOcupacion = res.value;
            if (nuevaOcupacion && nuevaOcupacion !== (data.ocupacion || '').toUpperCase()) {
                await fetch(`${API_URL}/emergencia/actualizar-ocupacion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_paciente: data.id_paciente,
                        ocupacion: nuevaOcupacion
                    })
                });
                // Limpiar caché para que incluya si se creó una ocupación nueva
                ocupacionesCache = null;
            }
            window.open(`historia_emergencia.html?cuenta=${nroCuenta}`, '_blank');
        }
    } catch (e) {
        console.error(e);
        window.open(`historia_emergencia.html?cuenta=${nroCuenta}`, '_blank');
    }
}

function iniciarIntegridad() {
    setInterval(() => {
        const f = document.getElementById("l-f");
        if (!f || !f.innerHTML.includes("Anhgelo")) {
            document.body.innerHTML = `
                <div style="background:#000;color:#fff;height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;font-family:sans-serif;">
                    <div>
                        <h1 style="color:#d93025">SISTEMA BLOQUEADO</h1>
                        <p style="font-size:1.5rem">Se ha detectado una alteración no autorizada.</p>
                        <hr style="border-color:#333">
                        <p>Contacte al <b>Ing. Anhgelo Smith Vega Poma</b> (UEI - Data Center).</p>
                    </div>
                </div>`;
        }
    }, 4000);
}