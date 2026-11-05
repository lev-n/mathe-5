/**
 * Core contracts shared by every part of the app.
 *
 * Generators (src/topics/**) are pure functions: (rng, stufe, ctx) → Exercise.
 * Exercises are plain data (no functions) so they can be tested, de-duplicated,
 * printed on worksheets and rendered by generic UI components.
 *
 * See docs/research.md for the reasoning behind the fields (hints, steps, bugs, praise …).
 */

// ─── Basics ──────────────────────────────────────────────────────────────────

/** Difficulty level shown to children as "Stufe 1/2/3" (≈ KMK Anforderungsbereich I/II/III). */
export type Stufe = 1 | 2 | 3;
export const STUFEN: readonly Stufe[] = [1, 2, 3];

/** KMK Anforderungsbereich of one item. A round of any Stufe mixes all three (src/core/age.ts AB_MIX). */
export type Ab = 1 | 2 | 3;

/** Länder setting for written subtraction (docs/research.md §2.3): the visual, Sprechweise and bug library follow it, never mixed. */
export type SubtractionMethod = 'abziehen' | 'ergaenzen';

export type TopicId =
  | 'zahlen'
  | 'rechnen'
  | 'ganzzahlen'
  | 'brueche'
  | 'groessen'
  | 'geometrie'
  | 'flaeche'
  | 'daten';

/**
 * The optional question's stored answer (docs/research.md §2.5). A profile changes order, Schwerpunkt or Extra and the range defaults
 * below. It never sets a Stufe, a target or a message, and it is never shown as a label.
 */
export type ProfileId = 'ganzzahl' | 'anschaulich' | 'bruch' | 'offen';

/**
 * Range defaults of a profile (§2.5, src/data/profiles.ts), the only part of it a generator sees. Each one narrows a range inside a
 * Stufe's content; it is a default, never a lock, and the Stufe keeps its meaning.
 */
export interface RangeDefaults {
  /** Largest angle at Stufe 3. Stufe 1 and 2 stay ≤ 180° for every profile (catalogue). */
  maxAngle: 180 | 360;
  /** Stufe 3 of geometrie.koordinaten may use all four quadrants. Stufe 1 and 2 stay in the first one. */
  fourQuadrants: boolean;
  /** Stufe 3 of the large-number skills goes beyond 1 Milliarde. */
  beyondMilliarde: boolean;
  /** Stufe 3 of written calculation may use a three-digit factor or divisor; otherwise at most two digits. */
  threeDigitFactor: boolean;
  /** Flächeneinheiten: 'wide' is km² to mm² with a and ha, 'm2ToMm2' stays with m², dm², cm², mm². */
  areaUnits: 'wide' | 'm2ToMm2';
  /** Integers as states and changes only: no calculating rules in contexts that can avoid them. */
  integersAsStates: boolean;
}

/** Seeded pseudo-random generator. Never use Math.random() in generators. */
export interface Rng {
  /** The seed this generator was created with (shown on worksheets). */
  readonly seed: number;
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (both inclusive). */
  int(min: number, max: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** New shuffled copy of an array (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** true with probability p. */
  chance(p: number): boolean;
  /** n distinct elements of an array, in random order. */
  sample<T>(items: readonly T[], n: number): T[];
}

/** Grid cell coordinate: x = column (0 = left), y = row (0 = top). */
export type Cell = readonly [x: number, y: number];

// ─── Visuals (declarative; rendered by src/ui/visuals/*) ──────────────────────

/** Stellentafel columns from Zehnmilliarden down to Tausendstel: ZMrd, Mrd, HM, ZM, M, HT, ZT, T, H, Z, E, then after the comma z, h, t. */
export type PlaceColumn = 'B' | 'HMrd' | 'ZMrd' | 'Mrd' | 'HM' | 'ZM' | 'M' | 'HT' | 'ZT' | 'T' | 'H' | 'Z' | 'E' | 'z' | 'h' | 't';

export type SolidKind =
  | 'wuerfel'
  | 'quader'
  | 'kugel'
  | 'zylinder'
  | 'kegel'
  | 'pyramide';

export type ShapeKind =
  | 'quadrat'
  | 'rechteck'
  | 'dreieck'
  | 'gleichseitiges-dreieck'
  | 'kreis'
  | 'sechseck'
  | 'parallelogramm'
  | 'raute'
  | 'trapez'
  | 'drachen'
  | 'l-form';

/** A point of a coordinateGrid or a point answer. */
export interface GridPoint {
  x: number;
  y: number;
  label?: string;
}

export type PictoIcon = 'person' | 'buch';

/** Symmetry axis on a grid. `at` = position in cell units from the left (vertical) or top (horizontal). */
export interface Axis {
  orientation: 'vertical' | 'horizontal';
  /** Line position in cell units (e.g. 4 = line between column 3 and 4). */
  at: number;
}

export type WrittenOp = 'add' | 'sub' | 'mul' | 'div';

/** A digit of a written calculation drawn as a labelled empty box. place 0 = Einer; index = operand row (row 'operand'). */
export interface WrittenMask {
  row: 'operand' | 'result';
  index?: number;
  place: number;
  label: string;
}

export type Visual =
  /**
   * Stellenwerttafel with digits. values[i] belongs to columns[i]; null = empty cell. A comma line is drawn between E and z.
   * A cell may hold more than one digit (14 ZT is a bundling task). highlight marks one column with a thick frame.
   */
  | { type: 'placeValue'; columns: PlaceColumn[]; rows: { label?: string; values: (number | null)[] }[]; highlight?: PlaceColumn }
  /**
   * Zahlenstrahl. Ticks every minorStep, longer ticks every majorStep. Labels at every major tick if labelMajor, plus explicit `labels`.
   * Marks are arrows with a letter/text. Jumps are arcs with an arrowhead (Rechenstrich-style steps, for hints and worked solutions),
   * e.g. { from: 35, to: 40, label: '+ 5' }. For an empty Rechenstrich: majorStep = minorStep = max − min, labels at the jump ends.
   * min may be negative: labels use U+2212, and arrows 'both' draws an arrowhead at both ends (a Zahlengerade; default 'right').
   * denominator d: values count d-ths, so 3 with d = 8 is three eighths, and labels draw stacked (integers stay integers); no floats.
   */
  | { type: 'numberLine'; min: number; max: number; majorStep: number; minorStep: number; labelMajor: boolean; labels?: number[]; marks?: { value: number; label: string }[]; jumps?: { from: number; to: number; label?: string }[]; arrows?: 'right' | 'both'; denominator?: number }
  /** Punktefeld (rows × cols dots). */
  | { type: 'dotArray'; rows: number; cols: number }
  /**
   * Dots in repeated groups, each with a frame (3 groups of 4: groups [4, 4, 4]; unequal groups, or a Rest: [5, 5, 5, 2]).
   * perRow: dots in a row inside a group (default 5).
   */
  | { type: 'dotArray'; groups: number[]; perRow?: number }
  /**
   * Column layout of a written calculation. showSolution draws result, carries, partial products and the division steps. shownResult and
   * shownPartials draw a given (e.g. planted wrong) result instead of the computed one (Fehlerdetektiv); masks draw single digits as labelled
   * empty boxes (Ziffernrätsel).
   */
  | {
      type: 'written';
      op: WrittenOp;
      operands: number[];
      method?: SubtractionMethod;
      showSolution: boolean;
      shownResult?: number;
      /** mul with a multi-digit second factor: partial products as written, highest digit first. */
      shownPartials?: { value: number; shift: number }[];
      masks?: WrittenMask[];
    }
  /** Square grid with filled cells (area/perimeter/symmetry figures). */
  | { type: 'grid'; width: number; height: number; cells: Cell[]; axis?: Axis; showOutline?: boolean; caption?: string }
  /**
   * Hexomino or net on a grid. faces[i] (optional) is a label drawn on cells[i].
   * groups[i]: the face cells[i] belongs to, for a Quader net whose faces span several cells. Cells of a group share one face:
   * lines between them are thin, the fold lines between groups thick. Without groups every cell is a face.
   */
  | { type: 'net'; cells: Cell[]; faces?: (string | null)[]; groups?: number[] }
  /** Körper drawing. The aria-label describes it without its name; named: the name instead (a task asks for what the description would state). */
  | { type: 'solid'; solid: SolidKind; named?: boolean }
  /**
   * rotate: degrees clockwise (a turned square). showAxes draws the symmetry axes as dashed lines. named: as for 'solid'.
   * sideLabels: texts at the sides, clockwise from the top side ('5 cm'); null leaves a side bare.
   * lForm: the L-form as a bounding box w × h with its top-right corner cut out, cutW × cutH (same units, drawn to scale). The six sides
   * clockwise from the top are w − cutW, cutH, cutW, h − cutH, w, h. split: the given line that cuts it into two rectangles.
   */
  | { type: 'shape'; shape: ShapeKind; rotate?: number; showAxes?: boolean; named?: boolean; sideLabels?: (string | null)[]; lForm?: { w: number; h: number; cutW: number; cutH: number }; split?: 'horizontal' | 'vertical' }
  /** Würfelgebäude. heights[row][col] = number of stacked cubes; row 0 = back. view 'plan' = Bauplan (top view with numbers). */
  | { type: 'cubeBuilding'; heights: number[][]; view: 'iso' | 'plan' | 'front' | 'side' | 'top' }
  /**
   * Säulendiagramm, or Balkendiagramm with horizontal. The value axis starts at 0, or at axisStart > 0 on purpose (daten.pruefen; the
   * aria-label says so). meanLine draws the Mittelwert as a dashed line with its value; levelled shows the bars levelled to meanLine,
   * with the original heights as dashed outlines (daten.mittelwert).
   */
  | { type: 'barChart'; title: string; categories: string[]; values: number[]; axisMax: number; axisStep: number; horizontal?: boolean; valueLabel?: string; axisStart?: number; meanLine?: number; levelled?: boolean }
  /** Bilddiagramm with its legend. */
  | { type: 'pictogram'; title: string; categories: string[]; values: number[]; iconValue: number; icon: PictoIcon }
  | { type: 'tally'; title?: string; rows: { label: string; count: number }[] }
  | { type: 'table'; caption?: string; header: string[]; rows: string[][] }
  /** Baumdiagramm: levels[i] = options at depth i (the full tree is drawn). */
  | { type: 'tree'; levels: string[][] }
  /**
   * Analog clock (+ optional digital display). hours 0–23. Without face it draws all 60 minute ticks, 'five' only the
   * 5-minute ticks.
   */
  | { type: 'clock'; hours: number; minutes: number; showDigital?: boolean; face?: 'five' }
  /** Coins and notes, values in Cent: 1, 2, 5, 10, 20, 50, 100, 200 (coins), 500, 1000, 2000, 5000, 10000 (notes). */
  | { type: 'money'; items: number[] }
  /**
   * Lineal in cm with mm ticks; an object (bar) from startMm to startMm + lengthMm is drawn above it.
   */
  | { type: 'ruler'; maxCm: number; startMm: number; lengthMm: number }
  /** Messbecher. */
  | { type: 'container'; capacityMl: number; fillMl: number; stepMl: number }
  /** Küchenwaage (dial). */
  | { type: 'scale'; maxGrams: number; stepGrams: number; grams: number }
  /**
   * Koordinatensystem with y upward (unlike `grid`), arrowed axes, origin labelled 0 and integer labels every labelStep. Four quadrants
   * only when xMin < 0 or yMin < 0. axisNames 'rechtsHoch' names the axes Rechtswert and Hochwert (BY-M), 'xy' x and y.
   */
  | { type: 'coordinateGrid'; xMin: number; xMax: number; yMin: number; yMax: number; step: number; labelStep: number; points: GridPoint[]; segments?: [GridPoint, GridPoint][]; axisNames?: 'xy' | 'rechtsHoch' }
  /**
   * Winkel: arm1 is drawn at baseRotation (degrees counterclockwise from the positive x-axis), arm2 turned `degrees` further. Arm lengths
   * are independent (F8), as fractions of the drawing's radius, 0.3–1. showArc draws the arc; over 180° it is the larger arc. labels name
   * the vertex and the arms. tool 'geodreieck' draws the half-circle scale with both directions 0–180, zero on arm1, centre on the vertex;
   * toolOffset moves it off the vertex on purpose (only for a Fehlerdetektiv item).
   */
  | { type: 'angle'; degrees: number; baseRotation: number; arm1: number; arm2: number; showArc: boolean; labels?: { vertex?: string; arm1?: string; arm2?: string; arc?: string }; tool?: 'none' | 'geodreieck'; toolOffset?: { x: number; y: number } }
  /**
   * Bruchteil: `wholes` wholes (default 1) of `parts` equal parts each, `filled` of them shaded across the wholes, left to right. A mark
   * besides the colour tells shaded from empty. refineTo adds finer lines for Erweitern (a multiple of parts, or a Vergröbern view).
   * unequal draws deliberately unequal parts (form 'bar' or 'rect').
   */
  | { type: 'fractionModel'; form: 'bar' | 'circle' | 'rect'; parts: number; filled: number; wholes?: number; refineTo?: number; unequal?: boolean }
  /**
   * Quader as a Schrägbild: receding edges at 45° and half depth, sizes to scale. a = width, b = depth, c = height. showLabels writes the
   * lengths with `unit`. hiddenEdges 'dashed' draws the three hidden edges dashed. highlightFace tints a face. layers draws the unit-cube
   * rows and layers on the visible faces. kind only names the body in the description.
   */
  | { type: 'quader'; a: number; b: number; c: number; unit?: string; showLabels: boolean; hiddenEdges: 'dashed' | 'none'; highlightFace?: 'front' | 'top' | 'side'; layers?: boolean; kind?: 'wuerfel' | 'quader' }
  /**
   * A term and its next steps, line by line (Rechenweg). highlight: the characters [start, end) of the first line, tinted and underlined,
   * so the next step is never marked by colour alone. bracketDepth lifts the brackets by level (nested Klammern).
   */
  | { type: 'term'; lines: string[]; highlight?: [start: number, end: number]; bracketDepth?: boolean }
  /**
   * Lines through a picture of 300 × 200 units around the centre. angle: degrees counterclockwise; offset: the signed distance of the line
   * from the centre. kind: 'gerade' (default, no ends), 'strecke' (two end marks), 'halbgerade' (one end mark, then an arrow).
   * rightAngleMarks: a square where line i and j cross. parallelMarks: a pair of lines marked parallel, with one chevron for the first pair, two for the second. geodreieck: the tool laid on line i.
   * points: named points, x and y as distances from the centre, y upward (a Punkt beside a Gerade, for a Abstand).
   */
  | { type: 'lines'; lines: { angle: number; offset: number; label?: string; kind?: 'gerade' | 'strecke' | 'halbgerade' }[]; points?: GridPoint[]; rightAngleMarks?: [number, number][]; parallelMarks?: [number, number][]; geodreieck?: number }
  /** Vertical thermometer, a vertical Zahlengerade with ticks every step. change draws an arrow from value by that amount. */
  | { type: 'thermometer'; min: number; max: number; step: number; value: number; unit: '°C'; change?: number };

export type VisualType = Visual['type'];
export type VisualOf<T extends VisualType> = Extract<Visual, { type: T }>;

// ─── Answers ─────────────────────────────────────────────────────────────────

export interface NumberAnswer {
  kind: 'number';
  /** Correct value. null = the task is not solvable and "Nicht lösbar" is correct (requires offerUnsolvable). */
  value: number | null;
  /** Unit shown after the input field (the child does not type it), e.g. '€', 'cm', 'Kästchen'. */
  unit?: string;
  /** Allowed decimal places. Without it the answer is a whole number. The comma key follows SkillDef.keys, never this field. */
  decimals?: number;
  /**
   * A signed answer: a leading '−' or '-' is accepted, '+5' is 5, '−0' is 0. Without it a minus gets a calm message. Every item of a skill
   * with keys.minus sets it, even when the result is positive, so the key gives nothing away (§6).
   */
  signed?: boolean;
  /** Absolute tolerance: correct if |input − value| ≤ tolerance. Compared in integer steps of `decimals`, never as floats. */
  tolerance?: number;
  /** Text directly before/after the input, e.g. an Antwortsatz: before 'Lena bezahlt', after '€.' */
  before?: string;
  after?: string;
  /** Show a "Nicht lösbar – es fehlt eine Angabe" button. */
  offerUnsolvable?: boolean;
  /** Visible label for screen readers if before/after is not descriptive. */
  label?: string;
}

export interface ChoiceOption {
  /** May hold stacked fractions, {frac:3/4} or {frac:1 3/4} (src/core/format.ts frac()). */
  label: string;
  visual?: Visual;
  /** Targeted feedback when this (wrong) option is chosen. */
  whyWrong?: string;
}

export interface ChoiceAnswer {
  kind: 'choice';
  options: ChoiceOption[];
  correct: number;
  /** 'symbols' = short labels like <, >, =; 'grid' = options with visuals. Default: a list. */
  layout?: 'symbols' | 'grid';
  /** The child has to read these options: read-aloud leaves them out (an option spoken as a number word gives a Zahlwort task away). */
  silentOptions?: boolean;
}

export interface MultiField {
  id: string;
  value: number;
  /** Text before/after this field, e.g. '[3] €' '[40] ct'. */
  before?: string;
  after?: string;
  /** As NumberAnswer.decimals. */
  decimals?: number;
  /** As NumberAnswer.signed. */
  signed?: boolean;
  label?: string;
}

export interface MultiAnswer {
  kind: 'multi';
  fields: MultiField[];
}

export interface WrittenAnswer {
  kind: 'written';
  op: WrittenOp;
  /** add: 2–4 Summanden; sub: [Minuend, Subtrahend]; mul: [Faktor, Faktor]; div: [Dividend, Divisor]. Up to 12 digits, factor and divisor up to 3. */
  operands: number[];
  /** Summe, Differenz, Produkt or Quotient. */
  result: number;
  /** Rest (div only, 0 or absent if none). */
  remainder?: number;
  method?: SubtractionMethod;
  /**
   * Expected Überschlag value (e.g. 8000 for 4873 + 3125). When set, the child first writes an Überschlag:
   * it is required and checked loosely (CheckResult.ueberschlagOk), but never part of `correct`.
   */
  ueberschlag?: number;
}

export interface CellsAnswer {
  kind: 'cells';
  width: number;
  height: number;
  /** Pre-filled cells that the child cannot toggle. */
  given: Cell[];
  /** Cells the child must switch on (in addition to `given`). */
  solution: Cell[];
  axis?: Axis;
}

export interface NumberLineAnswer {
  kind: 'numberline';
  min: number;
  max: number;
  majorStep: number;
  minorStep: number;
  /** Snapping step of the marker (usually minorStep). */
  step: number;
  value: number;
  /** Accepted absolute deviation (0 = exact). */
  tolerance: number;
  labelMajor: boolean;
  /** Explicitly labelled values (in addition to major labels if labelMajor). Default: both ends when !labelMajor. */
  labels?: number[];
  /** As in the numberLine visual: arrowheads at both ends of a Zahlengerade. */
  arrows?: 'right' | 'both';
  /** As in the numberLine visual: values count d-ths (3 with d = 8 is three eighths), labels draw stacked. */
  denominator?: number;
}

export interface OrderAnswer {
  kind: 'order';
  /** Items in display order. May hold stacked fractions, {frac:3/4}. */
  items: string[];
  /** Indices of `items` in the correct order. */
  correct: number[];
  direction: 'aufsteigend' | 'absteigend';
}

/**
 * A fraction, with Zähler above and Nenner below and a whole field when `whole` is set (§6). Digits only. Compared by integer
 * cross-multiplication, never as floats. exact: both numbers match. equivalent: any equal value. lowest: an equal value with a common
 * divisor gets the neutral prompt FRACTION_NOT_LOWEST and uses no attempt. Bugs match on { numerator, denominator } (plus whole if set).
 */
export interface FractionAnswer {
  kind: 'fraction';
  numerator: number;
  denominator: number;
  whole?: number;
  accept: 'exact' | 'equivalent' | 'lowest';
  unit?: string;
  before?: string;
  after?: string;
}

/**
 * Plot a point: a tap moves the marker to the nearest grid intersection, four step buttons and the arrow keys move it one step, and the
 * live label shows P(x|y). Correct only if exact. Bugs match on { x, y }, so a swapped pair gives koordinaten-getauscht. Reading a point
 * stays a multi answer with before 'P(' and after ')'. name: the point's letter (default P). points, segments, labelStep and axisNames
 * as in the coordinateGrid visual: the answer draws its own grid, so give the item no separate visual.
 */
export interface PointAnswer {
  kind: 'point';
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  step: number;
  target: readonly [x: number, y: number];
  tolerance: 0;
  name?: string;
  labelStep?: number;
  axisNames?: 'xy' | 'rechtsHoch';
  points?: GridPoint[];
  segments?: [GridPoint, GridPoint][];
}

/**
 * Set an angle: one arm is fixed at baseRotation, and the child moves the other by tapping near the arc or with step buttons and arrow
 * keys. Snaps to `step`. Correct if |input − value| ≤ tolerance: 0 at Stufe 1, 1 at Stufe 2–3. A Geodreieck is shown on request. The value is
 * never shown as text, since reading it off the tool is the task. Bugs match the wrong angle as a number (reverse scale 180 − value, tick value).
 */
export interface AngleAnswer {
  kind: 'angle';
  value: number;
  step: 1 | 5 | 10;
  tolerance: number;
  max: 180 | 360;
  baseRotation: number;
}

export type Answer =
  | NumberAnswer
  | ChoiceAnswer
  | MultiAnswer
  | WrittenAnswer
  | CellsAnswer
  | NumberLineAnswer
  | OrderAnswer
  | FractionAnswer
  | PointAnswer
  | AngleAnswer;

export type AnswerKind = Answer['kind'];
export type AnswerOf<K extends AnswerKind> = Extract<Answer, { kind: K }>;

/** What the child entered. Raw text is parsed by src/core/parse.ts. */
export type Response =
  | { kind: 'number'; text: string; unsolvable?: boolean }
  | { kind: 'choice'; index: number }
  | { kind: 'multi'; values: Record<string, string> }
  | { kind: 'written'; result: string; remainder?: string; ueberschlag?: string }
  | { kind: 'cells'; cells: Cell[] }
  | { kind: 'numberline'; value: number }
  | { kind: 'order'; order: number[] }
  | { kind: 'fraction'; numerator: string; denominator: string; whole?: string }
  | { kind: 'point'; x: number; y: number }
  | { kind: 'angle'; value: number };

/**
 * A typical wrong answer (misconception / "bug") with a targeted hint.
 * match: number for number/written/numberline/angle answers (for written div: the wrong quotient),
 *        Record<fieldId, number> for multi answers,
 *        { numerator, denominator, whole? } for fraction answers, { x, y } for point answers,
 *        number[] for order answers (an index order like OrderAnswer.correct).
 * (Choice answers use ChoiceOption.whyWrong instead.)
 * Bug ids are internal (never shown to children).
 */
export interface Bug {
  id: string;
  match: number | Record<string, number> | number[];
  /** Written div only: the wrong Rest, matched together with the quotient. */
  remainder?: number;
  hint: string;
}

/** A step of a worked solution. A plain string or text with an optional visual. */
export type Step = string | { text: string; visual?: Visual };

// ─── Exercise ────────────────────────────────────────────────────────────────

export interface Exercise {
  /** Canonical identity (skill + parameters) used to avoid repeats, e.g. 'zahlen.stellenwerte:2:47'. */
  key: string;
  topicId: TopicId;
  skillId: string;
  stufe: Stufe;
  /** KMK Anforderungsbereich of this item: GenContext.ab when set. Use targetAb() from src/topics/shared.ts. */
  ab: Ab;
  /** Short German instruction, du-form. Text limits: src/core/age.ts, checked by describeSkill (T1–T7). Fractions as {frac:3/4}. */
  prompt: string;
  /** Story text. An exercise with context counts as a Sachaufgabe (T2): context + prompt ≤ 30/40/50 words on Stufe 1/2/3. */
  context?: string;
  /** Optional large maths expression, e.g. '7 · 8 = □' or '45 + 8 = □'. */
  expression?: string;
  visual?: Visual;
  answer: Answer;
  /** Strategy hints, shown one at a time (≥ 1). Never contain the answer. */
  hints: string[];
  /** Worked solution with the child's numbers (≥ 1). The last step states the result. */
  steps: Step[];
  /** Typical wrong answers with targeted hints. */
  bugs?: Bug[];
  /** Specific process praise, completing "Richtig. …", e.g. 'Du bist erst zum Zehner gegangen.' */
  praise: string;
  /** Plain-text version for screen readers (operators spelled out, e.g. '7 mal 8'). A picture's own description is added where it holds other data (src/ui/visuals/describe.ts). */
  srText: string;
  /** The comma is the task (groessen.komma): the voice says '7 Komma 0 8 Euro', not '7 Euro 8' (src/core/format.ts speak). */
  literalComma?: true;
  /** KMK tags from src/data/curriculum.ts. */
  kmk: string[];
}

// ─── Skills & topics ─────────────────────────────────────────────────────────

/** Read-only context passed to generators. */
export interface GenContext {
  /** The written subtraction method (default 'abziehen', adult page only). Never mix the two inside one exercise or round. */
  subtractionMethod: SubtractionMethod;
  /** Range defaults of the profile (§2.5). The profile itself never reaches a generator. */
  ranges: RangeDefaults;
  /** The AB level the round plans for this item: the generator returns an item with exactly this `ab`. */
  ab?: Ab;
}

export interface SkillDef {
  /** Globally unique, `${topicId}.${slug}`, e.g. 'zahlen.lesen'. Never change once released (stored in progress). Listed in src/data/profiles.ts. */
  id: string;
  topicId: TopicId;
  /** Short German title, e.g. 'Große Zahlen lesen'. */
  title: string;
  /** One German sentence. */
  description: string;
  /** What each Stufe contains (German, ≤ 12 words each). These lines and the catalogue choose the content of a Stufe (src/topics/shared.ts targetAb). */
  stufen: Record<Stufe, string>;
  kmk: string[];
  /**
   * The keys active on the Ziffernblock, for the whole skill and never per item (§7.1). minus: every number and multi field sets `signed`.
   * comma: every number and multi field sets `decimals`. describeSkill checks both directions.
   */
  keys?: { minus?: true; comma?: true };
  /** Pure: same rng seed + stufe + ctx ⇒ same exercise. */
  generate(rng: Rng, stufe: Stufe, ctx: GenContext): Exercise;
}

export interface TopicModule {
  topicId: TopicId;
  skills: SkillDef[];
}

export interface TopicMeta {
  id: TopicId;
  title: string;
  shortTitle: string;
  description: string;
  /** CSS custom property suffix, e.g. 'zahlen' → var(--topic-zahlen) / var(--topic-zahlen-bg). */
  color: TopicId;
}

// ─── Checking ────────────────────────────────────────────────────────────────

export interface CheckResult {
  correct: boolean;
  /** Input could not be interpreted (e.g. empty, '3,5'). Not counted as an attempt; show this message. */
  invalid?: string;
  /** Targeted hint from a matched Bug or a wrong ChoiceOption. */
  bugHint?: string;
  /** Id of the matched Bug (internal, never shown): the error-library tag of this mistake (src/state/growth.ts). */
  bugId?: string;
  /** multi: correctness per field id. */
  fieldCorrect?: Record<string, boolean>;
  /** written: wrong result digit positions, 0 = Einer (rightmost). */
  wrongColumns?: number[];
  /** written div: Rest correct? */
  remainderCorrect?: boolean;
  /** written with an Überschlag: the child's Überschlag is close enough to the expected one (within 25 %). */
  ueberschlagOk?: boolean;
  /** cells: cells that are on but should be off, and missing cells. */
  extraCells?: Cell[];
  missingCells?: Cell[];
}
