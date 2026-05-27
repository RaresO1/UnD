"use strict";

let activeCharts = {};
let sortDir = 1,
  sortCol = 0;
let tableData = [];
let roGeoJson = null;
let mapApiData = {};
let dbOnline = false;
let years = [];
let f = {};
let apiData = {};

const COLUMN_LABELS = {
  rata: "Rata",
  total: "Total",
  // Sex
  feminin: "Feminin",
  masculin: "Masculin",
  // Mediu
  urban: "Urban",
  rural: "Rural",
  // Vârstă
  varsta_25m: "Sub 25 ani",
  varsta_25_29: "25-29 ani",
  varsta_30_39: "30-39 ani",
  varsta_40_49: "40-49 ani",
  varsta_50_55: "50-55 ani",
  varsta_55p: "Peste 55 ani",
  // Educație
  fara_studii: "Fără studii",
  primar: "Primar",
  gimnazial: "Gimnazial",
  liceal: "Liceal",
  postliceal: "Postliceal",
  profesional_arte_meserii: "Prof. / Arte si Meserii",
  universitar: "Universitar",
};

const COLUMN_LABELS_TABLE = {
  rata: "Rata",
  total: "Total",
  // Sex
  feminin: "Fem.",
  masculin: "Masc.",
  // Mediu
  urban: "Urban",
  rural: "Rural",
  // Vârstă
  varsta_25m: "<25",
  varsta_25_29: "25-29",
  varsta_30_39: "30-39",
  varsta_40_49: "40-49",
  varsta_50_55: "50-55",
  varsta_55p: ">55",
  // Educație
  fara_studii: "Fara",
  primar: "Primar",
  gimnazial: "Gimn.",
  liceal: "Liceal",
  postliceal: "Post.",
  profesional_arte_meserii: "P.A.M",
  universitar: "Univ.",
};

const V_LABELS = {
  "sub 25": "varsta_25m",
  "25-29": "varsta_25_29",
  "30-39": "varsta_30_39",
  "40-49": "varsta_40_49",
  "50-55": "varsta_50_55",
  "55+": "varsta_55p",
};

const API = "data.php";

async function init() {
  await checkDbStatus();
  setupSliders();
  await buildJudeteList();
  await applyFilters();
}

async function checkDbStatus() {
  try {
    const r = await fetch(`${API}?action=ping`, {
      signal: AbortSignal.timeout(5000),
    });
    const d = await r.json();
    dbOnline = d.status === "ok";
  } catch {
    dbOnline = false;
  }
  const badge = document.getElementById("db-badge");
  if (badge) {
    badge.textContent = dbOnline ? "● DB conectat" : "● Date locale";
    badge.className = "db-status" + (dbOnline ? "" : " error");
  }
}

async function apiGet(params) {
  if (!dbOnline) return null;
  try {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${API}?${qs}`, {
      signal: AbortSignal.timeout(5000),
    });
    const d = await r.json();
    return d.status === "ok" ? d : null;
  } catch {
    return null;
  }
}

// SIDEBAR
async function buildJudeteList() {
  const c = document.getElementById("judete-list");
  const sel = ["Cluj", "Iași", "Timiș", "Vaslui", "București"];
  const apiJudete = await apiGet({ action: "judete" });
  const judete = apiJudete.data;

  judete.forEach((jud) => {
    const j = jud.nume;
    const d = document.createElement("div");
    d.className = "check-item";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.id = "j_" + j;
    chk.value = j;
    chk.checked = sel.includes(j);

    const lbl = document.createElement("label");
    lbl.htmlFor = "j_" + j;
    lbl.textContent = j;

    d.appendChild(chk);
    d.appendChild(lbl);
    c.appendChild(d);
  });
}

function setupSliders() {
  document.getElementById("yr-start").addEventListener("input", function () {
    const v = +this.value;
    document.getElementById("yr-start-val").textContent = v;
    if (+document.getElementById("yr-end").value < v) {
      document.getElementById("yr-end").value = v;
      document.getElementById("yr-end-val").textContent = v;
    }
  });
  document.getElementById("yr-end").addEventListener("input", function () {
    const v = +this.value;
    document.getElementById("yr-end-val").textContent = v;
    if (+document.getElementById("yr-start").value > v) {
      document.getElementById("yr-start").value = v;
      document.getElementById("yr-start-val").textContent = v;
    }
  });
}

function getFilters() {
  return {
    yrStart: +document.getElementById("yr-start").value,
    yrEnd: +document.getElementById("yr-end").value,
    mediu: [
      ...document.querySelectorAll('#sidebar input[id^="mediu-"]:checked'),
    ].map((e) => e.value),
    sex: [
      ...document.querySelectorAll('#sidebar input[id^="sex-"]:checked'),
    ].map((e) => e.value),
    varsta: [
      ...document.querySelectorAll('#sidebar input[id^="v"]:checked'),
    ].map((e) => e.value),
    edu: [...document.querySelectorAll('#sidebar input[id^="e"]:checked')].map(
      (e) => e.value,
    ),
    judete: [...document.querySelectorAll("#judete-list input:checked")].map(
      (e) => e.value,
    ),
  };
}

function filteredYears() {
  const localYears = [];
  for (let i = f.yrStart; i <= f.yrEnd; i++) {
    localYears.push(i);
  }
  return localYears;
}

async function applyFilters() {
  f = getFilters();
  years = filteredYears(f);

  const apiStats = await apiGet({
    action: "stats",
    yr_start: f.yrStart,
    yr_end: f.yrEnd,
  });
  const apiRows = await apiGet({
    action: "evolutie",
    yr_start: f.yrStart,
    yr_end: f.yrEnd,
  });

  apiData = apiStats.data;

  updateStats();
  renderBar();
  renderLine(apiRows?.data);
  renderRadar();
  renderTable();
  updateMapCriteriuOptions();
  loadMap();
}

function updateStats() {
  let judeteSelectate = apiData.filter((r) => f.judete.includes(r.nume));

  let rates = judeteSelectate.map((r) => ({
    j: r.nume,
    v: parseFloat(r.rata),
  }));

  let total = judeteSelectate.map((r) => ({
    j: r.nume,
    v: parseFloat(r.total),
  }));
  const sumTotal = total.reduce((acc, r) => {
    if (f.judete.includes(r.j)) {
      acc = acc + r.v;
    }
    return acc;
  }, 0);

  const allVals = rates.map((r) => r.v);
  const mean = (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(1);

  const maxJ = rates.reduce((a, b) => (b.v > a.v ? b : a));
  const minJ = rates.reduce((a, b) => (b.v < a.v ? b : a));

  document.getElementById("s-rata").textContent = mean + "%";
  document.getElementById("s-total").textContent =
    Math.round(sumTotal).toLocaleString("ro-RO");
  document.getElementById("s-maxj").textContent = maxJ.j;
  document.getElementById("s-maxj-v").textContent = maxJ.v + "% medie";
  document.getElementById("s-minj").textContent = minJ.j;
  document.getElementById("s-minj-v").textContent = minJ.v + "% medie";
}

// BAR CHART

function renderBar() {
  let judeteSelectate = apiData.filter((r) => f.judete.includes(r.nume));
  let rates = judeteSelectate
    .map((r) => ({ j: r.nume, v: parseFloat(r.rata) }))
    .sort((a, b) => b.v - a.v);
  const labels = rates.map((r) => r.j);
  const vals = rates.map((r) => r.v);
  const colors = vals.map((v) =>
    v > 7 ? "#e05252" : v > 4 ? "#f4a261" : "#52b788",
  );
  document.getElementById("bar-sub").textContent =
    `Medie ${years[0]}–${years[years.length - 1]}`;
  destroyChart("bar-chart-canvas");
  activeCharts["bar-chart-canvas"] = new Chart(
    document.getElementById("bar-chart-canvas"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Rată șomaj (%)",
            data: vals,
            backgroundColor: colors,
            borderColor: colors.map((c) => c + "cc"),
            borderWidth: 1,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => " " + ctx.raw.toFixed(1) + "%" },
          },
        },
        scales: {
          x: {
            ticks: { color: "#8b949e", font: { size: 10 }, maxRotation: 60 },
            grid: { color: "#30363d" },
          },
          y: {
            ticks: { color: "#8b949e", callback: (v) => v + "%" },
            grid: { color: "#30363d" },
            title: { display: true, text: "%", color: "#8b949e" },
          },
        },
      },
    },
  );
}

// LINE CHART

const LINE_COLORS = [
  "#e05252",
  "#4f94ef",
  "#52b788",
  "#f4a261",
  "#a78bfa",
  "#34d399",
  "#ffbe0b",
  "#06d6a0",
  "#ef476f",
  "#118ab2",
];

function renderLine(apiRows) {
  renderLineJudete(apiRows);
  renderLineAge(apiRows);
  renderLineMediu(apiRows);
  renderLineEdu(apiRows);
  renderLineGender(apiRows);
}

function renderLineJudete(apiRows) {
  const judete = f.judete.length
    ? f.judete.slice(0, 10)
    : ["Cluj", "Iași", "Timiș", "București", "Brașov"];
  const judeteSelectate = apiRows.filter((r) => judete.includes(r.nume));
  const rates = judeteSelectate.map((r) => ({
    a: r.an,
    j: r.nume,
    v: parseFloat(r.rata),
  }));
  const rates_map = new Map(
    judeteSelectate.map((r) => [`${r.an}:${r.nume}`, parseFloat(r.rata)]),
  );
  const datasets = judete.map((j, i) => ({
    label: j,
    data: years.map((y) => rates_map.get(`${y}:${j}`)),
    borderColor: LINE_COLORS[i % 10],
    backgroundColor: LINE_COLORS[i % 10] + "22",
    tension: 0.3,
    fill: false,
    pointRadius: 3,
    borderWidth: 2,
    borderDash: i > judete.length / 2 ? [4, 3] : [],
  }));
  destroyChart("line-chart-canvas");
  activeCharts["line-chart-canvas"] = new Chart(
    document.getElementById("line-chart-canvas"),
    {
      type: "line",
      data: { labels: years, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false },
        },
        scales: {
          x: { ticks: { color: "#8b949e" }, grid: { color: "#30363d" } },
          y: {
            ticks: { color: "#8b949e", callback: (v) => v + "%" },
            grid: { color: "#30363d" },
          },
        },
      },
    },
  );
  document.getElementById("line-legend").innerHTML = judete
    .map(
      (j, i) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${LINE_COLORS[i % 10]}"></div>${j}</div>`,
    )
    .join("");
}

function renderLineAge(apiRows) {
  const sel_age = f.varsta.length ? f.varsta : ["sub 25"];
  const values = apiRows.map((r) => ({
    a: r.an,
    v_u25: parseInt(r.varsta_25m),
    v_25_29: parseInt(r.varsta_25_29),
    v_30_39: parseInt(r.varsta_30_39),
    v_40_49: parseInt(r.varsta_40_49),
    v_50_55: parseInt(r.varsta_50_55),
    v_55p: parseInt(r.varsta_55p),
  }));

  const groupedByYear = values.reduce((acc, current) => {
    const an = current.a;

    if (!acc[an]) {
      acc[an] = {
        count: 0,
        v_u25: 0,
        v_25_29: 0,
        v_30_39: 0,
        v_40_49: 0,
        v_50_55: 0,
        v_55p: 0,
      };
    }

    acc[an].count += 1;
    acc[an].v_u25 += current.v_u25 || 0;
    acc[an].v_25_29 += current.v_25_29 || 0;
    acc[an].v_30_39 += current.v_30_39 || 0;
    acc[an].v_40_49 += current.v_40_49 || 0;
    acc[an].v_50_55 += current.v_50_55 || 0;
    acc[an].v_55p += current.v_55p || 0;

    return acc;
  }, {});

  const averagesMap = new Map();
  for (let an = years[0]; an <= years[years.length - 1]; an++) {
    const data = groupedByYear[an];

    const totalRows = data.count;
    averagesMap.set(an, {
      v_u25: data.v_u25,
      v_25_29: data.v_25_29,
      v_30_39: data.v_30_39,
      v_40_49: data.v_40_49,
      v_50_55: data.v_50_55,
      v_55p: data.v_55p,
    });
  }

  const ageGroups = [
    { key: "sub 25", label: "Sub 25 ani", map_v: "v_u25" },
    { key: "25-29", label: "25 - 29 ani", map_v: "v_25_29" },
    { key: "30-39", label: "30 - 39 ani", map_v: "v_30_39" },
    { key: "40-49", label: "40 - 49 ani", map_v: "v_40_49" },
    { key: "50-55", label: "50 - 55 ani", map_v: "v_50_55" },
    { key: "55+", label: "Peste 55 ani", map_v: "v_55p" },
  ];

  const activeAgeGroups = ageGroups.filter((g) => sel_age.includes(g.key));

  const age_data = activeAgeGroups.map((v, i) => ({
    label: v.label,
    data: years.map((y) => {
      const anNumar = Number(y);
      const anData = averagesMap.get(anNumar);
      return anData[v.map_v];
    }),
    borderColor: LINE_COLORS[i % 10],
    backgroundColor: LINE_COLORS[i % 10] + "22",
    tension: 0.3,
    fill: false,
    borderWidth: 2,
    pointRadius: 2,
    borderDash: i > activeAgeGroups.length / 2 ? [4, 3] : [],
  }));
  destroyChart("age-chart-canvas");
  activeCharts["age-chart-canvas"] = new Chart(
    document.getElementById("age-chart-canvas"),
    {
      type: "line",
      data: { labels: years, datasets: age_data },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: { ticks: { color: "#8b949e" }, grid: { color: "#30363d" } },
          y: {
            ticks: { color: "#8b949e", callback: (v) => v },
            grid: { color: "#30363d" },
          },
        },
      },
    },
  );
  document.getElementById("age-legend").innerHTML = sel_age
    .map(
      (v, i) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${LINE_COLORS[i % 10]}"></div>${v} ani</div>`,
    )
    .join("");
}

function renderLineGender(apiRows) {
  const sel_gender = f.sex.length ? f.sex : ["feminin"];
  const values = apiRows.map((r) => ({ a: r.an, m: r.masculin, f: r.feminin }));

  const groupedByYear = values.reduce((acc, current) => {
    const an = current.a;

    if (!acc[an]) {
      acc[an] = { count: 0, masculin: 0, feminin: 0 };
    }

    acc[an].count += 1;
    acc[an].masculin += current.m;
    acc[an].feminin += current.f;

    return acc;
  }, {});

  const averagesMap = new Map();
  for (let an = years[0]; an <= years[years.length - 1]; an++) {
    const data = groupedByYear[an];

    const totalRows = data.count;
    averagesMap.set(an, {
      masculin: data.masculin,
      feminin: data.feminin,
    });
  }

  const genderGroups = [
    { key: "masculin", label: "Masculin" },
    { key: "feminin", label: "Feminin" },
  ];

  const activeGenderGroups = genderGroups.filter((g) =>
    sel_gender.includes(g.key),
  );

  const gender_data = activeGenderGroups.map((v, i) => ({
    label: v.label,
    data: years.map((y) => averagesMap.get(y)[v.key]),
    borderColor: LINE_COLORS[i % 10],
    backgroundColor: LINE_COLORS[i % 10] + "22",
    tension: 0.3,
    fill: false,
    borderWidth: 2,
    pointRadius: 2,
  }));
  destroyChart("sex-chart-canvas");
  activeCharts["sex-chart-canvas"] = new Chart(
    document.getElementById("sex-chart-canvas"),
    {
      type: "line",
      data: { labels: years, datasets: gender_data },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: { ticks: { color: "#8b949e" }, grid: { color: "#30363d" } },
          y: {
            ticks: { color: "#8b949e", callback: (v) => v },
            grid: { color: "#30363d" },
          },
        },
      },
    },
  );
  document.getElementById("sex-legend").innerHTML = sel_gender
    .map(
      (v, i) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${LINE_COLORS[i % 10]}"></div>${v}</div>`,
    )
    .join("");
}

function renderLineEdu(apiRows) {
  const sel_edu = f.edu.length ? f.edu : ["fara_studii"];
  const values = apiRows.map((r) => ({
    a: r.an,
    fara_studii: parseInt(r.fara_studii),
    primar: parseInt(r.primar),
    gimnazial: parseInt(r.gimnazial),
    liceal: parseInt(r.liceal),
    postliceal: parseInt(r.postliceal),
    profesional_arte_meserii: parseInt(r.profesional_arte_meserii),
    universitar: parseInt(r.universitar),
  }));

  const groupedByYear = values.reduce((acc, current) => {
    const an = current.a;

    if (!acc[an]) {
      acc[an] = {
        count: 0,
        fara_studii: 0,
        primar: 0,
        gimnazial: 0,
        liceal: 0,
        postliceal: 0,
        profesional_arte_meserii: 0,
        universitar: 0,
      };
    }

    acc[an].count += 1;
    acc[an].fara_studii += current.fara_studii || 0;
    acc[an].primar += current.primar || 0;
    acc[an].gimnazial += current.gimnazial || 0;
    acc[an].liceal += current.liceal || 0;
    acc[an].postliceal += current.postliceal || 0;
    acc[an].profesional_arte_meserii += current.profesional_arte_meserii || 0;
    acc[an].universitar += current.universitar || 0;

    return acc;
  }, {});

  const averagesMap = new Map();
  for (let an = years[0]; an <= years[years.length - 1]; an++) {
    const data = groupedByYear[an];

    const totalRows = data.count;
    averagesMap.set(an, {
      fara_studii: data.fara_studii,
      primar: data.primar,
      gimnazial: data.gimnazial,
      liceal: data.liceal,
      postliceal: data.postliceal,
      profesional_arte_meserii: data.profesional_arte_meserii,
      universitar: data.universitar,
    });
  }

  const eduGroups = [
    { key: "fara_studii", label: "Fara studii" },
    { key: "primar", label: "Primar" },
    { key: "gimnazial", label: "Gimnazial" },
    { key: "liceal", label: "Liceal" },
    { key: "postliceal", label: "Postliceal" },
    { key: "profesional_arte_meserii", label: "Profesional / arte si meserii" },
    { key: "universitar", label: "Universitar" },
  ];

  const activeEduGroups = eduGroups.filter((g) => sel_edu.includes(g.key));

  const edu_data = activeEduGroups.map((v, i) => ({
    label: v.label,
    data: years.map((y) => averagesMap.get(y)[v.key]),
    borderColor: LINE_COLORS[i % 10],
    backgroundColor: LINE_COLORS[i % 10] + "22",
    tension: 0.3,
    fill: false,
    borderWidth: 2,
    pointRadius: 2,
    borderDash: i > activeEduGroups.length / 2 ? [4, 3] : [],
  }));
  destroyChart("edu-chart-canvas");
  activeCharts["edu-chart-canvas"] = new Chart(
    document.getElementById("edu-chart-canvas"),
    {
      type: "line",
      data: { labels: years, datasets: edu_data },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: { ticks: { color: "#8b949e" }, grid: { color: "#30363d" } },
          y: {
            ticks: { color: "#8b949e", callback: (v) => v },
            grid: { color: "#30363d" },
          },
        },
      },
    },
  );
  document.getElementById("edu-legend").innerHTML = sel_edu
    .map(
      (v, i) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${LINE_COLORS[i % 10]}"></div>${v}</div>`,
    )
    .join("");
}

function renderLineMediu(apiRows) {
  const sel_mediu = f.mediu.length ? f.mediu : ["urban"];
  const values = apiRows.map((r) => ({ a: r.an, u: r.urban, r: r.rural }));

  const groupedByYear = values.reduce((acc, current) => {
    const an = current.a;

    if (!acc[an]) {
      acc[an] = { count: 0, urban: 0, rural: 0 };
    }

    acc[an].count += 1;
    acc[an].urban += current.u;
    acc[an].rural += current.r;

    return acc;
  }, {});

  const averagesMap = new Map();
  for (let an = years[0]; an <= years[years.length - 1]; an++) {
    const data = groupedByYear[an];

    const totalRows = data.count;
    averagesMap.set(an, {
      urban: data.urban,
      rural: data.rural,
    });
  }

  const locationGroups = [
    { key: "urban", label: "Urban" },
    { key: "rural", label: "Rural" },
  ];

  const activeLocationGroups = locationGroups.filter((g) =>
    sel_mediu.includes(g.key),
  );

  const location_data = activeLocationGroups.map((v, i) => ({
    label: v.label,
    data: years.map((y) => averagesMap.get(y)[v.key]),
    borderColor: LINE_COLORS[i % 10],
    backgroundColor: LINE_COLORS[i % 10] + "22",
    tension: 0.3,
    fill: false,
    borderWidth: 2,
    pointRadius: 2,
  }));

  destroyChart("location-chart-canvas");
  activeCharts["location-chart-canvas"] = new Chart(
    document.getElementById("location-chart-canvas"),
    {
      type: "line",
      data: { labels: years, datasets: location_data },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: { ticks: { color: "#8b949e" }, grid: { color: "#30363d" } },
          y: {
            ticks: { color: "#8b949e", callback: (v) => v },
            grid: { color: "#30363d" },
          },
        },
      },
    },
  );
  document.getElementById("location-legend").innerHTML = activeLocationGroups
    .map(
      (v, i) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${LINE_COLORS[i % 10]}"></div>${v.key}</div>`,
    )
    .join("");
}

// RADAR

function renderRadar() {
  const judete = f.judete.length
    ? f.judete.slice(0, 5)
    : ["Cluj", "Iași", "București", "Timiș", "Brașov"];
  const sex = f.sex;
  const edu = f.edu;
  const mediu = f.mediu;
  const varsta_init = f.varsta;

  const varsta = varsta_init.map((i) => V_LABELS[i]);

  const radarLabels = [
    "Rata",
    ...sex.map((s) => COLUMN_LABELS[s]),
    ...mediu.map((m) => COLUMN_LABELS[m]),
    ...varsta.map((v) => COLUMN_LABELS[v]),
    ...edu.map((e) => COLUMN_LABELS[e]),
  ];

  const dbColumns = ["rata", ...sex, ...mediu, ...varsta, ...edu];

  const minMaxMap = {};
  dbColumns.forEach((col) => {
    const allValuesForCol = apiData.map((r) => parseFloat(r[col]) || 0);
    minMaxMap[col] = {
      min: Math.min(...allValuesForCol),
      max: Math.max(...allValuesForCol),
    };
  });

  const datasets = judete.map((j, i) => {
    const row = apiData.find((r) => r.nume === j);
    let dataPoints = [];

    dbColumns.forEach((col) => {
      const val = parseFloat(row[col]) || 0;
      const limits = minMaxMap[col];

      const range = limits.max - limits.min;
      let normalizedVal = 0;

      if (range > 0) {
        normalizedVal = ((val - limits.min) / range) * 10;
      }

      dataPoints.push(parseFloat(normalizedVal.toFixed(1)));
    });

    return {
      label: j,
      data: dataPoints,
      borderColor: LINE_COLORS[i % 10],
      backgroundColor: LINE_COLORS[i % 10] + "22",
      borderWidth: 2,
      pointRadius: 3,
      rawValues: dbColumns.map((col) => parseFloat(row[col])),
    };
  });

  destroyChart("radar-chart-canvas");
  activeCharts["radar-chart-canvas"] = new Chart(
    document.getElementById("radar-chart-canvas"),
    {
      type: "radar",
      data: {
        labels: radarLabels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            axis: "xy",
            callbacks: {
              label: function (context) {
                const dataset = context.dataset;
                const index = context.dataIndex;
                const rawVal = dataset.rawValues[index];
                const labelName = dataset.label;
                if (index === 0) {
                  return `${labelName}: ${rawVal.toFixed(2)}%`;
                } else {
                  return `${labelName}: ${Math.round(rawVal).toLocaleString("ro-RO")}`;
                }
              },
            },
          },
        },
        scales: {
          r: {
            ticks: { display: false },
            grid: { color: "#30363d" },
            angleLines: { color: "#30363d" },
            pointLabels: { color: "#e6edf3", font: { size: 11 } },
          },
        },
      },
    },
  );
  document.getElementById("radar-legend").innerHTML = judete
    .map(
      (j, i) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${LINE_COLORS[i % 10]}"></div>${j}</div>`,
    )
    .join("");
}

// TABLE

function renderTable() {
  const judete = f.judete;
  const sex = f.sex;
  const edu = f.edu;
  const mediu = f.mediu;
  const varsta_init = f.varsta;

  const varsta = varsta_init.map((i) => V_LABELS[i]);

  tableData = judete.map((j) => {
    const row = apiData.find((r) => r.nume === j);

    const rata = parseFloat(row.rata);
    const total = parseInt(row.total);
    const nivel = rata > 7 ? "Ridicat" : rata > 4 ? "Mediu" : "Scăzut";

    const extractValues = (filtersArray) => {
      const obj = {};
      filtersArray.forEach((key) => {
        obj[key] = parseInt(row[key]);
      });
      return obj;
    };

    return {
      j,
      rata,
      total,
      ...extractValues(sex),
      ...extractValues(mediu),
      ...extractValues(varsta),
      ...extractValues(edu),
      nivel,
    };
  });
  renderTableHead();
  renderTableBody();
}

function renderTableHead() {
  const varsta_init = f.varsta;
  const varsta = varsta_init.map((i) => V_LABELS[i]);

  const h = document.getElementById("table-head");

  const activeFilters = [...f.sex, ...f.mediu, ...varsta, ...f.edu];

  const dynamicHeaders = activeFilters
    .map((key) => {
      const label = COLUMN_LABELS[key];
      return `<th onclick="sortTable('${key}')" style="cursor:pointer">${label} ▾</th>`;
    })
    .join("");

  h.innerHTML = `
    <tr>
      <th onclick="sortTable('j')" style="cursor:pointer">Județ ▾</th>
      <th onclick="sortTable('rata')" style="cursor:pointer">Rată (%) ▾</th>
      <th onclick="sortTable('total')" style="cursor:pointer">Total ▾</th>
      
      ${dynamicHeaders}
      
      <th>Nivel ▾</th>
    </tr>
  `;
}

function renderTableBody() {
  const varsta_init = f.varsta;
  const varsta = varsta_init.map((i) => V_LABELS[i]);
  const activeFilters = [...f.sex, ...f.mediu, ...varsta, ...f.edu];

  const b = document.getElementById("table-body");
  b.innerHTML = tableData
    .map((r) => {
      const cls =
        r.nivel === "Ridicat"
          ? "badge-high"
          : r.nivel === "Mediu"
            ? "badge-mid"
            : "badge-low";

      const orderedDynamicKeys = [
        "masculin",
        "feminin",
        "urban",
        "rural",
        "varsta_25m",
        "varsta_25_29",
        "varsta_30_39",
        "varsta_40_49",
        "varsta_50_55",
        "varsta_55p",
        "fara_studii",
        "primar",
        "gimnazial",
        "liceal",
        "postliceal",
        "profesional_arte_meserii",
        "universitar",
      ];
      const filteredKeys = orderedDynamicKeys.filter((i) =>
        activeFilters.includes(i),
      );
      const dynamicCells = filteredKeys
        .map((key) => {
          const rawValue = r[key];

          let cleanValue = "-";
          if (rawValue !== null && rawValue !== undefined && !isNaN(rawValue)) {
            cleanValue = rawValue;
          }

          return `<td>${cleanValue}</td>`;
        })
        .join("");

      return `<tr>
      <td style="font-weight:600">${r.j}</td>
      <td style="font-family:'IBM Plex Mono',monospace;font-weight:600">${r.rata}%</td>
      <td>${r.total}</td>
      
      ${dynamicCells}
      <td><span class="badge ${cls}">${r.nivel}</span></td>
    </tr>`;
    })
    .join("");
}

let currentSortKey = "";
let isAscending = true;

function sortTable(key) {
  if (currentSortKey === key) {
    isAscending = !isAscending;
  } else {
    currentSortKey = key;
    isAscending = true;
  }

  tableData.sort((rowA, rowB) => {
    let valA = rowA[key];
    let valB = rowB[key];

    if (typeof valA === "string") {
      return isAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    return isAscending ? valA - valB : valB - valA;
  });
  renderTableBody();
}


// HARTA
const GEOJSON_NAME_MAP = {
  'Alba':'Alba','Arad':'Arad','Arges':'Argeș','Bacau':'Bacău',
  'Bihor':'Bihor','Bistrita-Nasaud':'Bistrița-Năsăud','Botosani':'Botoșani',
  'Braila':'Brăila','Brasov':'Brașov','Buzau':'Buzău','Calarasi':'Călărași', 'Caras-Severin':'Caraș-Severin',
  'Cluj':'Cluj','Constanta':'Constanța','Covasna':'Covasna','Dambovita':'Dâmbovița', 'Dâmbovita':'Dâmbovița',
  'Dolj':'Dolj','Galati':'Galați','Giurgiu':'Giurgiu','Gorj':'Gorj',
  'Harghita':'Harghita','Hunedoara':'Hunedoara','Ialomita':'Ialomița',
  'Iasi':'Iași','Ilfov':'Ilfov','Maramures':'Maramureș','Mehedinti':'Mehedinți',
  'Mures':'Mureș','Neamt':'Neamț','Olt':'Olt','Prahova':'Prahova',
  'Satu Mare':'Satu Mare','Salaj':'Sălaj','Sibiu':'Sibiu','Suceava':'Suceava',
  'Teleorman':'Teleorman','Timis':'Timiș','Tulcea':'Tulcea','Vaslui':'Vaslui',
  'Valcea':'Vâlcea','Vrancea':'Vrancea','Municipiul Bucuresti':'București',
  'Bucharest':'București'
};

const GEOJSON_URL = "./harta_romania.json";

function updateMapCriteriuOptions() {
    const selectEl = document.getElementById('map-criteriu');
    if (!selectEl) return;
    const valoarePrecedenta = selectEl.value;

    const optiuniActive = [
        "rata",
        "total",
        ...f.mediu,
        ...f.sex,
        ...f.varsta.map(v => V_LABELS[v]),
        ...f.edu
    ];

    selectEl.innerHTML = '';

    optiuniActive.forEach(cod => {

        const textAfisat = COLUMN_LABELS[cod] || cod; 

        const opt = document.createElement('option');
        opt.value = cod;
        opt.textContent = textAfisat;

        if (cod === valoarePrecedenta) {
            opt.selected = true;
        }

        selectEl.appendChild(opt);
    });
}


async function loadMap() {
  const loadingEl = document.getElementById("map-loading");
  if (loadingEl) loadingEl.style.display = "flex";

  let geoData = null;
  try {
    const r = await fetch(GEOJSON_URL, { signal: AbortSignal.timeout(8000) });
    if (r.ok) geoData = await r.json();
  } catch {}

  if (!geoData) throw new Error("GeoJSON indisponibil");

  roGeoJson = geoData;

  if (loadingEl) loadingEl.style.display = "none";
  await renderMap();
}

async function renderMap() {
  const crit = document.getElementById("map-criteriu").value;

  mapApiData = {};
  apiData.forEach((r) => {
    mapApiData[r.nume] = parseFloat(r[crit]);
  });

  renderChoroplethD3(crit);
}

function renderChoroplethD3(crit) {
  const container = document.getElementById("map-container");
  const svgEl = document.getElementById("map-svg");
  svgEl.innerHTML = "";

  const W = container.clientWidth || 700;
  const H = Math.max(460, W * 0.65);
  svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const vals = Object.values(mapApiData);
  const vmin = Math.min(...vals);
  const vmax = Math.max(...vals);
  const color = d3.scaleSequential(d3.interpolateRdYlBu).domain([vmax, vmin]);

  const projection = d3.geoMercator().fitSize([W, H], roGeoJson);
  const pathGen = d3.geoPath().projection(projection);
  const tooltip = document.getElementById("global-tooltip");

  const getName = (feat) => {
    const p = feat.properties;
    const raw = p.NAME_1 || p.name || p.JUDETE || p.judet || p.NAME || "";
    return GEOJSON_NAME_MAP[raw] || raw;
  };

  const fragment = document.createDocumentFragment();

  roGeoJson.features.forEach((feat) => {
    const name = getName(feat);
    const val = mapApiData[name] ?? 0;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathGen(feat) || "");
    path.setAttribute("fill", val > 0 ? color(val) : "#2a3347");
    path.setAttribute("stroke", "#0d1117");
    path.setAttribute("stroke-width", "0.6");
    path.setAttribute("class", "county-path");
    path.setAttribute("data-judet", name);
    path.setAttribute("data-val", val);
    path.style.transition = "fill 0.2s ease";

    path.addEventListener("mouseenter", (e) => {
      tooltip.style.display = "block";
      const label = COLUMN_LABELS[crit];
      const suffix = crit === 'rata' ? '%' : '';
      const formattedVal = suffix === '' ? Math.round(val).toLocaleString('ro-RO') : val.toFixed(2) + '%';
      tooltip.innerHTML = `
        <strong>${name}</strong>
        <div class="tip-row"><span>${label}:</span><span class="tip-val">${formattedVal}</span></div>
      `;
    });
    path.addEventListener("mousemove", (e) => {
      tooltip.style.left = e.clientX + 14 + "px";
      tooltip.style.top = e.clientY - 10 + "px";
    });
    path.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
    fragment.appendChild(path);
  });

  roGeoJson.features.forEach((feat) => {
    const name = getName(feat);

    const centroid = pathGen.centroid(feat);
    if (!centroid || isNaN(centroid[0])) return;
    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", centroid[0]);
    txt.setAttribute("y", centroid[1]);
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("dominant-baseline", "middle");
    txt.setAttribute("font-size", "8");
    txt.setAttribute("fill", "#000000");
    txt.setAttribute("pointer-events", "none");
    txt.setAttribute("font-family", "Sora, sans-serif");
    txt.textContent = name;
    fragment.appendChild(txt);
  });

  svgEl.appendChild(fragment);

  updateMapLegend(color, vmin, vmax, crit);
}

function updateMapLegend(colorFn, vmin, vmax, crit) {
  const scale = document.getElementById("map-scale");
  scale.innerHTML = "";


  const titleEl = document.getElementById("map-legend-title");
  const critEl = document.getElementById("map-criteriu");
  
  if (titleEl && critEl) {
    const selectedText = critEl.options[critEl.selectedIndex].text;
    titleEl.textContent = selectedText;
  }

  for (let i = 0; i < 18; i++) {
    const t = i / 17,
      v = vmin + t * (vmax - vmin);
    const sp = document.createElement("span");
    sp.style.cssText = `display:inline-block;width:${100 / 18}%;height:12px;background:${colorFn(v)}`;
    scale.appendChild(sp);
  }
  const suffix = crit === 'rata' ? '%' : '';
  const minText = suffix === '' ? Math.round(vmin).toLocaleString('ro-RO') : vmin.toFixed(1) + "%";
  const maxText = suffix === '' ? Math.round(vmax).toLocaleString('ro-RO') : vmax.toFixed(1) + "%";

  document.getElementById("ml-min").textContent = minText;
  document.getElementById("ml-max").textContent = maxText;
}

// TABS
function switchTab(tab, el) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("panel-" + tab).classList.add("active");
  // if (tab === 'map') setTimeout(renderMap, 80);
}

function destroyChart(id) {
  if (activeCharts[id]) {
    activeCharts[id].destroy();
    delete activeCharts[id];
  }
}

// EXPORT CSV

function exportCSV() {

  const judete = f.judete;
  const sex = f.sex;
  const edu = f.edu;
  const mediu = f.mediu;
  const varsta_init = f.varsta;
  const varsta = varsta_init.map((i) => V_LABELS[i]);

  const tableHead = [
    'Judet', 'Rata', 'Total',
    ...sex.map(s => COLUMN_LABELS[s]),
    ...mediu.map(m => COLUMN_LABELS[m]),
    ...varsta.map(v => COLUMN_LABELS[v]),
    ...edu.map(e => COLUMN_LABELS[e]), 
    'Nivel'
  ];


  tableData = judete.map((j) => {
    const row = apiData.find((r) => r.nume === j);

    const rata = parseFloat(row.rata);
    const total = parseInt(row.total);
    const nivel = rata > 7 ? "Ridicat" : rata > 4 ? "Mediu" : "Scăzut";

    const extractValues = (filtersArray) => {
      const obj = [];
      filtersArray.forEach((key) => {
        obj.push( parseInt(row[key]));
      });
      return obj;
    };

    return [
      j,
      rata,
      total,
      ...extractValues(sex),
      ...extractValues(mediu),
      ...extractValues(varsta),
      ...extractValues(edu),
      nivel,
    ];
  });
  
  let csv = tableHead.join(",");
  csv = csv + "\n" +tableData.map((r) => r.join(",")).join("\n");
  downloadBlob(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    "somaj_romania.csv",
  );
}

// EXPORT SVG

function exportSVG() {
  const panels = ["bar", "line", "radar", "map", "table"];
  for (const p of panels) {
    const el = document.getElementById("panel-" + p);
    if (el && el.classList.contains("active")) {
      if (p === "map") {
        exportMapSVG();
        return;
      }
      const canvas = el.querySelector("canvas");
      if (canvas) {
        exportChartSVG(canvas.id, p);
        return;
      }
    }
  }
}

function exportChartSVG(canvasId, name) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const imgData = canvas.toDataURL("image/png");
  const w = canvas.width,
    h = canvas.height;
  const svgContent = `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#0d1117"/><image href="${imgData}" width="${w}" height="${h}"/></svg>`;
  downloadBlob(
    new Blob([svgContent], { type: "image/svg+xml" }),
    name + ".svg",
  );
}

function exportMapSVG() {
  const svg = document.getElementById("map-svg");
  let svgStr =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    new XMLSerializer().serializeToString(svg);
  downloadBlob(
    new Blob([svgStr], { type: "image/svg+xml" }),
    "harta_somaj_romania.svg",
  );
}

// ──────────────────────────────────────────────────────────────
// EXPORT PDF
// ──────────────────────────────────────────────────────────────
const PDF_LABELS = {
  'bar_judete': "Rata somaj - bar chart",
  'evolutie_timp' : "Evolutie rata somaj",
  'mediu_evolutie': "Evolutie numar someri dupa mediu de rezidenta",
  'sex_evolutie': "Evolutie numar someri dupa sex",
  'varsta_evolutie': "Evolutie numar someri dupa varsta",
  'educatie_evolutie': "Evolutie numar someri dupa nivelul de educatie",
  'radar_comparare': "Radar comparare multi criteriala"
}

function exportPDF() {
  exportChartPDF(null, "raport_somaj");
}

function exportChartPDF(canvasId, name) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, 297, 210, "F");
  doc.setTextColor(230, 237, 243);
  doc.setFontSize(20);
  doc.text("Somaj Romania", 14, 18, { flags: "no-unicode" });

  doc.setFontSize(14);
  doc.text(PDF_LABELS[name], 14, 25, { flags: "no-unicode" });

  const f = getFilters();
  const years = filteredYears(f);
  doc.setFontSize(10);
  doc.text(
    `Perioada: ${years[0]} - ${years[years.length - 1]}  |  Generat: ${new Date().toLocaleDateString("ro-RO")}`,
    14,
    32,
    { flags: "no-unicode" }
  );
  const canvas = canvasId
    ? document.getElementById(canvasId)
    : document.querySelector(".panel.active canvas");
  if (canvas) {
    try {
      if(name === "radar_comparare"){
        doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 30, 320, 180);
      }else{
        doc.addImage(canvas.toDataURL("image/png"), "PNG", 8, 50, 280, 110);
      }
    } catch (e) {}
  }
  doc.save(name + ".pdf");
}


function exportTablePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, 297, 210, "F");
  doc.setTextColor(230, 237, 243);
  doc.setFontSize(14);
  doc.text("Tabel date - Somaj Romania", 14, 16);

  const judete = f.judete;
  const sex = f.sex;
  const edu = f.edu;
  const mediu = f.mediu;
  const varsta_init = f.varsta;

  const varsta = varsta_init.map((i) => V_LABELS[i]);

  const headers = [
    "Judet",
    "Rata",
    "Total",
    ...sex.map(s => COLUMN_LABELS_TABLE[s]),
    ...mediu.map(m => COLUMN_LABELS_TABLE[m]),
    ...varsta.map(v => COLUMN_LABELS_TABLE[v]),
    ...edu.map(e => COLUMN_LABELS_TABLE[e]),
  ];
  let x = 10,
    y = 28;
  doc.setFontSize(9);
  doc.setTextColor(139, 148, 158);
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    if(i == 0){
      x+=6;
    }
    x += 14;
  });
  doc.setDrawColor(48, 54, 61);
  doc.line(10, 30, 283, 30);
  y = 37;
  doc.setTextColor(230, 237, 243);
  doc.setFontSize(8);

  const activeFilters = [...f.sex, ...f.mediu, ...varsta, ...f.edu];
  const orderedDynamicKeys = [
        "masculin",
        "feminin",
        "urban",
        "rural",
        "varsta_25m",
        "varsta_25_29",
        "varsta_30_39",
        "varsta_40_49",
        "varsta_50_55",
        "varsta_55p",
        "fara_studii",
        "primar",
        "gimnazial",
        "liceal",
        "postliceal",
        "profesional_arte_meserii",
        "universitar",
      ];
    const filteredKeys = orderedDynamicKeys.filter((i) =>
      activeFilters.includes(i),
    );

    const curataDiacritice = text => {
      return text
        .replace(/[Șș]/g, 's')
        .replace(/[Țț]/g, 't')
        .replace(/[ĂăÂâ]/g, 'a')
        .replace(/[Îî]/g, 'i');
    };

  tableData.forEach((r) => {
    if (y > 195) {
      doc.addPage();
      doc.setFillColor(13, 17, 23);
      doc.rect(0, 0, 297, 210, "F");
      y = 20;
    }
    x = 10;

    const row = filteredKeys.map((key) => r[key]);

    doc.text(curataDiacritice(r.j), x, y);
    x+= 20;
    doc.text(String(r.rata)+'%', x, y);
    x+= 14;
    doc.text(String(r.total), x, y);
    x+= 14;

    row.forEach((v, i) => {
      doc.text(String(v), x, y);
      x += 14;
    });
    doc.setTextColor(230, 237, 243);
    y += 7;
  });
  doc.save("tabel_somaj_judete.pdf");
}


function exportMapPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, 297, 210, "F");
  doc.setTextColor(230, 237, 243);
  doc.setFontSize(14);
  const crit =
    document.getElementById("map-criteriu").options[
      document.getElementById("map-criteriu").selectedIndex
    ].text;
  doc.text(`Harta Somaj Romania - ${crit} ( ${years[0]} - ${years[years.length-1]})`, 14, 14);
  const svgEl = document.getElementById("map-svg");
  const svgStr = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 680;
    c.height = 460;
    c.getContext("2d").drawImage(img, 0, 0);
    doc.addImage(c.toDataURL("image/png"), "PNG", 14, 24, 269, 170);
    doc.save("harta_somaj_romania.pdf");
    URL.revokeObjectURL(url);
  };
  img.onerror = () => doc.save("harta_somaj_romania.pdf");
  img.src = url;
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

window.addEventListener("DOMContentLoaded", init);
