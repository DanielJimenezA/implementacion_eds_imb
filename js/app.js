let mapa;
let markers = [];
let datosGlobales = [];
let tipoChart = null;
let datosEquipamiento = [];

const mexicoBounds = [
  [14.0, -118.5],
  [33.8, -85.0],
];

const etapasOrden = [
  "Realizando diagnóstico de infraestructura",
  "Diagnóstico de infraestructura concluido",
  "Entrega de equipos y config. de red concluida",
  "En uso de PHEDS y MoCE",
  "Formato PHEDS concluido",
  "Formato MoCE concluido",
  "Configuraciones iniciales concluidas",
  "Capacitaciones concluidas",
  "En uso del PHEDS",
  "En uso del MoCE",
];

const etapasDistribucion = [
  {
    nombre: "Introducción",
    corto: "Introducción",
    color: "#235B4E",
    cumple: () => true,
  },

  // const etapasDistribucion = [
  //   {
  //     nombre: "Kick-Off",
  //     corto: "Kick-Off",
  //     color: "#235B4E",
  //     cumple: (item) => item.entidad !== "GUANAJUATO",
  //   },
  {
    nombre: "Diagnóstico de infraestructura concluido",
    corto: "Diagnóstico",
    color: "#E04525",
    cumple: (item) =>
      valorUpper(item.formato_tics_servicios) === "ENVIADO A TICS",
  },
  {
    nombre: "Entrega de equipos y config. de red concluida",
    corto: "Entrega equipos",
    color: "#F47C20",
    cumple: (item) =>
      contieneConcluido(item.entrega_equipos_red) || item.avance >= 25,
  },
  // {
  //   nombre: "Formato PHEDS concluido",
  //   corto: "Formato PHEDS",
  //   color: "#F2B52E",
  //   cumple: (item) =>
  //     contieneConcluido(item.formato_pheds) || item.avance >= 37.5,
  // },
  // {
  //   nombre: "Formato MoCE concluido",
  //   corto: "Formato MoCE",
  //   color: "#B7D44A",
  //   cumple: (item) => contieneConcluido(item.formato_moce) || item.avance >= 50,
  // },
  // {
  //   nombre: "Configuraciones iniciales concluidas",
  //   corto: "Config.",
  //   color: "#A6CF55",
  //   cumple: (item) =>
  //     valorUpper(item.configuraciones_iniciales) === "CONCLUIDO",
  // },
  {
    nombre: "Formato PHEDS concluido",
    corto: "Formato PHEDS",
    color: "#F2B52E",
    cumple: (item) => valorUpper(item.formato_pheds) === "CONCLUIDO",
  },
  {
    nombre: "Formato MoCE concluido",
    corto: "Formato MoCE",
    color: "#B7D44A",
    cumple: (item) => valorUpper(item.formato_moce) === "CONCLUIDO",
  },
  {
    nombre: "Configuraciones iniciales concluidas",
    corto: "Config.",
    color: "#A6CF55",
    cumple: (item) =>
      valorUpper(item.configuraciones_iniciales) === "CONCLUIDO",
  },
  {
    nombre: "Capacitaciones concluidas",
    corto: "Capacitación",
    color: "#67B74B",
    cumple: (item) =>
      contieneConcluido(item.capacitaciones) || item.avance >= 75,
  },
  {
    nombre: "Uso PHEDS",
    corto: "Uso PHEDS",
    color: "#235B4E",

    cumple: (item) => {
      const valor = valorUpper(item.uso_pheds);

      return valor === "SI" || valor === "SÍ";
    },
  },
  {
    nombre: "Uso MoCE",
    corto: "Uso MoCE",
    color: "#235B4E",

    cumple: (item) => {
      const valor = valorUpper(item.uso_moce);

      return valor === "SI" || valor === "SÍ";
    },
  },
  {
    nombre: "En uso de PHEDS y MoCE",
    corto: "PHEDS y MoCE",
    color: "#235B4E",
    cumple: (item) =>
      item.avance >= 100 ||
      (contieneSi(item.uso_pheds) && contieneSi(item.uso_moce)),
  },
];

// const etapaColores = {
//   "En uso de PHEDS y MoCE": "#00037A",
//   "Realizando diagnóstico de infraestructura": "#7A1E1E",
//   "Diagnóstico de infraestructura concluido": "#E04525",
//   "Entrega de equipos y config. de red concluida": "#F47C20",
//   "Formato PHEDS concluido": "#F2B52E",
//   "Formato MoCE concluido": "#B7D44A",
//   "Configuraciones iniciales concluidas": "#A6CF55",
//   "Capacitaciones concluidas": "#67B74B",
//   "En uso del PHEDS": "#4AA090",
//   "En uso del MoCE": "#3070C0",
// };

const etapaColores = {
  "Realizando diagnóstico de infraestructura": "#7A1E1E",
  "Diagnóstico de infraestructura concluido": "#E04525",
  "Entrega de equipos y config. de red concluida": "#F47C20",

  "En uso de PHEDS y MoCE": "#00008B",
  "Formato PHEDS concluido": "#F2B52E",
  "Formato MoCE concluido": "#B7D44A",

  "Configuraciones iniciales concluidas": "#A6CF55",
  "Capacitaciones concluidas": "#67B74B",
  "En uso del PHEDS": "#4AA090",

  "En uso del MoCE": "#3070C0",
};

document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();
  cargarEquipamiento();
});

async function cargarDatos() {
  try {
    const response = await fetch("data/unidades.json");

    if (!response.ok) {
      throw new Error("No se pudo cargar data/unidades.json");
    }

    const data = await response.json();

    datosGlobales = data
      .map(normalizarRegistro)
      .filter(
        (d) => d.latitud !== null && d.longitud !== null && d.clues !== ""
      );

    inicializarMapa();
    cargarLeyenda();
    cargarFiltros(datosGlobales);
    aplicarFiltros();
  } catch (error) {
    console.error("Actualizando datos:", error);
    alert("Se han actualizado los datos.");
  }
}

function normalizarRegistro(item) {
  return {
    ...item,
    clues: texto(item.clues),
    entidad: texto(item.entidad),
    tipo_entidad: texto(item.tipo_entidad),
    municipio: texto(item.municipio),
    nombre_unidad: texto(item.nombre_unidad),
    categoria_gerencial: texto(item.categoria_gerencial),
    tipologia: texto(item.tipologia),
    estatus_operacion: texto(item.estatus_operacion),
    latitud: numeroONull(item.latitud),
    longitud: numeroONull(item.longitud),
    avance: avanceNormalizado(item.avance),
    total_consultorios: numero(item.total_consultorios),
    total_quirofanos: numero(item.total_quirofanos),
    total_camas: numero(item.total_camas ?? item.total),
    formato_tics_servicios: texto(item.formato_tics_servicios),
    entrega_equipos_red: texto(item.entrega_equipos_red),
    formato_pheds: texto(item.formato_pheds),
    formato_moce: texto(item.formato_moce),
    configuraciones_iniciales: texto(item.configuraciones_iniciales),
    capacitaciones: texto(item.capacitaciones),
    uso_pheds: texto(item.uso_pheds),
    uso_moce: texto(item.uso_moce),
    observaciones: texto(item.observaciones),
  };
}

function inicializarMapa() {
  mapa = L.map("map", {
    center: [23.6345, -102.5528],
    zoom: 5,
    minZoom: 5,
    maxZoom: 16,
    maxBounds: mexicoBounds,
    maxBoundsViscosity: 1.0,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
  }).addTo(mapa);

  mapa.fitBounds(mexicoBounds);
}

function texto(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function numeroONull(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function avanceNormalizado(valor) {
  let n = Number(valor);

  if (!Number.isFinite(n)) return 0;

  if (n > 0 && n <= 1) {
    n = n * 100;
  }

  return n;
}

function valorUpper(valor) {
  return texto(valor).toUpperCase();
}

function contieneConcluido(valor) {
  return valorUpper(valor).includes("CONCLUID");
}

function contieneSi(valor) {
  const v = valorUpper(valor);
  return v === "SI" || v === "SÍ" || v.includes("SI");
}

function esSi(valor) {
  const v = valorUpper(valor);
  return v === "SI" || v === "SÍ";
}

function esUsoParcial(item) {
  const pheds = esSi(item.uso_pheds);
  const moce = esSi(item.uso_moce);

  return (pheds && !moce) || (!pheds && moce);
}

function esUsoCompleto(item) {
  const pheds = esSi(item.uso_pheds);
  const moce = esSi(item.uso_moce);

  return pheds && moce;
}

// function obtenerEtapa(item) {
//   if (item.avance >= 100) {
//     return "En uso de PHEDS y MoCE";
//   }

//   if (contieneSi(item.uso_moce) || item.avance >= 87.5) {
//     return "En uso del MoCE";
//   }

//   if (contieneSi(item.uso_pheds) || item.avance >= 75) {
//     return "En uso del PHEDS";
//   }

//   if (contieneConcluido(item.capacitaciones)) {
//     return "Capacitaciones concluidas";
//   }

//   if (contieneConcluido(item.configuraciones_iniciales)) {
//     return "Configuraciones iniciales concluidas";
//   }

//   if (contieneConcluido(item.formato_moce)) {
//     return "Formato MoCE concluido";
//   }

//   if (contieneConcluido(item.formato_pheds)) {
//     return "Formato PHEDS concluido";
//   }

//   if (contieneConcluido(item.entrega_equipos_red)) {
//     return "Entrega de equipos y config. de red concluida";
//   }

//   if (
//     contieneConcluido(item.formato_tics_servicios) ||
//     valorUpper(item.formato_tics_servicios).includes("ENVIADO")
//   ) {
//     return "Diagnóstico de infraestructura concluido";
//   }

//   return "Realizando diagnóstico de infraestructura";
// }

function obtenerEtapa(item) {
  const pheds = esSi(item.uso_pheds);
  const moce = esSi(item.uso_moce);

  if (pheds && moce) {
    return "En uso de PHEDS y MoCE";
  }

  if (moce) {
    return "En uso del MoCE";
  }

  if (pheds) {
    return "En uso del PHEDS";
  }

  if (valorUpper(item.capacitaciones) === "CONCLUIDO") {
    return "Capacitaciones concluidas";
  }

  if (valorUpper(item.configuraciones_iniciales) === "CONCLUIDO") {
    return "Configuraciones iniciales concluidas";
  }

  if (valorUpper(item.formato_moce) === "CONCLUIDO") {
    return "Formato MoCE concluido";
  }

  if (valorUpper(item.formato_pheds) === "CONCLUIDO") {
    return "Formato PHEDS concluido";
  }

  if (valorUpper(item.entrega_equipos_red) === "CONCLUIDO") {
    return "Entrega de equipos y config. de red concluida";
  }

  if (valorUpper(item.formato_tics_servicios) === "ENVIADO A TICS") {
    return "Diagnóstico de infraestructura concluido";
  }
  return "Realizando diagnóstico de infraestructura";
}

function cargarFiltros(data) {
  llenarSelect("f-entidad", data, "entidad");
  llenarSelect("f-categoria", data, "categoria_gerencial");
  llenarSelect("f-tipologia", data, "tipologia");
  // llenarSelect("f-estatus", data, "estatus_operacion");

  const etapaSelect = document.getElementById("f-etapa");
  etapaSelect.innerHTML = `<option value="">Todas las etapas</option>`;
  etapasOrden.forEach((etapa) => {
    const option = document.createElement("option");
    option.value = etapa;
    option.textContent = etapa;
    etapaSelect.appendChild(option);
  });

  document.getElementById("f-search").addEventListener("input", aplicarFiltros);
  document
    .getElementById("f-entidad")
    .addEventListener("change", aplicarFiltros);
  document
    .getElementById("f-categoria")
    .addEventListener("change", aplicarFiltros);
  document
    .getElementById("f-tipologia")
    .addEventListener("change", aplicarFiltros);
  // document.getElementById("f-estatus").addEventListener("change", aplicarFiltros);
  document.getElementById("f-etapa").addEventListener("change", aplicarFiltros);
  document.getElementById("f-avance").addEventListener("input", aplicarFiltros);
  document.getElementById("btn-reset").addEventListener("click", resetFilters);
}

function llenarSelect(id, data, campo) {
  const select = document.getElementById(id);
  const valorInicial = select.querySelector("option")?.textContent || "Todos";

  select.innerHTML = `<option value="">${valorInicial}</option>`;

  const valores = [
    ...new Set(data.map((d) => texto(d[campo])).filter(Boolean)),
  ].sort();

  valores.forEach((valor) => {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    select.appendChild(option);
  });
}

function resetFilters() {
  document.getElementById("f-search").value = "";
  document.getElementById("f-entidad").value = "";
  document.getElementById("f-categoria").value = "";
  document.getElementById("f-tipologia").value = "";
  // document.getElementById("f-estatus").value = "";
  document.getElementById("f-etapa").value = "";
  document.getElementById("f-avance").value = 0;
  document.getElementById("avance-value").innerText = "0%";

  aplicarFiltros();
}

function aplicarFiltros() {
  const busqueda = texto(
    document.getElementById("f-search").value
  ).toLowerCase();
  const entidad = document.getElementById("f-entidad").value;
  const categoria = document.getElementById("f-categoria").value;
  const tipologia = document.getElementById("f-tipologia").value;
  // const estatus = document.getElementById("f-estatus").value;
  const etapa = document.getElementById("f-etapa").value;
  const avanceMinimo = Number(document.getElementById("f-avance").value);

  document.getElementById("avance-value").innerText = `${avanceMinimo}%`;

  let filtrado = [...datosGlobales];

  if (busqueda) {
    filtrado = filtrado.filter(
      (d) =>
        d.clues.toLowerCase().includes(busqueda) ||
        d.nombre_unidad.toLowerCase().includes(busqueda) ||
        d.municipio.toLowerCase().includes(busqueda)
    );
  }

  if (entidad) {
    filtrado = filtrado.filter((d) => d.entidad === entidad);
  }

  if (categoria) {
    filtrado = filtrado.filter((d) => d.categoria_gerencial === categoria);
  }

  if (tipologia) {
    filtrado = filtrado.filter((d) => d.tipologia === tipologia);
  }

  // if (estatus) {
  //   filtrado = filtrado.filter((d) => d.estatus_operacion === estatus);
  // }

  if (etapa) {
    filtrado = filtrado.filter((d) => obtenerEtapa(d) === etapa);
  }

  filtrado = filtrado.filter((d) => d.avance >= avanceMinimo);

  actualizarDashboard(filtrado);
}

function actualizarDashboard(data) {
  cargarIndicadores(data);
  cargarMapa(data);
  cargarDistribucionEtapas(data);
  cargarGraficaTipologia(data);
  cargarEntidades(data);
  cargarTabla(data);
  cargarMatrizAvance(data);

  document.getElementById(
    "results-count"
  ).innerText = `${data.length} unidades`;
  document.getElementById("map-count").innerText = `${data.length} unidades`;
  document.getElementById(
    "table-count"
  ).innerText = `${data.length} resultados`;

  const footerTotal = document.getElementById("footer-total");

  if (footerTotal) {
    footerTotal.innerText = data.length;
  }
}

// function cargarIndicadores(data) {
//   const total = data.length;

//   const sinInicio = data.filter((d) => d.avance === 0).length;

//   const proceso = data.filter((d) => d.avance > 0 && d.avance < 75).length;

//   const alto = data.filter((d) => {
//     const pheds = valorUpper(d.uso_pheds);
//     const moce = valorUpper(d.uso_moce);

//     const completo =
//       (pheds === "SI" || pheds === "SÍ") && (moce === "SI" || moce === "SÍ");

//     return d.avance >= 75 && !completo;
//   }).length;

//   const completo = data.filter((d) => {
//     const pheds = valorUpper(d.uso_pheds);
//     const moce = valorUpper(d.uso_moce);

//     return (
//       (pheds === "SI" || pheds === "SÍ") && (moce === "SI" || moce === "SÍ")
//     );
//   }).length;

//   const promedio = total
//     ? data.reduce((acc, d) => acc + d.avance, 0) / total
//     : 0;

//   document.getElementById("kpi-total").innerText = total;
//   document.getElementById("kpi-sin").innerText = sinInicio;
//   document.getElementById("kpi-proceso").innerText = proceso;
//   document.getElementById("kpi-alto").innerText = alto;
//   document.getElementById("kpi-completo").innerText = completo;
//   document.getElementById("kpi-prom").innerText = promedio.toFixed(1);
// }

function cargarIndicadores(data) {
  const total = data.length;

  const sinInicio = data.filter((d) => d.avance === 0).length;

  const proceso = data.filter(
    (d) => d.avance > 0 && !esUsoParcial(d) && !esUsoCompleto(d)
  ).length;

  const usoParcial = data.filter(esUsoParcial).length;

  const usoCompleto = data.filter(esUsoCompleto).length;

  const promedio = total
    ? data.reduce((acc, d) => acc + d.avance, 0) / total
    : 0;

  document.getElementById("kpi-total").innerText = total;
  document.getElementById("kpi-sin").innerText = sinInicio;
  document.getElementById("kpi-proceso").innerText = proceso;
  document.getElementById("kpi-alto").innerText = usoParcial;
  document.getElementById("kpi-completo").innerText = usoCompleto;
  document.getElementById("kpi-prom").innerText = promedio.toFixed(1);
}

function filtrarKpi(tipo) {
  let unidades = [...datosGlobales];
  let etiqueta = "Total en seguimiento";

  if (tipo === "sin") {
    unidades = datosGlobales.filter((d) => d.avance === 0);
    etiqueta = "Sin inicio";
  }

  if (tipo === "proceso") {
    unidades = datosGlobales.filter((d) => d.avance > 0 && d.avance < 75);
    etiqueta = "En proceso";
  }

  if (tipo === "alto") {
    unidades = datosGlobales.filter(esUsoParcial);
    etiqueta = "Uso parcial";
  }

  if (tipo === "completo") {
    unidades = datosGlobales.filter(esUsoCompleto);
    etiqueta = "Uso completo";
  }

  cargarTabla(unidades);
  cargarMapa(unidades);
  cargarIndicadores(unidades);
  cargarDistribucionEtapas(unidades);
  cargarGraficaTipologia(unidades);
  cargarEntidades(unidades);
  cargarMatrizAvance(unidades);

  document.getElementById(
    "results-count"
  ).innerText = `${unidades.length} unidades`;
  document.getElementById(
    "map-count"
  ).innerText = `${unidades.length} unidades`;
  document.getElementById(
    "table-count"
  ).innerText = `${unidades.length} resultados · ${etiqueta}`;

  const detalle = document.getElementById("detalle-unidad");

  if (detalle) {
    detalle.innerHTML = `
      <div class="no-data">
        Mostrando ${unidades.length} unidades para:<br>
        <strong>${etiqueta}</strong>
      </div>
    `;
  }

  const tabla = document.querySelector(".bottom-grid");

  if (tabla) {
    tabla.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function cargarMapa(data) {
  limpiarMarkers();

  const bounds = [];

  data.forEach((item) => {
    if (item.latitud === null || item.longitud === null) return;

    const etapa = obtenerEtapa(item);
    const color = etapaColores[etapa] || "#235B4E";

    const marker = L.circleMarker([item.latitud, item.longitud], {
      radius: 7,
      color: "#ffffff",
      weight: 1,
      fillColor: color,
      fillOpacity: 0.9,
    }).addTo(mapa);

    marker.bindPopup(crearPopup(item, etapa, color));
    marker.on("click", () => mostrarDetalle(item));

    markers.push(marker);
    bounds.push([item.latitud, item.longitud]);
  });

  if (bounds.length > 0) {
    mapa.fitBounds(bounds, {
      padding: [30, 30],
      maxZoom: 8,
    });
  } else {
    mapa.fitBounds(mexicoBounds);
  }
}

function limpiarMarkers() {
  markers.forEach((marker) => mapa.removeLayer(marker));
  markers = [];
}

function crearPopup(item, etapa, color) {
  return `
    <div class="popup-top" style="background:${color}">
      <div class="popup-title">${item.nombre_unidad}</div>
      <div class="popup-clues">${item.clues}</div>
    </div>
    <div class="popup-inner">
      <div class="popup-detail"><b>Entidad:</b> ${item.entidad}</div>
      <div class="popup-detail"><b>Municipio:</b> ${item.municipio}</div>
      <div class="popup-detail"><b>Tipología:</b> ${item.tipologia}</div>
      <div class="popup-detail"><b>Avance:</b> ${item.avance.toFixed(1)}%</div>
      <div class="popup-etapa" style="background:${color}22;color:${color}">
        ${etapa}
      </div>
    </div>
  `;
}

function mostrarDetalle(item) {
  const etapa = obtenerEtapa(item);
  const color = etapaColores[etapa] || "#235B4E";

  document.getElementById("detalle-unidad").innerHTML = `
    <div class="detail-title">${item.nombre_unidad}</div>
    <div class="detail-clues">${item.clues}</div>

    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Entidad</div>
        <div class="detail-value">${item.entidad}</div>
      </div>

      <div class="detail-item">
        <div class="detail-label">Municipio</div>
        <div class="detail-value">${item.municipio}</div>
      </div>

      <div class="detail-item full">
        <div class="detail-label">Categoría gerencial</div>
        <div class="detail-value">${
          item.categoria_gerencial || "Sin dato"
        }</div>
      </div>

      <div class="detail-item full">
        <div class="detail-label">Tipología</div>
        <div class="detail-value">${item.tipologia || "Sin dato"}</div>
      </div>

      <div class="detail-item">
        <div class="detail-label">Consultorios</div>
        <div class="detail-value">${item.total_consultorios}</div>
      </div>

      <div class="detail-item">
        <div class="detail-label">Quirófanos</div>
        <div class="detail-value">${item.total_quirofanos}</div>
      </div>

      <div class="detail-item">
        <div class="detail-label">Camas</div>
        <div class="detail-value">${item.total_camas}</div>
      </div>

      <div class="detail-item">
        <div class="detail-label">Categoría Gerencial</div>
        <div class="detail-value">${
          item.categoria_gerencial || "Sin dato"
        }</div>
      </div>
        
      <div class="detail-item">
        <div class="detail-label">Avance</div>
        <div class="detail-value">${item.avance.toFixed(1)}%</div>
      </div>

      <div class="detail-item">
        <div class="detail-label">Etapa</div>
        <div class="detail-value" style="color:${color}">${etapa}</div>
      </div>

      <div class="detail-item full">
          <div class="detail-label">Observaciones</div>
          <div class="detail-value">${
            item.observaciones || "Sin observaciones"
          }</div>
        </div>
      </div>
  `;
}

// function cargarLeyenda() {
//   const contenedor = document.getElementById("legend-grid");

//   contenedor.innerHTML = etapasOrden
//     .map((etapa) => {
//       const color = etapaColores[etapa];

//       return `
//         <div class="legend-item">
//           <span class="legend-dot" style="background:${color}"></span>
//           <span>${etapa}</span>
//         </div>
//       `;
//     })
//     .join("");
// }

function cargarLeyenda() {
  const contenedor = document.getElementById("legend-grid");

  if (!contenedor) return;

  contenedor.innerHTML = etapasOrden
    .map((etapa) => {
      const color = etapaColores[etapa] || "#235B4E";

      return `
        <button
          class="legend-item legend-clickable"
          type="button"
          onclick="filtrarPorEtapaLeyenda('${escapeJS(etapa)}')"
          title="Ver unidades: ${etapa}"
        >
          <span class="legend-dot" style="background:${color}"></span>
          <span>${etapa}</span>
        </button>
      `;
    })
    .join("");
}

function cargarDistribucionEtapas(data) {
  const total = data.length || 1;

  document.getElementById("stage-summary").innerHTML = etapasDistribucion
    .map((etapa, index) => {
      const unidades = data.filter(etapa.cumple);
      const valor = unidades.length;
      const porcentaje = (valor / total) * 100;

      return `
        <div class="stage-bar-row">
          <span class="etapa-dot" style="background:${etapa.color}"></span>

          <div class="stage-bar-label">${etapa.nombre}</div>

          <div class="stage-bar-track">
            <div
              class="stage-bar-fill"
              style="width:${porcentaje}%; background:${etapa.color}"
            ></div>
          </div>

          <button
            class="stage-bar-count"
            onclick="mostrarUnidadesPorEtapa(${index})"
            title="Ver unidades"
          >
            ${valor}
          </button>
        </div>
      `;
    })
    .join("");
}

function cargarMatrizAvance(data) {
  const contenedor = document.getElementById("progress-matrix");

  if (!contenedor) return;

  const entidades = [
    ...new Set(
      data
        .map((d) =>
          valorUpper(d.tipo_entidad) === "HRAE" ? "HRAE" : d.entidad
        )
        .filter(Boolean)
    ),
  ]
    .map((entidad) => {
      const unidadesEntidad = data.filter((d) => {
        const grupo =
          valorUpper(d.tipo_entidad) === "HRAE" ? "HRAE" : d.entidad;

        return grupo === entidad;
      });

      const totalEntidad = unidadesEntidad.length || 1;

      const porcentajes = etapasDistribucion.map((etapa) => {
        const cantidad = unidadesEntidad.filter(etapa.cumple).length;
        return (cantidad / totalEntidad) * 100;
      });

      const celdasConAvance = porcentajes.filter((p) => p > 0).length;

      const avanceTotal = porcentajes.reduce((acc, p) => acc + p, 0);

      return {
        entidad,
        celdasConAvance,
        avanceTotal,
      };
    })
    .sort((a, b) => {
      if (b.celdasConAvance !== a.celdasConAvance) {
        return b.celdasConAvance - a.celdasConAvance;
      }

      return b.avanceTotal - a.avanceTotal;
    })
    .map((item) => item.entidad);

  const columnas = ["Entidad", ...etapasDistribucion.map((e) => e.corto)];

  contenedor.innerHTML = `
    <div
      class="progress-matrix"
      style="grid-template-columns: minmax(120px, 1.15fr) repeat(${
        etapasDistribucion.length
      }, minmax(70px, 1fr));"
    >
      ${columnas
        .map((col) => `<div class="matrix-cell matrix-header">${col}</div>`)
        .join("")}

      ${entidades
        .map((entidad) => {
          const unidadesEntidad = data.filter((d) => {
            const grupo =
              valorUpper(d.tipo_entidad) === "HRAE" ? "HRAE" : d.entidad;

            return grupo === entidad;
          });

          const totalEntidad = unidadesEntidad.length || 1;

          const valores = etapasDistribucion
            .map((etapa) => {
              const cantidad = unidadesEntidad.filter(etapa.cumple).length;
              const porcentaje = (cantidad / totalEntidad) * 100;

              // let clase = "matrix-danger";

              // if (porcentaje >= 75) {
              //   clase = "matrix-success-strong";
              // } else if (porcentaje >= 80) {
              //   clase = "matrix-success";
              // } else if (porcentaje >= 60) {
              //   clase = "matrix-warning";
              // }

              let clase = "matrix-danger";

              if (porcentaje >= 75) {
                clase = "matrix-success-strong";
              } else if (porcentaje >= 50) {
                clase = "matrix-success";
              } else if (porcentaje >= 25) {
                clase = "matrix-warning";
              } else if (porcentaje === 0) {
                clase = "matrix-notstarted";
              }

              return `
                <div
                  class="matrix-cell matrix-value ${clase}"
                  title="${cantidad} de ${totalEntidad} unidades"
                >
                  ${porcentaje.toFixed(0)}%
                </div>
              `;
            })
            .join("");

          return `
            <div class="matrix-cell matrix-entity">${entidad}</div>
            ${valores}
          `;
        })
        .join("")}
    </div>
  `;
}

function mostrarUnidadesPorEtapa(index) {
  const etapa = etapasDistribucion[index];

  if (!etapa) return;

  const unidades = datosGlobales.filter(etapa.cumple);

  cargarTabla(unidades);
  cargarMapa(unidades);
  cargarIndicadores(unidades);
  cargarGraficaTipologia(unidades);
  cargarEntidades(unidades);
  cargarMatrizAvance(unidades);

  document.getElementById(
    "results-count"
  ).innerText = `${unidades.length} unidades`;

  document.getElementById(
    "map-count"
  ).innerText = `${unidades.length} unidades`;

  document.getElementById(
    "table-count"
  ).innerText = `${unidades.length} resultados · ${etapa.nombre}`;

  const detalle = document.getElementById("detalle-unidad");

  if (detalle) {
    detalle.innerHTML = `
      <div class="no-data">
        Mostrando ${unidades.length} unidades para:<br>
        <strong>${etapa.nombre}</strong>
      </div>
    `;
  }

  const tabla = document.querySelector(".bottom-grid");

  if (tabla) {
    tabla.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function cargarGraficaTipologia(data) {
  const resumen = {};

  data.forEach((item) => {
    const tipologia = item.tipologia || "Sin tipología";
    if (!resumen[tipologia]) {
      resumen[tipologia] = {
        total: 0,
        avance: 0,
      };
    }

    resumen[tipologia].total += 1;
    resumen[tipologia].avance += item.avance;
  });

  const labels = Object.keys(resumen);
  const values = labels.map((label) =>
    resumen[label].total ? resumen[label].avance / resumen[label].total : 0
  );

  const canvas = document.getElementById("tipoChart");

  if (tipoChart) {
    tipoChart.destroy();
  }

  tipoChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Avance promedio",
          data: values,
          backgroundColor: "#235B4E",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.raw.toFixed(1)}%`,
          },
        },
      },
    },
  });
}

function cargarEntidades(data) {
  const resumen = {};

  data.forEach((item) => {
    const entidad = item.entidad || "Sin entidad";

    if (!resumen[entidad]) {
      resumen[entidad] = {
        total: 0,
        avance: 0,
        alto: 0,
      };
    }

    resumen[entidad].total += 1;
    resumen[entidad].avance += item.avance;

    if (item.avance >= 75) {
      resumen[entidad].alto += 1;
    }
  });

  const entidades = Object.entries(resumen)
    .map(([entidad, valores]) => ({
      entidad,
      total: valores.total,
      avancePromedio: valores.total ? valores.avance / valores.total : 0,
      alto: valores.alto,
    }))
    .sort((a, b) => b.avancePromedio - a.avancePromedio);

  document.getElementById(
    "entidades-count"
  ).innerText = `${entidades.length} estados`;

  document.getElementById("entidades-body").innerHTML = entidades
    .map((item) => {
      const color = colorPorAvance(item.avancePromedio);

      return `
        <div class="entidad-row" onclick="filtrarEntidad('${escapeJS(
          item.entidad
        )}')">
          <div>
            <div class="entidad-name">${item.entidad}</div>
            <div class="bar-mini">
              <div class="bar-mini-fill" style="width:${
                item.avancePromedio
              }%;background:${color}"></div>
            </div>
          </div>
          <div class="entidad-count">${item.total}</div>
          <div class="avance-badge" style="background:${color}22;color:${color}">
            ${item.avancePromedio.toFixed(1)}%
          </div>
          <div class="entidad-count">${item.alto}</div>
        </div>
      `;
    })
    .join("");
}

function filtrarEntidad(entidad) {
  document.getElementById("f-entidad").value = entidad;
  aplicarFiltros();
}

function cargarTabla(data) {
  const tbody = document.getElementById("hospitals-tbody");

  const ordenado = [...data].sort((a, b) => b.avance - a.avance);

  tbody.innerHTML = ordenado
    .map((item, index) => {
      const etapa = obtenerEtapa(item);
      const color = etapaColores[etapa] || "#235B4E";

      return `
        <tr onclick="seleccionarDesdeTabla(${index})">
          <td>
            <div class="td-nombre">${item.nombre_unidad}</div>
            <div class="td-clues">${item.clues}</div>
          </td>
          <td>${item.entidad}</td>
          <td>
            <span class="avance-badge" style="background:${color}22;color:${color}">
              ${item.avance.toFixed(1)}%
            </span>
          </td>
          <td>
            <span class="etapa-chip" style="background:${color}22;color:${color}">
              <span class="etapa-dot" style="background:${color}"></span>
              ${etapa}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  window.tablaActual = ordenado;
}

function seleccionarDesdeTabla(index) {
  const item = window.tablaActual[index];
  if (!item) return;

  mostrarDetalle(item);

  if (item.latitud !== null && item.longitud !== null) {
    mapa.setView([item.latitud, item.longitud], 9);
  }
}

function colorPorAvance(avance) {
  if (avance >= 87.5) return "#3070C0";
  if (avance >= 75) return "#4AA090";
  if (avance >= 50) return "#67B74B";
  if (avance >= 25) return "#F2B52E";
  if (avance > 0) return "#F47C20";
  return "#7A1E1E";
}

function escapeJS(valor) {
  return String(valor).replace(/'/g, "\\'");
}

async function cargarEquipamiento() {
  try {
    const response = await fetch("data/equipamiento.json");

    if (!response.ok) {
      throw new Error("No se pudo cargar data/equipamiento.json");
    }

    const data = await response.json();

    datosEquipamiento = data.map((item) => ({
      ...item,
      entidad: texto(item.entidad ?? item.ENTIDAD ?? item.Entidad),

      pc_requerimiento: numero(item.pc_requerimiento),
      pc_entregado: numero(item.pc_entregado),

      aps_requerimiento: numero(item.aps_requerimiento),
      aps_entregado: numero(item.aps_entregado),

      impresoras_requerimiento: numero(item.impresoras_requerimiento),
      impresoras_entregado: numero(item.impresoras_entregado),
    }));

    cargarMatrizEquipamiento(datosEquipamiento);
    cargarKpiEquipamiento(datosEquipamiento);
    cargarMatrizEquipamiento(datosEquipamiento);
  } catch (error) {
    console.warn("Equipamiento no disponible:", error);
  }
}

function calcularPorcentajeEquipamiento(entregado, requerido) {
  if (!requerido || requerido <= 0) return 0;
  return (entregado / requerido) * 100;
}

function crearCeldaEquipamiento(entidad, tipo, entregado, requerido) {
  const porcentaje = calcularPorcentajeEquipamiento(entregado, requerido);
  const faltante = Math.max(requerido - entregado, 0);
  const clase = porcentaje > 0 ? "active" : "zero";

  return `
    <div
      class="equipment-cell equipment-value ${clase}"
      title="Entregado: ${entregado.toLocaleString(
        "es-MX"
      )} de ${requerido.toLocaleString(
    "es-MX"
  )}&#10;Faltante: ${faltante.toLocaleString("es-MX")}"
      onclick="filtrarEquipamientoEntidad('${escapeJS(entidad)}', '${tipo}')"
    >
      ${porcentaje.toFixed(0)}%
    </div>
  `;
}

function cargarMatrizEquipamiento(data) {
  const contenedor = document.getElementById("equipment-matrix");

  if (!contenedor) return;

  const entidades = [
    ...new Set(data.map((d) => d.entidad).filter(Boolean)),
  ].sort();

  contenedor.innerHTML = `
    <div class="equipment-matrix">
      <div class="equipment-cell equipment-header">Entidad</div>
      <div class="equipment-cell equipment-header">PC</div>
      <div class="equipment-cell equipment-header">AP'S</div>
      <div class="equipment-cell equipment-header">Impresoras</div>

      ${entidades
        .map((entidad) => {
          const filas = data.filter((d) => d.entidad === entidad);

          const pcReq = sumarCampo(filas, "pc_requerimiento");
          const pcEnt = sumarCampo(filas, "pc_entregado");

          const apsReq = sumarCampo(filas, "aps_requerimiento");
          const apsEnt = sumarCampo(filas, "aps_entregado");

          const impReq = sumarCampo(filas, "impresoras_requerimiento");
          const impEnt = sumarCampo(filas, "impresoras_entregado");

          return `
            <div class="equipment-cell equipment-entity">${entidad}</div>
            ${crearCeldaEquipamiento(entidad, "PC", pcEnt, pcReq)}
            ${crearCeldaEquipamiento(entidad, "AP'S", apsEnt, apsReq)}
            ${crearCeldaEquipamiento(entidad, "Impresoras", impEnt, impReq)}
          `;
        })
        .join("")}
    </div>
  `;
}

function filtrarEquipamientoEntidad(entidad, tipo) {
  const unidades = datosGlobales.filter(
    (d) => texto(d.entidad) === texto(entidad)
  );

  cargarTabla(unidades);
  cargarMapa(unidades);
  cargarIndicadores(unidades);
  cargarDistribucionEtapas(unidades);
  cargarGraficaTipologia(unidades);
  cargarEntidades(unidades);
  cargarMatrizAvance(unidades);

  document.getElementById(
    "results-count"
  ).innerText = `${unidades.length} unidades`;

  document.getElementById(
    "map-count"
  ).innerText = `${unidades.length} unidades`;

  document.getElementById(
    "table-count"
  ).innerText = `${unidades.length} resultados · Equipamiento ${tipo} · ${entidad}`;

  const detalle = document.getElementById("detalle-unidad");

  if (detalle) {
    detalle.innerHTML = `
      <div class="no-data">
        Mostrando ${unidades.length} unidades para:<br>
        <strong>${entidad}</strong><br>
        Equipamiento: <strong>${tipo}</strong>
      </div>
    `;
  }

  const tabla = document.querySelector(".bottom-grid");

  if (tabla) {
    tabla.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function sumarCampo(data, campo) {
  return data.reduce((acc, item) => {
    const valor = Number(item[campo]);
    return acc + (Number.isFinite(valor) ? valor : 0);
  }, 0);
}

function pintarKpiEquipamiento(prefix, requerido, entregado) {
  const porcentaje = calcularPorcentajeEquipamiento(entregado, requerido);

  const porcentajeEl = document.getElementById(`eq-kpi-${prefix}`);
  const detalleEl = document.getElementById(`eq-kpi-${prefix}-detalle`);

  if (!porcentajeEl || !detalleEl) return;

  porcentajeEl.innerText = porcentaje.toFixed(1);

  detalleEl.innerText = `${entregado.toLocaleString(
    "es-MX"
  )} / ${requerido.toLocaleString("es-MX")} entregadas`;
}

function cargarKpiEquipamiento(data) {
  const pcReq = sumarCampo(data, "pc_requerimiento");
  const pcEnt = sumarCampo(data, "pc_entregado");

  const apsReq = sumarCampo(data, "aps_requerimiento");
  const apsEnt = sumarCampo(data, "aps_entregado");

  const impReq = sumarCampo(data, "impresoras_requerimiento");
  const impEnt = sumarCampo(data, "impresoras_entregado");

  pintarKpiEquipamiento("pc", pcReq, pcEnt);
  pintarKpiEquipamiento("aps", apsReq, apsEnt);
  pintarKpiEquipamiento("impresoras", impReq, impEnt);
}

async function copiarMatrizSVG() {
  const matriz = document.querySelector(".progress-matrix");

  if (!matriz) {
    alert("No se encontró la matriz.");
    return;
  }

  const rect = matriz.getBoundingClientRect();
  const ancho = Math.ceil(rect.width);
  const alto = Math.ceil(rect.height);

  const estilos = `
    <style>
      .progress-matrix {
        display: grid;
        gap: 4px;
        width: ${ancho}px;
        font-family: "Noto Sans", Arial, sans-serif;
      }

      .matrix-cell {
        min-height: 30px;
        border-radius: 6px;
        padding: 5px 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 800;
        text-align: center;
        line-height: 1.05;
        border: 1px solid rgba(35, 91, 78, 0.12);
      }

      .matrix-header {
        background: #5D9A84;
        color: #ffffff;
        font-size: 13px;
      }

      .matrix-entity {
        justify-content: flex-start;
        text-align: left;
        background: #E7F1EC;
        color: #10312B;
        font-size: 13px;
      }

      .matrix-danger {
        background: #F4D6D8;
        color: #6A1B1F;
      }

      .matrix-warning {
        background: #F9E7B7;
        color: #7A5A00;
      }

      .matrix-success {
        background: #DCEBDE;
        color: #235B4E;
      }

      .matrix-success-strong {
        background: #B7D8C7;
        color: #163D34;
      }
    </style>
  `;

  const html = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          ${estilos}
          ${matriz.outerHTML}
        </div>
      </foreignObject>
    </svg>
  `;

  try {
    await navigator.clipboard.writeText(html);
    alert("SVG de la matriz copiado al portapapeles.");
  } catch (error) {
    console.error("No se pudo copiar el SVG:", error);

    const blob = new Blob([html], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
}

function descargarMatrizSVG() {
  const matriz = document.querySelector(".progress-matrix");

  if (!matriz) {
    alert("No se encontró la matriz.");
    return;
  }

  const rect = matriz.getBoundingClientRect();
  const ancho = Math.ceil(rect.width);
  const alto = Math.ceil(rect.height);

  const estilos = `
    <style>
      .progress-matrix { display: grid; gap: 4px; width: ${ancho}px; font-family: Arial, sans-serif; }
      .matrix-cell { min-height: 30px; border-radius: 6px; padding: 5px 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; text-align: center; border: 1px solid rgba(35,91,78,.12); }
      .matrix-header { background: #5D9A84; color: #fff; font-size: 13px; }
      .matrix-entity { justify-content: flex-start; text-align: left; background: #E7F1EC; color: #10312B; font-size: 13px; }
      .matrix-danger { background: #F4D6D8; color: #6A1B1F; }
      .matrix-warning { background: #F9E7B7; color: #7A5A00; }
      .matrix-success { background: #DCEBDE; color: #235B4E; }
      .matrix-success-strong { background: #B7D8C7; color: #163D34; }
    </style>
  `;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          ${estilos}
          ${matriz.outerHTML}
        </div>
      </foreignObject>
    </svg>
  `;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "matriz-avance.svg";
  link.click();

  URL.revokeObjectURL(url);
}

async function descargarMatrizPNG() {
  const matriz = document.querySelector(".progress-matrix");

  if (!matriz) {
    alert("No se encontró la matriz.");
    return;
  }

  try {
    const canvas = await html2canvas(matriz, {
      backgroundColor: "#ffffff",
      scale: 3,
      useCORS: true,
    });

    const enlace = document.createElement("a");

    enlace.download = `matriz_avance_${new Date()
      .toISOString()
      .slice(0, 10)}.png`;

    enlace.href = canvas.toDataURL("image/png");

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  } catch (error) {
    console.error(error);
    alert("No fue posible generar el PNG.");
  }
}

function aplicarVistaFiltrada(data, etiqueta = "Filtro aplicado") {
  cargarIndicadores(data);
  cargarMapa(data);
  cargarDistribucionEtapas(data);
  cargarGraficaTipologia(data);
  cargarEntidades(data);
  cargarTabla(data);
  cargarMatrizAvance(data);

  document.getElementById(
    "results-count"
  ).innerText = `${data.length} unidades`;
  document.getElementById("map-count").innerText = `${data.length} unidades`;
  document.getElementById(
    "table-count"
  ).innerText = `${data.length} resultados · ${etiqueta}`;

  const detalle = document.getElementById("detalle-unidad");

  if (detalle) {
    detalle.innerHTML = `
      <div class="no-data">
        Mostrando ${data.length} unidades para:<br>
        <strong>${etiqueta}</strong>
      </div>
    `;
  }
}

function filtrarPorEtapaLeyenda(etapa) {
  const unidades = datosGlobales.filter((d) => obtenerEtapa(d) === etapa);

  aplicarVistaFiltrada(unidades, etapa);

  const mapa = document.getElementById("map");

  if (mapa) {
    mapa.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}
