<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Șomaj România - Analiză Multi-Criterială</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-dot"></div>
    <span>ȘomajRO</span>
    <span class="header-sub">Analiză multi-criterială a șomajului din România</span>
  </div>
  <div class="header-actions">
    <span id="db-badge" class="db-status"><span class="db-dot"></span>Se verifică DB…</span>
  </div>
</header>

<div class="app">
  <!-- SIDEBAR FILTRE -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-title">Filtre &amp; Criterii</div>

    <div class="filter-group">
      <span class="filter-label">Perioadă</span>
      <div class="range-row">
        <span class="range-label">An început</span>
        <span class="range-val" id="yr-start-val">2020</span>
      </div>
      <input type="range" id="yr-start" min="2019" max="2025" value="2020">
      <div class="range-row">
        <span class="range-label">An sfârșit</span>
        <span class="range-val" id="yr-end-val">2025</span>
      </div>
      <input type="range" id="yr-end" min="2019" max="2025" value="2025">
    </div>

    <div class="filter-group">
      <span class="filter-label">Mediu de rezidență</span>
      <div class="multi-select">
        <div class="check-item"><input type="checkbox" id="mediu-urban"  value="urban"  checked><label for="mediu-urban">Urban</label></div>
        <div class="check-item"><input type="checkbox" id="mediu-rural"  value="rural"  checked><label for="mediu-rural">Rural</label></div>
      </div>
    </div>

    <div class="filter-group">
      <span class="filter-label">Sex</span>
      <div class="multi-select">
        <div class="check-item"><input type="checkbox" id="sex-m" value="masculin" checked><label for="sex-m">Masculin</label></div>
        <div class="check-item"><input type="checkbox" id="sex-f" value="feminin"  checked><label for="sex-f">Feminin</label></div>
      </div>
    </div>

    <div class="filter-group">
      <span class="filter-label">Grupe de vârstă</span>
      <div class="multi-select" id="varsta-list">
        <div class="check-item"><input type="checkbox" id="v1" value="sub 25" checked><label for="v1">Sub 25 ani</label></div>
        <div class="check-item"><input type="checkbox" id="v2" value="25-29" checked><label for="v2">25-29 ani</label></div>
        <div class="check-item"><input type="checkbox" id="v3" value="30-39" checked><label for="v3">30–39 ani</label></div>
        <div class="check-item"><input type="checkbox" id="v4" value="40-49" checked><label for="v4">40–49 ani</label></div>
        <div class="check-item"><input type="checkbox" id="v5" value="50-55" checked><label for="v5">50-55 ani</label></div>
        <div class="check-item"><input type="checkbox" id="v5" value="55+" checked><label for="v5">55+ ani</label></div>
      </div>
    </div>

    <div class="filter-group">
      <span class="filter-label">Nivel educație</span>
      <div class="multi-select" id="edu-list">
        <div class="check-item"><input type="checkbox" id="e1" value="fara_studii" checked><label for="e1">Fără școlarizare</label></div>
        <div class="check-item"><input type="checkbox" id="e2" value="primar" checked><label for="e2">Primar</label></div>
        <div class="check-item"><input type="checkbox" id="e3" value="gimnazial" checked><label for="e3">Gimnazial</label></div>
        <div class="check-item"><input type="checkbox" id="e4" value="liceal" checked><label for="e4">Liceal</label></div>
        <div class="check-item"><input type="checkbox" id="e4" value="postliceal" checked><label for="e4">Postliceal</label></div>
        <div class="check-item"><input type="checkbox" id="e4" value="profesional_arte_meserii" checked><label for="e4">Profesional / Arte si meserii</label></div>
        <div class="check-item"><input type="checkbox" id="e5" value="universitar" checked><label for="e5">Universitar</label></div>
      </div>
    </div>

    <div class="filter-group">
      <span class="filter-label">Județe (pentru comparare)</span>
      <div class="multi-select" id="judete-list"></div>
    </div>

    <button class="btn-apply" onclick="applyFilters()">Aplică filtrele</button>
  </aside>

  <main id="main-content">

    <div class="stats-grid" id="stats-grid">
      <div class="stat-card">
        <div class="label">Rată medie șomaj</div>
        <div class="value" id="s-rata">—</div>
      </div>
      <div class="stat-card">
        <div class="label">Total șomeri</div>
        <div class="value" id="s-total">—</div>
      </div>
      <div class="stat-card">
        <div class="label">Județ cu rată max.</div>
        <div class="value" id="s-maxj">—</div>
        <div class="delta" id="s-maxj-v"></div>
      </div>
      <div class="stat-card">
        <div class="label">Județ cu rată min.</div>
        <div class="value" id="s-minj">—</div>
        <div class="delta" id="s-minj-v"></div>
      </div>
    </div>


    <!-- TABS -->
    <div class="tabs" id="tabs">
      <button class="tab active" data-tab="bar"   onclick="switchTab('bar',this)">Bar - Județe</button>
      <button class="tab" data-tab="line"  onclick="switchTab('line',this)">Linie - Evoluție</button>
      <button class="tab" data-tab="radar" onclick="switchTab('radar',this)">Radar - Comparare</button>
      <button class="tab" data-tab="map"   onclick="switchTab('map',this)">Hartă</button>
      <button class="tab" data-tab="table" onclick="switchTab('table',this)">Tabel date</button>
    </div>

    <!-- PANEL BAR -->
    <div class="panel active" id="panel-bar">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Rata șomajului pe județe (%)</div>
            <div class="chart-sub" id="bar-sub">Valori medii pentru perioada selectată</div>
          </div>
          <div class="chart-actions">
            <button class="btn" onclick="exportChartSVG('bar-chart-canvas','bar_judete')">SVG</button>
            <button class="btn" onclick="exportChartPDF('bar-chart-canvas','bar_judete')">PDF</button>
          </div>
        </div>
        <div class="legend" id="bar-legend">
          <div class="legend-item"><div class="legend-dot"></div>Rată șomaj (%)</div>
        </div>
        <div class="chart-wrap-bar">
          <canvas id="bar-chart-canvas" role="img" aria-label="Diagrama bara rata somajului pe judete Romania"></canvas>
        </div>
      </div>
    </div>

    <!-- PANEL LINE -->
    <!-- dupa judete -->
    <div class="panel" id="panel-line">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Evoluția ratei șomajului în timp (%)</div>
            <div class="chart-sub">Tendință anuală pentru județele selectate</div>
          </div>
          <div class="chart-actions">
            <button class="btn" onclick="exportChartSVG('line-chart-canvas','evolutie_timp')">SVG</button>
            <button class="btn" onclick="exportChartPDF('line-chart-canvas','evolutie_timp')">PDF</button>
          </div>
        </div>
        <div class="legend" id="line-legend"></div>
        <div class="chart-wrap-line">
          <canvas id="line-chart-canvas" role="img" aria-label="Grafic liniar evolutia somajului Romania pe ani"></canvas>
        </div>
      </div>

      <!-- dupa mediu -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Șomaj pe mediu de rezidență - evoluție</div>
          </div>
          <div class="chart-actions">
            <button class="btn" onclick="exportChartSVG('location-chart-canvas','mediu_evolutie')">SVG</button>
            <button class="btn" onclick="exportChartPDF('location-chart-canvas','mediu_evolutie')">PDF</button>
          </div>
        </div>
        <div class="legend" id="location-legend"></div>
        <div class="chart-wrap-line">
          <canvas id="location-chart-canvas" role="img" aria-label="Grafic somaj pe medii de rezidență"></canvas>
        </div>
      </div>

      <!-- dupa sex -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Șomaj dupa gen - evoluție</div>
          </div>
          <div class="chart-actions">
            <button class="btn" onclick="exportChartSVG('sex-chart-canvas','sex_evolutie')">SVG</button>
            <button class="btn" onclick="exportChartPDF('sex-chart-canvas','sex_evolutie')">PDF</button>
          </div>
        </div>
        <div class="legend" id="sex-legend"></div>
        <div class="chart-wrap-line">
          <canvas id="sex-chart-canvas" role="img" aria-label="Grafic somaj dupa gen"></canvas>
        </div>
        
      </div>

      <!-- dupa varsta -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Șomaj pe grupe de vârstă - evoluție</div>
          </div>
          <div class="chart-actions">
            <button class="btn" onclick="exportChartSVG('age-chart-canvas','varsta_evolutie')">SVG</button>
            <button class="btn" onclick="exportChartPDF('age-chart-canvas','varsta_evolutie')">PDF</button>
          </div>
        </div>
        <div class="legend" id="age-legend"></div>
        <div class="chart-wrap-line">
          <canvas id="age-chart-canvas" role="img" aria-label="Grafic somaj pe grupe de varsta"></canvas>
        </div>
      </div>

      <!-- dupa educatie -->
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Șomaj pe nivel de educatie - evoluție</div>
          </div>
          <div class="chart-actions">
            <button class="btn" onclick="exportChartSVG('edu-chart-canvas','educatie_evolutie')">SVG</button>
            <button class="btn" onclick="exportChartPDF('edu-chart-canvas','educatie_evolutie')">PDF</button>
          </div>
        </div>
        <div class="legend" id="edu-legend"></div>
        <div class="chart-wrap-line">
          <canvas id="edu-chart-canvas" role="img" aria-label="Grafic somaj pe nivel de educatie"></canvas>
        </div>
      </div>
    </div>


    <!-- PANEL RADAR -->
    <div class="panel" id="panel-radar">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Comparare multi-criterială - radar</div>
          </div>
          <div class="chart-actions">
            <button class="btn" onclick="exportChartSVG('radar-chart-canvas','radar_comparare')">SVG</button>
            <button class="btn" onclick="exportChartPDF('radar-chart-canvas','radar_comparare')">PDF</button>
          </div>
        </div>
        <div class="legend" id="radar-legend"></div>
        <div id="radar-wrap">
          <canvas id="radar-chart-canvas" role="img" aria-label="Diagrama radar comparare judete"></canvas>
        </div>
      </div>
    </div>

    <!-- PANEL MAP -->
    <div class="panel" id="panel-map">
      <div class="chart-card" id="panel-map-chart-card">
        <div class="chart-header" id="panel-map-chart-header">
          <div>
            <div class="chart-title">Hartă coropleth - rata șomajului pe județe</div>
          </div>
          <div class="chart-actions">
            <button class="btn" onclick="exportMapSVG()">SVG</button>
            <button class="btn btn-primary" onclick="exportMapPDF()">PDF</button>
          </div>
        </div>
        <div class="map-controls">
          <label id="map-crit">Criteriu:</label>
          <select id="map-criteriu" onchange="renderMap()">
            <option value="rata">Rată șomaj (%)</option>
            <option value="feminin">Feminin</option>
            <option value="masculin">Masculin</option>
            <option value="urban">Urban</option>
            <option value="rural">Rural</option>
            <option value="varsta_25m">Sub 25 ani</option>
            <option value="varsta_25_29">25-29 ani</option>
            <option value="varsta_30_39">30-39 ani</option>
            <option value="varsta_40_49">40-49 ani</option>
            <option value="varsta_50_55">50-55 ani</option>
            <option value="varsta_55p">Peste 55 ani</option>
            <option value="fara_studii">Fara_studii</option>
            <option value="primar">Primar</option>
            <option value="gimnazial">Gimnazial</option>
            <option value="liceal">Liceal</option>
            <option value="postliceal">Postliceal</option>
            <option value="profesional_arte_meserii">Profesional / Arte si meserii</option>
            <option value="universitar">Universitar</option>
          </select>
        </div>
        <div id="map-container">
          <div id="map-loading" class="map-loading-overlay">
            <div class="loading"><div class="spinner"></div>Se încarcă harta…</div>
          </div>
          <svg id="map-svg" viewBox="0 0 700 500"></svg>
          <div class="map-legend">
            <div class="map-legend-title" id="map-legend-title">Rată șomaj (%)</div>
            <div class="map-legend-scale" id="map-scale"></div>
            <div class="map-scale-labels"><span id="ml-min">0%</span><span id="ml-max">12%</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL TABLE -->
    <div class="panel" id="panel-table">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">Date detaliate pe județe</div>
            <div class="chart-sub" id="table-sub">Toți indicatorii pentru perioada selectată</div>
          </div>
          <div class="chart-actions">
            <button class="btn" onclick="exportCSV()">CSV</button>
            <button class="btn btn-primary" onclick="exportTablePDF()">PDF</button>
          </div>
        </div>
        <div class="table-wrap">
          <table id="data-table">
            <thead id="table-head"></thead>
            <tbody id="table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

  </main>
</div>

<div class="tooltip" id="global-tooltip"></div>

<script src="app.js"></script>
</body>
</html>
