let mapa;
let markers = [];
let datosGlobales = [];
let tipoChart = null;

const mexicoBounds = [
  [14.0, -118.5],
  [33.8, -85.0],
];

const etapasOrden = [
  "No ha iniciado",
  "Diagnóstico de infraestructura concluido",
  "Entrega de equipos y config. de red concluida",
  "En uso de PHEDS y MoCE",
  // "Formato PHEDS concluido",
  // "Formato MoCE concluido",
  "Configuraciones iniciales concluidas",
  "Capacitaciones concluidas",
  "En uso del PHEDS",
  "En uso del MoCE",
];

const etapaColores = {
  "En uso de PHEDS y MoCE": "#3070C0",
  "No ha iniciado": "#7A1E1E",
  "Diagnóstico de infraestructura concluido": "#E04525",
  "Entrega de equipos y config. de red concluida": "#F47C20",
  "Formato PHEDS concluido": "#F2B52E",
  "Formato MoCE concluido": "#B7D44A",
  "Configuraciones iniciales concluidas": "#A6CF55",
  "Capacitaciones concluidas": "#67B74B",
  // "En uso del PHEDS": "#4AA090",
  // "En uso del MoCE": "#3070C0",
};

document.addEventListener("DOMContentLoaded", cargarDatos);

async function cargarDatos() {
  try {
    const response = await fetch("data/unidades.json");

    if (!response.ok) {
      throw new Error("No se pudo cargar data/unidades.json");
    }

    const data = await response.json();

    datosGlobales = data
      .map(normalizarRegistro)
      .filter((d) => d.latitud !== null && d.longitud !== null && d.clues !== "");

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

// 
function obtenerEtapa(item) {
  if (item.avance >= 100) {
    return "En uso de PHEDS y MoCE";
  }

  if (contieneSi(item.uso_moce) || item.avance >= 87.5) {
    return "En uso del MoCE";
  }

  if (contieneSi(item.uso_pheds) || item.avance >= 75) {
    return "En uso del PHEDS";
  }

  if (contieneConcluido(item.capacitaciones)) {
    return "Capacitaciones concluidas";
  }

  if (contieneConcluido(item.configuraciones_iniciales)) {
    return "Configuraciones iniciales concluidas";
  }

  if (contieneConcluido(item.formato_moce)) {
    return "Formato MoCE concluido";
  }

  if (contieneConcluido(item.formato_pheds)) {
    return "Formato PHEDS concluido";
  }

  if (contieneConcluido(item.entrega_equipos_red)) {
    return "Entrega de equipos y config. de red concluida";
  }

  if (
    contieneConcluido(item.formato_tics_servicios) ||
    valorUpper(item.formato_tics_servicios).includes("ENVIADO")
  ) {
    return "Diagnóstico de infraestructura concluido";
  }

  return "No ha iniciado";
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
  document.getElementById("f-entidad").addEventListener("change", aplicarFiltros);
  document.getElementById("f-categoria").addEventListener("change", aplicarFiltros);
  document.getElementById("f-tipologia").addEventListener("change", aplicarFiltros);
  // document.getElementById("f-estatus").addEventListener("change", aplicarFiltros);
  document.getElementById("f-etapa").addEventListener("change", aplicarFiltros);
  document.getElementById("f-avance").addEventListener("input", aplicarFiltros);
  document.getElementById("btn-reset").addEventListener("click", resetFilters);
}

function llenarSelect(id, data, campo) {
  const select = document.getElementById(id);
  const valorInicial = select.querySelector("option")?.textContent || "Todos";

  select.innerHTML = `<option value="">${valorInicial}</option>`;

  const valores = [...new Set(data.map((d) => texto(d[campo])).filter(Boolean))].sort();

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
  const busqueda = texto(document.getElementById("f-search").value).toLowerCase();
  const entidad = document.getElementById("f-entidad").value;
  const categoria = document.getElementById("f-categoria").value;
  const tipologia = document.getElementById("f-tipologia").value;
  // const estatus = document.getElementById("f-estatus").value;
  const etapa = document.getElementById("f-etapa").value;
  const avanceMinimo = Number(document.getElementById("f-avance").value);

  document.getElementById("avance-value").innerText = `${avanceMinimo}%`;

  let filtrado = [...datosGlobales];

  if (busqueda) {
    filtrado = filtrado.filter((d) =>
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

  document.getElementById("results-count").innerText = `${data.length} unidades`;
  document.getElementById("map-count").innerText = `${data.length} unidades`;
  document.getElementById("table-count").innerText = `${data.length} resultados`;
  document.getElementById("footer-total").innerText = data.length;
}

function cargarIndicadores(data) {
  const total = data.length;
  const alto = data.filter((d) => d.avance >= 75).length;
  const medio = data.filter((d) => d.avance >= 25 && d.avance < 75).length;
  const sinInicio = data.filter((d) => d.avance === 0).length;

  const promedio = total
    ? data.reduce((acc, d) => acc + d.avance, 0) / total
    : 0;

  document.getElementById("kpi-total").innerText = total;
  document.getElementById("kpi-alto").innerText = alto;
  document.getElementById("kpi-medio").innerText = medio;
  document.getElementById("kpi-sin").innerText = sinInicio;
  document.getElementById("kpi-prom").innerText = promedio.toFixed(1);
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
        <div class="detail-value">${item.categoria_gerencial || "Sin dato"}</div>
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
        <div class="detail-value">${item.categoria_gerencial || "Sin dato"}</div>
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
          <div class="detail-value">${item.observaciones || "Sin observaciones"}</div>
        </div>
      </div>
  `;
}

function cargarLeyenda() {
  const contenedor = document.getElementById("legend-grid");

  contenedor.innerHTML = etapasOrden
    .map((etapa) => {
      const color = etapaColores[etapa];

      return `
        <div class="legend-item">
          <span class="legend-dot" style="background:${color}"></span>
          <span>${etapa}</span>
        </div>
      `;
    })
    .join("");
}

function cargarDistribucionEtapas(data) {
  const etapas = [
    {
      nombre: "Diagnóstico de infraestructura concluido",
      color: "#E04525",
      cumple: (item) =>
        valorUpper(item.formato_tics_servicios) === "ENVIADO A TICS",
    },
    {
      nombre: "Entrega de equipos y config. de red concluida",
      color: "#F47C20",
      cumple: (item) =>
        contieneConcluido(item.entrega_equipos_red) ||
        item.avance >= 25,
    },
    {
      nombre: "Formato PHEDS concluido",
      color: "#F2B52E",
      cumple: (item) =>
        contieneConcluido(item.formato_pheds) ||
        item.avance >= 37.5,
    },
    {
      nombre: "Formato MOCE concluido",
      color: "#B7D44A",
      cumple: (item) =>
        contieneConcluido(item.formato_moce) ||
        item.avance >= 50,
    },
    {
      nombre: "Configuraciones iniciales concluidas",
      color: "#A6CF55",
      cumple: (item) =>
        contieneConcluido(item.configuraciones_iniciales) ||
        item.avance >= 62.5,
    },
    {
      nombre: "Capacitaciones concluidas",
      color: "#67B74B",
      cumple: (item) =>
        contieneConcluido(item.capacitaciones) ||
        item.avance >= 75,
    },
    {
      nombre: "En uso del PHEDS",
      color: "#4AA090",
      cumple: (item) =>
        contieneSi(item.uso_pheds) ||
        item.avance >= 87.5,
    },
    {
      nombre: "En uso del MOCE",
      color: "#3070C0",
      cumple: (item) =>
        contieneSi(item.uso_moce) ||
        item.avance >= 100,
    },
    {
      nombre: "No ha iniciado",
      color: "#7A1E1E",
      cumple: (item) => item.avance === 0,
    },
  ];

  const total = data.length || 1;

  document.getElementById("stage-summary").innerHTML = etapas
    .map((etapa) => {
      const valor = data.filter(etapa.cumple).length;
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

          <div class="stage-bar-count">${valor}</div>
        </div>
      `;
    })
    .join("");
}

// function cargarDistribucionEtapas(data) {
//   const conteo = {};
//   etapasOrden.forEach((etapa) => (conteo[etapa] = 0));

//   data.forEach((item) => {
//     const etapa = obtenerEtapa(item);
//     conteo[etapa] = (conteo[etapa] || 0) + 1;
//   });

//   const total = data.length || 1;

//   document.getElementById("stage-summary").innerHTML = etapasOrden
//     .map((etapa) => {
//       const valor = conteo[etapa] || 0;
//       const porcentaje = (valor / total) * 100;
//       const color = etapaColores[etapa];

//       return `
//         <div class="stage-bar-row">
//           <span class="etapa-dot" style="background:${color}"></span>
//           <div class="stage-bar-label">${etapa}</div>
//           <div class="stage-bar-track">
//             <div class="stage-bar-fill" style="width:${porcentaje}%; background:${color}"></div>
//           </div>
//           <div class="stage-bar-count">${valor}</div>
//         </div>
//       `;
//     })
//     .join("");
// }

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
    resumen[label].total
      ? resumen[label].avance / resumen[label].total
      : 0
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

  document.getElementById("entidades-count").innerText = `${entidades.length} estados`;

  document.getElementById("entidades-body").innerHTML = entidades
    .map((item) => {
      const color = colorPorAvance(item.avancePromedio);

      return `
        <div class="entidad-row" onclick="filtrarEntidad('${escapeJS(item.entidad)}')">
          <div>
            <div class="entidad-name">${item.entidad}</div>
            <div class="bar-mini">
              <div class="bar-mini-fill" style="width:${item.avancePromedio}%;background:${color}"></div>
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