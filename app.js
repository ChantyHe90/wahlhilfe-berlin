// Verbindet data.js (Fakten) + engine.js (Berechnung) mit der Seite.
// Default-Flow: PLZ -> Erst-/Zweitstimmen-Empfehlung -> AfD-Sitzeffekt (Hero) -> CTA.
// Reine Rendering-Datei - alle Berechnungen kommen unveraendert aus engine.js.

let scenarioSwingPct = 3;
let basisMode = "aktuell";
let lang = "de";

// Uebersetzungen fuer den DE/EN-Toggle. Deckt bewusst nur den Kern-Flow ab
// (Hero bis persoenlicher Vergleich + Footer) - der editoriale Deep-Dive
// ("Genauer hinsehen") bleibt deutsch, siehe Produktentscheidung.
const STRINGS = {
  de: {
    "meta.title": "Berlin – Wahlkreis-Sitzsimulator (PoC)",
    "hero.eyebrow": "Berlin · Wahl 2026",
    "hero.headline": "Welche Stimme<br />macht einen<br />Unterschied?",
    "hero.sub": "Wenn dein Ziel ist, AfD-Sitze möglichst zu vermeiden.",
    "hero.plzPlaceholder": "Deine PLZ, z. B. 10115",
    "hero.go": "Los",
    "hero.constituencyLabel": "Dein Wahlkreis",
    "result.local.eyebrow": "01 — Dein Kiez",
    "result.local.headline": "Erst-<br />stimme",
    "result.local.definition": "Wer liegt aktuell bei Dir im Kiez vorne?",
    "result.land.eyebrow": "02 — Ganz Berlin",
    "result.land.headline": "Zweit-<br />stimme",
    "result.land.definition": "Welche Partei ist aktuell in ganz Berlin vorne?",
    "effect.eyebrow": "Das verändert dein Modell",
    "effect.label": "AfD-Sitze",
    "cta.done": "Das reicht dir?",
    "cta.prefToggle": "Ich würde eigentlich lieber eine andere Partei wählen →",
    "cta.nerdToggle": "Nope– Ich will mehr wissen! →",
    "pref.eyebrow": "Deine Präferenz",
    "pref.headline": "Welche Partei kommt für dich infrage?",
    "pref.hint": "Wir empfehlen dir nichts danach, was du inhaltlich vertreten willst — das entscheidest du.",
    "pref.preferredLabel": "Am liebsten (optional)",
    "pref.noPreference": "keine Angabe",
    "pref.compareButton": "Vergleichen",
    "prefResult.eyebrow": "Bringt strategisches Wählen hier überhaupt etwas?",
    "prefResult.first.eyebrow": "Erststimme",
    "prefResult.first.definition": "Ist ein AfD-Direktmandat in deinem Wahlkreis realistisch?",
    "prefResult.second.eyebrow": "Zweitstimme",
    "prefResult.second.definition": "Gibt es einen robusten Grund, von deiner Wunschpartei abzuweichen?",
    "prefResult.hint": "Du entscheidest, wie viel Strategie dir deine Parteipräferenz wert ist.",
    "prefResult.nerdToggle": "Wie kommen wir darauf? →",
    "footer.disclaimer":
      'Keine Wahlempfehlung, nur eine Modellrechnung: echte Ergebnisse 2023 (Landeswahlleiterin Berlin), optional verschoben auf den aktuellen Berlin-Wahltrend (dawum.de, gleichmäßig auf alle Wahlkreise übertragen). Die Szenario-Funktion simuliert <em>nicht</em> deine einzelne Stimme, sondern die Frage "was wäre, wenn eine Partei berlinweit stärker abschneidet". Wahlrecht stark vereinfacht (u. a. keine Grundmandatsklausel, echte Bezirkslisten-Mechanik nur angenähert). PLZ-Zuordnung: Berlin-PLZ überschneiden sich mit Bezirksgrenzen, darum wählst du deinen Wahlkreis aus einer kurzen Liste statt automatisch exakt zugeordnet zu werden.',
    "footer.github": "Quellcode auf GitHub",
  },
  en: {
    "meta.title": "Berlin – Constituency Seat Simulator (PoC)",
    "hero.eyebrow": "Berlin · 2026 Election",
    "hero.headline": "Which vote<br />makes a<br />difference?",
    "hero.sub": "If your goal is to minimize AfD seats.",
    "hero.plzPlaceholder": "Your postcode, e.g. 10115",
    "hero.go": "Go",
    "hero.constituencyLabel": "Your constituency",
    "result.local.eyebrow": "01 — Your local area",
    "result.local.headline": "First<br />vote",
    "result.local.definition": "Who is currently ahead in your local area?",
    "result.land.eyebrow": "02 — All of Berlin",
    "result.land.headline": "Second<br />vote",
    "result.land.definition": "Which party is currently ahead across Berlin?",
    "effect.eyebrow": "How this changes your model",
    "effect.label": "AfD seats",
    "cta.done": "That's enough for you?",
    "cta.prefToggle": "Actually, I'd rather vote for a different party →",
    "cta.nerdToggle": "Nope – I want to know more! →",
    "pref.eyebrow": "Your preference",
    "pref.headline": "Which parties are an option for you?",
    "pref.hint": "We don't recommend anything based on what you should stand for politically — that's your call.",
    "pref.preferredLabel": "Favorite (optional)",
    "pref.noPreference": "no preference",
    "pref.compareButton": "Compare",
    "prefResult.eyebrow": "Does tactical voting even help here?",
    "prefResult.first.eyebrow": "First vote",
    "prefResult.first.definition": "Is an AfD direct mandate realistic in your constituency?",
    "prefResult.second.eyebrow": "Second vote",
    "prefResult.second.definition": "Is there a robust reason to deviate from your preferred party?",
    "prefResult.hint": "You decide how much strategy your party preference is worth to you.",
    "prefResult.nerdToggle": "How do we get there? →",
    "footer.disclaimer":
      'Not a voting recommendation, just a model: real 2023 results (Berlin\'s state returning officer), optionally shifted to the current Berlin polling trend (dawum.de, applied evenly across all constituencies). The scenario feature does <em>not</em> simulate your individual vote, but the question "what if a party performs better across Berlin". Electoral law heavily simplified (among other things, no basic-mandate clause, real district-list mechanics only approximated). Postcode assignment: Berlin postcodes overlap district boundaries, which is why you pick your constituency from a short list instead of being assigned automatically.',
    "footer.github": "Source code on GitHub",
  },
};

function t(key) {
  return STRINGS[lang][key] ?? STRINGS.de[key] ?? key;
}

function seatsLabel(delta) {
  if (lang === "en") return delta === 0 ? "±0 seats" : `${delta > 0 ? "+" : ""}${delta} seats`;
  return delta === 0 ? "±0 Sitze" : `${delta > 0 ? "+" : ""}${delta} Sitze`;
}

// currentPoll/DATASETS existieren erst, sobald initPoll() fertig ist (siehe
// unten) - der DAWUM-Live-Abruf ist async. initPoll() startet sofort beim
// Skriptstart, parallel zur PLZ-Eingabe; jede Stelle, die DATASETS/currentPoll
// braucht, wartet vorher auf pollReadyPromise (siehe plzButton-Handler).
let currentPoll = FALLBACK_POLL;
let CURRENT_CONSTITUENCIES = null;
let DATASETS = null;

async function initPoll() {
  const poll = await loadCurrentPoll(); // aus poll-api.js - faellt bei Fehlern selbst schon auf FALLBACK_POLL zurueck
  currentPoll = poll;

  const pollShareSum = Object.values(poll.shares).reduce((a, b) => a + b, 0);
  const normalizedPollShares = Object.fromEntries(
    Object.entries(poll.shares).map(([party, pct]) => [party, pct / pollShareSum])
  );
  CURRENT_CONSTITUENCIES = buildCurrentBaseline(CONSTITUENCIES, normalizedPollShares);
  DATASETS = { "2023": CONSTITUENCIES, aktuell: CURRENT_CONSTITUENCIES };

  renderPollStatus();
}
const pollReadyPromise = initPoll();

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
// Text fuer das (i)-Icon neben Parteien aus NO_LOCAL_DATA_PARTIES in den
// Wahlkreis-Balken (siehe renderBars: options.infoNote). Erklaert direkt am
// Balken, statt die Partei stillschweigend rauszufiltern - Zahl bleibt
// sichtbar, aber klar als landesweit hochgerechnet markiert.
function noLocalDataInfoNote(partyId) {
  if (!NO_LOCAL_DATA_PARTIES.has(partyId)) return null;
  return `Keine echten 2023-Wahlkreisdaten für ${partyName(partyId)} (Partei existierte damals nicht) - Wert ist landesweit hochgerechnet, nicht wahlkreisscharf.`;
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

    const note = options.infoNote && options.infoNote(party);
    if (note) {
      const icon = document.createElement("span");
      icon.className = "info-icon";
      icon.textContent = "ⓘ";
      icon.title = note;
      icon.setAttribute("aria-label", note);
      icon.tabIndex = 0;
      label.appendChild(icon);
    }

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

const langDeButton = document.getElementById("langDeButton");
const langEnButton = document.getElementById("langEnButton");

const plzInput = document.getElementById("plzInput");
const plzButton = document.getElementById("plzButton");
const plzHint = document.getElementById("plzHint");
const wahlkreisRow = document.getElementById("wahlkreisRow");
const wahlkreisSelect = document.getElementById("wahlkreisSelect");
const resultSection = document.getElementById("resultSection");
const constituencyName = document.getElementById("constituencyName");

const firstRecoParty = document.getElementById("firstRecoParty");
const firstRecoText = document.getElementById("firstRecoText");
const firstRecoTop3 = document.getElementById("firstRecoTop3");
const secondRecoParty = document.getElementById("secondRecoParty");
const secondRecoText = document.getElementById("secondRecoText");
const secondRecoTop3 = document.getElementById("secondRecoTop3");

const effectSection = document.getElementById("effectSection");
const effectFrom = document.getElementById("effectFrom");
const effectTo = document.getElementById("effectTo");
const effectDelta = document.getElementById("effectDelta");
const effectNote = document.getElementById("effectNote");
const compareFillBaseline = document.getElementById("compareFillBaseline");
const compareFillScenario = document.getElementById("compareFillScenario");

const ctaSection = document.getElementById("ctaSection");
const prefToggle = document.getElementById("prefToggle");
const prefSection = document.getElementById("prefSection");
const prefCheckboxes = document.getElementById("prefCheckboxes");
const prefPreferredSelect = document.getElementById("prefPreferredSelect");
const prefApplyButton = document.getElementById("prefApplyButton");
const prefResultSection = document.getElementById("prefResultSection");
const prefFirstParty = document.getElementById("prefFirstParty");
const prefFirstText = document.getElementById("prefFirstText");
const prefFirstTop3 = document.getElementById("prefFirstTop3");
const prefSecondParty = document.getElementById("prefSecondParty");
const prefSecondText = document.getElementById("prefSecondText");
const prefSecondTable = document.getElementById("prefSecondTable");
const prefNerdToggle = document.getElementById("prefNerdToggle");
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
const pollStatusNote = document.getElementById("pollStatusNote");
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

// Erststimme testweise: Parteien aus NO_LOCAL_DATA_PARTIES (BSW) sind hier
// bewusst waehlbar - applySwing() rechnet fuer sie einfach ab Ausgangswert 0
// (keine 2023-Basis), genau wie fuer jede andere Partei ist das Ergebnis eine
// rein hypothetische Testrechnung, keine echte lokale Prognose. Deshalb kein
// Datenfake noetig, nur der Hinweis in der UI (siehe firstVoteHint unten).
fillPartySelect(firstVoteSelect, new Set(["afd"]));
fillPartySelect(secondVoteSelect, new Set(["afd"]));

// Merkt sich den zuletzt gezeigten plzHint-Zustand, damit ein Sprachwechsel
// (setLang) den Hint in der neuen Sprache neu rendern kann, auch wenn der
// urspruengliche PLZ-Klick laengst vorbei ist.
let plzHintState = { type: "none", bezirkeNames: [] };
let lastAcceptableParties = null;
let lastPreferredParty = null;

function renderPlzHint() {
  if (plzHintState.type === "notfound") {
    plzHint.textContent =
      lang === "en"
        ? "No Berlin postcode recognized. Try e.g. 10115, 12043, 13403."
        : "Keine Berliner PLZ erkannt. Probier z.B. 10115, 12043, 13403.";
  } else if (plzHintState.type === "multi") {
    const names = plzHintState.bezirkeNames.join(", ");
    plzHint.textContent =
      lang === "en"
        ? `Your postcode is on the border of several districts (${names}). Choose your constituency.`
        : `Deine PLZ liegt an der Grenze mehrerer Bezirke (${names}). Wähle deinen Wahlkreis.`;
  } else if (plzHintState.type === "single") {
    plzHint.textContent = lang === "en" ? "Choose your constituency." : "Wähle deinen Wahlkreis.";
  }
}

function applyStaticTranslations() {
  document.documentElement.lang = lang;
  document.title = t("meta.title");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
  });
}

function setLang(newLang) {
  if (lang === newLang) return;
  lang = newLang;
  langDeButton.classList.toggle("active", lang === "de");
  langEnButton.classList.toggle("active", lang === "en");
  applyStaticTranslations();
  renderPlzHint();
  if (currentConstituencyId) showConstituency(currentConstituencyId);
  if (!prefResultSection.hidden) {
    renderPersonalizedComparison(lastAcceptableParties ?? [], lastPreferredParty);
  }
}

langDeButton.addEventListener("click", () => setLang("de"));
langEnButton.addEventListener("click", () => setLang("en"));

plzButton.addEventListener("click", async () => {
  const plz = plzInput.value.trim();
  resultSection.hidden = true;
  effectSection.hidden = true;
  ctaSection.hidden = true;
  prefSection.hidden = true;
  prefResultSection.hidden = true;
  nerdSection.hidden = true;

  const bezirke = findBezirkeByPlz(plz);

  if (bezirke.length === 0) {
    wahlkreisRow.hidden = true;
    plzHintState = { type: "notfound", bezirkeNames: [] };
    renderPlzHint();
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

  plzHintState =
    bezirke.length > 1
      ? { type: "multi", bezirkeNames: bezirke.map((b) => b.name) }
      : { type: "single", bezirkeNames: [] };
  renderPlzHint();
  wahlkreisRow.hidden = false;

  // In der Regel schon laengst aufgeloest (initPoll laeuft parallel seit
  // Skriptstart) - der kurze Loading-State faengt nur den seltenen Fall
  // langsamer/fehlender Netzwerkverbindung ab.
  plzButton.classList.add("is-loading");
  plzButton.disabled = true;
  await showConstituency(wahlkreisSelect.value);
  plzButton.classList.remove("is-loading");
  plzButton.disabled = false;
});

wahlkreisSelect.addEventListener("change", () => {
  showConstituency(wahlkreisSelect.value);
});


function pollShareList() {
  return Object.entries(currentPoll.shares)
    .sort((a, b) => b[1] - a[1])
    .map(([party, pct]) => `${partyName(party)} ${pct.toFixed(1)} %`)
    .join(" · ");
}

// "Live-Daten · DAWUM · <Institut>" bzw. "Fallback-Daten · Stand XX.XX.XXXX" -
// bewusst nur im Nerd-Modus (Kapitel I), im Quick Mode sieht niemand das.
function renderPollStatus() {
  if (basisMode !== "aktuell") {
    pollStatusNote.hidden = true;
    return;
  }
  pollStatusNote.hidden = false;
  pollStatusNote.textContent = currentPoll.isLive
    ? `Live-Daten · DAWUM · Ø aus ${currentPoll.instituteCount} Instituten${currentPoll.institute ? " (" + currentPoll.institute + ")" : ""}`
    : `Fallback-Daten · Stand ${currentPoll.date}`;
}

function updateBasisLabels() {
  const isAktuell = basisMode === "aktuell";
  basis2023Button.classList.toggle("active", !isAktuell);
  basisAktuellButton.classList.toggle("active", isAktuell);
  renderPollStatus();

  basisInfo.innerHTML = isAktuell
    ? `<strong>Woher die Zahlen kommen:</strong> Wahlkreis-Verteilung wie 2023, aber landesweit auf den aktuellen
       Wahltrend verschoben (Umfrage-Verschiebung, Fachbegriff "Uniform Swing" &mdash; <em>nicht</em> dasselbe wie
       die Szenario-Verschiebung weiter unten). Der Wahltrend ist ein ungewichtetes Mittel der jeweils neuesten
       Umfrage von bis zu 4 Instituten (nicht älter als 21 Tage) &mdash; kein Institut zählt stärker als ein
       anderes, ein Institut ohne Wert für eine getrackte Partei fließt gar nicht erst mit ein. Quelle:
       <a href="https://dawum.de/Berlin/" target="_blank" rel="noopener">${currentPoll.source}</a>,
       Stand ${currentPoll.date}. Keine echte Wahlkreis-Umfrage, nur eine berlinweite hochgerechnet.
       <div class="poll-values">Umfragewerte (Mittelwert): ${pollShareList()}</div>`
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
    .filter((p) => p in currentPoll.shares)
    .map((p) => `${partyName(p)} ${currentPoll.shares[p].toFixed(1)} %`);
  if (parts.length === 0) {
    noLocalDataNote.hidden = true;
    return;
  }
  noLocalDataNote.hidden = false;
  noLocalDataNote.textContent =
    `ⓘ Keine echten 2023-Wahlkreisdaten, Wert landesweit hochgerechnet (Berlin gesamt: ${parts.join(" · ")}).`;
}

// async, weil DATASETS erst existiert, sobald der DAWUM-Live-Abruf
// abgeschlossen ist (siehe initPoll()) - normalerweise ist das schon
// laengst der Fall, wenn diese Funktion zum ersten Mal aufgerufen wird, weil
// initPoll() parallel zur PLZ-Eingabe des Users laeuft.
async function showConstituency(constituencyId) {
  await pollReadyPromise;
  currentConstituencyId = constituencyId;
  currentConstituency = DATASETS[basisMode].find((c) => c.id === constituencyId);
  if (!currentConstituency) return;

  nerdSimResult.hidden = true;
  constituencyName.textContent = currentConstituency.name;
  updateBasisLabels();
  renderBars(document.getElementById("firstVoteBaseline"), currentConstituency.firstVotes);
  renderBars(document.getElementById("secondVoteBaseline"), currentConstituency.secondVotes, {
    infoNote: noLocalDataInfoNote,
  });
  renderNoLocalDataNote();

  computeAndRenderRecommendation();

  revealScreen(resultSection);
  revealScreen(effectSection);
  revealScreen(ctaSection);
}

// Lokale Wirkung bleibt die Hauptmetrik der Erststimme (nicht die
// landesweite AfD-Sitzzahl, siehe Konzept-Diskussion): entweder ist AfD hier
// real kompetitiv (dann zeigen wir den staerksten Gegenkandidaten samt
// Prozentwerten), oder sie ist es nicht - dann erzwingen wir KEINE
// Empfehlung, sondern sagen das ehrlich.
function renderFirstVoteRecommendation(firstReco) {
  const totalVotes = firstReco.contextRanking.reduce((sum, [, v]) => sum + v, 0) || 1;
  const afdPct = (firstReco.avoidVotes / totalVotes) * 100;
  const afdRank = partyRank(firstReco.contextRanking, "afd");
  renderTopPartyList(firstRecoTop3, firstReco.contextRanking, totalVotes);

  if (!firstReco.avoidCompetitive) {
    const leader = firstReco.contextRanking[0];
    firstRecoParty.textContent = leader ? partyName(leader[0]) : "–";
    nerdFirstPartyName.textContent = leader ? partyName(leader[0]) : lang === "en" ? "this" : "diese";
    firstRecoText.textContent =
      lang === "en"
        ? `AfD is only in place ${afdRank} here (${afdPct.toFixed(0)}%) and doesn't play a major role for the first vote.`
        : `AfD liegt hier nur auf Platz ${afdRank} (${afdPct.toFixed(0)} %) und spielt bei der Erststimme ` +
          `keine große Rolle.`;
    return;
  }

  if (!firstReco.recommendedParty) {
    firstRecoParty.textContent = "–";
    firstRecoText.textContent =
      lang === "en" ? "There isn't enough data for this constituency." : "Für diesen Wahlkreis liegen keine ausreichenden Daten vor.";
    nerdFirstPartyName.textContent = lang === "en" ? "this" : "diese";
    return;
  }

  const recPct = (firstReco.recommendedVotes / totalVotes) * 100;

  firstRecoParty.textContent = partyName(firstReco.recommendedParty);
  nerdFirstPartyName.textContent = partyName(firstReco.recommendedParty);

  if (firstReco.avoidLeads) {
    firstRecoText.textContent =
      lang === "en"
        ? `Yes — AfD is ahead here and can win the direct mandate. ${partyName(firstReco.recommendedParty)} currently ` +
          `has the best chance against it. AfD ${afdPct.toFixed(0)}% · ${partyName(firstReco.recommendedParty)} ${recPct.toFixed(0)}%`
        : `Ja — AfD liegt hier vorn und kann das Direktmandat gewinnen. ${partyName(firstReco.recommendedParty)} hat ` +
          `aktuell die beste Chance dagegen. AfD ${afdPct.toFixed(0)} % · ${partyName(firstReco.recommendedParty)} ${recPct.toFixed(0)} %`;
  } else {
    const actualLeader = firstReco.contextRanking[0];
    const recommendedIsActualLeader = actualLeader && actualLeader[0] === firstReco.recommendedParty;
    if (recommendedIsActualLeader) {
      firstRecoText.textContent =
        lang === "en"
          ? `${partyName(firstReco.recommendedParty)} is ahead here (${recPct.toFixed(0)}%), ` +
            `AfD in 2nd place (${afdPct.toFixed(0)}%). Your first vote helps keep it that way.`
          : `${partyName(firstReco.recommendedParty)} liegt hier vorn (${recPct.toFixed(0)} %), ` +
            `AfD auf Platz 2 (${afdPct.toFixed(0)} %). Mit deiner Erststimme hilfst du, das so zu halten.`;
    } else {
      const actualLeaderPct = (actualLeader[1] / totalVotes) * 100;
      firstRecoText.textContent =
        lang === "en"
          ? `Close — AfD is in 2nd place (${afdPct.toFixed(0)}%), but ${partyName(actualLeader[0])} ` +
            `(${actualLeaderPct.toFixed(0)}%) is actually leading here. Among the nationally relevant parties, ` +
            `${partyName(firstReco.recommendedParty)} has the best chance against AfD (${recPct.toFixed(0)}%).`
          : `Knapp — AfD liegt auf Platz 2 (${afdPct.toFixed(0)} %), aber tatsächlich führt hier ` +
            `${partyName(actualLeader[0])} (${actualLeaderPct.toFixed(0)} %). Unter den landesweit relevanten ` +
            `Parteien hat ${partyName(firstReco.recommendedParty)} die beste Chance gegen die AfD (${recPct.toFixed(0)} %).`;
    }
  }
}

// Partei-Rangliste als Bulletpoints (Zweitstimme landesweit: nur Top 3,
// Erststimme lokal: komplette Liste - siehe Aufrufer). entries muss bereits
// absteigend sortiert sein ([partyId, Stimmen][]), total ist die
// Prozentbasis. limit weglassen zeigt die komplette Liste: wer nicht in den
// Top 3 auftaucht (z.B. die eigene Wunschpartei), soll trotzdem sichtbar
// sein, statt aus der Ansicht zu verschwinden.
function renderTopPartyList(container, entries, total, limit) {
  container.innerHTML = "";
  const shown = limit ? entries.slice(0, limit) : entries;
  for (const [party, votes] of shown) {
    const pct = (votes / total) * 100;
    const li = document.createElement("li");
    li.innerHTML = `<span>${partyName(party)}</span><strong>${pct.toFixed(1)} %</strong>`;
    container.appendChild(li);
  }
}

// Prozentbasis ist totalValid (alle abgegebenen Stimmen der getrackten
// Parteien), nicht nur huerdenberechtigte, damit die Zahl mit dem echten
// Wahlergebnis-Anteil uebereinstimmt.
function renderSecondVoteTop3(secondReco) {
  const entries = Object.entries(secondReco.baseline.totals).sort((a, b) => b[1] - a[1]);
  renderTopPartyList(secondRecoTop3, entries, secondReco.baseline.totalValid || 1, 3);
}

// Platz (1-basiert) einer Partei in einer absteigend sortierten Rangliste,
// oder null wenn sie darin gar nicht vorkommt.
function partyRank(ranking, partyId) {
  const idx = ranking.findIndex(([p]) => p === partyId);
  return idx === -1 ? null : idx + 1;
}

function renderSecondVoteRecommendation(secondReco) {
  renderSecondVoteTop3(secondReco);

  if (secondReco.bestDelta === 0) {
    secondRecoParty.textContent = lang === "en" ? "no clear party" : "keine eindeutige Partei";
    nerdSecondPartyName.textContent = lang === "en" ? "this" : "diese";
    secondRecoText.textContent =
      lang === "en"
        ? `In our model, none of the tested parties alone changes the AfD seat count at +${scenarioSwingPct} ` +
          `percentage points. The second vote still matters for the overall seat distribution — vote by your convictions.`
        : `In unserem Modell verändert bei +${scenarioSwingPct} Prozentpunkten keine der getesteten Parteien allein ` +
          `die AfD-Sitzzahl. Die Zweitstimme bleibt trotzdem wichtig für die Sitzverteilung insgesamt — wähl nach ` +
          `deiner Überzeugung.`;
    effectNote.textContent =
      lang === "en"
        ? `Tested: +${scenarioSwingPct} percentage points for each party individually, AfD seat count stayed the same each time. Simulation based on current polls.`
        : `Getestet: +${scenarioSwingPct} Prozentpunkte für jede Partei einzeln, AfD-Sitzzahl blieb jeweils gleich. Simulation auf Basis aktueller Umfragen.`;
    return null;
  }

  const chosen = secondReco.bestParties[0];
  const names = secondReco.bestParties.map((r) => partyName(r.party)).join(lang === "en" ? " or " : " oder ");
  secondRecoParty.textContent = names;
  nerdSecondPartyName.textContent = names;
  secondRecoText.textContent =
    lang === "en"
      ? `In our model, a shift towards ${names} weakens the AfD seat count the most (not an ideological automatism ` +
        `— just the party that was closest to the next seat threshold in the model).`
      : `In unserem Modell schwächt eine Verschiebung hin zu ${names} die AfD-Sitzzahl am stärksten (kein ` +
        `ideologischer Automatismus — nur die Partei, die im Modell am nächsten an der nächsten Sitz-Schwelle lag).`;
  effectNote.textContent =
    lang === "en"
      ? "Simulation based on current polls — not a prediction, not the effect of your individual vote."
      : "Simulation auf Basis aktueller Umfragen — keine Vorhersage, keine Wirkung deiner einzelnen Stimme.";
  return chosen;
}

// Hero-Moment: großer AfD-Sitzvergleich. baselineSeats/scenarioSeats sind
// absolute Sitzzahlen (nicht Prozent) - genau die Zahl, die User 1 in 2
// Sekunden verstehen soll. Ergaenzt effectNote um den Hinweis, dass die
// Erststimme hier nicht einfliesst: buildScenario() aendert im
// Zweitstimmen-Test bewusst nur secondVotes, firstVotes bleiben
// unveraendert (siehe engine.js) - das Sitz-Delta kommt also allein aus
// der Zweitstimme.
function renderEffectHero(baselineSeats, scenarioSeats) {
  animateNumber(effectFrom, baselineSeats);
  animateNumber(effectTo, scenarioSeats);
  const delta = scenarioSeats - baselineSeats;
  effectDelta.textContent = seatsLabel(delta);
  effectDelta.classList.toggle("neg", delta < 0);
  effectDelta.classList.toggle("pos", delta > 0);

  effectNote.textContent +=
    lang === "en"
      ? " The first vote above counts separately only for the direct mandate in your constituency and doesn't change this seat count."
      : " Die Erststimme oben zählt separat nur für das Direktmandat in deinem Wahlkreis und verändert diese Sitzzahl nicht.";

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

  const localFullField = Object.keys(currentConstituency.firstVotes);
  const firstReco = recommendDirectMandateAgainst(currentConstituency, baseline.eligibleParties, "afd", localFullField);
  
  renderFirstVoteRecommendation(firstReco);

  const secondReco = recommendSecondVoteAgainst(dataset, "afd", scenarioSwingPct);
  const chosen = renderSecondVoteRecommendation(secondReco);

  const scenarioAllocation = chosen ? chosen.scenario : baseline;
  renderEffectHero(baseline.seats.afd || 0, scenarioAllocation.seats.afd || 0);

  renderMarginExplain(baseline, chosen ? chosen.party : null);

  if (firstReco.recommendedParty) firstVoteSelect.value = firstReco.recommendedParty;
  if (chosen) secondVoteSelect.value = chosen.party;
}

// ---------- Persoenliche Praeferenz (preferredParty/acceptableParties) ----------
// Additiv zum Fast-Lane-Pfad: blockiert nichts, ist standardmaessig
// versteckt. AfD ist bewusst nicht ankreuzbar - Kernziel der App ist, AfD-
// Sitze zu vermeiden, "waere AfD fuer dich akzeptabel" waere sinnlos.
for (const p of PARTIES) {
  if (p.id === "afd") continue;
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = p.id;
  checkbox.addEventListener("change", updatePrefPreferredOptions);
  label.appendChild(checkbox);
  label.append(" " + p.name);
  prefCheckboxes.appendChild(label);
}

// Das "am liebsten"-Dropdown zeigt nur angekreuzte Parteien - eine
// Herzenswahl, die man selbst nicht als akzeptabel markiert hat, ergibt
// keinen Sinn.
function updatePrefPreferredOptions() {
  const checked = [...prefCheckboxes.querySelectorAll("input:checked")].map((c) => c.value);
  const currentValue = prefPreferredSelect.value;
  prefPreferredSelect.innerHTML = `<option value="">${t("pref.noPreference")}</option>`;
  for (const id of checked) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = partyName(id);
    prefPreferredSelect.appendChild(opt);
  }
  if (checked.includes(currentValue)) prefPreferredSelect.value = currentValue;
}

prefToggle.addEventListener("click", () => {
  console.log("prefToggle")
  prefToggle.setAttribute("aria-expanded", "true");
  revealScreen(prefSection);
  prefSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

prefApplyButton.addEventListener("click", () => {
  if (!currentConstituency) return;
  const acceptableParties = [...prefCheckboxes.querySelectorAll("input:checked")].map((c) => c.value);
  const preferredParty = prefPreferredSelect.value || null;
  lastAcceptableParties = acceptableParties;
  lastPreferredParty = preferredParty;
  renderPersonalizedComparison(acceptableParties, preferredParty);
  revealScreen(prefResultSection);
  prefResultSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

prefNerdToggle.addEventListener("click", () => {
  prefNerdToggle.setAttribute("aria-expanded", "true");
  nerdToggle.setAttribute("aria-expanded", "true");
  nerdSection.hidden = false;
  nerdSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Erststimme personalisiert: identische Logik wie renderFirstVoteRecommendation
// (lokale Wirkung als Hauptmetrik, keine erzwungene Empfehlung), nur mit der
// persoenlichen Kandidatenliste statt aller huerdenberechtigten Parteien.
function renderPersonalFirstVoteBlock(firstReco) {
  const totalVotes = firstReco.contextRanking.reduce((sum, [, v]) => sum + v, 0) || 1;
  const afdPct = (firstReco.avoidVotes / totalVotes) * 100;
  const afdRank = partyRank(firstReco.contextRanking, "afd");
  renderTopPartyList(prefFirstTop3, firstReco.contextRanking, totalVotes);

  if (!firstReco.avoidCompetitive) {
    prefFirstParty.textContent = "–";
    prefFirstText.textContent =
      lang === "en"
        ? `No — AfD is only in place ${afdRank} here (${afdPct.toFixed(0)}%) and doesn't play a major role for the first vote.`
        : `Nein — AfD liegt hier nur auf Platz ${afdRank} (${afdPct.toFixed(0)} %) und spielt bei der Erststimme ` +
          `keine große Rolle.`;
    return;
  }
  if (!firstReco.recommendedParty) {
    const actualLeader = firstReco.contextRanking[0];
    prefFirstParty.textContent = "–";
    if (lang === "en") {
      prefFirstText.textContent = actualLeader
        ? `None of your acceptable parties realistically runs against AfD here. ${partyName(actualLeader[0])} is ` +
          `currently ahead (${((actualLeader[1] / totalVotes) * 100).toFixed(0)}%).`
        : "None of your acceptable parties realistically runs against AfD here.";
    } else {
      prefFirstText.textContent = actualLeader
        ? `Keine deiner akzeptablen Parteien tritt hier realistisch gegen AfD an. Aktuell führt ` +
          `${partyName(actualLeader[0])} (${((actualLeader[1] / totalVotes) * 100).toFixed(0)} %).`
        : "Keine deiner akzeptablen Parteien tritt hier realistisch gegen AfD an.";
    }
    return;
  }
  const recPct = (firstReco.recommendedVotes / totalVotes) * 100;

  prefFirstParty.textContent = partyName(firstReco.recommendedParty);

  if (firstReco.avoidLeads) {
    prefFirstText.textContent =
      lang === "en"
        ? `Yes — AfD can win your constituency. Within your selection, ${partyName(firstReco.recommendedParty)} currently ` +
          `has the best chance against it. AfD ${afdPct.toFixed(0)}% · ${partyName(firstReco.recommendedParty)} ${recPct.toFixed(0)}%`
        : `Ja — AfD kann deinen Wahlkreis gewinnen. Innerhalb deiner Auswahl hat ${partyName(firstReco.recommendedParty)} ` +
          `aktuell die beste Chance dagegen. AfD ${afdPct.toFixed(0)} % · ${partyName(firstReco.recommendedParty)} ${recPct.toFixed(0)} %`;
  } else {
    const actualLeader = firstReco.contextRanking[0];
    const recommendedIsActualLeader = actualLeader && actualLeader[0] === firstReco.recommendedParty;
    if (recommendedIsActualLeader) {
      prefFirstText.textContent =
        lang === "en"
          ? `No, not currently — ${partyName(firstReco.recommendedParty)} is already ahead here, AfD in 2nd place (${afdPct.toFixed(0)}%).`
          : `Nein, aktuell nicht — ${partyName(firstReco.recommendedParty)} liegt hier schon vorn, ` +
            `AfD auf Platz 2 (${afdPct.toFixed(0)} %).`;
    } else {
      const actualLeaderPct = (actualLeader[1] / totalVotes) * 100;
      prefFirstText.textContent =
        lang === "en"
          ? `Close — AfD is in 2nd place (${afdPct.toFixed(0)}%), but ${partyName(actualLeader[0])} ` +
            `(${actualLeaderPct.toFixed(0)}%) is actually leading here, not ${partyName(firstReco.recommendedParty)}. ` +
            `Within your selection, ${partyName(firstReco.recommendedParty)} has the best chance against AfD (${recPct.toFixed(0)}%).`
          : `Knapp — AfD liegt auf Platz 2 (${afdPct.toFixed(0)} %), aber tatsächlich führt hier ` +
            `${partyName(actualLeader[0])} (${actualLeaderPct.toFixed(0)} %), nicht ${partyName(firstReco.recommendedParty)}. ` +
            `Innerhalb deiner Auswahl hat ${partyName(firstReco.recommendedParty)} die beste Chance gegen die AfD ` +
            `(${recPct.toFixed(0)} %).`;
    }
  }
}

// Zweitstimme personalisiert MIT Wunschpartei: die eigentliche Produktfrage
// ist "gibt es einen ROBUSTEN Grund, davon abzuweichen?" - nicht "wer ist
// die beste Partei ueberhaupt". Kein erzwungener Sieger: wenn keine
// Alternative robust ueber +1/+2/+3/+5pp besser ist, bleibt die Wunschpartei
// stehen, als vollwertiges Ergebnis.
function renderPersonalSecondVoteBlockWithPreference(robust, preferredParty) {
  prefSecondTable.innerHTML = "";
  if (!robust.hasRobustAlternative) {
    prefSecondParty.textContent = partyName(preferredParty);
    prefSecondText.textContent =
      lang === "en"
        ? `You want to vote ${partyName(preferredParty)}? Then there's currently no robust strategic reason to deviate ` +
          `from that. Your second vote mainly determines how strong your party becomes in the Berlin state parliament.`
        : `Du willst ${partyName(preferredParty)} wählen? Dann gibt es aktuell keinen robusten strategischen Grund, ` +
          `davon abzuweichen. Deine Zweitstimme bestimmt vor allem, wie stark deine Partei im Berliner ` +
          `Abgeordnetenhaus wird.`;
    return;
  }
  const best = robust.bestRobustAlternative;
  prefSecondParty.textContent = partyName(best.party);
  prefSecondText.textContent =
    lang === "en"
      ? `Among the parties that are an option for you, ${partyName(best.party)} weakens the AfD seat count more ` +
        `robustly than ${partyName(preferredParty)} — consistently as good or better at +1 to +5 percentage points ` +
        `of shift, not just under a single assumption.`
      : `Unter den Parteien, die für dich infrage kommen, schwächt ${partyName(best.party)} die AfD-Sitzzahl ` +
        `robuster als ${partyName(preferredParty)} — bei +1 bis +5 Prozentpunkten Verschiebung durchgehend gleich ` +
        `gut oder besser, nicht nur bei einer einzelnen Annahme.`;
}

// Tabelle je Kandidatenpartei: aktueller Zweitstimmen-Anteil (Prozentbasis:
// totalValid, wie ueberall sonst) plus der AfD-Sitzeffekt im getesteten
// Swing-Szenario - damit sich "welche Partei hat welche Chance" nicht nur
// aus einer einzelnen Gewinner-Partei erschliesst, sondern die ganze Auswahl
// sichtbar bleibt (auch die, die aktuell nicht als beste Wahl genannt wird).
function renderPersonalSecondTable(withinSelection, totals, totalValid) {
  const entries = [...withinSelection].sort((a, b) => (totals[b.party] || 0) - (totals[a.party] || 0));
  prefSecondTable.innerHTML = "";
  for (const { party, delta } of entries) {
    const pct = ((totals[party] || 0) / totalValid) * 100;
    const deltaLabel = seatsLabel(delta);
    const li = document.createElement("li");
    li.innerHTML = `<span>${partyName(party)}</span><strong>${pct.toFixed(1)} % · AfD ${deltaLabel}</strong>`;
    prefSecondTable.appendChild(li);
  }
}

// Zweitstimme personalisiert OHNE Wunschpartei: es gibt keine Referenz, von
// der "abgewichen" werden koennte - dann bleibt die bisherige Frage ("welche
// Partei aus deiner Auswahl wirkt am staerksten"), nur auf die Auswahl
// eingeschraenkt und korrekt als Einzel-Szenario gelabelt (siehe
// Konzept-Korrektur: das ist KEINE "beste Zweitstimme", nur der groesste
// modellierte Effekt bei dieser einen Annahme).
function renderPersonalSecondVoteBlockNoPreference(withinSelection, secondReco) {
  const baselineSeats = secondReco.baselineSeats;
  prefSecondTable.innerHTML = "";

  if (withinSelection.length === 0) {
    prefSecondParty.textContent = "–";
    prefSecondText.textContent = lang === "en" ? "There's no data for your selection." : "Für deine Auswahl liegen keine Daten vor.";
    return;
  }

  renderPersonalSecondTable(withinSelection, secondReco.baseline.totals, secondReco.baseline.totalValid || 1);

  const bestDelta = Math.min(...withinSelection.map((r) => r.delta));
  const best = withinSelection.filter((r) => r.delta === bestDelta);
  if (bestDelta === 0) {
    prefSecondParty.textContent = lang === "en" ? "no clear party" : "keine eindeutige Partei";
    prefSecondText.textContent =
      lang === "en"
        ? `Within your selection, no party alone changes the AfD seat count at +${scenarioSwingPct} percentage points ` +
          `(baseline: ${baselineSeats} seats) — vote by your convictions.`
        : `Innerhalb deiner Auswahl verändert bei +${scenarioSwingPct} Prozentpunkten keine Partei allein die ` +
          `AfD-Sitzzahl (Basis: ${baselineSeats} Sitze) — wähl nach deiner Überzeugung.`;
    return;
  }
  const names = best.map((r) => partyName(r.party)).join(lang === "en" ? " or " : " oder ");
  prefSecondParty.textContent = names;
  prefSecondText.textContent =
    lang === "en"
      ? `Among the parties that are an option for you, ${names} produces the largest modeled effect in the assumed +${scenarioSwingPct}pp scenario.`
      : `Unter den Parteien, die für dich infrage kommen, erzeugt ${names} im angenommenen +${scenarioSwingPct}-pp-Szenario ` +
        `den größten modellierten Effekt.`;
}

function renderPersonalizedComparison(acceptableParties, preferredParty) {
  const dataset = DATASETS[basisMode];
  const allNonAfdParties = PARTIES.map((p) => p.id).filter((id) => id !== "afd");
  const candidateParties = acceptableParties.length > 0 ? acceptableParties : allNonAfdParties;

  const localFullField = Object.keys(currentConstituency.firstVotes);
  const firstReco = recommendDirectMandateAgainst(currentConstituency, candidateParties, "afd", localFullField);
  renderPersonalFirstVoteBlock(firstReco);

  if (preferredParty) {
    const robust = findRobustSecondVoteAlternative(dataset, "afd", preferredParty, candidateParties);
    renderPersonalSecondVoteBlockWithPreference(robust, preferredParty);
  } else {
    const secondReco = recommendSecondVoteAgainst(dataset, "afd", scenarioSwingPct);
    const withinSelection = secondReco.results.filter((r) => candidateParties.includes(r.party));
    renderPersonalSecondVoteBlockNoPreference(withinSelection, secondReco);
  }
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
  nerdToggle.setAttribute("aria-expanded", "true");
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

  // baseline.seats/scenario.seats enthalten nur Parteien, die in dieser
  // Rechnung >=5% haben (siehe engine.js: hareNiemeyer baut Sitze nur fuer
  // eligibleVotes-Parteien). Eine Partei kann also z.B. im Szenario auftauchen,
  // in der Basis aber komplett fehlen (nicht 0 Sitze - gar keine Zeile). Fuer
  // den Vergleich brauchen beide Spalten dieselbe Parteien-Menge, sonst wirkt
  // das Auftauchen/Verschwinden wie ein Rendering-Fehler statt wie die
  // 5%-Huerde, die es tatsaechlich ist.
  const allSeatParties = new Set([...Object.keys(baseline.seats), ...Object.keys(scenario.seats)]);
  const fillZeros = (seats) => Object.fromEntries([...allSeatParties].map((p) => [p, seats[p] || 0]));
  const belowThresholdNote = (allocation) => (party) =>
    !allocation.eligibleParties.includes(party)
      ? `${partyName(party)} liegt unter der 5%-Hürde in dieser Rechnung, deshalb 0 Sitze.`
      : null;

  renderBars(document.getElementById("baselineSeats"), fillZeros(baseline.seats), {
    seats: true,
    infoNote: belowThresholdNote(baseline),
  });
  renderBars(document.getElementById("scenarioSeats"), fillZeros(scenario.seats), {
    seats: true,
    infoNote: belowThresholdNote(scenario),
  });
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
