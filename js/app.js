let mapa;
let markers = [];
let datosGlobales = [];
let datosFiltrados = [];
let tipoChart = null;

const ETAPAS = [
  { id:'sin_inicio', label:'Sin inicio', min:0, max:0, color:'#722222', bg:'#F7E8EC' },
  { id:'inicial', label:'Inicial', min:0.00001, max:24.9999, color:'#9F2241', bg:'#F7E8EC' },
  { id:'bajo', label:'Bajo', min:25, max:49.9999, color:'#BC955C', bg:'#FBF6EE' },
  { id:'medio', label:'Medio', min:50, max:74.9999, color:'#778D76', bg:'#E8F0EE' },
  { id:'alto', label:'Alto', min:75, max:99.9999, color:'#4AA090', bg:'#E8F0EE' },
  { id:'concluido', label:'Concluido', min:100, max:100, color:'#3070C0', bg:'#E8F0EE' }
];

async function cargarDatos() {
  try {
    const response = await fetch('data/unidades.json');
    if (!response.ok) throw new Error('No se pudo cargar data/unidades.json');

    const raw = await response.json();
    datosGlobales = raw.map(normalizarRegistro).filter(d => d.lat !== null && d.lon !== null);
    datosFiltrados = [...datosGlobales];

    inicializarMapa();
    cargarLeyenda();
    cargarFiltros(datosGlobales);
    render(datosGlobales);
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML('beforeend', `<div class="no-data">No se pudieron cargar los datos. Revisa la consola del navegador.</div>`);
  }
}

function normalizarRegistro(d) {
  return {
    clues: texto(d.clues),
    inst: texto(d.inst),
    entidad: texto(d.entidad),
    municipio: texto(d.municipio),
    nombre: texto(d.nombre_unidad ?? d.nombre),
    categoria: texto(d.categoria_gerencial_ampliada ?? d['categoria_gerencial_ampliada'] ?? d['categoría gerencial ampliada'] ?? d.categoria),
    tipologia: texto(d.tipologia),
    subtipologia: texto(d.subtipologia ?? d['subtipología']),
    estatus: texto(d.estatus_operacion ?? d.estatus),
    estrato: texto(d.estrato_unidad ?? d['estrato unidad']),
    consultorios: numero(d.total_consultorios ?? d.consultorios),
    quirofanos: numero(d.total_quirofanos ?? d.quirofanos),
    camas: numero(d.total_camas ?? d.total ?? d.camas),
    lat: numeroONull(d.latitud ?? d.lat),
    lon: numeroONull(d.longitud ?? d.lon),
    avance: avanceNormalizado(d.avance),
    formatoTics: texto(d.formato_tics_servicios ?? d['formato tics/servicios']),
    red: texto(d.entrega_de_equipos_red ?? d.entrega_de_equipos___red ?? d['entrega de equipos / red']),
    pheds: texto(d.formato_pheds),
    moce: texto(d.formato_moce),
    observaciones: texto(d.observaciones)
  };
}

function texto(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function numero(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function numeroONull(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function avanceNormalizado(v) { const n = numero(v); return n > 0 && n <= 1 ? n * 100 : n; }
function fmt(n, dec=0) { return Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits:dec, minimumFractionDigits:dec }); }

function etapaDeAvance(avance) {
  const a = avanceNormalizado(avance);
  return ETAPAS.find(e => a >= e.min && a <= e.max) || ETAPAS[0];
}

function colorAvance(avance) { return etapaDeAvance(avance).color; }

function inicializarMapa() {
  mapa = L.map('map', { scrollWheelZoom:true }).setView([23.6345, -102.5528], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap'
  }).addTo(mapa);
}

function cargarLeyenda() {
  const grid = document.getElementById('legend-grid');
  grid.innerHTML = ETAPAS.map(e => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${e.color}"></span>
      <span>${e.label}</span>
    </div>
  `).join('');
}

function cargarFiltros(data) {
  llenarSelect('f-entidad', [...new Set(data.map(d => d.entidad).filter(Boolean))].sort());
  llenarSelect('f-tipologia', [...new Set(data.map(d => d.tipologia).filter(Boolean))].sort());
  llenarSelect('f-estatus', [...new Set(data.map(d => d.estatus).filter(Boolean))].sort());
  llenarSelect('f-etapa', ETAPAS.map(e => e.label));

  ['f-search','f-entidad','f-tipologia','f-estatus','f-etapa','f-avance'].forEach(id => {
    document.getElementById(id).addEventListener('input', aplicarFiltros);
    document.getElementById(id).addEventListener('change', aplicarFiltros);
  });
  document.getElementById('btn-reset').addEventListener('click', resetFilters);
}

function llenarSelect(id, valores) {
  const select = document.getElementById(id);
  const primera = select.querySelector('option')?.outerHTML || '<option value="">Todos</option>';
  select.innerHTML = primera + valores.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
}

function aplicarFiltros() {
  const q = document.getElementById('f-search').value.toLowerCase();
  const entidad = document.getElementById('f-entidad').value;
  const tipologia = document.getElementById('f-tipologia').value;
  const estatus = document.getElementById('f-estatus').value;
  const etapa = document.getElementById('f-etapa').value;
  const avanceMin = Number(document.getElementById('f-avance').value);

  document.getElementById('avance-value').textContent = `${avanceMin}%`;

  datosFiltrados = datosGlobales.filter(d => {
    const matchQ = !q || d.clues.toLowerCase().includes(q) || d.nombre.toLowerCase().includes(q);
    const matchEntidad = !entidad || d.entidad === entidad;
    const matchTipologia = !tipologia || d.tipologia === tipologia;
    const matchEstatus = !estatus || d.estatus === estatus;
    const matchEtapa = !etapa || etapaDeAvance(d.avance).label === etapa;
    const matchAvance = d.avance >= avanceMin;
    return matchQ && matchEntidad && matchTipologia && matchEstatus && matchEtapa && matchAvance;
  });

  render(datosFiltrados);
}

function resetFilters() {
  document.getElementById('f-search').value = '';
  document.getElementById('f-entidad').value = '';
  document.getElementById('f-tipologia').value = '';
  document.getElementById('f-estatus').value = '';
  document.getElementById('f-etapa').value = '';
  document.getElementById('f-avance').value = 0;
  aplicarFiltros();
}

function render(data) {
  renderKPIs(data);
  renderMapa(data);
  renderStageSummary(data);
  renderTipoChart(data);
  renderEntidades(data);
  renderTabla(data);
}

function renderKPIs(data) {
  const total = data.length;
  const promedio = total ? data.reduce((a,d) => a + d.avance, 0) / total : 0;
  document.getElementById('kpi-total').textContent = fmt(total);
  document.getElementById('kpi-alto').textContent = fmt(data.filter(d => d.avance >= 75).length);
  document.getElementById('kpi-medio').textContent = fmt(data.filter(d => d.avance >= 25 && d.avance < 75).length);
  document.getElementById('kpi-sin').textContent = fmt(data.filter(d => d.avance === 0).length);
  document.getElementById('kpi-prom').textContent = fmt(promedio, 1);
  document.getElementById('results-count').textContent = `${fmt(total)} unidades`;
  document.getElementById('map-count').textContent = `${fmt(total)} unidades`;
  document.getElementById('table-count').textContent = `${fmt(total)} resultados`;
  document.getElementById('footer-total').textContent = fmt(datosGlobales.length);
}

function renderMapa(data) {
  markers.forEach(m => mapa.removeLayer(m));
  markers = [];
  const bounds = [];

  data.forEach(d => {
    if (d.lat === null || d.lon === null) return;
    const etapa = etapaDeAvance(d.avance);
    const marker = L.circleMarker([d.lat, d.lon], {
      radius:7,
      color:'#fff',
      weight:1.5,
      fillColor:etapa.color,
      fillOpacity:.9
    }).addTo(mapa);

    marker.bindPopup(`
      <div class="popup-top" style="background:${etapa.color}">
        <div class="popup-title">${escapeHtml(d.nombre)}</div>
        <div class="popup-clues">${escapeHtml(d.clues)}</div>
      </div>
      <div class="popup-inner">
        <div class="popup-detail"><strong>Entidad:</strong> ${escapeHtml(d.entidad)}</div>
        <div class="popup-detail"><strong>Municipio:</strong> ${escapeHtml(d.municipio)}</div>
        <div class="popup-detail"><strong>Tipología:</strong> ${escapeHtml(d.tipologia)}</div>
        <div class="popup-etapa" style="background:${etapa.bg}; color:${etapa.color}">${etapa.label} · ${fmt(d.avance,1)}%</div>
      </div>
    `);
    marker.on('click', () => mostrarDetalle(d));
    markers.push(marker);
    bounds.push([d.lat, d.lon]);
  });

  if (bounds.length) mapa.fitBounds(bounds, { padding:[25,25], maxZoom:10 });
}

function mostrarDetalle(d) {
  const etapa = etapaDeAvance(d.avance);
  document.getElementById('detalle-unidad').innerHTML = `
    <div class="detail-title">${escapeHtml(d.nombre)}</div>
    <div class="detail-clues">${escapeHtml(d.clues)}</div>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Entidad</div><div class="detail-value">${escapeHtml(d.entidad)}</div></div>
      <div class="detail-item"><div class="detail-label">Municipio</div><div class="detail-value">${escapeHtml(d.municipio)}</div></div>
      <div class="detail-item full"><div class="detail-label">Tipología</div><div class="detail-value">${escapeHtml(d.tipologia)}</div></div>
      <div class="detail-item"><div class="detail-label">Estatus</div><div class="detail-value">${escapeHtml(d.estatus)}</div></div>
      <div class="detail-item"><div class="detail-label">Etapa</div><div class="detail-value" style="color:${etapa.color}">${etapa.label}</div></div>
      <div class="detail-item"><div class="detail-label">Consultorios</div><div class="detail-value">${fmt(d.consultorios)}</div></div>
      <div class="detail-item"><div class="detail-label">Quirófanos</div><div class="detail-value">${fmt(d.quirofanos)}</div></div>
      <div class="detail-item"><div class="detail-label">Camas</div><div class="detail-value">${fmt(d.camas)}</div></div>
      <div class="detail-item"><div class="detail-label">Avance</div><div class="detail-value">${fmt(d.avance,1)}%</div></div>
      <div class="detail-item full"><div class="detail-label">Observaciones</div><div class="detail-value">${escapeHtml(d.observaciones || 'Sin observaciones')}</div></div>
    </div>
  `;
}

function renderStageSummary(data) {
  const max = Math.max(1, data.length);
  document.getElementById('stage-summary').innerHTML = ETAPAS.map(e => {
    const count = data.filter(d => etapaDeAvance(d.avance).id === e.id).length;
    const width = (count / max) * 100;
    return `
      <div class="stage-bar-row">
        <div class="stage-bar-label">${e.label}</div>
        <div class="stage-bar-track"><div class="stage-bar-fill" style="width:${width}%; background:${e.color}"></div></div>
        <div class="stage-bar-count">${fmt(count)}</div>
      </div>
    `;
  }).join('');
}

function renderTipoChart(data) {
  const resumen = agrupar(data, 'tipologia');
  const labels = Object.keys(resumen).slice(0,8);
  const values = labels.map(k => resumen[k].count);
  const ctx = document.getElementById('tipoChart');
  if (tipoChart) tipoChart.destroy();
  tipoChart = new Chart(ctx, {
    type:'doughnut',
    data:{ labels, datasets:[{ data:values, borderWidth:0 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{ size:10 } } } } }
  });
}

function renderEntidades(data) {
  const resumen = agrupar(data, 'entidad');
  const rows = Object.entries(resumen)
    .map(([entidad, r]) => ({ entidad, count:r.count, prom:r.sumaAvance/r.count, alto:r.items.filter(x => x.avance >= 75).length }))
    .sort((a,b) => b.prom - a.prom);
  document.getElementById('entidades-count').textContent = `${fmt(rows.length)} estados`;
  document.getElementById('entidades-body').innerHTML = rows.map(r => `
    <div class="entidad-row" onclick="filtrarEntidad('${escapeAttr(r.entidad)}')">
      <div><div class="entidad-name">${escapeHtml(r.entidad)}</div><div class="bar-mini"><div class="bar-mini-fill" style="width:${Math.min(100,r.prom)}%; background:${colorAvance(r.prom)}"></div></div></div>
      <div class="entidad-count">${fmt(r.count)}</div>
      <div class="avance-badge" style="background:${etapaDeAvance(r.prom).bg}; color:${colorAvance(r.prom)}">${fmt(r.prom,1)}%</div>
      <div class="entidad-count">${fmt(r.alto)}</div>
    </div>
  `).join('') || '<div class="no-data">Sin datos</div>';
}

function filtrarEntidad(entidad) {
  document.getElementById('f-entidad').value = entidad;
  aplicarFiltros();
}

function renderTabla(data) {
  const tbody = document.getElementById('hospitals-tbody');
  tbody.innerHTML = data.slice(0,500).map((d, i) => {
    const etapa = etapaDeAvance(d.avance);
    return `
      <tr onclick="seleccionarFila(${i})">
        <td><div class="td-nombre">${escapeHtml(d.nombre)}</div><div class="td-clues">${escapeHtml(d.clues)}</div></td>
        <td>${escapeHtml(d.entidad)}</td>
        <td><span class="avance-badge" style="background:${etapa.bg}; color:${etapa.color}">${fmt(d.avance,1)}%</span></td>
        <td><span class="etapa-chip" style="background:${etapa.bg}; color:${etapa.color}"><span class="etapa-dot" style="background:${etapa.color}"></span>${etapa.label}</span></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="4"><div class="no-data">Sin resultados</div></td></tr>';
}

function seleccionarFila(index) {
  const d = datosFiltrados[index];
  if (!d) return;
  mostrarDetalle(d);
  if (d.lat !== null && d.lon !== null) mapa.setView([d.lat, d.lon], 12);
}

function agrupar(data, campo) {
  return data.reduce((acc,d) => {
    const key = d[campo] || 'Sin dato';
    if (!acc[key]) acc[key] = { count:0, sumaAvance:0, items:[] };
    acc[key].count++;
    acc[key].sumaAvance += d.avance;
    acc[key].items.push(d);
    return acc;
  }, {});
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, '&#96;'); }

cargarDatos();
