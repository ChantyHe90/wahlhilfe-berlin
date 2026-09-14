// Laedt die 4 neuesten Berlin-Umfragen (je Institut nur die neueste, siehe
// SURVEYS_TO_AVERAGE) von der oeffentlichen DAWUM-API (https://dawum.de/API/)
// und mittelt sie zu einem { date, source, institute, shares, isLive } -
// robuster gegen Ausreisser einzelner Institute als eine einzelne Umfrage.
// Reine Netzwerk-/Parsing-Schicht, getrennt von app.js (State/Rendering) und
// engine.js (Berechnung). Wirft nach aussen nie einen Fehler: loadCurrentPoll()
// faellt bei jedem Problem (Netzwerk, Format, fehlende Partei) auf
// FALLBACK_POLL aus data.js zurueck - siehe Kommentar dort.

const DAWUM_ENDPOINT = "https://api.dawum.de/newest_surveys.json";

// DAWUM-Party-Shortcuts -> unsere internen PartyIds. Zentral hier definiert,
// nicht ueber die ganze App verteilt. Bewusst ueber den textuellen Shortcut
// gemappt, nicht ueber DAWUMs numerische IDs - die sind laut DAWUM nicht
// stabil ueber Zeit (koennen bei Datenpflege neu vergeben werden).
//
// Achtung Falle: DAWUM fuehrt "CDU/CSU" (Bundesebene, gemeinsame Zahl) UND
// "CDU" (Landesebene, einzeln) als zwei verschiedene Parteien. Fuer eine
// Landtagswahl wie Berlin ist "CDU" der richtige Shortcut - "CDU/CSU" waere
// hier still falsch (Bundeswert statt Landeswert).
const DAWUM_SHORTCUT_TO_PARTY_ID = {
  SPD: "spd",
  CDU: "cdu",
  Grüne: "gruene",
  Linke: "linke",
  AfD: "afd",
  FDP: "fdp",
  BSW: "bsw",
};

const TRACKED_PARTY_IDS = Object.values(DAWUM_SHORTCUT_TO_PARTY_ID);

function formatGermanDate(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

// Baut Shortcut -> DAWUM-Partei-ID (numerisch, z.B. "101" fuer "CDU") aus dem
// live mitgelieferten Parties-Block, statt DAWUM-Zahlen im Code
// hartzucodieren - siehe Kommentar bei DAWUM_SHORTCUT_TO_PARTY_ID.
function buildPartyIdLookup(partiesBlock) {
  const lookup = {};
  for (const [dawumId, party] of Object.entries(partiesBlock)) {
    const ourId = DAWUM_SHORTCUT_TO_PARTY_ID[party.Shortcut];
    if (ourId) lookup[ourId] = dawumId;
  }
  return lookup;
}

// Berlin-Parlament ueber den Shortcut "Berlin" finden, nicht ueber eine
// hartkodierte Parliament_ID (aus demselben Stabilitaetsgrund wie oben).
function findBerlinParliamentId(parliamentsBlock) {
  const entry = Object.entries(parliamentsBlock).find(([, p]) => p.Shortcut === "Berlin");
  return entry ? entry[0] : null;
}

// newest_surveys.json liefert schon pro Institut nur die jeweils neueste
// Umfrage - "die 4 neuesten Umfragen" heisst hier also automatisch "von 4
// verschiedenen Instituten" (kein Institut kann doppelt vorkommen).
const SURVEYS_TO_AVERAGE = 4;
const MAX_SURVEY_AGE_DAYS = 21;

function findRecentSurveys(
  surveysBlock,
  parliamentId,
  limit = SURVEYS_TO_AVERAGE
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_SURVEY_AGE_DAYS);

  const matches = Object.values(surveysBlock)
    .filter((s) => s.Parliament_ID === parliamentId)
    .filter((s) => {
      const date = new Date(`${s.Date}T12:00:00`);
      return !Number.isNaN(date.getTime()) && date >= cutoff;
    });

  matches.sort((a, b) => b.Date.localeCompare(a.Date));

  return matches.slice(0, limit);
}

// Extrahiert nur die Parteianteile einer rohen DAWUM-Survey. Gibt null
// zurueck, wenn irgendeine der 7 getrackten Parteien fehlt (z.B. unter
// "Sonstige" zusammengefasst) - so eine Umfrage fliesst gar nicht erst in
// den Mittelwert ein, statt ihn mit einer fehlenden Partei zu verzerren.
function extractShares(survey, partyIdLookup) {
  const shares = {};
  for (const ourId of TRACKED_PARTY_IDS) {
    const dawumId = partyIdLookup[ourId];
    const value = dawumId !== undefined ? survey.Results[dawumId] : undefined;
    if (value === undefined) return null;
    shares[ourId] = value;
  }
  return shares;
}

// Baut aus mehreren rohen DAWUM-Surveys (verschiedene Institute) unser
// {date, source, institute, shares} per einfachem, ungewichtetem Mittelwert
// je Partei - kein Institut zaehlt staerker als ein anderes. Umfragen ohne
// alle 7 getrackten Parteien werden vorher rausgefiltert (siehe
// extractShares), nicht mitgezaehlt. Gibt null zurueck, wenn danach kein
// Institut mehr uebrig ist.
function averageSurveys(surveys, partyIdLookup, institutesBlock) {
  const usable = surveys
    .map((survey) => ({ survey, shares: extractShares(survey, partyIdLookup) }))
    .filter(({ shares }) => shares !== null);
  if (usable.length === 0) return null;

  const shares = {};
  for (const ourId of TRACKED_PARTY_IDS) {
    const sum = usable.reduce((acc, { shares: s }) => acc + s[ourId], 0);
    shares[ourId] = sum / usable.length;
  }

  const instituteNames = usable.map(
    ({ survey }) => institutesBlock[survey.Institute_ID]?.Name || "unbekanntes Institut"
  );
  const newestDate = usable.map(({ survey }) => survey.Date).sort().at(-1);

  return {
    date: formatGermanDate(newestDate),
    source: `Ø aus ${usable.length} Instituten (${instituteNames.join(", ")}) — DAWUM Open Data`,
    institute: instituteNames.join(", "),
    instituteCount: usable.length,
    shares,
  };
}

// Einmalig gecachte Promise pro Seitenaufruf: mehrfache Aufrufe von
// loadCurrentPoll() (z.B. mehrere showConstituency()-Durchlaeufe) loesen
// nie einen zweiten Netzwerk-Request aus, alle bekommen dieselbe Antwort.
let pollPromise = null;

function loadCurrentPoll() {
  if (pollPromise) return pollPromise;

  pollPromise = fetch(DAWUM_ENDPOINT, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`DAWUM-API antwortete mit Status ${res.status}`);
      return res.json();
    })
    .then((data) => {
      const parliamentId = findBerlinParliamentId(data.Parliaments || {});
      if (!parliamentId) throw new Error("Kein Berlin-Parlament in DAWUM-Daten gefunden");

      const recentSurveys = findRecentSurveys(data.Surveys || {}, parliamentId);
      if (recentSurveys.length === 0) throw new Error("Keine Berlin-Umfrage in DAWUM-Daten gefunden");

      const partyIdLookup = buildPartyIdLookup(data.Parties || {});
      const averaged = averageSurveys(recentSurveys, partyIdLookup, data.Institutes || {});
      if (!averaged) throw new Error("Keine der neuesten Berlin-Umfragen deckt alle getrackten Parteien ab");

      return { ...averaged, isLive: true };
    })
    .catch((err) => {
      console.warn("[poll-api] Live-Umfrage nicht verfuegbar, nutze Fallback:", err.message);
      return { ...FALLBACK_POLL, isLive: false };
    });

  return pollPromise;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DAWUM_SHORTCUT_TO_PARTY_ID,
    buildPartyIdLookup,
    findBerlinParliamentId,
    findRecentSurveys,
    extractShares,
    averageSurveys,
    loadCurrentPoll,
  };
}
