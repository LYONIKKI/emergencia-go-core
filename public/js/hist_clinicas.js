const API_URL = "http://172.16.10.240:8080/api";
let modalInstancia = null;

document.addEventListener("DOMContentLoaded", () => {
    const inputDni = document.getElementById("dni_busqueda");
    
    inputDni.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            buscarPaciente();
        }
    });

    iniciarIntegridad();
});

async function buscarPaciente() {
    const dniInput = document.getElementById("dni_busqueda");
    const dni = dniInput.value.trim();
    const loading = document.getElementById("loading");

    if (!dni) {
        Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: 'Por favor, ingrese un número de DNI o Historia Clínica.',
            confirmButtonColor: '#d93025'
        });
        return;
    }

    loading.classList.remove("hidden");

    try {
        const res = await fetch(`${API_URL}/archivos/paciente/${dni}`);
        loading.classList.add("hidden");

        if (res.status === 404) {
            Swal.fire({
                icon: 'error',
                title: 'No Encontrado',
                text: 'No se localizó ningún paciente con el documento ingresado.',
                confirmButtonColor: '#d93025'
            });
            return;
        }

        if (!res.ok) throw new Error("Error en la consulta");

        const data = await res.json();

        // Rellenar datos en el Modal
        document.getElementById("nombre_paciente").textContent = data.nombre_completo;
        document.getElementById("id_sistema").textContent = data.id_paciente;
        document.getElementById("hc_actual").textContent = data.nro_historia_clinica;
        document.getElementById("modal_id_paciente").value = data.id_paciente;
        document.getElementById("nuevo_hc").value = "";

        // Abrir Modal
        const modalEl = document.getElementById("modalActualizar");
        modalEl.classList.remove("hidden");
        document.getElementById("nuevo_hc").focus();

    } catch (err) {
        loading.classList.add("hidden");
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: 'No se pudo comunicar con el servidor de base de datos.',
            confirmButtonColor: '#d93025'
        });
    }
}

function cerrarModal() {
    document.getElementById("modalActualizar").classList.add("hidden");
}

async function procesarUpdate() {
    const idPaciente = parseInt(document.getElementById("modal_id_paciente").value);
    const nuevoHC = document.getElementById("nuevo_hc").value.trim();

    if (!nuevoHC) {
        Swal.fire({
            icon: 'warning',
            title: 'Campo Requerido',
            text: 'Debe ingresar el nuevo número de historia clínica.',
            confirmButtonColor: '#d93025'
        });
        return;
    }

    try {
        const res = await fetch(`${API_URL}/archivos/actualizar-hc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_paciente: idPaciente, nuevo_hc: nuevoHC })
        });

        const data = await res.json();

        if (res.ok && data.status === "success") {
            cerrarModal();
            Swal.fire({
                icon: 'success',
                title: '¡Actualizado!',
                text: 'El número de historia clínica ha sido actualizado correctamente.',
                confirmButtonColor: '#16a34a'
            }).then(() => {
                document.getElementById("dni_busqueda").value = "";
                document.getElementById("dni_busqueda").focus();
            });
        } else {
            throw new Error(data.message || "Error al actualizar");
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Fallo al Guardar',
            text: err.message,
            confirmButtonColor: '#d93025'
        });
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