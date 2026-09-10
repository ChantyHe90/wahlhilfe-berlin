// Laedt die neueste Berlin-Umfrage von der oeffentlichen DAWUM-API
// (https://dawum.de/API/) und normalisiert sie auf das App-eigene Format
// { date, source, institute, shares, isLive }. Reine Netzwerk-/Parsing-
// Schicht, getrennt von app.js (State/Rendering) und engine.js (Berechnung).
// Wirft nach aussen nie einen Fehler: loadCurrentPoll() faellt bei jedem
// Problem (Netzwerk, Format, fehlende Partei) auf FALLBACK_POLL aus data.js
// zurueck - siehe Kommentar dort.

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

function findNewestSurvey(surveysBlock, parliamentId) {
  const matches = Object.values(surveysBlock).filter((s) => s.Parliament_ID === parliamentId);
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.Date.localeCompare(a.Date));
  return matches[0];
}

// Baut aus einer rohen DAWUM-Survey unser {date, source, institute, shares}.
// Gibt null zurueck, wenn irgendeine der 7 getrackten Parteien in den
// Ergebnissen fehlt (z.B. unter "Sonstige" zusammengefasst) - dann ist diese
// Umfrage fuer unser Modell unvollstaendig. Bewusst KEIN Fallback auf 0% fuer
// die fehlende Partei und KEIN Mix aus Live- und Fallback-Werten innerhalb
// derselben Umfrage (siehe Konzept-Abwaegung) - stattdessen faellt
// loadCurrentPoll() dann komplett auf FALLBACK_POLL zurueck.
function normalizeSurvey(survey, partyIdLookup, institutesBlock) {
  const shares = {};
  for (const ourId of TRACKED_PARTY_IDS) {
    const dawumId = partyIdLookup[ourId];
    const value = dawumId !== undefined ? survey.Results[dawumId] : undefined;
    if (value === undefined) return null;
    shares[ourId] = value;
  }

  const institute = institutesBlock[survey.Institute_ID]?.Name || null;
  return {
    date: formatGermanDate(survey.Date),
    source: institute ? `${institute} (DAWUM Open Data)` : "DAWUM Open Data",
    institute,
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

      const survey = findNewestSurvey(data.Surveys || {}, parliamentId);
      if (!survey) throw new Error("Keine Berlin-Umfrage in DAWUM-Daten gefunden");

      const partyIdLookup = buildPartyIdLookup(data.Parties || {});
      const normalized = normalizeSurvey(survey, partyIdLookup, data.Institutes || {});
      if (!normalized) throw new Error("Neueste Berlin-Umfrage deckt nicht alle getrackten Parteien ab");

      return { ...normalized, isLive: true };
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
    findNewestSurvey,
    normalizeSurvey,
    loadCurrentPoll,
  };
}
