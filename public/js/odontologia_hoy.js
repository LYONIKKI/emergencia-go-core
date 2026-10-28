const API_URL = "http://172.16.10.240:8080/api";
let citasCache = [];
let citasFiltradas = [];
let paginaActual = 1;
let registrosPorPagina = 10;

document.addEventListener("DOMContentLoaded", () => {
    const fechaActual = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fechaEl = document.getElementById("fecha-actual");
    if (fechaEl) fechaEl.textContent = fechaActual;

    cargarCitas();
    setInterval(cargarCitas, 60000);

    document.getElementById("select-filas").addEventListener("change", (e) => {
        registrosPorPagina = parseInt(e.target.value);
        paginaActual = 1;
        actualizarVistaPaginada();
    });

    document.getElementById("input-busqueda").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        citasFiltradas = citasCache.filter(c => 
            c.paciente.toLowerCase().includes(query) ||
            c.dni.toLowerCase().includes(query) ||
            c.nro_historia_clinica.toLowerCase().includes(query) ||
            c.nro_cuenta.toString().includes(query) ||
            c.medico.toLowerCase().includes(query)
        );
        paginaActual = 1;
        actualizarVistaPaginada();
    });
});

async function cargarCitas() {
    try {
        const res = await fetch(`${API_URL}/odontologia/citas-hoy`);
        if (!res.ok) throw new Error("Error al consultar el servidor");

        citasCache = await res.json();
        citasFiltradas = [...citasCache];
        document.getElementById("contador-citas").textContent = `${citasCache.length} Pacientes`;
        actualizarVistaPaginada();
    } catch (err) {
        console.error(err);
        document.getElementById("tablaBody").innerHTML = `
            <tr>
                <td colspan="8" class="p-6 text-center text-red-500 font-semibold">
                    <i class="bi bi-exclamation-triangle mr-2"></i> Error al sincronizar con el backend Go.
                </td>
            </tr>`;
    }
}

function actualizarVistaPaginada() {
    const total = citasFiltradas.length;
    const totalPaginas = Math.ceil(total / registrosPorPagina) || 1;

    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = Math.min(inicio + registrosPorPagina, total);
    const registros = citasFiltradas.slice(inicio, fin);

    document.getElementById("pag-desde").textContent = total > 0 ? (inicio + 1) : 0;
    document.getElementById("pag-hasta").textContent = fin;
    document.getElementById("pag-total").textContent = total;

    renderTabla(registros);
    renderPaginador(totalPaginas);
}

function renderTabla(lista) {
    const tbody = document.getElementById("tablaBody");
    tbody.innerHTML = "";

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="p-6 text-center text-gray-400 font-medium text-xs">
                    No hay citas odontológicas para el día de hoy.
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

        const tieneCuenta = item.nro_cuenta > 0;
        const badgeCuenta = tieneCuenta 
            ? `<span class="bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded text-xs border border-indigo-200">${item.nro_cuenta}</span>`
            : `<span class="bg-gray-100 text-gray-500 italic px-2 py-0.5 rounded text-[11px]">Sin atención</span>`;

        const tr = document.createElement("tr");
        tr.className = "hover:bg-gray-50 border-b border-gray-100 transition duration-150 text-xs text-gray-700";
        tr.innerHTML = `
            <td class="p-3 text-center">
                <span class="inline-block bg-gray-900 text-white font-mono text-xs px-2.5 py-1 rounded-md shadow-sm">
                    <i class="bi bi-clock mr-1 text-blue-400"></i>${item.hora_cita}
                </span>
            </td>
            <td class="p-3 text-center">${badgeCuenta}</td>
            <td class="p-3 text-center">
                <span class="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-[11px] font-semibold">${item.nro_historia_clinica || '-'}</span>
            </td>
            <td class="p-3 font-bold text-gray-900 uppercase tracking-tight">${item.paciente}</td>
            <td class="p-3 text-center font-semibold text-gray-600">${item.dni || '-'}</td>
            <td class="p-3 text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${claseBadge}">
                    <i class="bi bi-shield-check mr-1"></i> ${item.seguro}
                </span>
            </td>
            <td class="p-3">
                <div class="text-gray-900 font-bold text-[11px] truncate">${item.servicio}</div>
                <div class="text-blue-700 text-[11px] truncate"><i class="bi bi-person-badge mr-1"></i>${item.medico}</div>
            </td>
            <td class="p-3 text-center">
                <button onclick="imprimirHojaAtencion('${item.nro_cuenta}')" 
                    ${!tieneCuenta ? 'disabled' : ''} 
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 shadow-sm cursor-pointer ${
                        tieneCuenta 
                            ? 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 hover:border-blue-600' 
                            : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }">
                    <i class="bi bi-printer-fill"></i> IMPRIMIR HOJA
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPaginador(totalPaginas) {
    const contenedor = document.getElementById("contenedor-paginacion");
    contenedor.innerHTML = "";

    const btnAnt = document.createElement("button");
    btnAnt.className = `px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${
        paginaActual === 1 ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50" : "border-gray-300 text-gray-700 hover:bg-gray-200 bg-white cursor-pointer"
    }`;
    btnAnt.innerHTML = '<i class="bi bi-chevron-left"></i>';
    btnAnt.disabled = (paginaActual === 1);
    btnAnt.onclick = () => { if (paginaActual > 1) { paginaActual--; actualizarVistaPaginada(); } };
    contenedor.appendChild(btnAnt);

    for (let i = 1; i <= totalPaginas; i++) {
        const btnNum = document.createElement("button");
        if (i === paginaActual) {
            btnNum.className = "px-3 py-1.5 rounded-lg bg-blue-600 text-white font-extrabold text-xs shadow-sm cursor-default";
        } else {
            btnNum.className = "px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 font-semibold text-xs transition cursor-pointer";
            btnNum.onclick = () => { paginaActual = i; actualizarVistaPaginada(); };
        }
        btnNum.textContent = i;
        contenedor.appendChild(btnNum);
    }

    const btnSig = document.createElement("button");
    btnSig.className = `px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${
        paginaActual === totalPaginas ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50" : "border-gray-300 text-gray-700 hover:bg-gray-200 bg-white cursor-pointer"
    }`;
    btnSig.innerHTML = '<i class="bi bi-chevron-right"></i>';
    btnSig.disabled = (paginaActual === totalPaginas);
    btnSig.onclick = () => { if (paginaActual < totalPaginas) { paginaActual++; actualizarVistaPaginada(); } };
    contenedor.appendChild(btnSig);
}

function imprimirHojaAtencion(nroCuenta) {
    if (!nroCuenta || nroCuenta === "0") {
        alert("Esta cita aún no tiene generada una cuenta de atención.");
        return;
    }
    const url = `hoja_atencion_odonto.html?cuenta=${nroCuenta}`;
    window.open(url, 'ImpresionHojaAtencion', 'width=900,height=1000,toolbar=no,menubar=no');
}