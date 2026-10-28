const API_URL = "http://172.16.10.240:8080/api";

document.addEventListener("DOMContentLoaded", () => {
    const inputTermino = document.getElementById("input_termino");
    
    inputTermino.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            buscarCustodia();
        }
    });

    iniciarIntegridad();
});

async function buscarCustodia() {
    const termino = document.getElementById("input_termino").value.trim();
    if (!termino) {
        return Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'Por favor, ingrese un número de DNI o Historia Clínica.',
            confirmButtonColor: '#d97706'
        });
    }

    try {
        // 1. Consultar si tiene movimientos en la tabla de custodia
        const res = await fetch(`${API_URL}/archivos/movimiento/historial/${termino}`);
        const data = await res.json();

        if (data.length === 0) {
            // 2. Si no tiene movimientos, validar si el paciente existe en la BD SIGH
            const resPac = await fetch(`${API_URL}/archivos/paciente/${termino}`);
            if (!resPac.ok) {
                return Swal.fire({
                    icon: 'error',
                    title: 'No Encontrado',
                    text: 'El paciente no existe en el sistema hospitalario.',
                    confirmButtonColor: '#d93025'
                });
            }
            
            const pacData = await resPac.json();
            mostrarInfo(pacData.nombre_completo, pacData.nro_historia_clinica, termino, "DEVUELTO", "ARCHIVO GENERAL (Sin Préstamos Activos)", "ARCHIVO CENTRAL", []);
            return;
        }

        const ultimo = data[0];
        mostrarInfo(ultimo.paciente, ultimo.nro_historia_clinica, ultimo.dni, ultimo.estado, ultimo.ubicacion_archivo, ultimo.servicio_destino, data);

    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Fallo al conectar con el servidor Go.', 'error');
    }
}

function mostrarInfo(paciente, hc, dni, estado, ubicacion, servicio, movimientos) {
    document.getElementById("res_paciente").textContent = paciente;
    document.getElementById("res_hc").textContent = hc;
    document.getElementById("res_dni").textContent = dni || '-';
    document.getElementById("res_ubicacion").textContent = ubicacion || 'ARCHIVO GENERAL';
    document.getElementById("res_servicio").textContent = servicio || '-';

    const badgeCont = document.getElementById("res_badge_estado");
    if (estado === "SALIENTE") {
        badgeCont.innerHTML = '<span class="px-3 py-1 bg-red-600 text-white rounded-full font-bold text-xs"><i class="bi bi-box-arrow-up-right mr-1"></i> EN PRÉSTAMO</span>';
    } else {
        badgeCont.innerHTML = '<span class="px-3 py-1 bg-emerald-600 text-white rounded-full font-bold text-xs"><i class="bi bi-shield-check mr-1"></i> EN ARCHIVO</span>';
    }

    const listCont = document.getElementById("listaMovimientosLocalizador");
    listCont.innerHTML = "";

    if (movimientos.length === 0) {
        listCont.innerHTML = '<p class="text-gray-400 font-semibold">Expediente físicamente en el archivo central sin salidas registradas.</p>';
    } else {
        movimientos.forEach(m => {
            const esSaliente = (m.estado === "SALIENTE");
            const div = document.createElement("div");
            div.className = `p-3.5 rounded-xl border-l-4 ${esSaliente ? 'border-red-500 bg-red-50' : 'border-emerald-500 bg-emerald-50'} shadow-sm space-y-1`;
            div.innerHTML = `
                <div class="flex justify-between items-center font-bold">
                    <span class="text-gray-900 uppercase">${m.servicio_destino}</span>
                    <span class="${esSaliente ? 'text-red-700' : 'text-emerald-700'} text-[10px] font-extrabold px-2 py-0.5 rounded bg-white border">${m.estado}</span>
                </div>
                <p class="text-gray-700 text-[11px]"><strong>Salida:</strong> ${m.fecha_salida} | <strong>Recogió:</strong> ${m.quien_recoge}</p>
                ${m.fecha_devolucion ? `<p class="text-emerald-900 text-[11px]"><strong>Devuelto:</strong> ${m.fecha_devolucion} | <strong>Ubicación:</strong> <span class="font-bold">${m.ubicacion_archivo}</span></p>` : ''}
                ${m.observaciones ? `<p class="text-[10px] text-gray-500 italic border-t pt-1">Nota: ${m.observaciones}</p>` : ''}
            `;
            listCont.appendChild(div);
        });
    }

    document.getElementById("resultadoCustodia").classList.remove("hidden");
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