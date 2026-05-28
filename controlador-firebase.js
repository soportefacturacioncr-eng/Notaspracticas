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


// 4. LOGÍSTICA: ANALIZAR VENCIMIENTOS POR MES Y AÑO (El "Semáforo")
function verificarEstadoCliente(extintores) {
    if (!extintores || Object.keys(extintores).length === 0) return { estado: "sin_equipos", clase: "border-gray-400", icono: "⚪ SIN EQUIPOS" };

    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1; // Enero es 0, por eso sumamos 1

    let proximoAVencer = false;
    let vencido = false;

    for (let key in extintores) {
        const ext = extintores[key];
        if (!ext.fechaVencimiento) continue;

        // Esperamos que la fecha venga en formato "YYYY-MM" (Ej: "2026-05")
        const partesFecha = ext.fechaVencimiento.split("-");
        const anioVenc = parseInt(partesFecha[0]);
        const mesVenc = parseInt(partesFecha[1]);

        // Calculamos la diferencia exacta en meses
        const mesesRestantes = ((anioVenc - anioActual) * 12) + (mesVenc - mesActual);

        if (mesesRestantes < 0) {
            vencido = true; // Ya pasó el mes de vencimiento
        } else if (mesesRestantes === 0 || mesesRestantes === 1) {
            proximoAVencer = true; // Vence este mes o el mes que viene
        }
    }

    if (vencido) return { estado: "vencido", clase: "border-red-500", icono: "⚠️ VENCIDO" };
    if (proximoAVencer) return { estado: "alerta", clase: "border-yellow-500", icono: "⏳ PRÓXIMO" };
    return { estado: "al dia", clase: "border-green-500", icono: "✅ AL DÍA" };
}

// Función auxiliar para auto-calcular el vencimiento (1 año exacto)
function calcularVencimientoAutomatico(mesRecarga, anioRecarga) {
    return `${anioRecarga + 1}-${mesRecarga.toString().padStart(2, '0')}`;
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
