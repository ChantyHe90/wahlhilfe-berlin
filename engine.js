// Election Engine (PoC): Hare-Niemeyer-Sitzzuteilung + 5%-Huerde +
// vereinfachte Ueberhang-/Ausgleichs-Logik. Kennt keine Parteinamen,
// nur PartyId -> Stimmen. Bewusst stark vereinfacht (kein
// Grundmandatsklausel, keine echten Landeslisten, keine Bezirksebene).

  // Hare-Niemeyer (Quotenverfahren mit Restausgleich) — echtes Berlin-Wahlrecht fuer die Sitzverteilung des
  // Abgeordnetenhauses. Mechanik in hareNiemeyer(): jede Partei bekommt zunaechst floor(totalSeats * Stimmen /
  // Gesamtstimmen) Sitze (Ganzzahl-Anteil). Die restlichen Sitze gehen an die Parteien mit den hoechsten
  // Nachkommastellen (Restanteilen) dieser Rechnung, bis alle Sitze vergeben sind.
  //
  // Bekannte Eigenschaft von Hare-Niemeyer (keine Implementierungs-Macke, sondern Eigenschaft des echten
  // Verfahrens): nicht monoton. Mehr Gesamtsitze koennen einer Partei theoretisch einen Sitz *kosten*
  // (Alabama-Paradoxon). Die Ausgleichs-Schleife unten (allocateParliament) kann das in Randfaellen zeigen.
  //
  // Rundungs-Gleichstand (zwei Parteien mit exakt demselben Restanteil um den letzten Sitz): echtes Wahlrecht
  // entscheidet per Los. Diese App hat kein Zufallselement, deshalb deterministischer Tie-Break: erst hoehere
  // absolute Stimmenzahl, dann alphabetisch nach PartyId. Nur fuer Reproduzierbarkeit, kein Abbild der
  // amtlichen Losverfahren-Praxis.

  // 5%-Hürde — Partei unter 5% der Zweitstimmen (berlinweit) kriegt keine Sitze aus der Zweitstimmen-Rechnung,
  // fliegt komplett aus der Hare-Niemeyer-Rechnung raus. In allocateParliament(): eligibleParties filtert das.
  //
  // Direktmandat und 5%-Huerde sind zwei getrennte Dinge und duerfen nicht vermischt werden: wer im Wahlkreis
  // die meisten Erststimmen bekommt, gewinnt das Direktmandat — unabhaengig davon, ob die eigene Partei
  // landesweit ueber oder unter 5% liegt (getConstituencyWinners() kennt eligibleParties nicht mehr). Ob eine
  // Partei unter 5% ihr gewonnenes Direktmandat "einfach so" behaelt, obwohl sie sonst keine Sitze aus der
  // Zweitstimmen-Rechnung bekommt, ist in echtem Wahlrecht ein Sonderfall (vergleichbar einer
  // Grundmandatsklausel-Wirkung nur fuer die gewonnenen Wahlkreise, nicht fuer die ganze Landesliste). Diese
  // App bildet das vereinfacht ab: siehe Kommentar bei der Ausgleichs-Schleife in allocateParliament().

  // Szenario-Verschiebung (scenarioSwingPct, applySwing()) — simuliert NICHT eine einzelne Stimme, sondern die
  // Frage "was waere, wenn Partei X berlinweit N Prozentpunkte staerker abschneidet". Die Prozentpunkte kommen
  // proportional von allen anderen Parteien (Gesamtsumme bleibt gleich). Regler in der UI, kein fester Wert.
  //
  // Nicht zu verwechseln mit der Umfrage-Verschiebung (applyUniformSwing(), Fachbegriff "Uniform Swing"): die
  // ueberschreibt die 2023-Basis mit einer echten, bereits gemessenen Umfrage, gleichmaessig auf alle Wahlkreise
  // verteilt. Zwei unterschiedliche Mechanismen, beide verschieben Stimmenanteile, aber zu unterschiedlichen
  // Zwecken.

  // Zusatz, nicht im Diagramm-Text: engine.js macht noch vereinfachte Überhang-/Ausgleichsmandate — zählt Sitze
  // hoch bis jede Partei ueber der 5%-Huerde mindestens so viele Sitze hat wie Direktmandate gewonnen
  // (while-Schleife in allocateParliament()). Parteien unter der 5%-Huerde mit Direktmandat bekommen ihre
  // Direktmandate separat obendrauf, ausserhalb der proportionalen Rechnung (siehe Kommentar dort) — kein
  // echtes Ueberhang-/Ausgleichsmandatsverfahren fuer diesen Fall, nur eine sichtbare Modellgrenze.

// Hare-Niemeyer-Sitzverteilung: floor(Quote) je Partei, Restsitze an die
// hoechsten Nachkommastellen. Gibt neben den Sitzen auch die Rechenbasis pro
// Partei zurueck (quota, remainder) sowie remainderCutoff (niedrigster
// Restanteil, der noch einen Sitz bekam) - das Hare-Niemeyer-Aequivalent zu
// einer Sainte-Laguë-Schwelle, siehe Kommentar oben.
function hareNiemeyer(votes, totalSeats) {
  const partyIds = Object.keys(votes);
  const total = partyIds.reduce((sum, p) => sum + votes[p], 0);

  const seats = Object.fromEntries(partyIds.map((p) => [p, 0]));
  const details = {};

  if (total <= 0 || totalSeats <= 0) {
    for (const p of partyIds) details[p] = { seats: 0, quota: 0, remainder: 0 };
    return { seats, details, remainderCutoff: null };
  }

  let distributed = 0;
  const remainders = [];
  for (const p of partyIds) {
    const quota = (totalSeats * votes[p]) / total;
    const base = Math.floor(quota);
    seats[p] = base;
    distributed += base;
    const remainder = quota - base;
    details[p] = { seats: base, quota, remainder };
    remainders.push({ party: p, remainder, votes: votes[p] });
  }

  const remainingSeats = totalSeats - distributed;

  // Deterministischer Tie-Break, siehe Kommentar oben: hoechster Restanteil
  // zuerst, bei exaktem Gleichstand hoehere Stimmenzahl, danach Partei-Id
  // alphabetisch.
  remainders.sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.party.localeCompare(b.party);
  });

  let remainderCutoff = null;
  for (let i = 0; i < remainingSeats; i++) {
    const p = remainders[i].party;
    seats[p]++;
    details[p].seats++;
    remainderCutoff = remainders[i].remainder;
  }

  return { seats, details, remainderCutoff };
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

// Erststimme: wer im Wahlkreis die meisten Erststimmen hat, gewinnt das
// Direktmandat - unabhaengig von der landesweiten 5%-Huerde (siehe
// Datei-Kommentar oben). Kennt eligibleParties deshalb bewusst nicht mehr.
function getConstituencyWinners(constituencies) {
  const winners = {};
  const directCounts = {};
  for (const c of constituencies) {
    let bestParty = null;
    let bestVotes = -1;
    for (const [party, votes] of Object.entries(c.firstVotes)) {
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

  const { winners, directCounts } = getConstituencyWinners(constituencies);

  // Vereinfachte Ausgleichsmandate: Sitzzahl so lange erhoehen, bis jede
  // *huerdenberechtigte* Partei mindestens so viele Sitze per Hare-Niemeyer
  // bekommt, wie sie Direktmandate hat. Nur eligible Parteien pruefen, sonst
  // wuerde eine Partei unter 5% mit Direktmandat (kann per Erststimme
  // vorkommen, siehe oben) nie in eligibleVotes/seats auftauchen und die
  // Schleife liefe bis zum guard-Limit durch.
  let totalSeats = baseSeats;
  let allocation = hareNiemeyer(eligibleVotes, totalSeats);
  let guard = 0;
  while (
    Object.entries(directCounts).some(
      ([p, d]) => eligibleParties.has(p) && (allocation.seats[p] || 0) < d
    ) &&
    guard < 500
  ) {
    totalSeats++;
    allocation = hareNiemeyer(eligibleVotes, totalSeats);
    guard++;
  }

  const seats = { ...allocation.seats };

  // Modellgrenze: gewinnt eine Partei unter der 5%-Huerde trotzdem ein
  // Direktmandat, bekommt sie im echten Wahlrecht diesen einen Sitz (siehe
  // Datei-Kommentar oben), aber keine Sitze aus der Zweitstimmen-Rechnung,
  // weil ihre Zweitstimmen dort nicht mitzaehlen. Diese App zaehlt solche
  // Direktmandate 1:1 obendrauf - kein echtes Ueberhang-/
  // Ausgleichsmandatsverfahren fuer diesen Fall, nur eine sichtbare
  // Modellgrenze statt einer scheinbar exakten Berechnung.
  for (const [p, d] of Object.entries(directCounts)) {
    if (!eligibleParties.has(p)) {
      seats[p] = d;
      totalSeats += d;
    }
  }

  return {
    totalSeats,
    seats, // partyId -> Sitze
    directCounts, // partyId -> Anzahl Direktmandate
    constituencyWinners: winners, // constituencyId -> partyId
    eligibleParties: [...eligibleParties],
    totals,
    totalValid,
    remainders: allocation.details, // partyId -> { seats, quota, remainder (0..1) }
    remainderCutoff: allocation.remainderCutoff, // niedrigster Restanteil, der im finalen Ergebnis noch einen Sitz bekam (null wenn keine Restsitze noetig waren)
  };
}

// Szenario-Verschiebung: die Zielpartei bekommt +scenarioSwingPct
// Prozentpunkte, alle anderen Parteien verlieren proportional zueinander,
// sodass die Gesamtsumme gleich bleibt. Das ist eine hypothetische
// Testrechnung, keine Simulation einer einzelnen abgegebenen Stimme.
function applySwing(votesObj, targetParty, scenarioSwingPct) {
  const total = Object.values(votesObj).reduce((a, b) => a + b, 0);
  const shift = (scenarioSwingPct / 100) * total;

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
function buildScenario(constituencies, { constituencyId, firstVoteParty, secondVoteParty, scenarioSwingPct }) {
  return constituencies.map((c) => {
    const next = { ...c };
    if (c.id === constituencyId && firstVoteParty) {
      next.firstVotes = applySwing(c.firstVotes, firstVoteParty, scenarioSwingPct);
    }
    if (secondVoteParty) {
      next.secondVotes = applySwing(c.secondVotes, secondVoteParty, scenarioSwingPct);
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
//
// Iteriert bewusst ueber die Vereinigung der Parteien aus votesObj UND
// currentShares (nicht nur Object.keys(votesObj)): eine Partei, die in
// currentShares neu auftaucht, aber im historischen votesObj (2023) noch
// nicht existierte (z.B. BSW), soll trotzdem mit localShare 0 starten und
// die volle currentShares/baselineShares-Differenz bekommen, statt beim
// Verschieben komplett zu verschwinden. Vorher fehlerhaft: nur
// Object.keys(votesObj) durchlaufen, neue Parteien wurden nie geschrieben.
function applyUniformSwing(votesObj, currentShares, baselineShares) {
  const total = Object.values(votesObj).reduce((a, b) => a + b, 0);
  const parties = new Set([...Object.keys(votesObj), ...Object.keys(currentShares)]);
  const result = {};
  for (const party of parties) {
    const localShare = total > 0 ? (votesObj[party] || 0) / total : 0;
    const delta = (currentShares[party] || 0) - (baselineShares[party] || 0);
    result[party] = Math.max(0, localShare + delta) * total;
  }
  return result;
}

// Baut aus den 2023-Wahlkreisdaten eine "aktuelle" Variante: jeder
// Wahlkreis behaelt seine 2023-Verteilung als lokale Grundlage, aber
// landesweit verschoben auf die aktuellen Umfragewerte (pollShares).
//
// Modellgrenze BSW (und jede andere Partei ohne 2023-Wahlkreisdaten): fliesst
// nur in die Zweitstimmen-Verschiebung ein (dort in die landesweite
// Sitzberechnung), NICHT in die Erststimmen-Verschiebung. Grund: die
// Zweitstimmen-Zahl je Wahlkreis war schon vorher fuer alle Parteien nur
// "2023er Lokalverteilung + landesweite Umfrage-Differenz" - fuer eine
// Partei ohne 2023-Anker (BSW) ist die lokale Zahl dann aber zu 100% aus dem
// Landeswert konstruiert, ohne jede lokale Grundlage. Die App zeigt diese
// Zahl deshalb bewusst nicht als Wahlkreis-Ergebnis an (siehe app.js), auch
// wenn sie hier fuer die Sitzberechnung mitgerechnet wird. Fuer die
// Erststimme gibt es dafuer keinen Anwendungsfall: keine erfundene lokale
// Erststimmen-/Direktmandats-Verteilung fuer Parteien ohne echte 2023-Daten.
function buildCurrentBaseline(constituencies, pollShares) {
  const baseline2023Second = computeLandShares(constituencies, "secondVotes");
  const baseline2023First = computeLandShares(constituencies, "firstVotes");

  const firstVotePollShares = Object.fromEntries(
    Object.entries(pollShares).filter(([party]) => party in baseline2023First)
  );

  return constituencies.map((c) => ({
    ...c,
    firstVotes: applyUniformSwing(c.firstVotes, firstVotePollShares, baseline2023First),
    secondVotes: applyUniformSwing(c.secondVotes, pollShares, baseline2023Second),
  }));
}

// Strategische Erststimmen-Empfehlung: wer im Wahlkreis am ehesten
// avoidPartyId (z.B. "afd") ein Direktmandat vermasseln kann. Engine kennt
// hier bewusst nur die uebergebene PartyId, keine Namen/Bedeutung.
// eligibleParties = Land-weit 5%-Huerden-Parteien: bewusste Vereinfachung
// der Empfehlung (nur Parteien vorschlagen, die auch landesweit eine Rolle
// spielen), unabhaengig davon, dass ein Direktmandat selbst laut
// getConstituencyWinners() keine 5%-Huerde kennt.
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
function simulateSecondVoteOnly(constituencies, secondVoteParty, scenarioSwingPct) {
  const scenarioConstituencies = buildScenario(constituencies, {
    constituencyId: null,
    firstVoteParty: null,
    secondVoteParty,
    scenarioSwingPct,
  });
  return allocateParliament(scenarioConstituencies);
}

// Testet fuer jede Partei (ausser avoidPartyId) dieselbe Szenario-Verschiebung
// und vergleicht, wie sich das auf die Sitzzahl von avoidPartyId auswirkt.
// Liefert eine sortierbare Liste - keine versteckte "beste Partei"-Magie,
// nur dieselbe applySwing()-Rechnung pro Partei durchgefuehrt.
function recommendSecondVoteAgainst(constituencies, avoidPartyId, scenarioSwingPct) {
  const baseline = allocateParliament(constituencies);
  const baselineSeats = baseline.seats[avoidPartyId] || 0;
  const partyIds = Object.keys(sumSecondVotes(constituencies)).filter((p) => p !== avoidPartyId);

  const results = partyIds.map((party) => {
    const scenario = simulateSecondVoteOnly(constituencies, party, scenarioSwingPct);
    const scenarioSeats = scenario.seats[avoidPartyId] || 0;
    return { party, baselineSeats, scenarioSeats, delta: scenarioSeats - baselineSeats, scenario };
  });

  const bestDelta = results.length ? Math.min(...results.map((r) => r.delta)) : 0;
  const bestParties = results.filter((r) => r.delta === bestDelta);

  return { baseline, baselineSeats, results, bestDelta, bestParties };
}

// Hare-Niemeyer-Aequivalent zur alten Sainte-Laguë-"votesToNextSeat()":
// KEINE Stimmenprognose mehr, nur noch der Restanteil-Abstand zur Schwelle.
// Grund: bei Sainte-Laguë hing der Quotient einer Partei nur von ihren
// eigenen Stimmen und ihrem eigenen Sitzstand ab (unabhaengig von anderen
// Parteien) - "X Stimmen mehr" liess sich daraus sauber ausrechnen. Bei
// Hare-Niemeyer haengt der Restanteil jeder Partei von der Gesamtstimmenzahl
// ALLER Parteien gemeinsam ab, und die Zuteilung ist nicht monoton
// (Alabama-Paradoxon, siehe Datei-Kommentar oben). Eine "in N Stimmen kippt
// der Sitz"-Zahl waere hier keine Naeherung, sondern schlicht falsch
// begruendet - deshalb bewusst nicht implementiert. Was mathematisch
// sinnvoll bleibt: wie nah der Restanteil einer Partei an der Schwelle
// (remainderCutoff) liegt, in Prozentpunkten Restanteil.
function remainderGap(allocation, party) {
  const info = allocation.remainders[party];
  if (!info) return null;
  if (allocation.remainderCutoff === null) return { remainder: info.remainder, cutoff: null, gapPct: null };
  const gapPct = (info.remainder - allocation.remainderCutoff) * 100;
  return { remainder: info.remainder, cutoff: allocation.remainderCutoff, gapPct };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    hareNiemeyer,
    sumSecondVotes,
    getConstituencyWinners,
    allocateParliament,
    applySwing,
    buildScenario,
    simulate,
    computeLandShares,
    applyUniformSwing,
    buildCurrentBaseline,
    recommendDirectMandateAgainst,
    simulateSecondVoteOnly,
    recommendSecondVoteAgainst,
    remainderGap,
  };
}
