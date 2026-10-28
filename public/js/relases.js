const API_URL = "http://172.16.10.240:8080/api";
let historialCache = [];
let historialFiltrado = [];
let paginaActual = 1;
let registrosPorPagina = 5;
let rangoSeleccionado = 0; // 0: Este Mes, -1: Hace 1 Mes

document.addEventListener("DOMContentLoaded", () => {
    cargarHistorial(0);

    // Evento selector de filas
    document.getElementById("select-filas").addEventListener("change", (e) => {
        registrosPorPagina = parseInt(e.target.value);
        paginaActual = 1;
        actualizarVistaPaginada();
    });

    // Evento buscador
    document.getElementById("input-busqueda").addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        historialFiltrado = historialCache.filter(item =>
            item.paciente.toLowerCase().includes(query) ||
            item.dni.toLowerCase().includes(query) ||
            item.fecha_ingreso.toLowerCase().includes(query) ||
            item.servicio_emergencia.toLowerCase().includes(query)
        );
        paginaActual = 1;
        actualizarVistaPaginada();
    });

    // Filtros de Rango (Botones Este Mes / Hace 1 Mes)
    document.getElementById("btn-este-mes").addEventListener("click", () => {
        cambiarRango(0);
    });

    document.getElementById("btn-mes-anterior").addEventListener("click", () => {
        cambiarRango(-1);
    });

    iniciarIntegridad();
});

function cambiarRango(rango) {
    rangoSeleccionado = rango;
    const btnEsteMes = document.getElementById("btn-este-mes");
    const btnMesAnt = document.getElementById("btn-mes-anterior");

    if (rango === 0) {
        btnEsteMes.className = "px-4 py-2 text-xs font-bold rounded-lg bg-white text-blue-900 shadow transition";
        btnMesAnt.className = "px-4 py-2 text-xs font-semibold rounded-lg bg-blue-800 bg-opacity-40 text-blue-100 hover:bg-white hover:text-blue-900 transition";
    } else {
        btnMesAnt.className = "px-4 py-2 text-xs font-bold rounded-lg bg-white text-blue-900 shadow transition";
        btnEsteMes.className = "px-4 py-2 text-xs font-semibold rounded-lg bg-blue-800 bg-opacity-40 text-blue-100 hover:bg-white hover:text-blue-900 transition";
    }

    cargarHistorial(rango);
}

async function cargarHistorial(rango) {
    const tbody = document.getElementById("tablaBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="p-6 text-center text-gray-400 text-xs">
                <i class="bi bi-arrow-repeat animate-spin mr-2"></i> Consultando registros acumulados...
            </td>
        </tr>`;

    try {
        const res = await fetch(`${API_URL}/emergencia/historial-atenciones?rango=${rango}`);
        if (!res.ok) throw new Error("Error al consultar el historial");

        historialCache = await res.json();
        historialFiltrado = [...historialCache];
        paginaActual = 1;
        actualizarVistaPaginada();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-6 text-center text-red-500 font-semibold text-xs">
                    <i class="bi bi-exclamation-triangle mr-2"></i> Error al conectar con el backend Go.
                </td>
            </tr>`;
    }
}

function actualizarVistaPaginada() {
    const total = historialFiltrado.length;
    const totalPaginas = Math.ceil(total / registrosPorPagina) || 1;

    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = Math.min(inicio + registrosPorPagina, total);
    const registrosDePagina = historialFiltrado.slice(inicio, fin);

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
                <td colspan="7" class="p-6 text-center text-gray-400 font-medium text-xs">
                    No se encontraron atenciones registradas.
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
            <td class="p-3 text-center font-semibold text-gray-800">${item.fecha_ingreso}</td>
            <td class="p-3 text-center font-mono text-gray-600">${item.hora_ingreso}</td>
            <td class="p-3 font-bold text-gray-900 uppercase tracking-tight">${item.paciente}</td>
            <td class="p-3 text-center font-bold text-gray-700">${item.dni || '-'}</td>
            <td class="p-3 text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${claseBadge}">
                    ${item.seguro}
                </span>
            </td>
            <td class="p-3 text-gray-600 font-medium">${item.servicio_emergencia}</td>
            <td class="p-3 text-center">
                <button onclick="imprimirTicket('${item.nro_cuenta}')" class="p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition shadow-sm cursor-pointer" title="Imprimir Ticket">
                    <i class="bi bi-printer text-sm"></i>
                </button>
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
        paginaActual === 1 ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50" : "border-gray-300 text-gray-700 hover:bg-gray-200 bg-white cursor-pointer"
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
    let inicio = Math.max(1, paginaActual - 2);
    let fin = Math.min(totalPaginas, paginaActual + 2);

    for (let i = inicio; i <= fin; i++) {
        const btnNum = document.createElement("button");
        if (i === paginaActual) {
            btnNum.className = "px-3 py-1.5 rounded-lg bg-blue-900 text-white font-extrabold text-xs shadow-sm cursor-default";
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
        paginaActual === totalPaginas ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50" : "border-gray-300 text-gray-700 hover:bg-gray-200 bg-white cursor-pointer"
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

function iniciarIntegridad() {
    setInterval(() => {
        const f = document.getElementById("l-f");
        if (!f || !f.innerHTML.includes("Anhgelo")) {
            document.body.innerHTML = `
                <div style="background:#000;color:#fff;height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;font-family:sans-serif;">
                    <div>
                        <h1 style="color:#d93025">ACCESO RESTRINGIDO</h1>
                        <p style="font-size:1.5rem">Se ha detectado una modificación no autorizada en el sistema.</p>
                        <hr style="border-color:#333">
                        <p>Para restaurar el servicio, contacte al desarrollador original: <b>Ing. Anhgelo Smith Vega Poma</b> (UEI - Data Center).</p>
                    </div>
                </div>`;
        }
    }, 4000);
}