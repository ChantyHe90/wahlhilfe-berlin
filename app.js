// Verbindet data.js (Fakten) + engine.js (Berechnung) mit der Seite.
// Default-Flow: PLZ -> Erst-/Zweitstimmen-Empfehlung -> AfD-Sitzeffekt (Hero) -> CTA.
// Nerd-Modus (progressive disclosure, siehe #nerdSection): einzelne <details>,
// jede beantwortet genau eine Frage, keine globale An/Aus-Ansicht mehr.
// Reine Rendering-Datei - alle Berechnungen kommen unveraendert aus engine.js.

let scenarioSwingPct = 3;
const pollShareSum = Object.values(CURRENT_POLL.shares).reduce((a, b) => a + b, 0);
const normalizedPollShares = Object.fromEntries(
  Object.entries(CURRENT_POLL.shares).map(([party, pct]) => [party, pct / pollShareSum])
);

const CURRENT_CONSTITUENCIES = buildCurrentBaseline(CONSTITUENCIES, normalizedPollShares);
const DATASETS = { "2023": CONSTITUENCIES, aktuell: CURRENT_CONSTITUENCIES };
let basisMode = "aktuell";

// Parteien ohne echte 2023-Wahlkreisdaten (aktuell: BSW). Ihr Zweitstimmen-Wert
// je Wahlkreis in CURRENT_CONSTITUENCIES ist rein aus dem Landes-Umfragewert
// konstruiert (siehe engine.js: buildCurrentBaseline), ohne jede lokale
// Grundlage - anders als bei den anderen Parteien, die zumindest eine echte
// 2023-Lokalverteilung als Anker haben. Wird deshalb aus der
// Wahlkreis-Balkengrafik ausgeblendet und stattdessen als Landeswert
// gesondert angezeigt (siehe renderNoLocalDataNote).
const NO_LOCAL_DATA_PARTIES = new Set(["bsw"]);

// "Bogen"-Signaturelement: markiert ueberall den Wechsel alt->neu (Hero-Zahl
// in index.html, hier als Mini-Variante fuer die Delta-Chips). Einfacher
// Pfeil statt SVG - die Kurve verzog sich bei kleinen Groessen.
const BOGEN_MINI_SVG = '<span class="bogen-mini" aria-hidden="true">&rarr;</span>';

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function partyName(id) {
  return PARTIES.find((p) => p.id === id)?.name || id;
}
function partyColor(id) {
  return PARTIES.find((p) => p.id === id)?.color || "#999";
}
function formatVotes(v) {
  return Math.round(v).toLocaleString("de-DE");
}
function formatRemainderPct(gapPct) {
  return gapPct === null || gapPct === undefined ? "–" : `${gapPct >= 0 ? "+" : ""}${gapPct.toFixed(1)} Pp.`;
}
function withoutNoLocalDataParties(votesObj) {
  return Object.fromEntries(Object.entries(votesObj).filter(([p]) => !NO_LOCAL_DATA_PARTIES.has(p)));
}

// Zahl zaehlt von ihrem aktuellen Anzeigewert weich zum neuen Wert hoch/runter
// (Microinteraction: Sitzzahl reagiert direkt auf Slider/Szenario-Aenderung).
// Respektiert prefers-reduced-motion (dann harter Sprung, kein Reflow-Risiko).
function animateNumber(el, to) {
  const from = Number(el.dataset.value ?? el.textContent) || 0;
  el.dataset.value = to;
  if (prefersReducedMotion() || from === to) {
    el.textContent = to;
    return;
  }
  const duration = 300;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = to;
  }
  requestAnimationFrame(step);
}

// Screen weich einblenden statt hart erscheinen zu lassen (kurz, respektiert
// prefers-reduced-motion ueber die globale CSS-Regel in style.css).
function revealScreen(el) {
  el.hidden = false;
  el.classList.remove("fade-in");
  void el.offsetWidth;
  el.classList.add("fade-in");
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

function fillPartySelect(select, excludeIds) {
  select.innerHTML = "";
  for (const p of PARTIES) {
    if (excludeIds.has(p.id)) continue;
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

const firstRecoParty = document.getElementById("firstRecoParty");
const firstRecoText = document.getElementById("firstRecoText");
const secondRecoParty = document.getElementById("secondRecoParty");
const secondRecoText = document.getElementById("secondRecoText");

const effectSection = document.getElementById("effectSection");
const effectFrom = document.getElementById("effectFrom");
const effectTo = document.getElementById("effectTo");
const effectDelta = document.getElementById("effectDelta");
const effectNote = document.getElementById("effectNote");
const compareFillBaseline = document.getElementById("compareFillBaseline");
const compareFillScenario = document.getElementById("compareFillScenario");

const ctaSection = document.getElementById("ctaSection");
const nerdSection = document.getElementById("nerdSection");
const nerdToggle = document.getElementById("nerdToggle");
const nerdFirstPartyName = document.getElementById("nerdFirstPartyName");
const nerdSecondPartyName = document.getElementById("nerdSecondPartyName");

const firstVoteSelect = document.getElementById("firstVoteSelect");
const secondVoteSelect = document.getElementById("secondVoteSelect");
const simulateButton = document.getElementById("simulateButton");
const nerdSimResult = document.getElementById("nerdSimResult");
const basis2023Button = document.getElementById("basis2023Button");
const basisAktuellButton = document.getElementById("basisAktuellButton");
const basisInfo = document.getElementById("basisInfo");
const simulateButtonLabel = document.getElementById("simulateButtonLabel");
const firstVoteLabel = document.getElementById("firstVoteLabel");
const secondVoteLabel = document.getElementById("secondVoteLabel");
const baselineSeatsLabel = document.getElementById("baselineSeatsLabel");
const marginExplain = document.getElementById("marginExplain");
const noLocalDataNote = document.getElementById("noLocalDataNote");
const swingSlider = document.getElementById("swingSlider");
const swingValue = document.getElementById("swingValue");
const presetButtons = document.querySelectorAll(".preset-button");
const tableToggle = document.getElementById("tableToggle");
const deltaTable = document.getElementById("deltaTable");
const deltaChips = document.getElementById("deltaChips");

// Jedes Nerd-Accordion bekommt beim Oeffnen kurz eine Fade-in-Klasse (siehe
// style.css: [data-just-opened]) - Microinteraction "Panel klappt weich auf",
// ohne die Hoehe des nativen <details> selbst zu animieren (robust, kein
// Layout-Zittern). Schliessen bleibt bewusst instant (schnelles Gefuehl).
document.querySelectorAll(".nerd-item").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (details.open) {
      details.setAttribute("data-just-opened", "");
      setTimeout(() => details.removeAttribute("data-just-opened"), 250);
    }
  });
});

// Erststimme testweise: BSW ausgeschlossen - keine echten Wahlkreis-
// Erststimmendaten fuer diese Partei (siehe NO_LOCAL_DATA_PARTIES), eine
// testweise Erststimme fuer sie waere komplett erfunden.
fillPartySelect(firstVoteSelect, new Set(["afd", ...NO_LOCAL_DATA_PARTIES]));
fillPartySelect(secondVoteSelect, new Set(["afd"]));

plzButton.addEventListener("click", () => {
  const plz = plzInput.value.trim();
  resultSection.hidden = true;
  effectSection.hidden = true;
  ctaSection.hidden = true;
  nerdSection.hidden = true;

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
    .map(([party, pct]) => `${partyName(party)} ${pct.toFixed(1)} %`)
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

// Zeigt Parteien aus NO_LOCAL_DATA_PARTIES als Landeswert an, statt sie in
// die Wahlkreis-Balkengrafik zu erfinden (siehe NO_LOCAL_DATA_PARTIES).
function renderNoLocalDataNote() {
  if (basisMode !== "aktuell") {
    noLocalDataNote.hidden = true;
    return;
  }
  const parts = [...NO_LOCAL_DATA_PARTIES]
    .filter((p) => p in CURRENT_POLL.shares)
    .map((p) => `${partyName(p)} ${CURRENT_POLL.shares[p].toFixed(1)} %`);
  if (parts.length === 0) {
    noLocalDataNote.hidden = true;
    return;
  }
  noLocalDataNote.hidden = false;
  noLocalDataNote.textContent =
    `Nicht in diesem Wahlkreis-Balken, nur als Berlin-Landeswert (keine 2023-Wahlkreisdaten): ${parts.join(" · ")}.`;
}

function showConstituency(constituencyId) {
  currentConstituencyId = constituencyId;
  currentConstituency = DATASETS[basisMode].find((c) => c.id === constituencyId);
  if (!currentConstituency) return;

  nerdSimResult.hidden = true;
  constituencyName.textContent = currentConstituency.name;
  updateBasisLabels();
  renderBars(document.getElementById("firstVoteBaseline"), currentConstituency.firstVotes);
  renderBars(document.getElementById("secondVoteBaseline"), withoutNoLocalDataParties(currentConstituency.secondVotes));
  renderNoLocalDataNote();

  computeAndRenderRecommendation();

  revealScreen(resultSection);
  revealScreen(effectSection);
  revealScreen(ctaSection);
}

function renderFirstVoteRecommendation(firstReco) {
  if (!firstReco.recommendedParty) {
    firstRecoParty.textContent = "–";
    firstRecoText.textContent = "Für diesen Wahlkreis liegen keine ausreichenden Daten vor.";
    nerdFirstPartyName.textContent = "diese";
    return;
  }

  firstRecoParty.textContent = partyName(firstReco.recommendedParty);
  nerdFirstPartyName.textContent = partyName(firstReco.recommendedParty);

  if (firstReco.avoidLeads) {
    firstRecoText.textContent =
      `AfD liegt hier mit ${formatVotes(firstReco.avoidVotes)} Stimmen vorn. ` +
      `${partyName(firstReco.recommendedParty)} ist mit ${formatVotes(firstReco.recommendedVotes)} Stimmen die ` +
      `stärkste Alternative — strategisch sinnvollste Wahl, um das Direktmandat zu verhindern.`;
  } else if (firstReco.avoidCompetitive) {
    firstRecoText.textContent =
      `${partyName(firstReco.recommendedParty)} liegt hier vorn, AfD auf Platz 2. Mit deiner Erststimme hilfst ` +
      `du, das so zu halten.`;
  } else {
    firstRecoText.textContent =
      `${partyName(firstReco.recommendedParty)} gewinnt hier voraussichtlich. AfD spielt in diesem Wahlkreis ` +
      `bei der Erststimme keine große Rolle — wähl nach deiner Überzeugung.`;
  }
}

function renderSecondVoteRecommendation(secondReco) {
  const baselineSeats = secondReco.baselineSeats;

  if (secondReco.bestDelta === 0) {
    secondRecoParty.textContent = "keine eindeutige Partei";
    nerdSecondPartyName.textContent = "diese";
    secondRecoText.textContent =
      `In unserem Modell verändert bei +${scenarioSwingPct} Prozentpunkten keine der getesteten Parteien allein ` +
      `die AfD-Sitzzahl. Die Zweitstimme bleibt trotzdem wichtig für die Sitzverteilung insgesamt — wähl nach ` +
      `deiner Überzeugung.`;
    effectNote.textContent = `Getestet: +${scenarioSwingPct} Prozentpunkte für jede Partei einzeln, AfD-Sitzzahl blieb jeweils gleich. Simulation auf Basis aktueller Umfragen.`;
    return null;
  }

  const chosen = secondReco.bestParties[0];
  const names = secondReco.bestParties.map((r) => partyName(r.party)).join(" oder ");
  secondRecoParty.textContent = names;
  nerdSecondPartyName.textContent = names;
  secondRecoText.textContent =
    `In unserem Modell schwächt eine Verschiebung hin zu ${names} die AfD-Sitzzahl am stärksten (kein ` +
    `ideologischer Automatismus — nur die Partei, die im Modell am nächsten an der nächsten Sitz-Schwelle lag).`;
  effectNote.textContent = "Simulation auf Basis aktueller Umfragen — keine Vorhersage, keine Wirkung deiner einzelnen Stimme.";
  return chosen;
}

// Hero-Moment: großer AfD-Sitzvergleich. baselineSeats/scenarioSeats sind
// absolute Sitzzahlen (nicht Prozent) - genau die Zahl, die User 1 in 2
// Sekunden verstehen soll.
function renderEffectHero(baselineSeats, scenarioSeats) {
  animateNumber(effectFrom, baselineSeats);
  animateNumber(effectTo, scenarioSeats);
  const delta = scenarioSeats - baselineSeats;
  effectDelta.textContent = delta === 0 ? "±0 Sitze" : `${delta > 0 ? "+" : ""}${delta} Sitze`;
  effectDelta.classList.toggle("neg", delta < 0);
  effectDelta.classList.toggle("pos", delta > 0);

  const maxSeats = Math.max(baselineSeats, scenarioSeats, 1);
  compareFillBaseline.style.width = `${(baselineSeats / maxSeats) * 100}%`;
  compareFillScenario.style.width = `${(scenarioSeats / maxSeats) * 100}%`;
}

// Hare-Niemeyer erlaubt keine "X Stimmen bis zum naechsten Sitz"-Prognose
// mehr (siehe engine.js: remainderGap-Kommentar) - nur noch, wie nah der
// Restanteil einer Partei am zuletzt vergebenen Restsitz lag, in
// Prozentpunkten Restanteil. Keine Stimmenzahl, bewusst.
function renderMarginExplain(baseline, chosenParty) {
  const afdGap = remainderGap(baseline, "afd");
  const parts = [];

  if (afdGap && afdGap.cutoff !== null) {
    parts.push(
      `<li><strong>AfD</strong> lag beim letzten vergebenen Restsitz ${formatRemainderPct(afdGap.gapPct)} ` +
        `(Restanteil) von der Schwelle entfernt &mdash; keine Stimmenprognose, nur ein Naeherungswert dafuer, wie ` +
        `knapp es war.</li>`
    );
  } else {
    parts.push(`<li><strong>AfD</strong> liegt unter der 5%-Hürde &mdash; die Restanteil-Rechnung setzt erst darüber an.</li>`);
  }

  if (chosenParty) {
    const partyGap = remainderGap(baseline, chosenParty);
    if (partyGap && partyGap.cutoff !== null) {
      parts.push(
        `<li><strong>${partyName(chosenParty)}</strong> lag ${formatRemainderPct(partyGap.gapPct)} (Restanteil) ` +
          `von der Schwelle des letzten Restsitzes entfernt.</li>`
      );
    }
  }

  marginExplain.innerHTML = `<ul>${parts.join("")}</ul>`;
}

function computeAndRenderRecommendation() {
  const dataset = DATASETS[basisMode];
  const baseline = allocateParliament(dataset);

  const firstReco = recommendDirectMandateAgainst(currentConstituency, baseline.eligibleParties, "afd");
  renderFirstVoteRecommendation(firstReco);

  const secondReco = recommendSecondVoteAgainst(dataset, "afd", scenarioSwingPct);
  const chosen = renderSecondVoteRecommendation(secondReco);

  const scenarioAllocation = chosen ? chosen.scenario : baseline;
  renderEffectHero(baseline.seats.afd || 0, scenarioAllocation.seats.afd || 0);

  renderMarginExplain(baseline, chosen ? chosen.party : null);

  if (firstReco.recommendedParty) firstVoteSelect.value = firstReco.recommendedParty;
  if (chosen) secondVoteSelect.value = chosen.party;
}

basis2023Button.addEventListener("click", () => {
  basisMode = "2023";
  if (currentConstituencyId) showConstituency(currentConstituencyId);
});
basisAktuellButton.addEventListener("click", () => {
  basisMode = "aktuell";
  if (currentConstituencyId) showConstituency(currentConstituencyId);
});

function setSwing(value) {
  scenarioSwingPct = value;
  swingSlider.value = value;
  swingValue.textContent = value;
  presetButtons.forEach((b) => b.classList.toggle("active", Number(b.dataset.swing) === value));
  if (currentConstituency) computeAndRenderRecommendation();
}

swingSlider.addEventListener("input", () => setSwing(Number(swingSlider.value)));
presetButtons.forEach((b) => {
  b.addEventListener("click", () => setSwing(Number(b.dataset.swing)));
});

nerdToggle.addEventListener("click", () => {
  nerdSection.hidden = false;
  nerdSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Desktop-Kapitelregister (sticky, nur >=860px sichtbar, siehe style.css) -
// springt zum Kapitel und klappt es auf, statt nur zu scrollen.
document.querySelectorAll(".nerd-index button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    target.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

simulateButton.addEventListener("click", () => {
  if (!currentConstituency || simulateButton.disabled) return;

  simulateButton.disabled = true;
  simulateButton.classList.add("is-loading");
  simulateButtonLabel.textContent = "Simuliere …";

  setTimeout(runDetailSimulation, 400);
});

function renderDeltaChipsAndTable(baseline, scenario) {
  deltaChips.innerHTML = "";
  const tbody = document.querySelector("#deltaTable tbody");
  tbody.innerHTML = "";

  const allParties = new Set([...Object.keys(baseline.seats), ...Object.keys(scenario.seats)]);
  for (const party of allParties) {
    const b = baseline.seats[party] || 0;
    const s = scenario.seats[party] || 0;
    const delta = s - b;
    const deltaText = `${delta > 0 ? "+" : ""}${delta}`;

    const chip = document.createElement("span");
    chip.className = "chip" + (party === "afd" ? " chip--afd" : "");
    chip.style.borderLeftColor = partyColor(party);
    chip.innerHTML = `${partyName(party)} ${b}${BOGEN_MINI_SVG}${s} <span class="chip-delta ${delta > 0 ? "pos" : delta < 0 ? "neg" : ""}">(${deltaText})</span>`;
    deltaChips.appendChild(chip);

    const tr = document.createElement("tr");
    if (party === "afd") tr.className = "afd-row";
    tr.innerHTML = `
      <td>${partyName(party)}</td>
      <td>${b}</td>
      <td>${s}</td>
      <td class="${delta > 0 ? "pos" : delta < 0 ? "neg" : ""}">${deltaText}</td>
    `;
    tbody.appendChild(tr);
  }
}

function runDetailSimulation() {
  const params = {
    constituencyId: currentConstituency.id,
    firstVoteParty: firstVoteSelect.value,
    secondVoteParty: secondVoteSelect.value,
    scenarioSwingPct,
  };

  const { baseline, scenario } = simulate(DATASETS[basisMode], params);

  renderBars(document.getElementById("baselineSeats"), baseline.seats, { seats: true });
  renderBars(document.getElementById("scenarioSeats"), scenario.seats, { seats: true });
  renderDeltaChipsAndTable(baseline, scenario);

  const afdBefore = baseline.seats.afd || 0;
  const afdAfter = scenario.seats.afd || 0;
  const afdDelta = afdAfter - afdBefore;
  document.getElementById("afdCallout").innerHTML =
    `<strong>AfD in dieser Testrechnung:</strong> ${afdBefore} &rarr; ${afdAfter} Sitze (${afdDelta > 0 ? "+" : ""}${afdDelta}). ` +
    `Die simulierte Zweitstimmen-Verschiebung wirkt auf ganz Berlin, die Erststimmen-Verschiebung nur auf ` +
    `1 Direktmandat in ${currentConstituency.name}.`;

  renderRemainderExplain(baseline, scenario);

  revealScreen(nerdSimResult);
  nerdSimResult.scrollIntoView({ behavior: "smooth", block: "start" });

  simulateButton.disabled = false;
  simulateButton.classList.remove("is-loading");
  simulateButtonLabel.textContent = "Szenario neu berechnen";
}

tableToggle.addEventListener("click", () => {
  const showing = !deltaTable.hidden;
  deltaTable.hidden = showing;
  tableToggle.textContent = showing ? "Als Tabelle anzeigen" : "Tabelle ausblenden";
});

function renderRemainderExplain(baseline, scenario) {
  const box = document.getElementById("remainderExplain");
  const allParties = new Set([...Object.keys(baseline.seats), ...Object.keys(scenario.seats)]);
  const changed = [...allParties].filter((p) => (baseline.seats[p] || 0) !== (scenario.seats[p] || 0));

  if (changed.length === 0) {
    box.innerHTML = `<strong>Warum ändert sich hier nichts?</strong> Keine Partei ist bei dieser Verschiebung nah
      genug an der Schwelle (dem niedrigsten Restanteil, der noch einen Sitz bekommt), um sie zu kippen.`;
    return;
  }

  const rows = changed
    .map((p) => {
      const b = remainderGap(baseline, p);
      const s = remainderGap(scenario, p);
      const delta = (scenario.seats[p] || 0) - (baseline.seats[p] || 0);

      if (!b || !s) {
        const dropped = !s;
        return `<li><strong>${partyName(p)}</strong> (${delta > 0 ? "+" : ""}${delta} Sitze): fällt ${dropped ? "im Szenario" : "in der Basis"}
          unter die 5%-Hürde &mdash; ${dropped ? "verliert" : "gewinnt"} alle Sitze auf einen Schlag, kein knapper Restanteil nötig.</li>`;
      }

      return `<li><strong>${partyName(p)}</strong> (${delta > 0 ? "+" : ""}${delta} Sitze): Restanteil-Abstand zur
        Schwelle lag bei ${formatRemainderPct(b.gapPct)} (Basis), liegt jetzt bei ${formatRemainderPct(s.gapPct)}
        (Szenario) &mdash; Naeherungswert, keine Stimmenprognose (siehe engine.js: remainderGap).</li>`;
    })
    .join("");

  box.innerHTML = `<strong>Warum ändern sich genau diese Parteien?</strong> Sie lagen am nächsten an der Schwelle
    (dem niedrigsten Restanteil, der noch einen Sitz bekam) &mdash; kleine Verschiebung, aber genau ihr Sitz kippt:
    <ul>${rows}</ul>`;
}
