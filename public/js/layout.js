document.addEventListener("DOMContentLoaded", async () => {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) return;

    try {
        // 1. Inyectar el HTML del sidebar
        const resHtml = await fetch("sidebar.html");
        sidebarContainer.innerHTML = await resHtml.text();

        // 2. Aplicar permisos según el rol
        await procesarPermisos();

        // 3. Marcar link activo en rojo
        marcarItemActivo();
    } catch (e) {
        console.error("Error inicializando sidebar:", e);
    }
});

async function procesarPermisos() {
    try {
        const res = await fetch("session_info.php");
        if (!res.ok) {
            window.location.href = "../login.php?error=sesion_expirada";
            return;
        }

        const data = await res.json();
        const rol = (data.rol || "").trim().toLowerCase();

        const bOdonto = document.getElementById("bloque-odontologia");
        const bEmg    = document.getElementById("bloque-emergencia");
        const bArch   = document.getElementById("bloque-archivos");
        const bAdm    = document.getElementById("bloque-admin");
        const pagina  = window.location.pathname.split("/").pop();

        // Regla 1: Superadministradores (ven TODO)
        if (rol === "go_admin_emg" || rol === "admin") {
            if (bOdonto) bOdonto.style.display = "block";
            if (bEmg)    bEmg.style.display    = "block";
            if (bArch)   bArch.style.display   = "block";
            if (bAdm)    bAdm.style.display    = "block";

        // Regla 2: Odontología (SOLO ve Odontología)
        } else if (rol === "odonto" || rol === "odontologia" || rol === "medico_odonto") {
            if (bOdonto) bOdonto.style.display = "block";
            if (bEmg)    bEmg.style.display    = "none";
            if (bArch)   bArch.style.display   = "none";
            if (bAdm)    bAdm.style.display    = "none";

            const permitidasOdonto = ["odontologia_hoy.html", "hoja_atencion_odonto.html"];
            if (!permitidasOdonto.includes(pagina)) {
                window.location.href = "odontologia_hoy.html";
            }

        // Regla 3: Archivos (C.E. y Actualizar Historias)
        } else if (rol === "archivos_go") {
            if (bOdonto) bOdonto.style.display = "none";
            if (bEmg)    bEmg.style.display    = "none";
            if (bArch)   bArch.style.display   = "block";
            if (bAdm)    bAdm.style.display    = "block";

            const prohibidasArchivos = [
                "dashboard.html", "pacientes_hoy.html", "relases.html", 
                "index.html", "", "odontologia_hoy.html", "hoja_atencion_odonto.html"
            ];
            if (prohibidasArchivos.includes(pagina)) {
                window.location.href = "citas_hoy_manana.html";
            }

        // Regla 4: Emergencia (Dashboard, Ingresos, Historial y Actualizar Historias)
        } else if (rol === "emergencia_go") {
            if (bOdonto) bOdonto.style.display = "none";
            if (bEmg)    bEmg.style.display    = "block";
            if (bArch)   bArch.style.display   = "none";
            if (bAdm)    bAdm.style.display    = "block";

            const prohibidasEmergencia = [
                "citas_hoy_manana.html", "localizador_hc.html", 
                "odontologia_hoy.html", "hoja_atencion_odonto.html"
            ];
            if (prohibidasEmergencia.includes(pagina)) {
                window.location.href = "dashboard.html";
            }
        }
    } catch (err) {
        console.error("Error al validar permisos de rol:", err);
    }
}

function marcarItemActivo() {
    const path = window.location.pathname.split("/").pop();
    const links = {
        "": "nav-dashboard",
        "index.html": "nav-dashboard",
        "dashboard.html": "nav-dashboard",
        "pacientes_hoy.html": "nav-pacientes",
        "relases.html": "nav-relases",
        "citas_hoy_manana.html": "nav-citas",
        "localizador_hc.html": "nav-localizador",
        "hist_clinicas.html": "nav-hist-clinicas",
        "odontologia_hoy.html": "nav-odonto"
    };

    const activeId = links[path];
    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) {
            el.classList.remove("text-gray-300", "hover:bg-gray-800");

            if (activeId === "nav-odonto") {
                // Color celeste idéntico al header de odontología
                el.classList.add("text-white", "font-bold", "shadow-md");
                el.style.background = "linear-gradient(45deg, #0284c7, #0369a1)";
            } else {
                // Rojo estándar para el resto de módulos
                el.classList.add("bg-red-600", "text-white", "font-semibold", "shadow-md");
            }
        }
    }
}