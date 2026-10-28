/**
 * Módulo independiente: Sincronización de Filtros (Hoy/Mañana + Servicio + Filas) con Cupos Cronológicos
 */

let citasServicioData = [];
let paginaActualServicio = 1;

document.addEventListener("DOMContentLoaded", () => {
    cargarListaServiciosCE();

    const selectServicio = document.getElementById("select-servicio-filtro");
    const selectFilas = document.getElementById("select-filas");
    const tabHoy = document.getElementById("tab-hoy");
    const tabManana = document.getElementById("tab-manana");

    // 1. Evento al cambiar de Servicio
    if (selectServicio) {
        selectServicio.addEventListener("change", () => {
            paginaActualServicio = 1;
            ejecutarFiltroServicio();
        });
    }

    // 2. Interceptar cambio de filas
    if (selectFilas) {
        selectFilas.addEventListener("change", () => {
            const idServicio = selectServicio ? selectServicio.value : "";
            if (idServicio !== "") {
                paginaActualServicio = 1;
                renderizarPaginacionServicio();
            }
        });
    }

    // 3. Sincronizar pestañas Hoy / Mañana
    if (tabHoy) {
        tabHoy.addEventListener("click", () => {
            setTimeout(() => {
                const idServicio = selectServicio ? selectServicio.value : "";
                if (idServicio !== "") {
                    paginaActualServicio = 1;
                    ejecutarFiltroServicio();
                }
            }, 50);
        });
    }

    if (tabManana) {
        tabManana.addEventListener("click", () => {
            setTimeout(() => {
                const idServicio = selectServicio ? selectServicio.value : "";
                if (idServicio !== "") {
                    paginaActualServicio = 1;
                    ejecutarFiltroServicio();
                }
            }, 50);
        });
    }
});

// Obtener qué pestaña está activa actualmente
function obtenerPeriodoActivo() {
    const tabHoy = document.getElementById("tab-hoy");
    if (tabHoy && tabHoy.classList.contains("bg-red-600")) {
        return "hoy";
    }
    return "manana";
}

// Cargar el listado de servicios en el select
async function cargarListaServiciosCE() {
    try {
        const res = await fetch("http://172.16.10.240:8080/api/servicios/lista-ce");
        const json = await res.json();
        if (json.status === "success" && json.data) {
            const combo = document.getElementById("select-servicio-filtro");
            json.data.forEach(srv => {
                const opt = document.createElement("option");
                opt.value = srv.id_servicio;
                opt.textContent = srv.nombre;
                combo.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error al cargar lista de servicios:", e);
    }
}

// Consultar API de Go con la fecha y el servicio actual
async function ejecutarFiltroServicio() {
    const selectServicio = document.getElementById("select-servicio-filtro");
    const idServicio = selectServicio ? selectServicio.value : "";
    const periodo = obtenerPeriodoActivo();

    if (!idServicio || idServicio === "") {
        // Si se limpia el selector, recarga la vista general
        if (typeof cargarCitas === 'function') {
            cargarCitas(periodo);
        }
        return;
    }

    const tbody = document.getElementById("tablaBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="p-6 text-center text-gray-400 text-xs">
                <i class="bi bi-arrow-repeat animate-spin mr-2"></i> Cargando citas por cupo...
            </td>
        </tr>
    `;

    try {
        const res = await fetch(`http://172.16.10.240:8080/api/servicios/citas-cupos?id_servicio=${idServicio}&fecha=${periodo}`);
        const json = await res.json();

        if (json.status !== "success" || !json.data || json.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-gray-400 text-xs">No hay citas programadas para este consultorio.</td></tr>`;
            document.getElementById("contador-citas").innerText = "0 Expedientes";
            actualizarInfoPaginacionServicio(0, 0, 0);
            return;
        }

        citasServicioData = json.data;
        document.getElementById("contador-citas").innerText = `${json.total} Expedientes`;
        renderizarPaginacionServicio();

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-red-500 text-xs">Error de conexión al cargar datos del servicio.</td></tr>`;
    }
}

// Renderizado con paginación integrada
function renderizarPaginacionServicio() {
    const selectFilas = document.getElementById("select-filas");
    const limite = selectFilas ? parseInt(selectFilas.value) : 10;
    const total = citasServicioData.length;

    const totalPaginas = Math.ceil(total / limite) || 1;
    if (paginaActualServicio > totalPaginas) paginaActualServicio = totalPaginas;

    const inicio = (paginaActualServicio - 1) * limite;
    const fin = Math.min(inicio + limite, total);
    const paginaItems = citasServicioData.slice(inicio, fin);

    renderizarFilas(paginaItems);
    actualizarInfoPaginacionServicio(inicio + 1, fin, total);
    dibujarBotonesPaginacionServicio(totalPaginas);
}

// Dibujar tabla con formato y cupos
function renderizarFilas(lista) {
    const tbody = document.getElementById("tablaBody");
    let html = "";

    lista.forEach(item => {
        const rawDoc = (item.dni || item.nro_historia_clinica || "").toString().trim();
        const docFormateado = (rawDoc.length > 0 && rawDoc.length < 8 && !/[a-zA-Z]/.test(rawDoc)) ? rawDoc.padStart(8, '0') : rawDoc;

        html += `
            <tr class="hover:bg-gray-50 border-b border-gray-100 transition text-xs">
                <td class="p-3 text-center">
                    <span class="inline-flex items-center gap-1 font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg border border-gray-300">
                        <span class="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-black mr-1">#${item.cupo}</span>
                        ${item.hi || '--:--'}
                    </span>
                </td>
                <td class="p-3 font-semibold text-gray-800">${item.paciente}</td>
                <td class="p-3 text-center font-mono font-bold text-gray-700">${docFormateado}</td>
                <td class="p-3 text-center font-mono text-gray-600">${item.nro_historia_clinica || docFormateado}</td>
                <td class="p-3 text-center">
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${item.seguro === 'SIS' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                        ${item.seguro}
                    </span>
                </td>
                <td class="p-3 text-gray-700 font-medium">${item.servicio}</td>
                <td class="p-3 text-gray-600 text-[11px]"><i class="bi bi-person-fill text-blue-600 mr-1"></i>${item.medico}</td>
                <td class="p-3 text-center">
                    <button onclick="abrirModalSalida('${docFormateado}', '${item.paciente}', '${item.servicio}', ${item.nro_cuenta})" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Registrar Salida">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </button>
                    <button onclick="abrirModalDevolucion('${docFormateado}', '${item.paciente}', ${item.nro_cuenta})" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Registrar Devolución">
                        <i class="bi bi-box-arrow-in-down-left"></i>
                    </button>
                    <button onclick="verHistorial('${docFormateado}', '${item.paciente}')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Ver Historial">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function actualizarInfoPaginacionServicio(desde, hasta, total) {
    const elDesde = document.getElementById("pag-desde");
    const elHasta = document.getElementById("pag-hasta");
    const elTotal = document.getElementById("pag-total");
    if (elDesde) elDesde.innerText = total === 0 ? 0 : desde;
    if (elHasta) elHasta.innerText = hasta;
    if (elTotal) elTotal.innerText = total;
}

function dibujarBotonesPaginacionServicio(totalPaginas) {
    const contenedor = document.getElementById("contenedor-paginacion");
    if (!contenedor) return;

    let html = "";
    for (let i = 1; i <= totalPaginas; i++) {
        const activo = i === paginaActualServicio;
        html += `
            <button onclick="cambiarPaginaServicio(${i})" class="px-2.5 py-1 text-xs font-bold rounded-lg border transition ${activo ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'}">
                ${i}
            </button>
        `;
    }
    contenedor.innerHTML = html;
}

window.cambiarPaginaServicio = function(numPag) {
    paginaActualServicio = numPag;
    renderizarPaginacionServicio();
};