// Einfache Node-Tests ohne Framework: `node engine.test.js`.
// Deckt Hare-Niemeyer (Kernverfahren), 5%-Huerde-Randfaelle, BSW/
// applyUniformSwing-Fix und Direktmandate > proportionale Sitzzahl ab.

const assert = require("assert");
const {
  hareNiemeyer,
  allocateParliament,
  applyUniformSwing,
} = require("./engine.js");

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

// 8) Direktmandat unter 5%-Huerde: Partei gewinnt Wahlkreis trotz insgesamt
// zu wenig Zweitstimmen fuer die Huerde - Direktmandat und Huerde sind
// getrennt (siehe getConstituencyWinners-Fix).
test("Partei unter 5% kann trotzdem ein Direktmandat gewinnen und behält den Sitz", () => {
  const constituencies = [
    { id: "k1", firstVotes: { a: 40, b: 60 }, secondVotes: { a: 9000, b: 100 } }, // b gewinnt Erststimme lokal, aber b landesweit klar unter 5%
    { id: "k2", firstVotes: { a: 90, b: 10 }, secondVotes: { a: 9000, b: 100 } },
  ];
  const result = allocateParliament(constituencies, { baseSeats: 10 });
  assert.strictEqual(result.constituencyWinners.k1, "b");
  assert.ok(!result.eligibleParties.includes("b"));
  assert.strictEqual(result.seats.b, 1); // 1 Direktmandat, keine Zweitstimmen-Sitze
});

console.log(`\n${passed} Tests bestanden.`);
