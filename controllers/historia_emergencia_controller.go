package controllers

import (
	"database/sql"
	"emergencia_go/config"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type HistoriaEmergenciaResponse struct {
	IdPaciente       int    `json:"id_paciente"`
	IdTipoOcupacion  int    `json:"id_tipo_ocupacion"`
	NroHistoria      string `json:"nro_historia"`
	ApellidosNombres string `json:"apellidos_nombres"`
	FechaIngreso     string `json:"fecha_ingreso"`
	HoraIngreso      string `json:"hora_ingreso"`
	Consultorio      string `json:"consultorio"`
	Medico           string `json:"medico"`
	Telefono         string `json:"telefono"`
	Direccion        string `json:"direccion"`
	Departamento     string `json:"departamento"`
	Distrito         string `json:"distrito"`
	Acompaniante     string `json:"acompaniante"`
	FormaIngreso     string `json:"forma_ingreso"`
	NroCuenta        int    `json:"nro_cuenta"`
	DNI              string `json:"dni"`
	Edad             string `json:"edad"`
	FechaNacimiento  string `json:"fecha_nacimiento"`
	Sexo             string `json:"sexo"`
	Ocupacion        string `json:"ocupacion"`
	Provincia        string `json:"provincia"`
	Prioridad        string `json:"prioridad"`
}

type OcupacionItem struct {
	IdTipoOcupacion int    `json:"id"`
	Descripcion     string `json:"descripcion"`
}

type ActualizarOcupacionRequest struct {
	IdPaciente int    `json:"id_paciente"`
	Ocupacion  string `json:"ocupacion"`
}

// GET /api/emergencia/ocupaciones
func GetTiposOcupacion(c *fiber.Ctx) error {
	db := config.DBSQLServer
	rows, err := db.Query(`
		SELECT IdTipoOcupacion, UPPER(LTRIM(RTRIM(Descripcion))) AS Descripcion
		FROM [dbo].[TiposOcupacion] WITH (NOLOCK)
		WHERE Descripcion IS NOT NULL AND LTRIM(RTRIM(Descripcion)) <> ''
		ORDER BY Descripcion ASC`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	lista := make([]OcupacionItem, 0, 100)
	for rows.Next() {
		var item OcupacionItem
		if err := rows.Scan(&item.IdTipoOcupacion, &item.Descripcion); err == nil {
			lista = append(lista, item)
		}
	}
	return c.JSON(lista)
}

// POST /api/emergencia/actualizar-ocupacion
func ActualizarOcupacionPaciente(c *fiber.Ctx) error {
	var req ActualizarOcupacionRequest
	if err := c.BodyParser(&req); err != nil || req.IdPaciente == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	ocupacion := strings.ToUpper(strings.TrimSpace(req.Ocupacion))
	if ocupacion == "" {
		return c.JSON(fiber.Map{"ok": true, "mensaje": "Sin cambios en ocupación"})
	}

	db := config.DBSQLServer
	var idOcupacion int

	// 1. Buscar si la ocupación ya existe en TiposOcupacion
	err := db.QueryRow(`
		SELECT TOP 1 IdTipoOcupacion 
		FROM [dbo].[TiposOcupacion] WITH (NOLOCK)
		WHERE UPPER(LTRIM(RTRIM(Descripcion))) = @p1`, ocupacion).Scan(&idOcupacion)

	// 2. Si no existe (ej. "INGENIERO AEROESPACIAL"), insertarla y recuperar su nuevo ID
	if err == sql.ErrNoRows {
		err = db.QueryRow(`
			INSERT INTO [dbo].[TiposOcupacion] (Descripcion)
			OUTPUT INSERTED.IdTipoOcupacion
			VALUES (@p1)`, ocupacion).Scan(&idOcupacion)
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error resolviendo ocupación: " + err.Error()})
	}

	// 3. Actualizar Pacientes con el IdTipoOcupacion
	_, err = db.Exec(`
		UPDATE [dbo].[Pacientes]
		SET IdTipoOcupacion = @p1
		WHERE IdPaciente = @p2`, idOcupacion, req.IdPaciente)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error actualizando paciente: " + err.Error()})
	}

	// Invalidar caché si aplica y devolver OK
	return c.JSON(fiber.Map{"ok": true, "id_tipo_ocupacion": idOcupacion, "ocupacion": ocupacion})
}

// GET /api/emergencia/historia-clinica/:cuenta
func GetHistoriaClinicaEmergencia(c *fiber.Ctx) error {
	db := config.DBSQLServer
	cuenta := c.Params("cuenta")

	query := `SELECT 
	    p.IdPaciente,
	    ISNULL(p.IdTipoOcupacion, 0) AS IdTipoOcupacion,
	    UPPER(ISNULL(p.NroHistoriaClinica, '')) AS NroHistoria,
	    UPPER(LTRIM(RTRIM(
	        ISNULL(p.ApellidoPaterno, '') + ' ' + 
	        ISNULL(p.ApellidoMaterno, '') + ' ' + 
	        ISNULL(p.PrimerNombre, '') + ' ' + 
	        ISNULL(p.SegundoNombre, '')
	    ))) AS ApellidosNombres,
	    CONVERT(VARCHAR(10), a.FechaIngreso, 103) AS FechaIngreso,
	    UPPER(ISNULL(a.HoraIngreso, '')) AS HoraIngreso,
	    UPPER(ISNULL(s.Nombre, '')) AS ConsultorioMedico,
	    UPPER(LTRIM(RTRIM(
	        ISNULL(e.ApellidoPaterno, '') + ' ' + 
	        ISNULL(e.ApellidoMaterno, '') + ' ' + 
	        ISNULL(e.Nombres, 'MEDICO DE TURNO')
	    ))) AS Medico,
	    UPPER(ISNULL(p.Telefono, '')) AS Telefono,
	    UPPER(ISNULL(COALESCE(
	        NULLIF(LTRIM(RTRIM(ae.DireccionDomicilio)) COLLATE DATABASE_DEFAULT, ''), 
	        LTRIM(RTRIM(p.DireccionDomicilio)) COLLATE DATABASE_DEFAULT
	    ), '')) AS Direccion,
	    UPPER(ISNULL(dep.Nombre, '')) AS Departamento,
	    UPPER(ISNULL(dist.Nombre, '')) AS Distrito,
	    UPPER(ISNULL(ae.NombreAcompaniante, '')) AS Acompaniante,
	    '' AS FormaIngreso,
	    a.IdCuentaAtencion AS NroCuenta,
	    UPPER(ISNULL(p.NroDocumento, '')) AS DNI,
	    UPPER(CAST(ISNULL(a.Edad, 0) AS VARCHAR(10)) + ' ' + ISNULL(te.Descripcion, 'AÑOS')) AS Edad,
	    ISNULL(CONVERT(VARCHAR(10), p.FechaNacimiento, 103), '') AS FechaNacimiento,
	    UPPER(ISNULL(ts.Descripcion, '')) AS Sexo,
	    UPPER(ISNULL(toc.Descripcion, '')) AS Ocupacion,
	    UPPER(ISNULL(prov.Nombre, '')) AS Provincia,
	    '' AS Prioridad
	FROM [dbo].[Atenciones] a WITH (NOLOCK)
	INNER JOIN [dbo].[Pacientes] p WITH (NOLOCK) ON a.IdPaciente = p.IdPaciente
	INNER JOIN [dbo].[Servicios] s WITH (NOLOCK) ON a.IdServicioIngreso = s.IdServicio
	LEFT JOIN [dbo].[AtencionesDatosAdicionales] ae WITH (NOLOCK) ON a.IdAtencion = ae.IdAtencion
	LEFT JOIN [dbo].[Medicos] m WITH (NOLOCK) ON a.IdMedicoIngreso = m.IdMedico
	LEFT JOIN [dbo].[Empleados] e WITH (NOLOCK) ON m.IdEmpleado = e.IdEmpleado
	LEFT JOIN [dbo].[TiposSexo] ts WITH (NOLOCK) ON p.IdTipoSexo = ts.IdTipoSexo
	LEFT JOIN [dbo].[TiposEdad] te WITH (NOLOCK) ON a.IdTipoEdad = te.IdTipoEdad
	LEFT JOIN [dbo].[TiposOcupacion] toc WITH (NOLOCK) ON p.IdTipoOcupacion = toc.IdTipoOcupacion
	LEFT JOIN [dbo].[Distritos] dist WITH (NOLOCK) ON p.IdDistritoDomicilio = dist.IdDistrito
	LEFT JOIN [dbo].[Provincias] prov WITH (NOLOCK) ON dist.IdProvincia = prov.IdProvincia
	LEFT JOIN [dbo].[Departamentos] dep WITH (NOLOCK) ON prov.IdDepartamento = dep.IdDepartamento
	WHERE a.IdCuentaAtencion = @p1`

	var h HistoriaEmergenciaResponse
	err := db.QueryRow(query, cuenta).Scan(
		&h.IdPaciente, &h.IdTipoOcupacion,
		&h.NroHistoria, &h.ApellidosNombres, &h.FechaIngreso, &h.HoraIngreso,
		&h.Consultorio, &h.Medico, &h.Telefono, &h.Direccion,
		&h.Departamento, &h.Distrito, &h.Acompaniante, &h.FormaIngreso,
		&h.NroCuenta, &h.DNI, &h.Edad, &h.FechaNacimiento,
		&h.Sexo, &h.Ocupacion, &h.Provincia, &h.Prioridad,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"error": "Atención no encontrada"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	h.Ocupacion = strings.TrimSpace(h.Ocupacion)
	return c.JSON(h)
}
