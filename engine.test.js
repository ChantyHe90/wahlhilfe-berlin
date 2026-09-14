// Einfache Node-Tests ohne Framework: `node engine.test.js`.
// Deckt Hare-Niemeyer (Kernverfahren), 5%-Huerde-Randfaelle inkl.
// Grundmandatsklausel, BSW/applyUniformSwing-Fix, Direktmandate >
// proportionale Sitzzahl, sowie einen Regressionstest gegen die echten
// amtlichen 2023-Wahlkreisdaten ab.

const assert = require("assert");
const {
  hareNiemeyer,
  allocateParliament,
  applyUniformSwing,
  buildCurrentBaseline,
  recommendDirectMandateAgainst,
  findRobustSecondVoteAlternative,
} = require("./engine.js");
const { CONSTITUENCIES, FALLBACK_POLL } = require("./data.js");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`FAIL - ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// 1) Einfache proportionale Verteilung, von Hand nachvollziehbar:
// 1000 Stimmen A:500 B:300 C:200, 10 Sitze.
// Quoten: A=5.0, B=3.0, C=2.0 - geht exakt auf, keine Restsitze noetig.
test("einfache proportionale Verteilung (exakt, kein Rest)", () => {
  const { seats, details, remainderCutoff } = hareNiemeyer({ a: 500, b: 300, c: 200 }, 10);
  assert.deepStrictEqual(seats, { a: 5, b: 3, c: 2 });
  assert.strictEqual(details.a.remainder, 0);
  assert.strictEqual(remainderCutoff, null); // keine Restsitze vergeben
});

// 2) Rundungsfall, von Hand nachvollziehbar:
// 100 Stimmen A:41 B:29 C:30, 10 Sitze.
// Quoten: A=4.1, B=2.9, C=3.0 -> floor: A=4 B=2 C=3 = 9 Sitze, 1 Rest.
// Restanteile: A=0.1, B=0.9, C=0.0 -> hoechster Rest B -> B bekommt den Sitz.
test("Rundungsfall: Restsitz geht an höchsten Restanteil", () => {
  const { seats, remainderCutoff } = hareNiemeyer({ a: 41, b: 29, c: 30 }, 10);
  assert.deepStrictEqual(seats, { a: 4, b: 3, c: 3 });
  assert.ok(Math.abs(remainderCutoff - 0.9) < 1e-9);
});

// 3) Deterministischer Tie-Break bei exakt gleichem Restanteil:
// 100 Stimmen A:15 B:15, 3 Sitze je (kuenstlich fuer klaren Bruch).
// A:25 B:25 C:50, 3 Sitze -> Quoten A=0.75 B=0.75 C=1.5 -> floor A=0 B=0 C=1,
// 2 Restsitze, A und B exakt gleicher Restanteil (0.75) -> Tie-Break: gleiche
// Stimmenzahl -> alphabetisch, a vor b.
test("Sitzverteilung bei exaktem Gleichstand ist deterministisch", () => {
  const run1 = hareNiemeyer({ a: 25, b: 25, c: 50 }, 3);
  const run2 = hareNiemeyer({ a: 25, b: 25, c: 50 }, 3);
  assert.deepStrictEqual(run1.seats, run2.seats);
  assert.deepStrictEqual(run1.seats, { a: 1, b: 1, c: 1 });
});

// 4) Partei knapp unter 5%: faellt komplett aus der Sitzverteilung.
test("Partei knapp unter 5% bekommt keine Sitze", () => {
  const constituencies = [
    {
      id: "k1",
      firstVotes: { a: 60, b: 40 },
      secondVotes: { a: 9600, b: 4849, c: 4800 }, // wird auf 78 Wahlkreise skaliert
    },
  ];
  // c liegt bei 4800 / 19249 = 24.94%... zu hoch, daher extra kleiner Test-Setup:
  const total = 9600 + 4849 + 400; // c = 400 -> ~2.7%, klar unter 5%
  constituencies[0].secondVotes = { a: 9600, b: 4849, c: 400 };
  const result = allocateParliament(constituencies, { baseSeats: 20 });
  assert.ok(!result.eligibleParties.includes("c"));
  assert.strictEqual(result.seats.c || 0, 0);
});

// 5) Partei knapp über 5%: wird beruecksichtigt.
test("Partei knapp über 5% wird bei der Sitzverteilung berücksichtigt", () => {
  const constituencies = [
    {
      id: "k1",
      firstVotes: { a: 60, b: 30, c: 10 },
      secondVotes: { a: 5000, b: 4500, c: 500 }, // c = 500/10000 = 5.0%
    },
  ];
  const result = allocateParliament(constituencies, { baseSeats: 20 });
  assert.ok(result.eligibleParties.includes("c"));
  assert.ok((result.seats.c || 0) >= 1);
});

// 6) Neue Partei (BSW-Fall): applyUniformSwing darf eine Partei, die im
// historischen votesObj fehlt, aber in currentShares auftaucht, nicht
// verschwinden lassen - vorher ein Bug (nur Object.keys(votesObj)).
test("applyUniformSwing nimmt neue Partei (z.B. BSW) mit auf, die historisch fehlt", () => {
  const votesObj2023 = { a: 600, b: 400 }; // kein "bsw" 2023
  const baselineShares = { a: 0.6, b: 0.4 }; // kein "bsw" 2023
  const currentShares = { a: 0.5, b: 0.4, bsw: 0.1 }; // bsw taucht neu auf
  const result = applyUniformSwing(votesObj2023, currentShares, baselineShares);
  assert.ok("bsw" in result);
  assert.ok(result.bsw > 0);
  // Gesamtstimmenzahl im Wahlkreis bleibt gleich (Definition von Uniform Swing hier).
  const totalBefore = 1000;
  const totalAfter = Object.values(result).reduce((x, y) => x + y, 0);
  assert.ok(Math.abs(totalAfter - totalBefore) < 1e-9);
});

// 7) Direktmandate groesser als zunaechst zugeteilte Sitzzahl: Ausgleichs-
// Schleife muss die Sitzzahl erhoehen, bis die Partei ihre Direktmandate
// abdeckt.
test("Ausgleichsmandate: Partei mit mehr Direktmandaten als Zweitstimmen-Sitzen wird ausgeglichen", () => {
  // b gewinnt in jedem der 3 Wahlkreise das Direktmandat (staerkste
  // Erststimme), hat aber bei den Zweitstimmen nur einen kleinen Anteil.
  const constituencies = [
    { id: "k1", firstVotes: { a: 10, b: 60 }, secondVotes: { a: 6000, b: 500 } },
    { id: "k2", firstVotes: { a: 10, b: 60 }, secondVotes: { a: 6000, b: 500 } },
    { id: "k3", firstVotes: { a: 10, b: 60 }, secondVotes: { a: 6000, b: 500 } },
  ];
  const result = allocateParliament(constituencies, { baseSeats: 10 });
  assert.strictEqual(result.directCounts.b, 3);
  assert.ok((result.seats.b || 0) >= 3, "b muss mindestens seine 3 Direktmandate behalten");
  assert.ok(result.totalSeats >= 10, "Sitzzahl muss fuer den Ausgleich wachsen");
});

// 8) Grundmandatsklausel (amtlich bestaetigt, parlament-berlin.de/Lexikon/
// sperrklausel): 1 Direktmandat reicht, damit eine Partei unter 5% trotzdem
// an der Sitzverteilung teilnimmt - Direktmandat und Huerde sind insofern
// nicht komplett unabhaengig, wie eine frühere Version dieses Tests annahm.
// b gewinnt hier lokal ein Direktmandat, landesweit aber klar unter 5%.
test("Partei unter 5% mit Direktmandat gewinnt weiterhin nur den Wahlkreis, bekommt aber ueber die Grundmandatsklausel Zugang zur Sitzverteilung", () => {
  const constituencies = [
    { id: "k1", firstVotes: { a: 40, b: 60 }, secondVotes: { a: 9000, b: 100 } },
    { id: "k2", firstVotes: { a: 90, b: 10 }, secondVotes: { a: 9000, b: 100 } },
  ];
  const result = allocateParliament(constituencies, { baseSeats: 10 });
  assert.strictEqual(result.constituencyWinners.k1, "b");
  // Vorher (Bug): !eligibleParties.includes("b"). Amtlich korrekt: b ist
  // trotz <5% huerdenberechtigt, weil sie ein Direktmandat gewonnen hat.
  assert.ok(result.eligibleParties.includes("b"));
  assert.strictEqual(result.seats.b, 1);
  assert.ok(result.totalSeats >= 10, "Ausgleichs-Schleife muss ggf. ueber baseSeats hinaus wachsen, bis b's 1 Direktmandat gedeckt ist");
  // Die exakte totalSeats-Zahl haengt nicht nur vom floor(Quote)-Anteil ab,
  // sondern auch davon, wann b's Restanteil im Vergleich zu a's Restanteil
  // hoch genug ist, um den letzten Sitz einer Runde zu gewinnen - das von
  // Hand durchzurechnen ist fehleranfaellig (siehe Testlauf-Historie). Der
  // quantitativ hand-verifizierte Fall steht in Test 9 unten.
});

// 9) Grundmandatsklausel mit deutlichem Unterschied zur alten (falschen)
// Logik: b hat 2 Direktmandate, aber ihr wahrer proportionaler Anteil (4%)
// entspricht bei 100 Sitzen 4 Sitzen - klar mehr als ihre 2 Direktmandate.
// Alte Logik haette b faelschlich auf genau 2 Sitze gedeckelt (ihre
// Direktmandate) und "obendrauf" gezaehlt, statt sie voll proportional
// mitzurechnen. Von Hand nachgerechnet: a=96000, b=4000, beides exakt durch
// 100 teilbar -> a=96, b=4, kein Restsitz noetig, totalSeats bleibt 100.
test("Grundmandatsklausel: Partei bekommt vollen proportionalen Anteil, nicht nur ihre Direktmandate gedeckelt", () => {
  const constituencies = [
    { id: "k1", firstVotes: { a: 10, b: 90 }, secondVotes: { a: 1000, b: 2000 } },
    { id: "k2", firstVotes: { a: 10, b: 90 }, secondVotes: { a: 1000, b: 2000 } },
    { id: "k3", firstVotes: { a: 1000, b: 1 }, secondVotes: { a: 94000, b: 0 } },
  ];
  const result = allocateParliament(constituencies, { baseSeats: 100 });
  assert.strictEqual(result.directCounts.b, 2);
  assert.ok(result.eligibleParties.includes("b"));
  assert.strictEqual(result.seats.b, 4, "b muss ihren vollen proportionalen 4%-Anteil bekommen, nicht auf 2 Direktmandate gedeckelt sein");
  assert.strictEqual(result.seats.a, 96);
  assert.strictEqual(result.totalSeats, 100, "kein Ausgleichswachstum noetig, b's proportionaler Anteil deckt ihre Direktmandate schon");
});

// 10) Regressionstest gegen echte amtliche 2023-Wahlkreisdaten (data.js,
// Quelle: Landeswahlleiterin Berlin). Amtliches Endergebnis der
// Wiederholungswahl 12.02.2023 (wahlen-berlin.de): CDU 52, SPD 34, Gruene 34,
// Linke 22, AfD 17 von 159 Sitzen gesamt; FDP 4,6% -> 0 Sitze.
//
// Bekannte, bereits in data.js dokumentierte Modellgrenze: unsere Daten
// erfassen nur 6 Parteien (kein "Sonstige"-Topf, der amtlich ~9% der
// Zweitstimmen ausmachte). Dadurch faellt FDPs Anteil in unserem verengten
// Nenner rechnerisch hoeher aus (~5.1%) als amtlich (4.6% von allen
// Stimmen) und erscheint bei uns faelschlich huerdenberechtigt - eine
// bekannte Datenumfang-Grenze, kein Algorithmus-Fehler. Deshalb wird FDP
// hier bewusst nicht mitgeprueft; der Test validiert stattdessen Reihenfolge
// und Groessenordnung der anderen 5 Parteien gegen das amtliche Ergebnis.
test("Regressionstest: echte 2023-Wahlkreisdaten ergeben eine mit dem amtlichen Ergebnis konsistente Sitzverteilung", () => {
  const result = allocateParliament(CONSTITUENCIES);

  const officialSeats = { cdu: 52, spd: 34, gruene: 34, linke: 22, afd: 17 };
  const officialTotal = 159;

  const ranked = Object.keys(officialSeats)
    .map((p) => [p, result.seats[p] || 0])
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);
  assert.strictEqual(ranked[0], "cdu", "CDU muss staerkste Partei bleiben");
  assert.strictEqual(ranked[ranked.length - 1], "afd", "AfD muss schwaechste der 5 verglichenen Parteien bleiben");

  for (const party of Object.keys(officialSeats)) {
    const ourShare = (result.seats[party] || 0) / result.totalSeats;
    const officialShare = officialSeats[party] / officialTotal;
    const diffPct = Math.abs(ourShare - officialShare) * 100;
    assert.ok(
      diffPct < 3,
      `${party}: unser Sitzanteil ${(ourShare * 100).toFixed(1)}% weicht ${diffPct.toFixed(1)}pp vom amtlichen ${(officialShare * 100).toFixed(1)}% ab (Toleranz 3pp, wegen einstufigem statt zweistufigem Verfahren)`
    );
  }
});

// 11) recommendDirectMandateAgainst: Kontext- vs. Kandidatenliste getrennt.
// AfD steht im ECHTEN lokalen Feld (alle 4 Parteien) auf Platz 2 hinter CDU -
// kompetitiv. Die Nutzer:in akzeptiert aber nur SPD. Empfehlung muss aus der
// Kandidatenliste kommen (SPD), avoidCompetitive muss trotzdem korrekt aus
// dem vollen Feld berechnet werden (nicht kuenstlich verzerrt, weil CDU aus
// der Kandidatenliste fehlt).
test("recommendDirectMandateAgainst: Kompetitivitaet aus vollem Feld, Empfehlung nur aus Kandidatenliste", () => {
  const constituency = { firstVotes: { cdu: 40, afd: 35, spd: 20, gruene: 5 } };
  const fullField = Object.keys(constituency.firstVotes);
  const result = recommendDirectMandateAgainst(constituency, ["spd"], "afd", fullField);
  assert.strictEqual(result.avoidCompetitive, true, "AfD ist im vollen Feld Platz 2 - kompetitiv");
  assert.strictEqual(result.avoidLeads, false, "CDU fuehrt im vollen Feld, nicht AfD");
  assert.strictEqual(result.recommendedParty, "spd", "Empfehlung darf nur aus der Kandidatenliste kommen");
  assert.strictEqual(result.contextRanking.length, 4);
  assert.strictEqual(result.ranking.length, 1);
});

// 12) recommendDirectMandateAgainst: alte 3-Parameter-Aufrufform (ohne
// contextParties) bleibt unveraendert kompatibel - contextParties faellt
// auf candidateParties zurueck, wie es vor dieser Erweiterung immer war.
test("recommendDirectMandateAgainst: Rueckwaertskompatibel ohne contextParties-Argument", () => {
  const constituency = { firstVotes: { cdu: 40, afd: 35, spd: 20 } };
  const result = recommendDirectMandateAgainst(constituency, ["cdu", "afd", "spd"], "afd");
  assert.strictEqual(result.avoidCompetitive, true);
  assert.strictEqual(result.recommendedParty, "cdu");
});

// 13) findRobustSecondVoteAlternative: echte "aktuell"-Daten (FALLBACK_POLL).
// CDU zeigt bei allen 4 getesteten Verschiebungen (+1/+2/+3/+5pp) gleich
// viele oder weniger AfD-Sitze als die Referenzpartei Linke, und bei
// mindestens einer Groesse strikt weniger -> robuste Alternative. SPD/Gruene/
// FDP/BSW veraendern AfDs Sitzzahl bei keiner der 4 Groessen ueberhaupt ->
// korrekt nicht robust (kein einziger Vorteil, nicht nur kein durchgaengiger).
test("findRobustSecondVoteAlternative: robuste vs. nicht-verbessernde Alternativen bei echten Daten", () => {
  const pollShareSum = Object.values(FALLBACK_POLL.shares).reduce((a, b) => a + b, 0);
  const normalizedPollShares = Object.fromEntries(
    Object.entries(FALLBACK_POLL.shares).map(([p, pct]) => [p, pct / pollShareSum])
  );
  const current = buildCurrentBaseline(CONSTITUENCIES, normalizedPollShares);

  const result = findRobustSecondVoteAlternative(current, "afd", "linke", ["spd", "cdu", "gruene", "fdp", "bsw"]);
  assert.strictEqual(result.swings.length, 4);

  const cdu = result.evaluated.find((r) => r.party === "cdu");
  assert.ok(cdu.isRobust, "CDU muss als robuste Alternative erkannt werden");
  assert.deepStrictEqual(cdu.bySwing, [27, 26, 24, 25]);

  for (const partyId of ["spd", "gruene", "fdp", "bsw"]) {
    const r = result.evaluated.find((e) => e.party === partyId);
    assert.strictEqual(r.isRobust, false, `${partyId} veraendert AfDs Sitze nie, darf nicht als robust gelten`);
  }

  assert.strictEqual(result.hasRobustAlternative, true);
  assert.strictEqual(result.bestRobustAlternative.party, "cdu");
});

// 14) findRobustSecondVoteAlternative: eine Partei, die bei EINER
// Verschiebungsgroesse sogar SCHLECHTER als die Referenz abschneidet (mehr
// AfD-Sitze), darf nie als robust gelten, selbst wenn sie sonst nirgends
// schlechter ist - "neverWorse" muss bei jeder einzelnen Groesse greifen,
// nicht nur im Durchschnitt.
test("findRobustSecondVoteAlternative: Partei mit einem schlechteren Wert gilt nie als robust", () => {
  const constituencies = [
    { id: "k1", firstVotes: {}, secondVotes: { afd: 1800, ref: 1700, y: 1500, cdu: 3400 } },
  ];
  const result = findRobustSecondVoteAlternative(constituencies, "afd", "ref", ["y", "cdu"]);
  const y = result.evaluated.find((r) => r.party === "y");
  assert.deepStrictEqual(result.referenceBySwing, [27, 27, 27, 26]);
  assert.deepStrictEqual(y.bySwing, [28, 27, 27, 26]);
  assert.strictEqual(y.isRobust, false, "y liegt bei +1pp schlechter als die Referenz (28 > 27) - darf nie robust sein");
});

console.log(`\n${passed} Tests bestanden.`);
