const API_URL = "http://172.16.10.240:8080/api";
let citasCache = [];
let citasFiltradas = [];
let pestanaActiva = "hoy";
let paginaActual = 1;
let registrosPorPagina = 10;

// Estado del ordenamiento global
let columnaOrdenActual = "null";
let ordenAscendente = true;

document.addEventListener("DOMContentLoaded", () => {
    cargarCitas("hoy");

    document.getElementById("tab-hoy").addEventListener("click", () => cambiarPestana("hoy"));
    document.getElementById("tab-manana").addEventListener("click", () => cambiarPestana("manana"));

    document.getElementById("select-filas").addEventListener("change", (e) => {
        registrosPorPagina = parseInt(e.target.value);
        paginaActual = 1;
        actualizarVistaPaginada();
    });

    document.getElementById("input-busqueda").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        citasFiltradas = citasCache.filter(item =>
            item.paciente.toLowerCase().includes(q) ||
            item.dni.toLowerCase().includes(q) ||
            item.nro_historia_clinica.toLowerCase().includes(q) ||
            item.servicio.toLowerCase().includes(q) ||
            item.medico.toLowerCase().includes(q)
        );
        aplicarOrden();
        paginaActual = 1;
        actualizarVistaPaginada();
    });

    iniciarIntegridad();
});

function cambiarPestana(tipo) {
    pestanaActiva = tipo;
    const tabHoy = document.getElementById("tab-hoy");
    const tabManana = document.getElementById("tab-manana");

    if (tipo === "hoy") {
        tabHoy.className = "flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-red-600 text-white shadow transition";
        tabManana.className = "flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 transition cursor-pointer";
    } else {
        tabManana.className = "flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-red-600 text-white shadow transition";
        tabHoy.className = "flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 transition cursor-pointer";
    }

    cargarCitas(tipo);
}

async function cargarCitas(tipo) {
    const tbody = document.getElementById("tablaBody");
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-gray-400 text-xs"><i class="bi bi-arrow-repeat animate-spin mr-2"></i> Consultando citas programadas...</td></tr>`;

    try {
        const res = await fetch(`${API_URL}/archivos/citas-ce?tipo=${tipo}`);
        if (!res.ok) throw new Error("Error al obtener citas");

        citasCache = await res.json();
        citasFiltradas = [...citasCache];
        
        aplicarOrden();
        actualizarIconosOrden();

        paginaActual = 1;
        document.getElementById("contador-citas").textContent = `${citasCache.length} Expedientes`;
        actualizarVistaPaginada();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-red-500 font-semibold text-xs"><i class="bi bi-exclamation-triangle mr-2"></i> Error al conectar con la base de datos de Archivos.</td></tr>`;
    }
}

// ORDENAMIENTO UNIVERSAL PARA TODAS LAS COLUMNAS
window.ordenarPor = function(columna) {
    if (columnaOrdenActual === columna) {
        ordenAscendente = !ordenAscendente;
    } else {
        columnaOrdenActual = columna;
        ordenAscendente = true;
    }

    aplicarOrden();
    actualizarIconosOrden();
    paginaActual = 1;
    actualizarVistaPaginada();
};

function aplicarOrden() {
    citasFiltradas.sort((a, b) => {
        let valA = (a[columnaOrdenActual] || "").toString().trim().toUpperCase();
        let valB = (b[columnaOrdenActual] || "").toString().trim().toUpperCase();

        // Orden numérico para H.C. o DNI si aplican
        if (columnaOrdenActual === "nro_historia_clinica" || columnaOrdenActual === "dni") {
            const numA = parseInt(valA, 10);
            const numB = parseInt(valB, 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                return ordenAscendente ? numA - numB : numB - numA;
            }
        }

        return ordenAscendente ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
}

function actualizarIconosOrden() {
    const columnas = ["hora_cita", "paciente", "dni", "nro_historia_clinica", "seguro", "servicio", "medico"];
    columnas.forEach(col => {
        const icono = document.getElementById(`sort-${col}`);
        if (!icono) return;

        if (col === columnaOrdenActual) {
            icono.className = ordenAscendente 
                ? "bi bi-arrow-up text-xs text-red-400 font-bold" 
                : "bi bi-arrow-down text-xs text-red-400 font-bold";
        } else {
            icono.className = "bi bi-arrow-down-up text-xs text-gray-500 opacity-60";
        }
    });
}

function actualizarVistaPaginada() {
    const total = citasFiltradas.length;
    const totalPaginas = Math.ceil(total / registrosPorPagina) || 1;

    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = Math.min(inicio + registrosPorPagina, total);
    const registrosDePagina = citasFiltradas.slice(inicio, fin);

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
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-gray-400 font-medium text-xs">No se encontraron citas programadas en la lista.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        const seguroMayus = item.seguro.toUpperCase();
        let claseBadge = "bg-yellow-100 text-yellow-800 border-yellow-200";
        if (seguroMayus.includes("SIS")) {
            claseBadge = "bg-green-100 text-green-800 border-green-200";
        }

        const safeJSON = encodeURIComponent(JSON.stringify(item));

        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 border-b border-gray-100 transition duration-150 text-xs text-gray-700";
        tr.innerHTML = `
            <td class="p-3 text-center">
                <span class="inline-block bg-gray-900 text-white font-mono text-xs px-2 py-1 rounded shadow-sm">
                    <i class="bi bi-clock mr-1 text-red-400"></i>${item.hora_cita}
                </span>
            </td>
            <td class="p-3 font-bold text-gray-900 uppercase tracking-tight">${item.paciente}</td>
            <td class="p-3 text-center font-bold text-gray-700">${item.dni || '-'}</td>
            <td class="p-3 text-center">
                <span class="bg-gray-200 text-gray-800 font-bold px-2 py-0.5 rounded text-xs">${item.nro_historia_clinica || '-'}</span>
            </td>
            <td class="p-3 text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${claseBadge}">
                    ${item.seguro}
                </span>
            </td>
            <td class="p-3">
                <span class="inline-block bg-gray-100 text-gray-800 border border-gray-300 font-semibold px-2 py-0.5 rounded text-[11px]">
                    ${item.servicio}
                </span>
            </td>
            <td class="p-3 text-gray-600 font-bold truncate max-w-xs">
                <i class="bi bi-person-badge mr-1 text-blue-600"></i>${item.medico}
            </td>
            <td class="p-3 text-center">
                <div class="inline-flex items-center gap-1">
                    <button onclick="abrirModalSalida('${safeJSON}')" class="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg border border-red-200 transition shadow-sm cursor-pointer" title="Registrar Salida / Despacho">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </button>
                    <button onclick="abrirModalDevolucion('${safeJSON}')" class="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-lg border border-emerald-200 transition shadow-sm cursor-pointer" title="Registrar Retorno / Devolución">
                        <i class="bi bi-box-arrow-in-down-left"></i>
                    </button>
                    <button onclick="verHistorial('${item.nro_historia_clinica}', '${encodeURIComponent(item.paciente)}', '${item.dni}')" class="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg border border-blue-200 transition shadow-sm cursor-pointer" title="Ver Historial y Ubicación">
                        <i class="bi bi-eye"></i>
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

    const btnAnt = document.createElement("button");
    btnAnt.className = `px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${paginaActual === 1 ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50" : "border-gray-300 text-gray-700 hover:bg-gray-200 bg-white cursor-pointer"}`;
    btnAnt.innerHTML = '<i class="bi bi-chevron-left"></i>';
    btnAnt.disabled = (paginaActual === 1);
    btnAnt.onclick = () => { if (paginaActual > 1) { paginaActual--; actualizarVistaPaginada(); } };
    contenedor.appendChild(btnAnt);

    let inicio = Math.max(1, paginaActual - 2);
    let fin = Math.min(totalPaginas, paginaActual + 2);

    for (let i = inicio; i <= fin; i++) {
        const btnNum = document.createElement("button");
        if (i === paginaActual) {
            btnNum.className = "px-3 py-1.5 rounded-lg bg-red-600 text-white font-extrabold text-xs shadow-sm cursor-default";
        } else {
            btnNum.className = "px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 font-semibold text-xs transition cursor-pointer";
            btnNum.onclick = () => { paginaActual = i; actualizarVistaPaginada(); };
        }
        btnNum.textContent = i;
        contenedor.appendChild(btnNum);
    }

    const btnSig = document.createElement("button");
    btnSig.className = `px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${paginaActual === totalPaginas ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50" : "border-gray-300 text-gray-700 hover:bg-gray-200 bg-white cursor-pointer"}`;
    btnSig.innerHTML = '<i class="bi bi-chevron-right"></i>';
    btnSig.disabled = (paginaActual === totalPaginas);
    btnSig.onclick = () => { if (paginaActual < totalPaginas) { paginaActual++; actualizarVistaPaginada(); } };
    contenedor.appendChild(btnSig);
}

// FUNCIONES DE MODALES Y ACCIONES
function cerrarModal(id) {
    document.getElementById(id).classList.add("hidden");
}

function abrirModalSalida(safeJSON) {
    const item = JSON.parse(decodeURIComponent(safeJSON));
    document.getElementById("s_paciente").textContent = item.paciente;
    document.getElementById("s_hc").textContent = item.nro_historia_clinica;
    document.getElementById("s_dni").textContent = item.dni || '-';
    document.getElementById("s_servicio").textContent = item.servicio;
    document.getElementById("s_nro_cuenta").value = item.nro_cuenta || 0;
    document.getElementById("s_quien_recoge").value = "";
    document.getElementById("s_obs").value = "";
    document.getElementById("modalSalida").classList.remove("hidden");
    document.getElementById("s_quien_recoge").focus();
}

async function procesarSalida() {
    const hc = document.getElementById("s_hc").textContent;
    const dni = document.getElementById("s_dni").textContent;
    const paciente = document.getElementById("s_paciente").textContent;
    const servicio = document.getElementById("s_servicio").textContent;
    const cuenta = parseInt(document.getElementById("s_nro_cuenta").value) || 0;
    const quien = document.getElementById("s_quien_recoge").value.trim();
    const obs = document.getElementById("s_obs").value.trim();

    if (!quien) {
        return Swal.fire('Campo requerido', 'Ingrese el nombre de la persona que retira el expediente', 'warning');
    }

    try {
        const res = await fetch(`${API_URL}/archivos/movimiento/salida`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nro_historia_clinica: hc,
                dni: dni,
                paciente: paciente,
                id_cuenta_atencion: cuenta,
                servicio_destino: servicio,
                quien_recoge: quien,
                usuario_salida: "ARCHIVOS_UEI",
                observaciones: obs
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            cerrarModal("modalSalida");
            Swal.fire('Salida Registrada', 'El expediente fue marcado como prestado/saliente.', 'success');
        } else {
            throw new Error(data.message || "Error al registrar");
        }
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function abrirModalDevolucion(safeJSON) {
    const item = JSON.parse(decodeURIComponent(safeJSON));
    
    try {
        const res = await fetch(`${API_URL}/archivos/movimiento/ultimo-estado/${item.nro_historia_clinica}`);
        const data = await res.json();

        if (data.estado !== "SALIENTE") {
            return Swal.fire({
                icon: 'info',
                title: 'Expediente en Archivo',
                text: `Esta historia clínica no figura como pendiente de devolución. Ubicación registrada: ${data.ubicacion_archivo || 'Archivo General'}`,
                confirmButtonColor: '#059669'
            });
        }

        document.getElementById("d_paciente").textContent = item.paciente;
        document.getElementById("d_hc").textContent = item.nro_historia_clinica;
        document.getElementById("d_salida_info").textContent = `${data.fecha_salida} por ${data.quien_recoge} (${data.servicio_destino})`;
        document.getElementById("d_id_movimiento").value = data.id_movimiento;
        document.getElementById("d_quien_devuelve").value = "";
        document.getElementById("d_ubicacion").value = "";
        document.getElementById("d_obs").value = "";
        
        document.getElementById("modalDevolucion").classList.remove("hidden");
        document.getElementById("d_quien_devuelve").focus();

    } catch (err) {
        Swal.fire('Error', 'No se pudo consultar el estado del expediente', 'error');
    }
}

async function procesarDevolucion() {
    const idMov = parseInt(document.getElementById("d_id_movimiento").value);
    const quien = document.getElementById("d_quien_devuelve").value.trim();
    const ubicacion = document.getElementById("d_ubicacion").value.trim();
    const obs = document.getElementById("d_obs").value.trim();

    if (!quien || !ubicacion) {
        return Swal.fire('Campos requeridos', 'Debe indicar quién devuelve y la ubicación física en archivo', 'warning');
    }

    try {
        const res = await fetch(`${API_URL}/archivos/movimiento/devolucion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_movimiento: idMov,
                quien_devuelve: quien,
                ubicacion_archivo: ubicacion,
                usuario_devolucion: "ARCHIVOS_UEI",
                observaciones: obs
            })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
            cerrarModal("modalDevolucion");
            Swal.fire('Devolución Exitosa', 'El expediente fue reingresado y ubicado en archivo.', 'success');
        } else {
            throw new Error(data.message || "Error al devolver");
        }
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function verHistorial(hc, pacEncoded, dni) {
    const paciente = decodeURIComponent(pacEncoded);
    document.getElementById("h_paciente").textContent = paciente;
    document.getElementById("h_hc").textContent = hc;
    document.getElementById("h_dni").textContent = dni || '-';

    const timeline = document.getElementById("timelineMovimientos");
    timeline.innerHTML = '<p class="text-center text-gray-400 py-4"><i class="bi bi-arrow-repeat animate-spin mr-2"></i> Cargando trazabilidad...</p>';
    document.getElementById("modalHistorial").classList.remove("hidden");

    try {
        const res = await fetch(`${API_URL}/archivos/movimiento/historial/${hc}`);
        const lista = await res.json();

        timeline.innerHTML = "";
        if (lista.length === 0) {
            timeline.innerHTML = '<div class="p-4 bg-gray-50 rounded-xl text-center text-gray-500 font-semibold">No registra salidas ni movimientos en la nueva base de custodia. Expediente en Archivo Central.</div>';
            return;
        }

        lista.forEach(m => {
            const esSaliente = (m.estado === "SALIENTE");
            const colorBorde = esSaliente ? "border-red-500 bg-red-50 text-red-900" : "border-emerald-500 bg-emerald-50 text-emerald-900";
            const badgeEstado = esSaliente 
                ? '<span class="px-2 py-0.5 text-[10px] font-extrabold bg-red-600 text-white rounded">EN TRÁNSITO / CONSULTORIO</span>'
                : '<span class="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-600 text-white rounded">DEVUELTO AL ARCHIVO</span>';

            const card = document.createElement("div");
            card.className = `p-4 rounded-xl border-l-4 ${colorBorde} shadow-sm space-y-2`;
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-bold text-xs uppercase">${m.servicio_destino}</span>
                    ${badgeEstado}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-gray-700">
                    <div>
                        <p><strong>Salida:</strong> ${m.fecha_salida}</p>
                        <p><strong>Recogido por:</strong> ${m.quien_recoge}</p>
                    </div>
                    <div>
                        <p><strong>Devuelto:</strong> ${m.fecha_devolucion || 'PENDIENTE'}</p>
                        <p><strong>Entregado por:</strong> ${m.quien_devuelve || '-'}</p>
                        <p><strong>Ubicación Física:</strong> <span class="font-bold text-gray-900">${m.ubicacion_archivo}</span></p>
                    </div>
                </div>
                ${m.observaciones ? `<p class="text-[10px] text-gray-500 italic border-t pt-1">Nota: ${m.observaciones}</p>` : ''}
            `;
            timeline.appendChild(card);
        });
    } catch (err) {
        timeline.innerHTML = '<p class="text-center text-red-500 font-bold">Error cargando historial.</p>';
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