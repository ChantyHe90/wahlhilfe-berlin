// Election Engine (PoC): Sainte-Lague Sitzzuteilung + 5%-Huerde +
// vereinfachte Ueberhang-/Ausgleichs-Logik. Kennt keine Parteinamen,
// nur PartyId -> Stimmen. Bewusst stark vereinfacht (kein
// Grundmandatsklausel, keine echten Landeslisten).

  // Sainte-Laguë — Sitzverteilungsverfahren. Rechnet Stimmen einer Partei in Sitze um, proportional. Mechanik in sainteLague(): jede
  // Partei kriegt Quotient Stimmen / (2×bisherige_Sitze + 1). Höchster Quotient kriegt nächsten Sitz, Runde für Runde, bis alle Sitze
  // vergeben. Ergebnis: Sitzanteil ≈ Stimmenanteil, rundet fair (kein systematischer Vor-/Nachteil für kleine/große Parteien wie bei
  // anderen Verfahren, z.B. d'Hondt). Auch echtes Berlin-Wahlrecht nutzt Sainte-Laguë.

  // 5%-Hürde — Partei unter 5% der Zweitstimmen (berlinweit) kriegt keine Sitze, fliegt komplett aus der Sainte-Laguë-Rechnung raus.
  // In allocateParliament(): eligibleParties filtert das vorher.

  // Szenario-Verschiebung (3 Pp., applySwing()) — simuliert NICHT eine einzelne Stimme, sondern die Frage "was waere,
  // wenn Partei X berlinweit 3 Prozentpunkte staerker abschneidet". Die Prozentpunkte kommen proportional von allen
  // anderen Parteien (Gesamtsumme bleibt gleich). Fest im Code (SWING_PCT = 3 in app.js), kein Regler.
  //
  // Nicht zu verwechseln mit der Umfrage-Verschiebung (applyUniformSwing(), Fachbegriff "Uniform Swing"): die
  // ueberschreibt die 2023-Basis mit einer echten, bereits gemessenen Umfrage, gleichmaessig auf alle Wahlkreise
  // verteilt. Zwei unterschiedliche Mechanismen, beide verschieben Stimmenanteile, aber zu unterschiedlichen Zwecken.

  // Zusatz, nicht im Diagramm-Text: engine.js macht noch vereinfachte Überhang-/Ausgleichsmandate — zählt Sitze hoch bis jede Partei
  // mindestens so viele Sitze hat wie Direktmandate gewonnen (while-Schleife in allocateParliament()).

function sainteLague(votes, totalSeats) {
  // Divisorverfahren: in jeder Runde bekommt die Partei mit dem
  // hoechsten votes/(2*seats+1) den naechsten Sitz.
  const partyIds = Object.keys(votes);
  const seats = Object.fromEntries(partyIds.map((p) => [p, 0]));

  for (let i = 0; i < totalSeats; i++) {
    let bestParty = null;
    let bestQuotient = -1;
    for (const p of partyIds) {
      const quotient = votes[p] / (2 * seats[p] + 1);
      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestParty = p;
      }
    }
    if (bestParty === null) break;
    seats[bestParty]++;
  }
  return seats;
}

function sumSecondVotes(constituencies) {
  const totals = {};
  for (const c of constituencies) {
    for (const [party, votes] of Object.entries(c.secondVotes)) {
      totals[party] = (totals[party] || 0) + votes;
    }
  }
  return totals;
}

function getConstituencyWinners(constituencies, eligibleParties) {
  const winners = {};
  const directCounts = {};
  for (const c of constituencies) {
    let bestParty = null;
    let bestVotes = -1;
    for (const [party, votes] of Object.entries(c.firstVotes)) {
      if (!eligibleParties.has(party)) continue; // vereinfachend: nur 5%-Parteien gewinnen Direktmandate
      if (votes > bestVotes) {
        bestVotes = votes;
        bestParty = party;
      }
    }
    winners[c.id] = bestParty;
    if (bestParty) directCounts[bestParty] = (directCounts[bestParty] || 0) + 1;
  }
  return { winners, directCounts };
}

function allocateParliament(constituencies, options = {}) {
  const baseSeats = options.baseSeats || 130;
  const thresholdPct = options.thresholdPct || 5;

  const totals = sumSecondVotes(constituencies);
  const totalValid = Object.values(totals).reduce((a, b) => a + b, 0);

  const eligibleParties = new Set(
    Object.entries(totals)
      .filter(([, v]) => (v / totalValid) * 100 >= thresholdPct)
      .map(([p]) => p)
  );

  const eligibleVotes = Object.fromEntries(
    Object.entries(totals).filter(([p]) => eligibleParties.has(p))
  );

  const { winners, directCounts } = getConstituencyWinners(constituencies, eligibleParties);

  // Vereinfachte Ausgleichsmandate: Sitzzahl so lange erhoehen, bis
  // jede Partei mindestens so viele Sitze per Sainte-Laguë bekommt,
  // wie sie Direktmandate hat.
  let totalSeats = baseSeats;
  let seats = sainteLague(eligibleVotes, totalSeats);
  let guard = 0;
  while (
    Object.entries(directCounts).some(([p, d]) => (seats[p] || 0) < d) &&
    guard < 500
  ) {
    totalSeats++;
    seats = sainteLague(eligibleVotes, totalSeats);
    guard++;
  }

  // Quotienten-Info fuer den Erklaermodus: bei Sainte-Laguë bekommt in jeder
  // Runde die Partei mit dem hoechsten Quotienten (Stimmen / (2*Sitze+1)) den
  // naechsten Sitz. cutoffQuotient ist der niedrigste Quotient, der noch
  // einen Sitz "gekauft" hat - das erklaert, warum ein kleiner Stimmenshift
  // manchmal einen Sitz zwischen zwei Parteien verschiebt und manchmal nicht:
  // nur wer nah an dieser Schwelle liegt, ist "wacklig".
  let cutoffQuotient = Infinity;
  const quotients = {};
  for (const party of Object.keys(eligibleVotes)) {
    const s = seats[party] || 0;
    const lastQuotient = s > 0 ? eligibleVotes[party] / (2 * s - 1) : null;
    const nextQuotient = eligibleVotes[party] / (2 * s + 1);
    quotients[party] = { seats: s, lastQuotient, nextQuotient };
    if (lastQuotient !== null && lastQuotient < cutoffQuotient) cutoffQuotient = lastQuotient;
  }

  return {
    totalSeats,
    seats, // partyId -> Sitze
    directCounts, // partyId -> Anzahl Direktmandate
    constituencyWinners: winners, // constituencyId -> partyId
    eligibleParties: [...eligibleParties],
    totals,
    totalValid,
    quotients, // partyId -> { seats, lastQuotient, nextQuotient }
    cutoffQuotient, // niedrigster Quotient, der im finalen Ergebnis noch einen Sitz bekam
  };
}

// Szenario-Verschiebung: die Zielpartei bekommt +swingPct Prozentpunkte,
// alle anderen Parteien verlieren proportional zueinander, sodass die
// Gesamtsumme gleich bleibt. Das ist eine hypothetische Testrechnung, keine
// Simulation einer einzelnen abgegebenen Stimme.
function applySwing(votesObj, targetParty, swingPct) {
  const total = Object.values(votesObj).reduce((a, b) => a + b, 0);
  const shift = (swingPct / 100) * total;

  const oldTargetVotes = votesObj[targetParty] || 0;
  const othersTotal = total - oldTargetVotes;

  const result = { ...votesObj };
  result[targetParty] = oldTargetVotes + shift;

  if (othersTotal > 0) {
    for (const party of Object.keys(result)) {
      if (party === targetParty) continue;
      const share = result[party] / othersTotal;
      result[party] = result[party] - shift * share;
    }
  }
  return result;
}

// Baut ein Szenario: Erststimme wirkt nur lokal im gewaehlten Wahlkreis
// (Direktmandat), Zweitstimme wirkt als Szenario-Verschiebung auf alle
// Wahlkreise gleichermassen (siehe Konzept "letzte Wahl + landesweite
// Verschiebung").
function buildScenario(constituencies, { constituencyId, firstVoteParty, secondVoteParty, swingPct }) {
  return constituencies.map((c) => {
    const next = { ...c };
    if (c.id === constituencyId && firstVoteParty) {
      next.firstVotes = applySwing(c.firstVotes, firstVoteParty, swingPct);
    }
    if (secondVoteParty) {
      next.secondVotes = applySwing(c.secondVotes, secondVoteParty, swingPct);
    }
    return next;
  });
}

function simulate(constituencies, params) {
  const baseline = allocateParliament(constituencies);
  const scenarioConstituencies = buildScenario(constituencies, params);
  const scenario = allocateParliament(scenarioConstituencies);
  return { baseline, scenario };
}

// Summiert einen Stimmentyp ("firstVotes"/"secondVotes") ueber alle
// Wahlkreise und gibt Anteile (0..1) je Partei zurueck, normiert auf die
// hier getrackten Parteien (nicht auf 100% aller tatsaechlich abgegebenen
// Stimmen, siehe data.js-Kommentar).
function computeLandShares(constituencies, voteKey) {
  const totals = {};
  for (const c of constituencies) {
    for (const [party, votes] of Object.entries(c[voteKey])) {
      totals[party] = (totals[party] || 0) + votes;
    }
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  const shares = {};
  for (const party of Object.keys(totals)) shares[party] = totals[party] / sum;
  return shares;
}

// Umfrage-Verschiebung (Fachbegriff "Uniform Swing"): verschiebt die
// Stimmen eines Wahlkreises so, dass sich der landesweite Anteil jeder
// Partei um dieselbe Differenz aendert wie zwischen baselineShares und
// currentShares (z.B. 2023-Ergebnis vs. aktuelle Umfrage) - die lokale
// Eigenart des Wahlkreises (wer dort relativ staerker/schwaecher ist als
// der Landesdurchschnitt) bleibt erhalten. Gesamtzahl Stimmen im Wahlkreis
// bleibt gleich (keine neuere lokale Wahlbeteiligung bekannt). Anders als
// applySwing(): das hier ueberschreibt die Basis mit einer echten Umfrage,
// keine hypothetische Testrechnung.
function applyUniformSwing(votesObj, currentShares, baselineShares) {
  const total = Object.values(votesObj).reduce((a, b) => a + b, 0);
  const result = {};
  for (const party of Object.keys(votesObj)) {
    const localShare = total > 0 ? votesObj[party] / total : 0;
    const delta = (currentShares[party] || 0) - (baselineShares[party] || 0);
    result[party] = Math.max(0, localShare + delta) * total;
  }
  return result;
}

// Baut aus den 2023-Wahlkreisdaten eine "aktuelle" Variante: jeder
// Wahlkreis behaelt seine 2023-Verteilung als lokale Grundlage, aber
// landesweit verschoben auf die aktuellen Umfragewerte (pollShares).
function buildCurrentBaseline(constituencies, pollShares) {
  const baseline2023Second = computeLandShares(constituencies, "secondVotes");
  const baseline2023First = computeLandShares(constituencies, "firstVotes");
  return constituencies.map((c) => ({
    ...c,
    firstVotes: applyUniformSwing(c.firstVotes, pollShares, baseline2023First),
    secondVotes: applyUniformSwing(c.secondVotes, pollShares, baseline2023Second),
  }));
}

// Strategische Erststimmen-Empfehlung: wer im Wahlkreis am ehesten
// avoidPartyId (z.B. "afd") ein Direktmandat vermasseln kann. Engine kennt
// hier bewusst nur die uebergebene PartyId, keine Namen/Bedeutung.
// eligibleParties = Land-weit 5%-Huerden-Parteien (wie getConstituencyWinners
// es auch handhabt) - dieselbe Vereinfachung wie beim echten Sitzausgleich.
function recommendDirectMandateAgainst(constituency, eligibleParties, avoidPartyId) {
  const entries = Object.entries(constituency.firstVotes)
    .filter(([p]) => eligibleParties.includes(p))
    .sort((a, b) => b[1] - a[1]);
  const avoidIndex = entries.findIndex(([p]) => p === avoidPartyId);
  const challengers = entries.filter(([p]) => p !== avoidPartyId);
  const leader = entries[0] || null;
  const avoidEntry = avoidIndex >= 0 ? entries[avoidIndex] : null;
  const avoidLeads = avoidIndex === 0;
  const recommended = avoidLeads ? challengers[0] : leader;

  let margin = null;
  if (recommended && avoidEntry) {
    margin = avoidLeads ? avoidEntry[1] - recommended[1] : recommended[1] - avoidEntry[1];
  }

  return {
    recommendedParty: recommended ? recommended[0] : null,
    recommendedVotes: recommended ? recommended[1] : null,
    avoidLeads,
    avoidCompetitive: avoidIndex !== -1 && avoidIndex <= 1,
    avoidVotes: avoidEntry ? avoidEntry[1] : 0,
    margin,
    ranking: entries,
  };
}

// Wie simulate(), aber nur die Zweitstimmen-Verschiebung (berlinweit), ohne
// lokale Erststimmen-Aenderung - die braucht keinen Wahlkreis-Bezug.
function simulateSecondVoteOnly(constituencies, secondVoteParty, swingPct) {
  const scenarioConstituencies = buildScenario(constituencies, {
    constituencyId: null,
    firstVoteParty: null,
    secondVoteParty,
    swingPct,
  });
  return allocateParliament(scenarioConstituencies);
}

// Testet fuer jede Partei (ausser avoidPartyId) dieselbe Szenario-Verschiebung
// und vergleicht, wie sich das auf die Sitzzahl von avoidPartyId auswirkt.
// Liefert eine sortierbare Liste - keine versteckte "beste Partei"-Magie,
// nur dieselbe applySwing()-Rechnung pro Partei durchgefuehrt.
function recommendSecondVoteAgainst(constituencies, avoidPartyId, swingPct) {
  const baseline = allocateParliament(constituencies);
  const baselineSeats = baseline.seats[avoidPartyId] || 0;
  const partyIds = Object.keys(sumSecondVotes(constituencies)).filter((p) => p !== avoidPartyId);

  const results = partyIds.map((party) => {
    const scenario = simulateSecondVoteOnly(constituencies, party, swingPct);
    const scenarioSeats = scenario.seats[avoidPartyId] || 0;
    return { party, baselineSeats, scenarioSeats, delta: scenarioSeats - baselineSeats, scenario };
  });

  const bestDelta = results.length ? Math.min(...results.map((r) => r.delta)) : 0;
  const bestParties = results.filter((r) => r.delta === bestDelta);

  return { baseline, baselineSeats, results, bestDelta, bestParties };
}

// Wie viele zusaetzliche Zweitstimmen (berlinweit, alles andere gleich)
// braucht eine Partei ungefaehr fuer ihren naechsten Sitz - aus cutoffQuotient
// und dem eigenen naechsten Quotienten hergeleitet (gleiche Mechanik wie
// renderQuotientExplain in app.js, nur als Zahl statt als Text).
function votesToNextSeat(allocation, party) {
  const q = allocation.quotients[party];
  if (!q) return null;
  const needed = allocation.cutoffQuotient * (2 * q.seats + 1) - (allocation.totals[party] || 0);
  return Math.max(0, Math.round(needed));
}
