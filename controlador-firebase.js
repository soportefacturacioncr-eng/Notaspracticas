// controlador-extintores.js

const BASE_URL = "https://escuela-viento-fresco-default-rtdb.firebaseio.com";

// 1. Normalización avanzada para búsquedas impecables (clientes, distritos, etc.)
function normalizarTexto(texto) {
    if (!texto) return "";
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
        .replace(/z/g, "s")   // Agrupa Z y S
        .replace(/v/g, "b")   // Agrupa V y B
        .replace(/ll/g, "y")  // Agrupa LL y Y
        .trim();
}

// 2. REGISTRO O ACTUALIZACIÓN DE CLIENTE (Con sus extintores y ubicaciones)
async function guardarCliente(telefono, datosCliente) {
    // datosCliente debe incluir: nombre, provincia, canton, distrito, direccionExacta, tipoPago (Contado/Crédito), saldo, etc.
    // Además de un objeto o lista de 'extintores'
    
    try {
        const respuesta = await fetch(`${BASE_URL}/clientes_extintores/${telefono}.json`, {
            method: 'PUT', // PUT sobreescribe o crea el cliente directamente usando el teléfono como ID
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosCliente)
        });
        
        if (!respuesta.ok) throw new Error("Error al guardar en la base de datos");
        return true;
    } catch (error) {
        console.error("Error en guardarCliente:", error);
        return false;
    }
}

// 3. OBTENER TODOS LOS CLIENTES (Para el mapa, las rutas o el buscador del vendedor)
async function obtenerClientes() {
    try {
        const respuesta = await fetch(`${BASE_URL}/clientes_extintores.json`);
        const data = await respuesta.json();
        return data || {}; // Retorna un objeto donde cada llave es el teléfono del cliente
    } catch (error) {
        console.error("Error al obtener clientes:", error);
        return {};
    }
}

// 4. LOGÍSTICA: ANALIZAR VENCIMIENTOS (El "Semáforo" de alertas para las tarjetas)
// Esta función revisa los extintores de un cliente y determina si alguno requiere atención urgente
function verificarEstadoCliente(extintores) {
    if (!extintores || Object.keys(extintores).length === 0) return { estado: "sin_equipos", mensaje: "Sin extintores registrados" };

    const hoy = new Date();
    let proximoAVencer = false;
    let vencido = false;
    let totalEquipos = 0;

    for (let key in extintores) {
        totalEquipos++;
        const ext = extintores[key];
        if (!ext.fechaVencimiento) continue;

        const fechaVenc = new Date(ext.fechaVencimiento);
        const diferenciaDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

        if (diferenciaDias <= 0) {
            vencido = true;
        } else if (diferenciaDias <= 30) {
            proximoAVencer = true;
        }
    }

    if (vencido) return { estado: "vencido", clase: "border-red-500", icono: "⚠️ VENCIDO" };
    if (proximoAVencer) return { estado: "alerta", clase: "border-yellow-500", icono: "⏳ PRÓXIMO" };
    return { estado: "al dia", clase: "border-green-500", icono: "✅ AL DÍA" };
}

// 5. CONTROL DIARIO: Reportar la actividad del vendedor al administrador
async function registrarActividadDiaria(vendedorNombre, datosReporte) {
    // datosReporte incluye: clientesVisitados, dineroRecaudado, gastosDiesel, gastosViaticos, fecha
    const fechaFormato = new Date().toISOString().split('T')[0]; // Ejemplo: 2026-05-27
    
    try {
        const respuesta = await fetch(`${BASE_URL}/visitas_diarias/${fechaFormato}/${vendedorNombre}.json`, {
            method: 'SET', // O POST si un mismo vendedor puede subir varios reportes separados al día
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...datosReporte,
                horaRegistro: new Date().toLocaleTimeString('es-CR')
            })
        });
        return respuesta.ok;
    } catch (error) {
        console.error("Error al registrar actividad diaria:", error);
        return false;
    }
}

// 6. AJUSTES DEL MANAGER: Guardar los tamaños de extintores autorizados
async function guardarTamanosConfig(listaTamanos) {
    // listaTamanos puede ser un arreglo simple: ["5 lbs", "10 lbs", "15 lbs", "20 lbs"]
    try {
        const respuesta = await fetch(`${BASE_URL}/configuracion_sistema/tamanos.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listaTamanos)
        });
        return respuesta.ok;
    } catch (error) {
        console.error("Error al guardar tamaños:", error);
        return false;
    }
}

// 7. OBTENER CONFIGURACIÓN DE TAMAÑOS (Para poblar los menús desplegables automáticamente)
async function obtenerTamanosConfig() {
    try {
        const respuesta = await fetch(`${BASE_URL}/configuracion_sistema/tamanos.json`);
        const data = await respuesta.json();
        // Si no se ha configurado nada aún, devolvemos los tamaños estándar por defecto
        return data || ["5 lbs", "10 lbs", "15 lbs", "20 lbs"];
    } catch (error) {
        return ["5 lbs", "10 lbs", "15 lbs", "20 lbs"];
    }
}
