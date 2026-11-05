/**
 * zahlen.primfaktoren: Primzahlen und Primfaktoren. The Stufe chooses the content (S1 prime or not ≤ 50, S2 prime factors ≤ 200 as a product, S3 power
 * notation, ggT and kgV); AB varies the demand inside it.
 */
import { BOX, TIMES, fmt } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef } from '../../core/types';
import { build, joinDe, makeChoice, multiBugs, pickPerson, targetAb } from '../shared';
import { divisors, gcd, isPrime, power, primeFactors } from './helpers';

const SKILL = { id: 'zahlen.primfaktoren', topicId: 'zahlen' } as const;
const KMK = ['ZO.teilbarkeit'];

const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
const product = (factors: readonly number[]) => factors.join(` ${TIMES} `);

const TWO_DIVISORS = 'Eine Primzahl hat genau zwei Teiler.';
/** Every number divides itself: said wherever a hint lists divisors to test, or 3, 5 and 7 would count as no primes. */
const NOT_ITSELF = 'Die Zahl selbst zählt dabei nicht.';

/** The common prime factors of a ggT, for the worked steps. */
const commonLine = (common: readonly number[]) => (common.length === 1 ? `Gemeinsam ist nur die ${common[0]}.` : `Gemeinsam sind ${joinDe(common.map(String))}.`);

/** Why n is no prime, in the words of §5. */
function notPrime(n: number): string {
  if (n === 1) return 'Eine Primzahl hat genau zwei Teiler. Die 1 hat nur einen.';
  if (n % 2 === 1) return `Prüfe die Teiler: ${divisors(n)[1]} teilt auch ungerade Zahlen.`;
  return 'Gerade Zahlen über 2 haben auch den Teiler 2.';
}

function primeSteps(n: number): string[] {
  const all = divisors(n);
  return [`Die Teiler von ${n}: ${joinDe(all.map(String))}.`, `Das ${all.length === 1 ? 'ist 1 Teiler' : `sind ${all.length} Teiler`}.`, isPrime(n) ? `Also ist ${n} eine Primzahl.` : `Also ist ${n} keine Primzahl.`];
}

function primeOrNot(rng: Rng, ab: Ab): Exercise {
  // the interesting numbers more often: 1, primes and odd numbers that only look prime
  const n = rng.chance(0.5) ? rng.pick([1, 9, 15, 21, 25, 27, 33, 35, 39, 45, 49]) : rng.int(2, 50);
  const prime = isPrime(n);
  const answer = makeChoice(rng, { label: prime ? 'Ja' : 'Nein' }, [{ label: prime ? 'Nein' : 'Ja', whyWrong: prime ? `${n} hat nur die Teiler 1 und ${n}.` : notPrime(n) }], { order: ['Ja', 'Nein'] });
  return build(SKILL, 1, {
    key: `prim:${n}`,
    ab,
    prompt: `Ist ${n} eine Primzahl?`,
    answer,
    hints: [TWO_DIVISORS, `Prüfe die Teiler 2, 3, 5 und 7. ${NOT_ITSELF}`],
    steps: primeSteps(n),
    praise: 'Du hast die Teiler der Zahl geprüft.',
    srText: `Ist ${n} eine Primzahl?`,
    kmk: KMK,
  });
}

function pickPrime(rng: Rng, ab: Ab): Exercise {
  const primes = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
  const p = rng.pick(primes);
  const wrongs = rng.sample([1, 9, 15, 21, 25, 27, 33, 35, 39, 45, 49], 3);
  const answer = makeChoice(rng, { label: String(p) }, wrongs.map((n) => ({ label: String(n), whyWrong: notPrime(n) })));
  return build(SKILL, 1, {
    key: `wahl:${p}:${wrongs.join('-')}`,
    ab,
    prompt: 'Welche Zahl ist eine Primzahl?',
    answer,
    hints: [`${TWO_DIVISORS} Ungerade heißt nicht automatisch Primzahl.`, `Prüfe die Teiler 3, 5 und 7. ${NOT_ITSELF}`],
    steps: primeSteps(p),
    praise: 'Du hast auch bei ungeraden Zahlen die Teiler geprüft.',
    srText: `Welche Zahl ist eine Primzahl? ${[p, ...wrongs].sort((a, b) => a - b).join(', ')}.`,
    kmk: KMK,
  });
}

function countPrimes(rng: Rng, ab: Ab): Exercise {
  const width = rng.pick([10, 15]);
  // from 0 often enough that the 1 lies inside: the primzahl-eins trap
  const a = rng.chance(0.3) ? 0 : rng.int(1, 50 - width);
  const b = a + width;
  const inside = Array.from({ length: width - 1 }, (_, i) => a + 1 + i);
  const primes = inside.filter(isPrime);
  const odd = inside.filter((n) => n % 2 === 1);
  const fields: MultiField[] = [{ id: 'c', value: primes.length, label: 'Anzahl der Primzahlen' }];
  return build(SKILL, 1, {
    key: `zaehlen:${a}:${b}`,
    ab,
    prompt: `Wie viele Primzahlen liegen zwischen ${a} und ${b}?`,
    answer: { kind: 'multi', fields },
    hints: ['Streiche zuerst alle geraden Zahlen, außer der Zahl 2.', `Prüfe die anderen auf die Teiler 3, 5 und 7. ${NOT_ITSELF}`],
    steps: [`Die Zahlen liegen von ${a + 1} bis ${b - 1}.`, primes.length ? `Primzahlen sind ${joinDe(primes.map(String))}.` : 'Hier liegt keine Primzahl.', `Das sind ${primes.length}.`],
    bugs: multiBugs([
      // first: from 0 on, counting the 1 and counting all odd numbers give the same value, and the 1 is the nearer reason
      inside.includes(1) && { id: 'primzahl-eins', match: { c: primes.length + 1 }, hint: 'Eine Primzahl hat genau zwei Teiler. Die 1 hat nur einen.' },
      { id: 'primzahl-ungerade', match: { c: odd.length }, hint: 'Prüfe die Teiler: 3 teilt auch ungerade Zahlen.' },
    ], fields),
    praise: 'Du hast jede Zahl auf ihre Teiler geprüft.',
    srText: `Wie viele Primzahlen liegen zwischen ${a} und ${b}?`,
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Numbers ≤ max whose factorisation fits the fields (2 to 5 prime factors). */
function factorable(max: number, minFactors: number): number[] {
  const out: number[] = [];
  for (let n = 8; n <= max; n++) {
    const f = primeFactors(n);
    if (f.length >= minFactors && f.length <= 5 && f[f.length - 1] <= 13) out.push(n);
  }
  return out;
}

const DIVIDE_STEP = (n: number, f: readonly number[]) => `${n} = ${product(f)}`;

/** The last two factors are gaps. */
function factorGaps(rng: Rng, ab: Ab): Exercise {
  const n = rng.pick(factorable(120, 3));
  const f = primeFactors(n);
  const [x, y] = f.slice(-2);
  const given = f.slice(0, -2);
  const fields: MultiField[] = [{ id: 'a', value: x, label: 'Erster fehlender Primfaktor' }, { id: 'b', value: y, label: 'Zweiter fehlender Primfaktor' }];
  const known = product(given);
  return build(SKILL, 2, {
    key: `luecken:${n}`,
    ab,
    prompt: 'Ergänze die Primfaktoren. Schreib die Faktoren der Größe nach.',
    expression: `${n} = ${known} ${TIMES} ${BOX} ${TIMES} ${BOX}`,
    answer: { kind: 'multi', fields },
    hints: [`Teile ${n} durch die Faktoren aus der Aufgabe.`, 'Zerlege den Rest in Primzahlen.'],
    steps: [`${n} : ${given.reduce((a, b) => a * b, 1)} = ${x * y}`, `${x * y} = ${x} ${TIMES} ${y}`, DIVIDE_STEP(n, f), `Die Lücken sind ${x} und ${y}.`],
    bugs: multiBugs([
      { id: 'faktor-nicht-prim', match: { a: x * y, b: 1 }, hint: `${x * y} ist keine Primzahl, und 1 auch nicht. Zerlege weiter.` },
      x !== y && { id: 'faktoren-absteigend', match: { a: y, b: x }, hint: 'Schreib die Primfaktoren der Größe nach.' },
    ], fields),
    praise: 'Du hast den Rest in Primzahlen zerlegt.',
    srText: `${n} gleich ${given.join(' mal ')} mal Lücke mal Lücke. Ergänze die Primfaktoren der Größe nach.`,
    kmk: KMK,
  });
}

function factorAll(rng: Rng, ab: Ab): Exercise {
  const n = rng.pick(factorable(200, 3));
  const f = primeFactors(n);
  const fields: MultiField[] = f.map((v, i) => ({ id: `p${i}`, value: v, label: `Primfaktor ${i + 1}` }));
  const record = (values: readonly number[]) => Object.fromEntries(values.map((v, i) => [`p${i}`, v]));
  const merged = [...f.slice(0, -2), f[f.length - 2] * f[f.length - 1], 1];
  return build(SKILL, 2, {
    key: `alle:${n}`,
    ab,
    prompt: 'Zerlege in Primfaktoren. Schreib die Faktoren der Größe nach.',
    expression: `${n} = ${f.map(() => BOX).join(` ${TIMES} `)}`,
    answer: { kind: 'multi', fields },
    hints: ['Teile immer wieder durch die kleinste passende Primzahl.', 'Hör auf, sobald nur noch die 1 übrig ist.'],
    steps: [`Teile der Reihe nach durch ${joinDe(f.map(String))}.`, DIVIDE_STEP(n, f)],
    bugs: multiBugs([
      { id: 'faktor-nicht-prim', match: record(merged), hint: `${merged[merged.length - 2]} ist keine Primzahl, und 1 auch nicht. Zerlege weiter.` },
      { id: 'faktoren-absteigend', match: record([...f].reverse()), hint: 'Schreib die Primfaktoren der Größe nach.' },
    ], fields),
    praise: 'Du hast geteilt, bis nur Primzahlen übrig waren.',
    srText: `Zerlege ${n} in Primfaktoren. Schreib die ${f.length} Faktoren der Größe nach.`,
    kmk: KMK,
  });
}

function whichFactorisation(rng: Rng, ab: Ab): Exercise {
  const n = rng.pick(factorable(200, 3));
  const f = primeFactors(n);
  const merged = [f[0] * f[1], ...f.slice(2)];
  const missing = f.slice(1);
  const extra = [...f, 2].sort((a, b) => a - b);
  const answer = makeChoice(rng, { label: product(f) }, [
    { label: product(merged), whyWrong: `${merged[0]} ist keine Primzahl. Zerlege weiter.` },
    { label: product(missing), whyWrong: `Das Produkt ist ${missing.reduce((a, b) => a * b, 1)}. Rechne nach.` },
    { label: product(extra), whyWrong: `Das Produkt ist ${extra.reduce((a, b) => a * b, 1)}. Rechne nach.` },
    { label: product([1, ...f]), whyWrong: 'Die 1 ist keine Primzahl. Die 1 gehört nicht in die Zerlegung.' },
  ]);
  return build(SKILL, 2, {
    key: `wahl:${n}:${answer.options.map((o) => o.label).join('|')}`,
    ab,
    prompt: `Welche Primfaktorzerlegung von ${n} stimmt?`,
    answer,
    hints: ['Prüfe zuerst: Stehen dort nur Primzahlen?', `Rechne dann nach: Kommt ${n} heraus?`],
    steps: [`Nur Primzahlen stehen in: ${product(f)}.`, DIVIDE_STEP(n, f)],
    praise: 'Du hast Primzahlen und Produkt beide geprüft.',
    srText: `Welche Primfaktorzerlegung von ${n} stimmt?`,
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function powerNotation(rng: Rng, ab: Ab): Exercise {
  const a = rng.int(2, 4);
  const b = rng.int(2, 3);
  const withFive = rng.chance(0.3);
  const c = withFive ? 1 : 0;
  const n = 2 ** a * 3 ** b * 5 ** c;
  const bases = withFive ? [2, 3, 5] : [2, 3];
  const exps = withFive ? [a, b, c] : [a, b];
  const fields: MultiField[] = bases.map((base, i) => ({ id: `e${base}`, value: exps[i], before: `${base} hoch`, label: `Exponent von ${base}` }));
  const record = (values: readonly number[]) => Object.fromEntries(bases.map((base, i) => [`e${base}`, values[i]]));
  const inPowers = bases.map((base, i) => power(base, exps[i])).join(` ${TIMES} `);
  return build(SKILL, 3, {
    key: `potenzform:${a}:${b}:${c}`,
    ab,
    prompt: 'Schreibe die Primfaktorzerlegung mit Potenzen.',
    expression: `${fmt(n)} = ${bases.map((base) => `${base} hoch ${BOX}`).join(` ${TIMES} `)}`,
    answer: { kind: 'multi', fields },
    hints: ['Zerlege die Zahl zuerst in Primfaktoren.', 'Der Exponent zählt: So oft steht der Primfaktor da.'],
    steps: [`${fmt(n)} = ${product(primeFactors(n))}`, `Gleiche Faktoren zusammen: ${inPowers}.`, `Die Exponenten sind ${exps.join(', ')}.`],
    bugs: multiBugs([
      { id: 'wert-statt-exponent', match: record(bases.map((base, i) => base ** exps[i])), hint: 'Der Exponent zählt die Faktoren. Schreib nicht den Wert der Potenz.' },
      !withFive && a !== b && { id: 'exponenten-getauscht', match: record([b, a]), hint: 'Prüfe: Wie oft steht die 2 da, und wie oft die 3?' },
    ], fields),
    praise: 'Du hast gleiche Primfaktoren als Potenz geschrieben.',
    srText: `Schreibe die Primfaktorzerlegung von ${n} mit Potenzen: ${bases.map((base) => `${base} hoch Lücke`).join(' mal ')}.`,
    kmk: [...KMK, 'PK.darstellen'],
  });
}

/** A pair with a common divisor above 1 where neither number divides the other. */
function goodPair(rng: Rng, max: number): [number, number] {
  for (let tries = 0; tries < 200; tries++) {
    const g = rng.int(2, 12);
    const a = g * rng.int(2, Math.floor(max / g));
    const b = g * rng.int(2, Math.floor(max / g));
    if (a !== b && a % b !== 0 && b % a !== 0 && gcd(a, b) >= 2 && a <= max && b <= max) return [a, b];
  }
  return [12, 18];
}

function ggtTask(rng: Rng, ab: Ab): Exercise {
  const [a, b] = goodPair(rng, 60);
  const g = gcd(a, b);
  const fields: MultiField[] = [{ id: 'v', value: g, label: 'ggT' }];
  const fa = primeFactors(a);
  const fb = primeFactors(b);
  const common = primeFactors(g);
  return build(SKILL, 3, {
    key: `ggt:${a}:${b}`,
    ab,
    prompt: 'Bestimme den größten gemeinsamen Teiler (ggT).',
    expression: `ggT(${a}, ${b}) = ${BOX}`,
    visual: { type: 'table', caption: 'Primfaktoren', header: ['Zahl', 'Primfaktoren'], rows: [[String(a), product(fa)], [String(b), product(fb)]] },
    answer: { kind: 'multi', fields },
    hints: ['Suche die Primfaktoren in beiden Zeilen.', 'Multipliziere nur die gemeinsamen Primfaktoren.'],
    steps: [commonLine(common), common.length > 1 ? `${product(common)} = ${g}` : `Das ist ${g}.`, `ggT(${a}, ${b}) = ${g}`],
    bugs: multiBugs([
      { id: 'ggt-kgv', match: { v: lcm(a, b) }, hint: 'Das ist ein Vielfaches. Gesucht ist ein Teiler beider Zahlen.' },
      { id: 'ggt-produkt', match: { v: a * b }, hint: 'Das Produkt ist kein Teiler. Nimm nur die gemeinsamen Primfaktoren.' },
      { id: 'ggt-eins', match: { v: 1 }, hint: 'Die 1 teilt beide. Es gibt aber einen größeren gemeinsamen Teiler.' },
    ], fields),
    praise: 'Du hast die gemeinsamen Primfaktoren multipliziert.',
    srText: `Bestimme den größten gemeinsamen Teiler von ${a} und ${b}.`,
    kmk: KMK,
  });
}

/** Bus intervals of a real timetable, and pairs that meet again within two hours. */
const BUS_INTERVALS = [6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 30];
const BUS_PAIRS = BUS_INTERVALS.flatMap((a, i) => BUS_INTERVALS.slice(i + 1).flatMap((b) => (gcd(a, b) >= 2 && b % a !== 0 && lcm(a, b) <= 120 ? [[a, b]] : [])));

/** The kgV as the steps build it: each prime as often as in the factorisation with the most of it. */
function lcmFactors(a: number, b: number): number[] {
  const fa = primeFactors(a);
  const fb = primeFactors(b);
  const count = (f: readonly number[], p: number) => f.filter((x) => x === p).length;
  return [...new Set([...fa, ...fb])].sort((x, y) => x - y).flatMap((p) => Array.from({ length: Math.max(count(fa, p), count(fb, p)) }, () => p));
}

function kgvStory(rng: Rng, ab: Ab): Exercise {
  const [a, b] = rng.shuffle(rng.pick(BUS_PAIRS));
  const value = lcm(a, b);
  const fields: MultiField[] = [{ id: 'v', value, after: 'Minuten', label: 'Minuten' }];
  return build(SKILL, 3, {
    key: `kgv:${a}:${b}`,
    ab,
    context: `Bus A fährt alle ${a} Minuten. Bus B fährt alle ${b} Minuten. Jetzt fahren beide zusammen los.`,
    prompt: 'Nach wie vielen Minuten fahren beide wieder zusammen los?',
    answer: { kind: 'multi', fields },
    hints: ['Schreib die Vielfachen beider Zahlen auf.', 'Gesucht ist das kleinste gemeinsame Vielfache (kgV).'],
    steps: [`${a} = ${product(primeFactors(a))}`, `${b} = ${product(primeFactors(b))}`, 'Nimm jeden Primfaktor so oft wie in der Zerlegung mit den meisten davon.', `kgV(${a}, ${b}) = ${product(lcmFactors(a, b))} = ${value}`, `Nach ${value} Minuten fahren beide wieder zusammen.`],
    bugs: multiBugs([
      { id: 'ggt-kgv', match: { v: gcd(a, b) }, hint: 'Das ist ein Teiler. Gesucht ist ein gemeinsames Vielfaches.' },
      { id: 'ggt-produkt', match: { v: a * b }, hint: 'Beide fahren dann zusammen, aber schon vorher auch. Suche das kleinste Vielfache.' },
      { id: 'alle-zahlen', match: { v: a + b }, hint: 'Addieren passt hier nicht. Schreib die Vielfachen beider Zahlen auf.' },
    ], fields),
    praise: 'Du hast das kleinste gemeinsame Vielfache gefunden.',
    srText: `Bus A fährt alle ${a} Minuten. Bus B fährt alle ${b} Minuten. Jetzt fahren beide zusammen los. Nach wie vielen Minuten fahren beide wieder zusammen los?`,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function ggtStory(rng: Rng, ab: Ab): Exercise {
  const person = pickPerson(rng);
  const [a, b] = goodPair(rng, 60);
  const value = gcd(a, b);
  const common = primeFactors(value);
  const fields: MultiField[] = [{ id: 'v', value, after: 'cm', label: 'Länge eines Stücks' }];
  return build(SKILL, 3, {
    key: `ggts:${person.name}:${a}:${b}`,
    ab,
    context: `${person.name} hat zwei Streifen Papier. Ein Streifen ist ${a} cm lang, der andere ${b} cm. Beide Streifen ergeben gleich lange Stücke, ohne Rest.`,
    prompt: 'Wie lang ist ein Stück höchstens?',
    answer: { kind: 'multi', fields },
    hints: ['Die Länge eines Stücks muss beide Zahlen teilen.', 'Gesucht ist der größte gemeinsame Teiler (ggT).'],
    steps: [`${a} = ${product(primeFactors(a))}`, `${b} = ${product(primeFactors(b))}`, commonLine(common), common.length > 1 ? `ggT(${a}, ${b}) = ${product(common)} = ${value}` : `ggT(${a}, ${b}) = ${value}`, `Ein Stück ist höchstens ${value} cm lang.`],
    bugs: multiBugs([
      { id: 'ggt-kgv', match: { v: lcm(a, b) }, hint: 'So lang ist kein Streifen. Die Länge muss beide Zahlen teilen.' },
      { id: 'ggt-eins', match: { v: 1 }, hint: 'Das passt, ist aber nicht die größte Länge.' },
    ], fields),
    praise: 'Du hast im Text den ggT erkannt.',
    srText: `${person.name} hat zwei Streifen Papier, ${a} cm und ${b} cm lang. Beide ergeben gleich lange Stücke ohne Rest. Wie lang ist ein Stück höchstens?`,
    kmk: [...KMK, 'PK.modellieren'],
  });
}

export const primfaktorenSkill: SkillDef = {
  ...SKILL,
  title: 'Primzahlen und Primfaktoren',
  description: 'Du erkennst Primzahlen und zerlegst Zahlen in Primfaktoren.',
  stufen: {
    1: 'Primzahl oder nicht, bis 50',
    2: 'Primfaktoren von Zahlen bis 200, als Produkt',
    3: 'Schreibweise mit Potenzen; ggT und kgV',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? primeOrNot(rng, ab) : ab === 2 ? pickPrime(rng, ab) : countPrimes(rng, ab);
    if (stufe === 2) return ab === 1 ? factorGaps(rng, ab) : ab === 2 ? factorAll(rng, ab) : whichFactorisation(rng, ab);
    if (ab === 1) return powerNotation(rng, ab);
    if (ab === 2) return ggtTask(rng, ab);
    return rng.chance(0.5) ? kgvStory(rng, ab) : ggtStory(rng, ab);
  },
};
