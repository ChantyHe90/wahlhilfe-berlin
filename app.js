// Szenario-Verschiebung fuers Durchrechnen (nicht zu verwechseln mit der
// Umfrage-Verschiebung/"Uniform Swing" fuer den "Aktuell"-Modus, siehe
// buildCurrentBaseline in engine.js). Simuliert NICHT eine einzelne Stimme,
// sondern die Frage "was waere, wenn Partei X berlinweit X Prozentpunkte
// staerker abschneidet". Fest verdrahtet, kein Regler, damit die App einfach
// bleibt.
const SWING_PCT = 3;

// Umfrage-Anteile auf die 6 getrackten Parteien normieren (dawum-Rohwerte
// summieren wegen BSW/Sonstige nicht auf 100), damit sie mit den
// 2023-Landesanteilen (die nur diese 6 Parteien kennen) vergleichbar sind.
const pollShareSum = Object.values(CURRENT_POLL.shares).reduce((a, b) => a + b, 0);
const normalizedPollShares = Object.fromEntries(
  Object.entries(CURRENT_POLL.shares).map(([party, pct]) => [party, pct / pollShareSum])
);

const CURRENT_CONSTITUENCIES = buildCurrentBaseline(CONSTITUENCIES, normalizedPollShares);

const DATASETS = { "2023": CONSTITUENCIES, aktuell: CURRENT_CONSTITUENCIES };
let basisMode = "2023";

function partyName(id) {
  return PARTIES.find((p) => p.id === id)?.name || id;
}
function partyColor(id) {
  return PARTIES.find((p) => p.id === id)?.color || "#999";
}

function findBezirkeByPlz(plz) {
  return BEZIRKE.filter((b) => b.plz.includes(plz));
}

function renderBars(container, votesObj, options = {}) {
  container.innerHTML = "";
  const total = Object.values(votesObj).reduce((a, b) => a + b, 0) || 1;
  const entries = Object.entries(votesObj).sort((a, b) => b[1] - a[1]);

  for (const [party, value] of entries) {
    const pct = (value / total) * 100;
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = partyName(party);

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = Math.max(pct, 1) + "%";
    fill.style.background = partyColor(party);
    track.appendChild(fill);

    const val = document.createElement("span");
    val.className = "bar-value";
    val.textContent = options.seats
      ? `${value} ${value === 1 ? "Sitz" : "Sitze"}`
      : `${pct.toFixed(1)} %`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(val);
    container.appendChild(row);
  }
}

function fillPartySelect(select) {
  select.innerHTML = "";
  for (const p of PARTIES) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  }
}

let currentConstituency = null;
let currentConstituencyId = null;

const plzInput = document.getElementById("plzInput");
const plzButton = document.getElementById("plzButton");
const plzHint = document.getElementById("plzHint");
const wahlkreisRow = document.getElementById("wahlkreisRow");
const wahlkreisSelect = document.getElementById("wahlkreisSelect");
const resultSection = document.getElementById("resultSection");
const constituencyName = document.getElementById("constituencyName");
const firstVoteSelect = document.getElementById("firstVoteSelect");
const secondVoteSelect = document.getElementById("secondVoteSelect");
const simulateButton = document.getElementById("simulateButton");
const simSection = document.getElementById("simSection");
const basis2023Button = document.getElementById("basis2023Button");
const basisAktuellButton = document.getElementById("basisAktuellButton");
const basisInfo = document.getElementById("basisInfo");
const simulateButtonLabel = document.getElementById("simulateButtonLabel");
const firstVoteLabel = document.getElementById("firstVoteLabel");
const secondVoteLabel = document.getElementById("secondVoteLabel");
const baselineSeatsLabel = document.getElementById("baselineSeatsLabel");

fillPartySelect(firstVoteSelect);
fillPartySelect(secondVoteSelect);

plzButton.addEventListener("click", () => {
  const plz = plzInput.value.trim();
  resultSection.hidden = true;
  simSection.hidden = true;

  const bezirke = findBezirkeByPlz(plz);

  if (bezirke.length === 0) {
    wahlkreisRow.hidden = true;
    plzHint.textContent = "Keine Berliner PLZ erkannt. Probier z.B. 10115, 12043, 13403.";
    return;
  }

  const bezirkIds = new Set(bezirke.map((b) => b.id));
  const matches = CONSTITUENCIES.filter((c) => bezirkIds.has(c.bezirkId));

  wahlkreisSelect.innerHTML = "";
  for (const bezirk of bezirke) {
    const group = document.createElement("optgroup");
    group.label = bezirk.name;
    for (const c of matches.filter((m) => m.bezirkId === bezirk.id)) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      group.appendChild(opt);
    }
    wahlkreisSelect.appendChild(group);
  }

  plzHint.textContent =
    bezirke.length > 1
      ? `Deine PLZ liegt an der Grenze mehrerer Bezirke (${bezirke.map((b) => b.name).join(", ")}). Wähle deinen Wahlkreis.`
      : "Wähle deinen Wahlkreis.";
  wahlkreisRow.hidden = false;
  showConstituency(wahlkreisSelect.value);
});

wahlkreisSelect.addEventListener("change", () => {
  showConstituency(wahlkreisSelect.value);
});

function pollShareList() {
  return Object.entries(CURRENT_POLL.shares)
    .sort((a, b) => b[1] - a[1])
    .map(([party, pct]) => `${partyName(party)} ${pct.toFixed(1)} %`)
    .join(" · ");
}

function updateBasisLabels() {
  const isAktuell = basisMode === "aktuell";
  basis2023Button.classList.toggle("active", !isAktuell);
  basisAktuellButton.classList.toggle("active", isAktuell);

  basisInfo.innerHTML = isAktuell
    ? `<strong>Woher die Zahlen kommen:</strong> Wahlkreis-Verteilung wie 2023, aber landesweit auf den aktuellen
       Wahltrend verschoben (Umfrage-Verschiebung, Fachbegriff "Uniform Swing" &mdash; <em>nicht</em> dasselbe wie
       die Szenario-Verschiebung weiter unten). Quelle:
       <a href="https://dawum.de/Berlin/" target="_blank" rel="noopener">${CURRENT_POLL.source}</a>,
       Stand ${CURRENT_POLL.date}. Keine echte Wahlkreis-Umfrage, nur eine berlinweite hochgerechnet.
       <div class="poll-values">Umfragewerte: ${pollShareList()}</div>`
    : `<strong>Woher die Zahlen kommen:</strong> Amtliches Endergebnis der Wiederholungswahl vom 12.02.2023
       (Landeswahlleiterin Berlin, wahlen-berlin.de).`;

  firstVoteLabel.textContent = isAktuell ? "Erststimme (Modell, Stand aktuell)" : "Erststimme 2023 (Direktkandidat:in)";
  secondVoteLabel.textContent = isAktuell ? "Zweitstimme (Modell, Stand aktuell)" : "Zweitstimme 2023 (Partei)";
  baselineSeatsLabel.textContent = isAktuell ? "Basis (aktuell)" : "Basis (2023)";
}

function showConstituency(constituencyId) {
  currentConstituencyId = constituencyId;
  currentConstituency = DATASETS[basisMode].find((c) => c.id === constituencyId);
  if (!currentConstituency) return;

  simSection.hidden = true;
  constituencyName.textContent = currentConstituency.name;
  updateBasisLabels();
  renderBars(document.getElementById("firstVoteBaseline"), currentConstituency.firstVotes);
  renderBars(document.getElementById("secondVoteBaseline"), currentConstituency.secondVotes);
  resultSection.hidden = false;
}

basis2023Button.addEventListener("click", () => {
  basisMode = "2023";
  if (currentConstituencyId) showConstituency(currentConstituencyId);
});
basisAktuellButton.addEventListener("click", () => {
  basisMode = "aktuell";
  if (currentConstituencyId) showConstituency(currentConstituencyId);
});

simulateButton.addEventListener("click", () => {
  if (!currentConstituency || simulateButton.disabled) return;

  simulateButton.disabled = true;
  simulateButton.classList.add("is-loading");
  simulateButtonLabel.textContent = "Simuliere …";
  simSection.classList.remove("fade-in");

  setTimeout(runSimulation, 400);
});

function runSimulation() {
  const params = {
    constituencyId: currentConstituency.id,
    firstVoteParty: firstVoteSelect.value,
    secondVoteParty: secondVoteSelect.value,
    swingPct: SWING_PCT,
  };

  const { baseline, scenario } = simulate(DATASETS[basisMode], params);

  renderBars(document.getElementById("baselineSeats"), baseline.seats, { seats: true });
  renderBars(document.getElementById("scenarioSeats"), scenario.seats, { seats: true });

  const tbody = document.querySelector("#deltaTable tbody");
  tbody.innerHTML = "";
  const allParties = new Set([...Object.keys(baseline.seats), ...Object.keys(scenario.seats)]);
  for (const party of allParties) {
    const b = baseline.seats[party] || 0;
    const s = scenario.seats[party] || 0;
    const delta = s - b;
    const tr = document.createElement("tr");
    if (party === "afd") tr.className = "afd-row";
    tr.innerHTML = `
      <td>${partyName(party)}</td>
      <td>${b}</td>
      <td>${s}</td>
      <td class="${delta > 0 ? "pos" : delta < 0 ? "neg" : ""}">${delta > 0 ? "+" : ""}${delta}</td>
    `;
    tbody.appendChild(tr);
  }

  const afdBefore = baseline.seats.afd || 0;
  const afdAfter = scenario.seats.afd || 0;
  const afdDelta = afdAfter - afdBefore;
  document.getElementById("afdCallout").innerHTML =
    `<strong>AfD im Szenario:</strong> ${afdBefore} &rarr; ${afdAfter} Sitze (${afdDelta > 0 ? "+" : ""}${afdDelta}). ` +
    `Die simulierte Zweitstimmen-Verschiebung wirkt auf ganz Berlin, die Erststimmen-Verschiebung nur auf ` +
    `1 Direktmandat in ${currentConstituency.name}.`;

  renderQuotientExplain(baseline, scenario);

  simSection.hidden = false;
  // reflow erzwingen, damit die fade-in-Animation bei jedem Klick neu abspielt
  void simSection.offsetWidth;
  simSection.classList.add("fade-in");
  simSection.scrollIntoView({ behavior: "smooth", block: "start" });

  simulateButton.disabled = false;
  simulateButton.classList.remove("is-loading");
  simulateButtonLabel.textContent = "Szenario durchrechnen";
}

function formatQuotient(q) {
  return q === null || q === undefined ? "–" : Math.round(q).toLocaleString("de-DE");
}

// Erklaert im Erklaermodus, warum genau diese Parteien Sitze gewonnen/
// verloren haben: zeigt fuer jede veraenderte Partei ihren Sainte-Laguë-
// Quotienten fuer den naechsten Sitz vs. die Schwelle (cutoffQuotient),
// jeweils in Basis und Szenario.
function renderQuotientExplain(baseline, scenario) {
  const box = document.getElementById("quotientExplain");
  const allParties = new Set([...Object.keys(baseline.seats), ...Object.keys(scenario.seats)]);
  const changed = [...allParties].filter((p) => (baseline.seats[p] || 0) !== (scenario.seats[p] || 0));

  if (changed.length === 0) {
    box.innerHTML = `<strong>Warum ändert sich hier nichts?</strong> Keine Partei ist bei dieser Verschiebung nah
      genug an der Schwelle (dem niedrigsten Quotienten, der noch einen Sitz bekommt), um sie zu kippen.`;
    return;
  }

  const rows = changed
    .map((p) => {
      const b = baseline.quotients[p];
      const s = scenario.quotients[p];
      const delta = (scenario.seats[p] || 0) - (baseline.seats[p] || 0);

      if (!b || !s) {
        const dropped = !s;
        return `<li><strong>${partyName(p)}</strong> (${delta > 0 ? "+" : ""}${delta} Sitze): fällt ${dropped ? "im Szenario" : "in der Basis"}
          unter die 5%-Hürde &mdash; ${dropped ? "verliert" : "gewinnt"} alle Sitze auf einen Schlag, kein knapper Quotient nötig.</li>`;
      }

      return `<li><strong>${partyName(p)}</strong> (${delta > 0 ? "+" : ""}${delta} Sitze): Quotient für den nächsten
        Sitz lag bei ${formatQuotient(b.nextQuotient)} (Basis, Schwelle war ${formatQuotient(baseline.cutoffQuotient)}),
        liegt jetzt bei ${formatQuotient(s.nextQuotient)} (Szenario, Schwelle ist ${formatQuotient(scenario.cutoffQuotient)}).</li>`;
    })
    .join("");

  box.innerHTML = `<strong>Warum ändern sich genau diese Parteien?</strong> Sie lagen am nächsten an der Schwelle
    (dem niedrigsten Quotienten, der noch einen Sitz bekam) &mdash; kleine Verschiebung, aber genau ihr Sitz kippt:
    <ul>${rows}</ul>`;
}

const explainToggle = document.getElementById("explainToggle");
explainToggle.addEventListener("click", () => {
  const isActive = document.body.classList.toggle("explain-mode");
  explainToggle.setAttribute("aria-pressed", String(isActive));
});

const architectureButton = document.getElementById("architectureButton");
const architectureSection = document.getElementById("architectureSection");
architectureButton.addEventListener("click", () => {
  architectureSection.hidden = !architectureSection.hidden;
  if (!architectureSection.hidden) {
    architectureSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
