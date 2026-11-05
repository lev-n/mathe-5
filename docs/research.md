# Research summary: Mathe-Portal Klasse 5 ("Mathe 5")

| | |
|---|---|
| **Project** | Free, no-login maths practice portal for Klasse 5 (first year of Sekundarstufe I in most Länder, children aged 10–11; in Berlin and Brandenburg usually still Grundschule). Sibling of the Klasse 2 and Klasse 4 portals. Static site, progress only in the browser. |
| **Research date** | 2026-11-03 |
| **Language** | English. German curriculum terms and all child-facing strings stay German. |
| **Status** | Basis for implementation. No expert in Fachdidaktik or law has reviewed it. Not legal advice. |
| **Relation to Klasse 4 and Klasse 2** | The Klasse 4 research [42] stays valid for general learning science, motivation, privacy and accessibility. IDs such as L8, M16, C3 or P13 mean the findings in [42] unless restated here. The format follows the Klasse 2 document [43]. This document adds only what changes at age 10–11 and with the split by Schulform. |

Evidence labels: **N** normative (curriculum, law), **E** empirical, **D** didactic consensus or practitioner material, **H** our own heuristic. Inline numbers refer to section 9. Curriculum wording was read in the original texts. Effect sizes come from the primary source unless the text says otherwise, and section 9 marks every source we saw only as an abstract, a summary or a search result.

Curriculum codes used throughout: **BY-G** Gymnasium Bayern, **BY-R** Realschule Bayern, **BY-M** Mittelschule Bayern, **NW-G** Gymnasium NRW (G9), **NW-R** Realschule NRW and, with the same competence list, Gesamtschule/Sekundarschule NRW, **NW-H** Hauptschule NRW, **BB** Rahmenlehrplan Berlin-Brandenburg.

## 1. Key takeaways

1. **The Land splits Klasse 5 at least as much as the Schulform.** All three Bavarian plans put ganze Zahlen in Klasse 5 and proper fractions and decimal numbers in Klasse 6 [2][3][4][5][6][7]. All NRW plans set one target for the end of 5/6, with fractions and decimals inside it and calculating with negative numbers only later [8][9][10][11]. A plain "Gymnasium, Realschule, Hauptschule" switch would therefore be wrong: a Bavarian Mittelschule child meets −3 °C in Klasse 5, and an NRW Gymnasium child may meet ¾ first.
2. **Negative numbers differ in depth inside Bayern too.** BY-G and BY-R calculate with all four operations in Klasse 5 [2][3]. BY-M stays with models such as the thermometer and a ± b, with a ∈ ℤ and b ∈ ℕ [4]. NW-G, NW-R and NW-H use ganze Zahlen to describe or display situations by the end of 6 [8][9][11].
3. **Recommended model: shared core, one optional question, three content profiles.** 31 of the 68 skills are core. One skippable question sets a local profile (`ganzzahl`, `anschaulich`, `bruch`, or the default `offen`). It changes order, emphasis and range limits, and never locks anything (2.5).
4. **Stufen must not stand for Schulformen.** Stufe 1, 2, 3 stay difficulty levels (about AB I, II, III) for every child. The default Stufe never depends on the profile. The child never sees a school label after the question.
5. **The transition is an emotional risk.** Fifth graders reported lower self-esteem and academic self-perceptions than fourth graders in a German cross-sectional sample [36], maths interest falls from grade 5 onward in all tracks [37], and a reported rise in maths anxiety at the changeover was strongest for girls and high achievers [35]. The fair-design rules therefore stay, and there is **no timed mode in v1**.
6. **The signature errors of this age come from carrying natural-number thinking into new numbers.** In 254 German low-achieving sixth graders, 41 % showed the typical natural number bias and 30 % a reverse bias, and both groups estimated fraction size less well [18]. Bayern's own plan names the matching integer error ("Von zwei ganzen Zahlen ist diejenige größer, die den größeren Betrag hat") as a statement to refute [2].
7. **Three new answer types are needed: `fraction`, `point`, `angle`.** `number` also needs `signed` and `tolerance`, and the keypad needs a minus key. The native iOS number pad has no minus key [50], so the on-screen keypad is required on touch devices.
8. **Five new visuals are needed: `coordinateGrid`, `angle`, `fractionModel`, `quader`, `term`,** plus `lines` and `thermometer` as small additions (section 6).
9. **Recommended default round: 10 items, or 6 in written-calculation skills.** This is a heuristic. We found no study that tests round length at this age (7.3).
10. **Tone must grow up.** Plain, respectful German, real Fachwörter, no mascot, no "Kids". The direct evidence for this age is thin and is labelled as such (F20).

## 2. Curriculum comparison: what is expected in Klasse 5

### 2.1 What the KMK standards mean for Klasse 5

The KMK standards for the Erster Schulabschluss (ESA) and Mittlerer Schulabschluss (MSA), in the version of 23.06.2022 (the file carries a correction dated 18.06.2026), describe the school-leaving qualifications, in two parallel columns [1]. They set no Klasse-5 waypoint, so they give a frame only:

- **Leitideen:** Zahl und Operation, Größen und Messen, Strukturen und funktionaler Zusammenhang, Raum und Form, Daten und Zufall [1].
- **Shared by ESA and MSA:** rational numbers, "insbesondere von natürlichen, ganzen und gebrochenen Zahlen"; Zahlbereichserweiterung from ℕ to ℤ and ℚ; Rechengesetze "auch zum vorteilhaften Rechnen"; Überschlag; rounding; schriftliche Rechenoperationen; Kenngrößen such as "Minimum, Maximum, arithmetisches Mittel, Median, Spannweite" [1].
- **MSA only, relevant here:** systematische Zählprinzipien and Quartile. ESA says "ermitteln" where MSA says "berechnen" for area and perimeter [1].
- **Consequence:** the two standards do not differ on most Klasse-5 content. The difference appears later and in depth. This supports a shared core.

### 2.2 How the plans are built

| Plan | Time unit | Reading rule for the app |
|---|---|---|
| BY-G, BY-R, BY-M [2][3][4] | One year. LehrplanPLUS has a page per Jahrgangsstufe. BY-G about 112 hours (four Lernbereiche), BY-R about 140 hours (six), BY-M hours not shown on the page (seven). | Direct statement of what belongs to Klasse 5. Klasse 6 pages [5][6][7] show what comes next. |
| NW-G [8] | Two years, "Ende der Erprobungsstufe". In force from 01.08.2019. | No official split by year. A QUA-LiS sample school plan [12] gives one possible order: 5.1 Daten, 5.2 große Zahlen, 5.3 Größen, 5.4 Rechengesetze, 5.5 Grundfiguren and Koordinaten, 5.6 Fläche and Umfang, 5.9 Brüche, 5.10 Körper; in Klasse 6, primes (6.1), ganze Zahlen (6.2), Dezimalzahlen (6.4). It is an example, not a rule. |
| NW-R, Gesamtschule/Sekundarschule [9][10] | Two years, "Ende der Doppeljahrgangsstufe 5/6". In force from 01.08.2022, rising from Klasse 5. | Same competence list in both documents as we read them. No year split, so Klasse 5 content varies by school. |
| NW-H [11] | Two years, "Ende 6". Issued 2011, so older than the others. | "Verbindlicher Kern". A later revision may exist that we did not find; we saw only this version. |
| BB [13] | Levels, not years. Berlin table: Jahrgangsstufe 5 "Niveaustufen C – D". A second table in the same file gives Jahrgangsstufen 5–6 "Niveaustufe D"; we read it as Brandenburg's but did not confirm that. | Klasse 5 is mainly Grundschule in Berlin and Brandenburg [15][16]. Berlin's official page describes the school change at Klasse 7 [16]. The Bundestag paper says "teilweise nach sechs Jahren" also for Mecklenburg-Vorpommern [15]. |

Practical meaning: the school year of a topic is firm only in Bayern. For NRW and BB the app can say only "in Klasse 5 oder 6".

### 2.3 Content by area and Schulform

"Kl. 5" means named for that year. "bis 6" means named for the end of 5/6. "–" means we did not find it on the Klasse-5 and Klasse-6 pages or in the 5/6 section. Text in quotation marks is the plan's wording.

| Area | BY-G [2][5] | BY-R [3][6] | BY-M [4][7] | NW-G [8][12] | NW-R, Gesamtschule [9][10] | NW-H [11] | BB [13] | Decision for Mathe 5 |
|---|---|---|---|---|---|---|---|---|
| **Große Zahlen** | Kl. 5: "auch Zahlen über eine Million"; no largest number | Kl. 5: no largest number; Stufenzahlen | Kl. 5: "über eine Milliarde hinaus" | bis 6: Stellenwerttafel, Zahlenstrahl, Wortform; sample plan 5.2 | bis 6: same | bis 6: Zahlengerade, 10er-Stellenwerttafel, Wortform | C: to 1 Mio.; D: comparing "großer Zahlen" | **Core.** Stufe 1 to 1 Million, Stufe 2 to 1 Milliarde, Stufe 3 beyond. |
| **Runden, Zahlenstrahl** | Kl. 5 | Kl. 5 | Kl. 5 | bis 6 | bis 6 | bis 6: "schätzen und überschlagen" | C | **Core.** |
| **Zahlensysteme** | Kl. 5: römisch as a contrast | Kl. 5: Dualsystem, römisch, convert | – | – | – | – | – | Optional, BY-R mainly. |
| **Zehnerpotenzen, Potenzen** | Kl. 5: integer bases; "Quadratzahlen bis 400" | Kl. 5: same 400 | – | Potenzschreibweise in Primfaktoren | – | Zehnerpotenz at Ende 10 | F: powers | Optional. |
| **Schriftliche Verfahren** | Kl. 5: all four; more than two-digit factors, divisors above ten | Kl. 5: all four; "Abziehverfahren mit Entbündeln" | Kl. 5: factor and divisor "höchstens zweistellig"; "Abziehverfahren mit Entbündeln" | bis 6: "schriftliche Division"; sample plan 5.4 | bis 6: same | bis 6: Grundrechenarten with decimals | not read in detail | **Core.** Stufe 3 holds three-digit factors and divisors. Written division starts from zero for some children: NRW's Grundschule only asks to "erläutern" it (C6 in [42]). |
| **Rechengesetze** | Kl. 5: Kommutativ, Assoziativ, Distributiv | Kl. 5: "Rechengesetze" | Kl. 5: Assoziativ, Kommutativ | bis 6: all three | bis 6: all three | Ende 8 | not read in detail | Commutative and associative are core. Distributive is optional. |
| **Klammern, Punkt vor Strich** | Kl. 5: named, also with integers | Kl. 5: "Rechenregeln" | Kl. 5: named | bis 6: "Rechenterm" | bis 6: "Rechenterm" | not named at Ende 6 | not read in detail | **Core.** Natural numbers first; with integers only in `ganzzahlen.terme`. |
| **Teilbarkeit** | Kl. 5: 2, 3, 5, 10; Primfaktorzerlegung | Kl. 5: rules, Teilermengen, Primfaktoren, ggT, kgV | – | bis 6: 2, 3, 4, 5, 10; Primfaktoren; sample plan 6.1 | bis 6: 2, 3, 5, 10; Primzahlen | bis 6: Teiler, Vielfache; 2, 3, 5, 10 | D: also 3, 4, 6, 9, 25, 50; Primzahlen | Optional, because BY-M has none on its 5/6 pages. Fits every other plan. |
| **Negative Zahlen** | **Kl. 5: all four operations**, Betrag, sign rules | **Kl. 5: all four operations**, Gegenzahl, Betrag | **Kl. 5: thermometer, heights; Vorzeichen vs Rechenzeichen; a ± b, a ∈ ℤ, b ∈ ℕ** | bis 6: "Darstellung ganzer Zahlen", states, changes, Koordinaten; sample plan 6.2 | bis 6: states and changes | bis 6: "darstellen". Ordering and calculating: Ende 8 | E: identifying, Zahlengerade, Betrag | Meaning, Zahlengerade, order and changes are core. Calculating is optional, with profile `ganzzahl` as Schwerpunkt. |
| **Brüche** | Kl. 6. Kl. 5: none named | Kl. 6. Kl. 5: "Alltagsbrüche" for Größen | Kl. 6. Kl. 5: ¼, ½, ¾, 1½ for Größen | bis 6: all five Vorstellungen, kürzen, all four operations with simple fractions; sample plan 5.9, 6.5 | bis 6: kürzen, plus and minus with simple fractions | bis 6: gleichnamig plus and minus, kürzen | D: gemeine Brüche, kürzen, gleichnamig machen | Optional, Schwerpunkt in profile `bruch`. Multiplying and dividing fractions: out of v1. |
| **Dezimalzahlen** | Kl. 6. Kl. 5: comma with Geld, Länge, Masse | Kl. 6. Kl. 5: "Kommaschreibweise" | Kl. 6. Kl. 5: comma with Geld and Längen | bis 6: endliche Dezimalzahlen; sample plan 6.4 | bis 6: all four operations | bis 6: ordnen, runden, operations, division by natural numbers only | D: ordering, rounding | Comma with Größen is core. Dezimalzahlen as numbers are optional, Schwerpunkt `bruch`. |
| **Größen** | Kl. 5: km–mm, t–mg, h–s, Einheitentafel | Kl. 5 | Kl. 5 | bis 6 | bis 6 | bis 6 | C–D | **Core.** |
| **Dreisatz** | Kl. 5: "Schlussrechnung", "Dreisatz" | Kl. 5 | – | bis 6: "Dreisatzverfahren" | not named | Ende 8 | not read in detail | Optional. |
| **Maßstab** | Kl. 5 | Kl. 5 | – | bis 6 | bis 6: "gängige Maßstabsverhältnisse" | bis 6: "Maßstabsverhältnisse bestimmen" | E level text "Rechnen mit Maßstäben", exact level not pinned | Optional, because BY-M lacks it on its 5/6 pages. |
| **Parallel, senkrecht** | Kl. 5: with Lot, Abstand, Tangente | Kl. 5 | Kl. 5 | bis 6 | bis 6 | bis 6 | C–D | **Core.** Tangente and circle relations: out of v1. |
| **Koordinatensystem** | Kl. 5: "kartesisch" | Kl. 5 | Kl. 5: **1. Quadrant**, "Rechtswert, Hochwert"; four quadrants Kl. 6 | bis 6: sample plan 5.5; four quadrants 6.2 | bis 6 | bis 6 | D: 1. Quadrant; E: four | **Core.** First quadrant in Stufe 1–2, four quadrants in Stufe 3. |
| **Winkel** | Kl. 5: to **360°**, Geodreieck | Kl. 5: **0° to 360°**, Scheitel- and Nebenwinkel | Kl. 5: **to 180°**; spitz, recht, stumpf, gestreckt; 45°, 90°, 180° as references | bis 6: schätzen, messen, klassifizieren | bis 6: same | bis 6: messen, zeichnen, schätzen | D | **Core.** Stufe 1–2 to 180°, Stufe 3 beyond. |
| **Vierecke** | Kl. 5: six types | Kl. 5: Dreiecke, Vierecke | Kl. 6 | bis 6 | bis 6: also Dreiecke | bis 6: Rechteck, Quadrat, Parallelogramm; others Ende 8 | D | Optional, because BY-M has it in Kl. 6. |
| **Rechteck: Umfang, Fläche** | Kl. 5: "unterscheiden" clearly; km² to mm², a, ha | Kl. 5 | Kl. 5: m² to mm², neighbouring units | bis 6 | bis 6 | bis 6; Flächen umwandeln Ende 8 | D | **Core.** |
| **Quader** | Kl. 5: Oberfläche via Netz and Schrägbild. Volumen Kl. 6 | Kl. 5: Netze, Schrägbilder; Oberfläche and Volumen Kl. 6 | Kl. 6 | bis 6: Netz, Schrägbild, Oberfläche, Volumen; sample plan 5.10, 6.3 | bis 6: same | bis 6: Netze, Oberfläche, Volumen; Schrägbild Ende 8 | D | Optional. Oberfläche fits BY-G and NRW first. |
| **Achsensymmetrie** | – on the 5 and 6 pages | Kl. 6 | Only a criterion for Vierecke in Kl. 6 | bis 6; sample plan 6.6, 6.10 | bis 6 | bis 6 | D | Optional. Also revision of Grundschule content. |
| **Daten, Diagramme** | Kl. 5: only Zählprinzip and Baumdiagramm. Diagrams Kl. 6 | Kl. 5: tables, diagrams, Vierfeldertafel, spotting distorted charts | Kl. 5: Ur- and Strichlisten, tables, diagrams | bis 6; sample plan 5.1 | bis 6 | bis 6 | D | Optional by the rule, because BY-G has it in Kl. 6. It fits nearly everyone, so it stays visible. |
| **Mittelwert** | Kl. 6 | not on the 5 or 6 page | Kl. 6 | bis 6, also Median, Quartile, Boxplot | bis 6, Median, Spannweite | bis 6, with Median | E | **Not a Klasse-5 topic in Bayern.** Optional, Schwerpunkt `bruch`. |

### 2.4 Differences that affect the app

- **Direction of the number extension.** Bayern: ℕ → ℤ in Klasse 5, then ℚ in Klasse 6. NRW: positive fractions first, ganze Zahlen as a representation. The same app must work in either order.
- **Bavarian Mittelschule has its own wording.** "Rechtswert, Hochwert", thermometer, and first-quadrant only. Hints should accept this wording, so `Rechtswert (x)` appears wherever an axis is explained.
- **Subtraction method.** BY-R and BY-M name "Abziehverfahren mit Entbündeln". The `written` answer already has a `method`. Default `abziehen`, with the adult page able to switch.
- **The NRW sample plan starts Klasse 5 with data,** partly because the topic "erlaubt den gemeinschaftlichen Beginn der Schullaufbahn unabhängig von heterogenen Lernvoraussetzungen" and runs alongside a diagnosis of Stellenwert [12]. This is a useful signal: Klasse 5 starts by repairing Grundschule content.
- **Boxplots and Quartile in NW-G.** The Erprobungsstufe section lists them under its Schwerpunkte [8]. They are not in NW-R's 5/6 list [9] and are out of v1.
- **Timing within the year is unknown.** Even in Bayern no month is fixed. A child in October may not have met a topic, so nothing is hard-locked.

### 2.5 Recommendation: one portal, one optional question

**Principle.** Separate three things that are easy to mix up:

| Dimension | What it means | How the app expresses it |
|---|---|---|
| **Difficulty** | How hard a task is, about AB I–III. Every plan and the KMK use all three levels. | Stufe 1, 2, 3. Chosen per skill by the child; suggestion from the child's own answers. |
| **Content order** | What is on the menu now. Depends mostly on Land. | Profile: order of topics, Schwerpunkt or Extra. |
| **Range limits** | For example angles to 180° or 360°. Depends on plan. | Profile sets a default generator parameter; never a lock. |

**The question** (H). Shown once, skippable, answerable by a child or an adult. Also available later under Einstellungen and on the adult page.

> **Was passt zu deiner Klasse?** Dann zeigen wir zuerst die passenden Themen. Du kannst das jederzeit ändern. Es bleibt nur auf diesem Gerät.
>
> `Bayern: Gymnasium oder Realschule` · `Bayern: Mittelschule` · `NRW, Berlin oder Brandenburg` · `Anderes Land oder weiß ich nicht`

| Answer | Stored profile | Schwerpunkt | Range defaults |
|---|---|---|---|
| Bayern: Gymnasium oder Realschule | `ganzzahl` | Core, then all of `ganzzahlen`, `zahlen.teilbarkeit`, `zahlen.primfaktoren`, `zahlen.potenzen`, `zahlen.zehnerpotenzen`, `rechnen.distributiv`, `groessen.schlussrechnung`, `groessen.massstab`, `geometrie.vierecke`, `flaeche.netze`, `daten.zaehlprinzip` | Angles to 360°, four quadrants at Stufe 3, numbers beyond 1 Milliarde, three-digit divisors at Stufe 3 |
| Bayern: Mittelschule | `anschaulich` | Core, then `brueche.alltag`, `rechnen.gleichungen`, `daten.strichliste`, `daten.diagramme`, and Stufe 1 of `ganzzahlen.plusminus` | Angles to 180°, first quadrant, factors and divisors at most two-digit, m² to mm² |
| NRW, Berlin oder Brandenburg | `bruch` | Core, then all of `brueche`, `zahlen.teilbarkeit`, `geometrie.symmetrie`, `flaeche.volumen`, `flaeche.oberflaeche`, `daten.*` except `daten.vierfelder` | Angles to 360° at Stufe 3, four quadrants at Stufe 3, integers as states and changes only |
| Anderes Land oder weiß ich nicht, or skipped | `offen` | Core first; every other skill visible and marked "Extra" | Widest range, offered by Stufe |

**Rules** (H, except where marked).

1. **Nothing is hidden for good.** "Mehr Themen" always opens every skill. A child at an NRW school who wants negative numbers has them one tap away.
2. **Topic progress counts Schwerpunkt skills only.** Extra skills earn the normal status labels but never make a topic look unfinished.
3. **The profile never sets a Stufe, a target, or a message.** Evidence for caution: a higher-achieving class or school goes with lower academic self-concept (β = −.28 across 33 studies) [57], a perceived social reference norm goes with a steeper fall in self-concept in grade 5–6 [56], and the lowest track had more favourable interest trajectories in one German sample [37]. Mapping tracks onto Stufen would also tell a child that a track is a ranking, which the banned-patterns rule on rankings forbids in spirit.
4. **No school label after the question.** Not on the start page, not in badges, not in summaries, not on worksheets. The internal value is the profile id, not the school type.
5. **NRW and BB do not get a Schulform sub-question.** Differences there are mainly depth, which Stufen cover. NW-H's limits are named on the adult page. This keeps the choice to four buttons.
6. **Other Länder default to `offen`.** Only Bayern, NRW and BE-BB were read (section 8). The adult page explains why.

**Options rejected.** Separate portals per Schulform (the shared core is large, and maintenance would multiply). Stufe = Schulform (rule 3). A full Land × Schulform matrix (long list, more identifying, and accurate for only a few Länder). A placement test at the start (test framing conflicts with M9; six weeks of school changes the answer anyway).

### 2.6 Out of scope for v1

Multiplying and dividing fractions (NW-G only at this level); Prozentrechnung beyond the word; periodische Dezimalzahlen; Variablen beyond a □ or x in simple equations; Tangente and Kreislagen; constructions with Zirkel; dynamic geometry and spreadsheets (plans ask for them, but they do not fit auto-checked tasks); free drawing of figures; Boxplots and Quartile; Zufallsexperimente and relative Häufigkeit (needs fractions and hands-on work; NW-H, NW-G, NW-R name them); Klassen-Umfragen as real surveys; written calculation with decimal numbers in the `written` component (decimals use `number` in v1).

## 3. Learning science and age-specific findings

General findings carry over from [42]: retrieval practice (L1), spacing (L2), interleaving (L3), elaborated feedback (L4), worked examples (L6), praise and reward research (M1, M2, M6) and improvement feedback (M16). This age is closer to much of that evidence than Klasse 2 was. Interleaved practice, for instance, was tested with seventh graders [55]. The table lists only what is specific to age 10–11 or to the new content.

| ID | Finding | Evidence | Design consequence |
|---|---|---|---|
| F1 | **Natural number bias.** 254 low-achieving German sixth graders from Hauptschulen, 8 weeks after first meeting fractions, did a fraction comparison task. Three clusters: typical bias 105 (41 %), accuracy .91 on congruent and .07 on incongruent items; reverse bias 75 (30 %), .21 and .81; no bias 74 (29 %), .64 and .60. Percentages are ours from the Ns. Estimation error was 16.6 %, 14.8 %, 10.8 %. The no-bias group was about three times slower (about 6.25 s vs 2.5 s). Rinne et al., cited there, saw some students shift from typical bias toward reverse bias or correct reasoning between grades 4 and 6 [18]. | E, one track, cross-sectional | Two separate bugs (`nenner-groesser`, `kleinere-zahlen`). Comparison items must mix congruent and incongruent pairs, so that neither rule scores well alone. Pictures and estimation before symbolic rules. Never reward speed here: the careful group was the slow one. |
| F2 | **Decimals.** Fourth and fifth graders (N = 74) who compared incorrect with correct examples of decimal magnitude learned procedures and concepts better than those comparing two correct examples, and showed fewer misconceptions; prior knowledge did not interact [21]. A dissertation version with a larger sample found no significant advantage (search result only). | E, mixed | Fehlerdetektiv stays at Stufe 3 and is not the default. Bugs `komma-laenger` and `komma-kuerzer` are separate. Stellentafel extended to the right is the anchor, as BY-M and BB describe it [7][13]. |
| F3 | **Stellenwert is not finished.** "Da viele Lernende kein tragfähiges und anschlussfähiges Stellenwertverständnis mitbringen", it should be reworked in Klasse 4/5 and then used for decimals. Only 29 % of 830 learners bundled ten Zehner into a Hunderter in a task before writing the number (Moser Opitz et al., via [26]; school year of the sample not restated). A child wrote all digits in a row, ignoring position [26]. The NRW sample plan runs a Stellenwert diagnosis at the start of Klasse 5 [12]. | D, E (secondary) | Do not skip `zahlen.stellenwerte` for "good" children. Bundling at Stufe 2. Stellentafel, zoomable number line and bundled material appear together. Decimals reuse the same table. |
| F4 | **Order of operations.** 240 Turkish students in grades 6–8 (78 in grade 6), two-tier test: left-to-right evaluation; the belief that only bracket operations go first; ignoring the order when writing expressions. No grade figures on the page we read [22]. Bavarian plans ask for "fortlaufender, klar strukturierter Rechnung" [2]. | E, slightly older, abstract | Separate skills for Punkt vor Strich and Klammern. Bugs match exact wrong values. `term` visual highlights the next step. Stufe 2 asks "Was rechnest du zuerst?" before the result. |
| F5 | **Minus sign.** The sign has three meanings: subtraction, a negative number, the opposite. "Many students in middle school and even high school" have no full symbol sense for it [23]. First graders over-rely on whole-number principles, and instruction on the sign's meanings helped [25]. BY-G and BY-M require a clear split of Vorzeichen and Rechenzeichen, BY-M as Zustand and Zustandsänderung [2][4]; so does the NRW sample plan [12]. | D, E (partly abstract), N | Dedicated `ganzzahlen.vorzeichen`. Numbers after an operator always carry brackets: 5 − (−3). Read-aloud says "minus drei" for the number, "minus" for the operation, with a pause. No colour-only coding. |
| F6 | **Order of negative numbers.** Sixth graders draw on prior out-of-school and school experience when reasoning about integer order; the number line and debts-and-assets context were used in the lesson series (two case analyses) [24]. Bayern lists "Von zwei ganzen Zahlen ist diejenige größer, die den größeren Betrag hat" as a statement to check [2]. | E (abstract, two cases), N | Bug `betrag-groesser`. Stufe 3 item from the plan's own statement. Thermometer first, then horizontal Zahlengerade. Guthaben as a context, never a child's own debt. |
| F7 | **Umfang and Fläche.** 262 Turkish fifth graders, 21 open items: difficulty with perimeter, and some students confused perimeter and area calculations or related perimeter to angle calculation [27]. BY-G asks pupils to "unterscheiden" the two clearly [2]. | E, N | Own skill `flaeche.unterscheiden`. Unit always visible as part of the answer choice in that skill (cm or cm²). Worked steps name Rand and Innenfläche. |
| F8 | **Winkel.** 254 Turkish fifth graders: 67 % made mistakes measuring with a protractor; 53 % succeeded with unusual shapes and positions. Most frequent error type measurement (f = 790), then drawing (615), reading the tool (510), definition (482), type (411). Details include not reading the units between degrees, not reading the outer scale, not using rays and vertex, and believing the arms make an angle larger [28]. Children attend to ray length rather than turn (Devichi & Munier, seen through later citations) [29]. | E | Separate `winkel-arten`, `winkel-messen`, `winkel-zeichnen`. Vary arm length on purpose. "Spitz oder stumpf?" before reading. Both scales drawn. Tick-value bug. |
| F9 | **Koordinaten.** We found only practitioner statements: students reverse the numbers and count up first [30]. No empirical prevalence study was opened. BY-M's "Rechtswert, Hochwert" [4]. | D, weak | Bug `koordinaten-getauscht`. Item pairs (4\|5) and (5\|4) side by side at Stufe 2, as in [30]. Note: `grid` has y = 0 at the top, so it must not be reused. |
| F10 | **Quader.** Students in grades 5–8 have difficulty relating isometric drawings to the solids they show (Ben-Haim et al.) [31]. Early conceptions treat a 3-D array as an uncoordinated set of faces (Battista & Clements) [32]. Only abstracts seen, no percentages. | E (abstract) | Layers before formula. Hidden edges dashed. `quader-sichtbar` bug. BY-G asks for Netz and Schrägbild together [2]. |
| F11 | **Mittelwert.** Cai (1995, via [33]): about 90 % of sixth graders knew the averaging algorithm, and less than half had a conceptual understanding. Mokros and Russell describe children treating an average as mode or as an algorithm (summary only) [34]. A levelling model is reported to help (search result only, not opened). | E (secondary) | Levelling picture first, in `barChart`. Stufe 3 asks for a missing value and effect of an outlier. Scope limited (2.3). |
| F12 | **Transition and self-perception.** German sample, 307 fifth and 318 fourth graders: fifth graders reported lower self-esteem, academic competence and academic affect, with no differences in physical appearance or peer self-concept. The authors attribute it mainly to the transition itself. Cross-sectional [36]. In 69 Gymnasium classes in grades 5–6, maths self-concept fell by about 0.37 SD a year (M16 in [42]) [56]. | E | Comparison only with the child's own past. Summaries count what worked. Copy never says "jetzt bist du an der weiterführenden Schule, da …". |
| F13 | **Transition and maths.** A review reports an interruption in academic growth, attitude and self-efficacy declines, and, from Madjar et al., maths anxiety rising at the changeover, more for girls and high achievers, back to initial levels by the end of the first year. Most of it is non-German, and the review's conclusions on some outcomes are "somewhat unclear" [35]. The review suggests teaching topics that carry over from primary to secondary school [35]. | E, mostly secondary here | Include Grundschule-near content in `zahlen` and `rechnen` at the start. High achievers need the fair rules as well. |
| F14 | **Interest falls.** N = 3,193, grades 5–9, all three German tracks: downward trend in maths interest that plateaus later, similar for boys and girls, more favourable in the lowest track [37]. | E (abstract) | Relevance through real contexts (T12), choice (M5), no extrinsic scheme. No claim that the app raises interest. |
| F15 | **Timed work.** 35 mathematically gifted sixth graders: timed 19.66 vs untimed 20.91 out of 40 (d = −.44), significant only when the timed test came first. Against the hypothesis, higher anxiety and perfectionism went with a *smaller* gap [38]. | E, small, gifted only | Weak evidence either way. No time pressure in v1 (7.1). It does not prove harm, so the reason is mainly that the plans ask for understanding and that F1 shows careful children are slower. BY plans do want some automatised knowledge, e.g. squares to 400 [2]. |
| F16 | **Reading.** IGLU 2021: 25.4 % of German fourth graders do not reach Kompetenzstufe III, compared with 18.9 % in 2016 and 17 % in 2001 (research team's press kit) [39]. Word-problem difficulty depends on word and sentence length, unfamiliar words and semantic structure [60]. 10–11-year-olds gave realistic reactions to about 17 % of problematic word problems (Verschaffel et al., via L15 in [42]) [58]. | E | Text rules in section 4. "They read better" is true on average only. A quarter of the group entering Klasse 5 still struggles with connecting information. Vorlesen stays. |
| F17 | **Language by school type.** Bayern 2024/25, Jahrgangsstufe 5, share with migration background: Mittelschule 50.1 % (girls), 48.8 % (boys); Realschule 21.1 %, 19.8 %; Gymnasium 20.0 %, 20.2 % [40]. Migration background is not the same as weak German. | Descriptive | Same plain text rules everywhere, not a "simple German" track. Fachwörter glossed on first use. Avoid idioms. |
| F18 | **Type.** 45 fifth graders (mean age 10.5): 20 % smaller font raised comprehension (.91 vs .81, d = .43); line length (d = .14) and line spacing (d = .02) not significant [41]. The second graders in the same paper showed the reverse. | E, one small study | Body text can be smaller than in Klasse 4 and 2 (7.1). Do not read this as "smaller is better"; there is no floor from this study. |
| F19 | **Touch and motor skills.** NN/g, practitioner: ages 9–12 have well-developed fine motor skills and partially developed motor coordination; around 11 children reach the adult range of physical interactions, though mental stage still calls for simpler interfaces; 2 × 2 cm is for young children, 1 × 1 cm the adult guideline [45]. In Anthony et al., the group aged 7–10 missed more than older groups on 0.25-inch targets [59]. | D, E small | Keypad 56 px. Dragging may be offered, never required (P17). Coordinate and angle inputs need tap and step buttons. |
| F20 | **Tone.** NN/g on ages 13–17 (100 teens): "Avoid anything that sounds condescending or babyish"; "the word 'kid' is a teen repellent"; neutral graphics preferred; write at about 6th-grade level or lower, with short sentences [46]. NN/g's work on ages 3–12 calls for clear, specific instructions and tested an age group of 9–11 [47]. The ICO Code uses the band 10–12, labelled "transition years" in an ICO document (search result only; ICO files blocked our download) [48]. **We found no study of 10–11-year-olds' reaction to childish tone in learning apps.** | D, extrapolated; H | Tone rule T17. Extrapolating from 13–17 is our inference. Pilot it. |
| F21 | **Devices.** KIM 2024 (n = 1,225 children aged 6–13): smartphone in own possession at 6–7: 11 %, 8–9: 33 %, 10–11: 63 %, 12–13: 79 %, the biggest jump (+30 points) falling, in the report's words, at the age of the school change. About 22 % use a learning programme at least weekly, as we read one sentence of the report [44]. | E, descriptive | Phone-first layout is new and essential. Coordinate grid, Geodreieck and written calculation must fit 360 px width. No install, no account. |
| F22 | **Digital practice in secondary school.** Meta-analysis, 92 studies, grades 5–13: g = 0.65 for achievement, larger when tools add to other instruction rather than replace it; intelligent tutoring and dynamic tools did better than hypermedia (search-result summary of abstract) [20]. TUM trial, about 1,000 pupils in 45 classes, about 15 hours on fractions: low achievers on tablets outperformed two comparison groups (20 % vs 13 % probability on an average item); results for high achievers and arithmetic are reported inconsistently across press texts [19]. | E, press and abstract | Position stays "Ergänzung zum Unterricht" (L10). No grade promises. Note that this app is simpler than those tools. |

**Privacy (no change in approach).** Art. 8 DSGVO applies only where processing rests on consent for a service offered directly to a child; below 16 a parent must give or authorise it, and member states may lower the age to 13 [51]. Germany has not lowered it [52]. All users here are under 16. A site that relies on no consent and collects no personal data does not trigger Art. 8 at all, apart from hosting logs it cannot avoid (P2 in [42]). Mathe 5 keeps the Klasse-4 approach (P1, P2): no accounts, no personal data, no third-party requests, storage only after opt-in. One point is new: the profile question. See section 8.

## 4. Text rules for 10–11-year-olds

**What is known.** F16–F18 show which factors make text harder. They do not give numerical limits for German 10–11-year-olds. All numbers below are therefore heuristics (H), chosen to be checkable by a unit test. They sit above the Klasse-2 limits [43] because the children read more and the plans expect multi-step tasks. Words are whitespace tokens; the symbols + − · : = □ < > and numbers with their unit do not count.

| # | Rule | Basis |
|---|---|---|
| T1 | Non-story tasks: at most 18 words. | H |
| T2 | Sachaufgaben: at most 30 words on Stufe 1, 40 on Stufe 2, 50 on Stufe 3. | H |
| T3 | At most 4 sentences including the question (5 on Stufe 3). | H |
| T4 | At most 14 words per sentence (16 on Stufe 3). | H; sentence length [60] |
| T5 | Stufe 1: no subordinate clauses. Stufe 2–3: at most one per task, using only `wenn, weil, dass`. Always ban `obwohl, nachdem, während, sodass, damit` and relative clauses. | H; structure [60] |
| T6 | Present tense, active voice. Ban `wird/werden/wurde` + participle, `würde, hätte, wäre`. A Konjunktiv is allowed only in a Stufe 3 "Was wäre, wenn" item, at most once. | H |
| T7 | One question, always last. One idea per sentence, at most three numbers per sentence. Data belongs in a table or chart once there are more than four numbers. | H |
| T8 | Words outside the allowlist have at most 14 letters. Allowlist includes Stellenwerttafel, Zahlengerade, Zehnerpotenz, Flächeninhalt, Primfaktorzerlegung, Koordinatensystem. | H; unfamiliar words [60] |
| T9 | No idioms and no double negatives. Repeat the noun instead of `sie`, `er`, `es` across sentences. | H; F17 |
| T10 | Number format: groups of three with a thin space from 5 digits (1 250 000); decimal comma; minus as U+2212; negatives after an operator in brackets, 5 − (−3); · and : for mal and geteilt; points as P(3\|2); space before units, `−3 °C`, but `90°`. Fractions stacked, never `3/4` in text. | C11 in [42]; [4] for Rechtswert; H for the rest |
| T11 | Fachwörter from the plans, not simplified away: Summe, Differenz, Produkt, Quotient; Stellenwert, Stufenzahl; Vorzeichen, Rechenzeichen, Betrag, Gegenzahl; Zähler, Nenner, kürzen, erweitern; Teiler, Vielfaches, Primzahl; Scheitel, Schenkel; parallel, senkrecht; Rechtswert, Hochwert. The first use in a skill has a short gloss by tap, not a pop-up. | N [2][3][4][9] |
| T12 | Contexts fit the age: Sportverein, Klassenfahrt, Busfahrplan, Taschengeld, Einkaufen, Rezepte, Wetter, Berge und Meer, Karten, Speicherplatz, Bastelprojekte. Short names from many backgrounds (Mia, Ali, Lena, Emre, Noah, Sofia). No brands, no weight or body comparisons, no real money trouble. Debts appear only as an abstract Konto, not as a child's or family's problem. | H; [2] for Guthaben und Schulden; C13 in [42] |
| T13 | Do not let a keyword predict the operation: "mehr" also appears in subtraction stories, and "weniger" with addition. | E [60] |
| T14 | Pictures show the data or repeat it. No decoration in the task area. | K2 T14 in [43] |
| T15 | Hints: at most 14 words and 2 sentences. Praise: at most 10 words. Worked steps: one line each, at most 5 steps. | H |
| T16 | "Vorlesen" reads task and hint. Check per skill: large numbers ("drei Millionen vierzigtausend"), fractions ("drei Viertel", not "drei Schrägstrich vier"), signs ("minus drei" vs "minus"), P(3\|2) as "P drei, zwei", angles and units. | E small [61]; P12 in [42] |
| T17 | **Tone.** du-form, plain and respectful. Ban diminutives and baby talk (`Aufgäbchen`, `Zählerchen`, `Zahlenfreunde`, `kleine Matheheldin`), `Kinder` or `Kids` as address, `wir` as a fake teacher voice ("Na, was haben wir denn hier?"), more than one exclamation mark per screen, emoji, and rhymes. Adult pages use Sie. | H, inferred from [46] |
| T18 | Regular upright text, no capitals-only words, no automatic hyphenation. | H; K2 T17 in [43] |

**Heuristic checks to automate:** a test that runs T1–T7 and T17's word list on sampled generator output, a test for T10 number format, and a word allowlist report for review with real children. LIX was considered and not used: we found no verified German norm for this age.

## 5. Typical misconceptions and bug hints

Basis: [n] means the pattern is documented in that source. **H** means it is a plausible pattern from our own didactic reasoning, with no source opened; check these in the pilot. A bug is matched only when the wrong answer computes exactly from the pattern; otherwise a generic step hint is used. No hint uses the words "falsch" or "leider", and a test should enforce that.

| Area | Bug | Wrong pattern | Hint | Basis |
|---|---|---|---|---|
| Zahlen | `null-vergessen` | "drei Millionen vierzig" as 340 or 3 040 | Trag die Zahl in die Stellentafel ein. Leere Stellen bekommen eine 0. | L14 in [42] |
| Zahlen | `milliarde-million` | 1 Milliarde taken as 1 000 000 | Eine Milliarde sind 1 000 Millionen. | H |
| Zahlen | `ziffern-hintereinander` | 6 T 3 H 12 Z 5 E written as 63 125 | 12 Zehner sind 1 Hunderter und 2 Zehner. Bündle zuerst. | [26] |
| Zahlen | `strahl-schritt` | Each tick read as 1 when 1 tick = 50 000 | Schau zuerst: Wie viel zählt ein kleiner Strich? | H, cf. [26] |
| Zahlen | `runden-stelle` | Rounds to a different place than asked | Markiere zuerst die Stelle, auf die du runden sollst. | L14 in [42] |
| Zahlen | `runden-uebertrag` | 1 996 000 to Zehntausender gives 1 990 000 | Die 6 rundet auf. Aus 199 Zehntausendern werden 200. | H |
| Zahlen | `teilbar-endziffer` | 13 taken as divisible by 3, it ends in 3 | Bei der 3 zählt die Quersumme, nicht die letzte Ziffer. | H |
| Zahlen | `primzahl-eins` | 1 called a Primzahl | Eine Primzahl hat genau zwei Teiler. Die 1 hat nur einen. | H |
| Zahlen | `primzahl-ungerade` | 9 or 21 called prime because odd | Prüfe die Teiler: 3 teilt auch ungerade Zahlen. | H |
| Zahlen | `potenz-mal` | 3² = 6; 2⁵ = 10 | 3² heißt 3 · 3, nicht 3 · 2. | H |
| Rechnen | `links-nach-rechts` | 3 + 4 · 5 = 35 | Punkt vor Strich: Rechne zuerst 4 · 5. | [22] |
| Rechnen | `nur-klammer` | 2 + 3 · (4 + 1) = 25 | Nach der Klammer gilt weiter: Punkt vor Strich. | [22] |
| Rechnen | `klammer-ignoriert` | (8 + 4) · 3 = 20 | Die Klammer kommt zuerst: 8 + 4. | H, cf. [22] |
| Rechnen | `minus-klammer` | 40 − (12 − 5) = 23 | Rechne erst 12 − 5. Zieh dann das Ergebnis von 40 ab. | H |
| Rechnen | `tausch-minus` | 30 − 12 treated like 12 − 30, or swapped in a chain | Bei Minus und Geteilt darfst du nicht einfach tauschen. | H |
| Rechnen | `verteilen-halb` | 7 · (20 + 3) = 143 | Die 7 gehört zu beiden: 7 · 20 und 7 · 3. | H |
| Rechnen | `uebertrag-vergessen` | Carry dropped in a written sum | Prüfe die Stelle mit dem Übertrag noch einmal. | L13 in [42] |
| Rechnen | `kleiner-von-groesser` | Takes the smaller digit from the larger in every column | Oben steht die kleinere Ziffer. Entbündle zuerst. | L13 in [42] |
| Rechnen | `mal-versatz` | 123 · 45 with both partial products unshifted | Die 4 steht für 4 Zehner. Rück das Teilergebnis eine Stelle ein. | H, cf. L13 in [42] |
| Rechnen | `null-im-quotient` | 4 230 : 6 = 75 | Passt 75 zum Überschlag? Schreib auch die 0 im Ergebnis. | L13 in [42] |
| Rechnen | `rest-zu-gross` | 17 : 5 = 2 Rest 7 | Der Rest muss kleiner als 5 sein. | C6 in [42] |
| Rechnen | `umkehr-richtung` | x − 5 = 12 gives 7 | Mach die Probe. Was hebt minus 5 auf? | H |
| Rechnen | `alle-zahlen` | Calculates with every number in the text | Welche Zahlen brauchst du für diese Frage? | [60] |
| Rechnen | `rest-sache` | 17 Kinder, 5 per car, gives 3 cars | Alle sollen mitfahren. Reichen 3 Autos? | [58], L15 in [42] |
| Ganze Zahlen | `betrag-groesser` | −7 > −3 | −3 liegt weiter rechts. Rechts ist größer. | [2] |
| Ganze Zahlen | `vorzeichen-ignoriert` | −3 + 8 = 11 | Starte bei −3 und geh 8 Schritte nach rechts. | H, cf. [23] |
| Ganze Zahlen | `vorzeichen-behalten` | −2 + 5 = −7 | Plus 5 heißt: nach rechts gehen, über die 0 hinaus. | H, cf. [23] |
| Ganze Zahlen | `minus-minus` | 4 − (−9) = −5 | Minus einer negativen Zahl: Es wird mehr. Rechne 4 + 9. | H, cf. [23] |
| Ganze Zahlen | `unter-null-weiter` | −7 − 5 = −2 | −7 ist schon unter 0. Minus 5 geht weiter nach unten. | H |
| Ganze Zahlen | `aenderung-zustand` | From −4 °C to 6 °C gives 2 | Zähle von −4 bis 0, dann weiter bis 6. | H, cf. [4] |
| Ganze Zahlen | `gegenzahl-negativ` | Gegenzahl of −5 is −5 | Die Gegenzahl liegt auf der anderen Seite der 0. | H, cf. [23] |
| Ganze Zahlen | `betrag-minus` | \|−8\| = −8 | Der Betrag ist der Abstand zur 0. Ein Abstand ist nie negativ. | H, cf. [2] |
| Ganze Zahlen | `regel-mal` | (−3) · (−4) = −12 | Zwei negative Faktoren: Das Ergebnis ist positiv. | H |
| Ganze Zahlen | `regel-uebertragen` | −3 + (−4) = 7 | Die Regel gilt nur für Mal und Geteilt. Hier rechnest du plus. | H |
| Brüche | `nenner-groesser` | ⅛ > ⅕ because 8 > 5 | Achtel sind kleiner als Fünftel: Das Ganze hat mehr Teile. | [18] |
| Brüche | `kleinere-zahlen` | ⅖ > ⅘ type: smaller numbers mean larger fraction | Gleich große Teile: Mehr Teile sind mehr. | [18] |
| Brüche | `bruch-plus` | ⅖ + ⅕ = ³⁄₁₀ | Der Nenner sagt die Teilgröße. Fünftel bleiben Fünftel. | H, cf. [18] |
| Brüche | `ungleiche-teile` | Unequal pieces called Viertel | Viertel heißt: vier gleich große Teile. | H |
| Brüche | `anteil-rest` | 3 of 5 shaded parts as ³⁄₂ | Der Nenner zählt alle Teile, auch die gefärbten. | H |
| Brüche | `erweitern-plus` | ⅔ extended to ⁶⁄₇ by adding 4 | Multipliziere Zähler und Nenner mit derselben Zahl. | H |
| Brüche | `kuerzen-eins` | ⁶⁄₈ shortened to ³⁄₈ | Teile Zähler und Nenner durch dieselbe Zahl. | H |
| Brüche | `von-nur-nenner` | ¾ von 20 gives 5 | Ein Viertel sind 5. Du brauchst drei Viertel. | H |
| Brüche | `ganzes-rueckwaerts` | ⅖ are 8, gives 3,2 | 8 sind zwei Fünftel. Wie viel ist ein Fünftel? | H, cf. [12] |
| Dezimalzahlen | `komma-laenger` | 0,45 > 0,5 | Schau auf die Zehntel: 5 Zehntel sind mehr als 4. | [21] |
| Dezimalzahlen | `komma-kuerzer` | 0,3 > 0,45 because tenths beat hundredths | Schreib beide mit zwei Stellen: 0,30 und 0,45. | H, cf. [21] |
| Dezimalzahlen | `komma-getrennt` | 0,9 + 0,2 = 0,11 | 9 Zehntel und 2 Zehntel sind 11 Zehntel. Das ist 1,1. | H, cf. [21] |
| Dezimalzahlen | `komma-ausrichten` | 3,5 + 1,25 = 1,60 or 4,30 | Komma unter Komma: Zehntel zu Zehnteln. | H |
| Dezimalzahlen | `null-stelle` | 0,05 read as ⁵⁄₁₀ | Die 5 steht bei den Hundertsteln. | H |
| Dezimalzahlen | `bruch-komma` | ¼ = 1,4 | ¼ heißt 1 : 4. Das sind 0,25. | H |
| Größen | `einheit-faktor` | 3 m = 30 cm | Zwischen m und cm liegt der Faktor 100. | H |
| Größen | `zeit-dezimal` | 1,5 h = 1 h 50 min | Eine Stunde hat 60 Minuten. Eine halbe sind 30. | H, cf. [43] |
| Größen | `komma-einheit` | 1,30 m = 1 m 3 cm | Nach dem Komma stehen Zehntel und Hundertstel: 1 m 30 cm. | H |
| Größen | `komma-gewicht` | 2,5 kg = 2 kg 5 g | Bei kg stehen drei Stellen nach dem Komma: 2,500 kg. | H |
| Größen | `massstab-richtung` | 3 cm at 1 : 100 gives 0,03 cm | In echt ist es 100-mal so lang wie gezeichnet. | H |
| Größen | `massstab-einheit` | 3 cm at 1 : 100 gives 300 m | 300 cm sind noch keine Meter. Rechne um. | H |
| Größen | `dreisatz-addiert` | 5 Hefte 10 €, 8 Hefte gives 13 € | Rechne zuerst: Was kostet ein Heft? | H |
| Größen | `immer-proportional` | Scales a situation that is not proportional | Stell dir die Situation vor. Wird es wirklich doppelt so viel? | [58], L15 in [42] |
| Geometrie | `koordinaten-getauscht` | P(3\|2) plotted at (2\|3) | Erst nach rechts, dann nach oben. | [30] |
| Geometrie | `koordinaten-eins` | Counts from 1, off by one | Der Ursprung ist (0\|0). Zähle die Schritte ab dort. | H |
| Geometrie | `koordinaten-vorzeichen` | (−2\|3) plotted to the right | Negativer Rechtswert: Geh vom Ursprung nach links. | H |
| Geometrie | `winkel-schenkel` | Longer arms taken as larger angle | Die Länge der Schenkel ändert den Winkel nicht. Schau auf die Öffnung. | [28][29] |
| Geometrie | `winkel-skala` | 40° read as 140° | Der Winkel ist spitz. Er muss kleiner als 90° sein. | [28] |
| Geometrie | `winkel-teilstrich` | 37° read as 35° or 42° | Schau nach: Wie viel Grad zählt ein kleiner Strich? | [28] |
| Geometrie | `winkel-anlegen` | Tool not on vertex or arm | Leg die 0 auf einen Schenkel und die Mitte auf den Scheitel. | [28] |
| Geometrie | `ueberstumpf-rest` | 300° gives 60° | Miss den kleinen Winkel. Rechne dann 360° minus dein Ergebnis. | H |
| Geometrie | `lage-gedreht` | Tilted perpendicular lines not recognised | Dreh das Bild im Kopf. Prüfe den rechten Winkel. | H, cf. [43] |
| Geometrie | `parallel-kurz` | Short lines called parallel because they do not meet in the picture | Verlängere die Linien. Treffen sie sich irgendwann? | H |
| Geometrie | `quadrat-rechteck` | "Ein Quadrat ist kein Rechteck" | Ein Quadrat hat auch vier rechte Winkel. | H, cf. [43] |
| Geometrie | `verschoben-statt-gespiegelt` | Copies instead of mirroring | Das Bild klappt um. Was links ist, kommt nach rechts. | H, cf. [43] |
| Fläche | `umfang-flaeche` | Gives the area for Umfang, or the reverse | Umfang: einmal außen herum. Fläche: alles innen. | [27] |
| Fläche | `umfang-halb` | 5 cm by 3 cm gives Umfang 8 cm | Geh einmal ganz herum: alle vier Seiten. | H |
| Fläche | `einheit-cm` | Area given in cm | Fläche misst du in Quadraten: cm², nicht cm. | [27] |
| Fläche | `flaeche-faktor` | 1 m² = 10 dm² | 1 m sind 10 dm. Also sind 1 m² 10 · 10 dm². | H |
| Fläche | `zerlegen-doppelt` | Counts an overlap twice | Zähle das gemeinsame Stück nur einmal. | H |
| Fläche | `quader-sichtbar` | Oberfläche from three visible faces only | Du siehst drei Flächen. Der Quader hat sechs. | [31][32] |
| Fläche | `kanten-verdeckt` | Skips hidden edges | Denk auch an die Kanten, die du nicht siehst. | H, cf. [32] |
| Fläche | `lagen-zaehlen` | Volume from visible cubes | Zähle eine Lage. Wie viele Lagen hat der Quader? | [32] |
| Fläche | `volumen-oberflaeche` | Volume and Oberfläche swapped | Oberfläche in cm², Volumen in cm³. Was ist gefragt? | H |
| Fläche | `netz-ueberlappt` | Net where two faces fold onto each other | Falte im Kopf: Liegen zwei Flächen übereinander? | H |
| Daten | `achse-schritt` | Reads bar height as count, step 50 | Schau an der Achse, wie viel ein Kästchen zählt. | H, cf. [43] |
| Daten | `achse-abgeschnitten` | Treats a cut axis as true proportion | Die Achse beginnt nicht bei 0. Lies die Werte ab. | H, cf. [3] |
| Daten | `mittel-haeufigster` | Gives the most frequent value as Mittelwert | Mittelwert: alles zusammenzählen, dann gleichmäßig verteilen. | [34] |
| Daten | `mittel-ohne-teilen` | Gives the sum | Verteile die Summe gleichmäßig auf alle Werte. | [33] |
| Daten | `mittel-null` | Leaves out a value of 0 | Die 0 zählt als Wert mit. | H |
| Daten | `median-unsortiert` | Takes the middle of an unsorted list | Sortiere zuerst. Dann suchst du die Mitte. | H |
| Daten | `baum-addiert` | 2 and 3 options give 5 | Jede Möglichkeit passt zu jeder anderen: 2 · 3. | H, cf. [43] |

## 6. Skill catalogue

**Format.** S1, S2, S3 are Stufen; each cell is the content of that Stufe, and AB varies the demand inside it; each cell is at most 12 words. Answer types and visuals use the existing app vocabulary; **NEW** marks one from the lists at the end of this section. **Basis** cites the plans: Bavarian entries give the Lernbereich of Klasse 5 unless "Kl. 6" is written; NRW entries give the numbered competence in the 5/6 section (Ari, Geo, Fkt, Sto), and NW-H gives "Ende 6". **Status:** `core` means named for Klasse 5 in BY-G, BY-R and BY-M, and by the end of 5/6 in NW-G and NW-R. Everything else is `opt`, and may still be Schwerpunkt in a profile (2.5). NW-H and BB are not part of the rule; exceptions are noted. **Schulform** names which plans the skill fits now. Skills appear in teaching order. Subsections are deliberately unnumbered: this section has no §6.4 (see 7.2).

### `zahlen` (Große Zahlen und Teiler)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Schulform |
|---|---|---|---|---|---|---|---|---|---|---|
| `zahlen.lesen` | Große Zahlen lesen | Du liest und schreibst Zahlen bis über eine Milliarde. | Words to digits ≤ 1 Million, no inner zeros | ≤ 1 Milliarde, inner zeros, groups of three | Beyond 1 Milliarde; digits to words by choice | number, choice | placeValue | BY-G 1.1; BY-R 1.1; BY-M 1.1; NW-G Ari 8; NW-R Ari 15; NW-H Ende 6; BB C–D | core | alle |
| `zahlen.stellenwerte` | Stellenwerte | Du erkennst, was jede Ziffer wert ist, und bündelst. | Value of one digit in the Stellentafel | Unordered parts; bundling 14 ZT = 1 HT 4 ZT | Stufenzahlen as a sum; largest number from given digits | multi, number | placeValue | BY-G 1.1; BY-R 1.1; BY-M 1.1; NW-G Ari 8; NW-R Ari 15; NW-H Ende 6 | core | alle |
| `zahlen.zahlenstrahl` | Am Zahlenstrahl | Du liest große Zahlen ab und trägst sie ein. | Read arrow; ticks at Stufenzahlen | Place a number; one tick = 50 000 | Section without zero; choose a fitting scale | numberline | numberLine | BY-G 1.1; BY-R 1.1; BY-M 1.1; NW-G Ari 8; NW-R Ari 15 | core | alle |
| `zahlen.runden` | Runden | Du rundest passend zur Aufgabe. | Round to a named Stufenzahl, ≤ 1 Million | Carry across places; which numbers round to this? | Is rounding sensible here? Largest possible original number | number, choice | numberLine | BY-G 1.1; BY-R 1.1; BY-M 1.1; NW-G Ari 10; NW-R Ari 2; NW-H schätzen | core | alle |
| `zahlen.zehnerpotenzen` | Zehnerpotenzen | Du schreibst große Zahlen kurz mit Zehnerpotenzen. | 10³ to 1 000 and back, to 10⁹ | 3 · 10⁶ as a number; 450 000 as 45 · 10⁴ | Compare sizes from contexts: Einwohner, Entfernungen | number, choice | placeValue | BY-G 3.1; BY-R 1.3 | opt | BY-G, BY-R |
| `zahlen.zahlensysteme` | Andere Zahlensysteme | Du vergleichst römische Zahlen und Dualzahlen mit unseren Zahlen. | Roman numerals ≤ 100 to decimal | Roman ≤ 3 000; binary ≤ 15 to decimal | Decimal to binary ≤ 63; why position matters | number, choice | table | BY-R 1.1; BY-G 1.1 as a contrast only | opt | BY-R, BY-G |
| `zahlen.teilbarkeit` | Teiler und Teilbarkeit | Du findest Teiler und nutzt Regeln für die Teilbarkeit. | Rules for 2, 5, 10; divisors ≤ 30 | Rule for 3, 4 where taught; Teilermenge ≤ 100 | Combined: by 6, 15; find a missing digit | choice, multi | table | BY-G 3.1; BY-R 1.3; NW-G Ari 2; NW-R Ari 8; NW-H Ende 6; BB D | opt | alle außer BY-M |
| `zahlen.primfaktoren` | Primzahlen und Primfaktoren | Du erkennst Primzahlen und zerlegst Zahlen in Primfaktoren. | Prime or not, ≤ 50 | Prime factors of numbers ≤ 200, as a product | Power notation; ggT and kgV (BY-R) | choice, multi | table | BY-G 3.1; BY-R 1.3; NW-G Ari 1; NW-R Ari 9 primes only; BB D | opt | BY-G, BY-R, NW-G, NW-R, BB |
| `zahlen.potenzen` | Potenzen und Quadratzahlen | Du rechnest Potenzen und kennst die Quadratzahlen bis 400. | Squares to 12²; name Basis and Exponent | Squares to 20²; 2⁵, 3³ | Doubling stories; negative Basis (BY-G) | number | dotArray | BY-G 3.1; BY-R 1.3 | opt | BY-G, BY-R |

### `rechnen` (Rechnen, Klammern, Rechengesetze)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Schulform |
|---|---|---|---|---|---|---|---|---|---|---|
| `rechnen.schriftlich-plusminus` | Schriftlich plus und minus | Du rechnest auch sehr große Zahlen schriftlich. | Two numbers, ≤ 6 digits, at most two carries | Up to 9 digits; zeros; three Summanden | Beyond 1 Milliarde; Fehlerdetektiv; missing digits | written | written | BY-G 1.2; BY-R 1.3; BY-M 1.2; NW-G Ari 14; NW-R Ari 1 | core | alle |
| `rechnen.schriftlich-mal` | Schriftlich malnehmen | Du multiplizierst schriftlich und prüfst mit dem Überschlag. | ≤ 4 digits times one digit, inner zeros | ≤ 4 digits times two digits | Three-digit factor (BY-G); find a planted slip | written | written | BY-G 3.1; BY-R 1.3; BY-M 1.2 factor at most two-digit; NW-G Ari 14; NW-R Ari 1 | core | alle |
| `rechnen.schriftlich-geteilt` | Schriftlich teilen | Du teilst schriftlich, auch durch zweistellige Zahlen. | ≤ 4 digits by one digit, no Rest | By 11–25; Rest; zero in the quotient | Divisor ≥ 100 (BY-G); Überschlag picks plausible quotient | written | written | BY-G 3.1; BY-R 1.3; BY-M 1.2 divisor at most two-digit; NW-G, NW-R "schriftliche Division" | core | alle |
| `rechnen.punkt-vor-strich` | Punkt vor Strich | Du weißt, was du zuerst rechnest. | Two operations, ≤ 100: 3 + 4 · 5 | Three operations; choose the first step; write steps | Insert operation signs to reach a target value | number, multi, choice | term NEW | BY-G 3.2; BY-R 1.3; BY-M 1.2; NW-G Ari 4; NW-R Ari 4 as Rechenterm; NW-H not named | core | alle |
| `rechnen.klammern` | Klammern | Du rechnest Klammern zuerst und setzt selbst Klammern. | One bracket first: (8 + 4) · 3 | Bracket plus Punkt vor Strich; 40 − (12 − 5) | Nested brackets; set brackets to make a statement true | number, multi, choice | term NEW | BY-G 1.2, 3.2; BY-R 1.3; BY-M 1.2; NW-G Ari 4; NW-R Ari 4 | core | alle |
| `rechnen.rechengesetze` | Vorteilhaft rechnen | Du tauschst und fasst zusammen, damit es leichter wird. | Swap and group: 25 + 38 + 75 | 4 · 17 · 25; choose the easier order | Which law? Why it fails for minus and geteilt | number, choice | none | BY-G 1.2, 3.1; BY-R 1.3; BY-M 1.2; NW-G Ari 3; NW-R Ari 3; NW-H Ende 8 | core | alle |
| `rechnen.distributiv` | Zerlegen und ausklammern | Du zerlegst einen Faktor und rechnest in zwei Teilen. | Split: 7 · 23 = 7 · 20 + 7 · 3 | Reverse: 6 · 17 + 6 · 3 as 6 · 20 | Minus version: 9 · 19 = 9 · 20 − 9 | multi, number | dotArray | BY-G 3.2; NW-G, NW-R Schwerpunkt "Distributivgesetz"; NW-H Ende 8 | opt | BY-G, NW-G, NW-R |
| `rechnen.gleichungen` | Unbekannte Zahlen finden | Du löst Gleichungen mit der Umkehraufgabe oder durch Probieren. | x + 17 = 42 by Umkehraufgabe | x : 6 = 14; 120 − x = 75 | Two steps; Zahlenrätsel as a Gleichung | number | none | BY-G 1.2, 3.1; BY-M 7; BY-R Kl. 6; NW-G Ari 5; NW-R Ari 7 | opt | BY-G, BY-M, NW-G, NW-R |
| `rechnen.sachaufgaben` | Sachaufgaben | Du liest genau, rechnest und prüfst, ob das Ergebnis passt. | One step, no extra numbers | Two steps, one number not needed | Missing data: Nicht lösbar; plausibility; meaning of a Rest | number, choice | table, money | BY-G 3.2; BY-R 1.3; BY-M 1.2; NW-G Fkt 2; NW-R Fkt 2 | core | alle |

### `ganzzahlen` (Negative Zahlen)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Schulform |
|---|---|---|---|---|---|---|---|---|---|---|
| `ganzzahlen.alltag` | Negative Zahlen im Alltag | Du liest Temperaturen und Höhen unter null. | Thermometer and heights: read −5 °C, −200 m | Text to number: 8 Grad unter Null | Which story fits −12? Guthaben, Keller, Wetter | number signed, choice | thermometer NEW | BY-G 1.1; BY-R 2; BY-M 2; NW-G Ari 15; NW-R Ari 14; NW-H Ende 6; BB E | core | alle |
| `ganzzahlen.zahlengerade` | Die Zahlengerade | Du liest ganze Zahlen ab und trägst sie ein. | Read marks, −10 to 10, step 1 | Place numbers, −100 to 100, step 10 | Section without zero; choose a scale | numberline | numberLine | BY-G 1.1; BY-R 2; BY-M 2; NW-G Ari 8; NW-R Ari 15; NW-H Ende 6; BB E | core | alle |
| `ganzzahlen.vergleichen` | Größer oder kleiner? | Du vergleichst und ordnest positive und negative Zahlen. | Negative vs positive; use <, > | Two negatives: −7 and −3 | Order five; test: größerer Betrag heißt größer | choice, order | numberLine | BY-G 1.1; BY-R 2; BY-M 2; NW-G Ari 8; NW-R Ari 15; NW-H Ende 8 | core | alle |
| `ganzzahlen.aenderungen` | Zustand und Änderung | Du beschreibst, wie sich eine Temperatur oder Höhe ändert. | Thermometer rises or falls, stays on one side | Crossing zero: −3 °C rises 8 Grad | Find the change from −4 to 6 | number signed | thermometer NEW | BY-G 1.2; BY-R 2; BY-M 2; NW-G Ari 15; NW-R Ari 14; NW-H not named | core | alle (NW-H Stufe 1) |
| `ganzzahlen.betrag` | Betrag und Gegenzahl | Du findest Abstand zur Null und Gegenzahl. | Gegenzahl of a number on the Zahlengerade | Betrag: \|−8\| as distance from zero | Two numbers with Betrag 6; find a counterexample | number signed, multi | numberLine | BY-G 1.1; BY-R 2; BB E | opt | BY-G, BY-R, BB |
| `ganzzahlen.plusminus` | Plus und Minus | Du rechnest plus und minus mit ganzen Zahlen. | a ± natural b, ≤ 20: −3 + 8 | Negative b: 4 + (−9), 4 − (−9), ≤ 20 | ≤ 1 000; missing number; Guthaben and Schulden story | number signed | numberLine | BY-G 1.2; BY-R 2; BY-M 2 only a ± b, b natural; NW later | opt | BY-G, BY-R, BY-M (S1) |
| `ganzzahlen.vorzeichen` | Vorzeichen und Rechenzeichen | Du unterscheidest die beiden Bedeutungen des Minuszeichens. | In 5 − (−3): which minus is which? | Rewrite subtraction as addition: 7 − 9 = 7 + (−9) | Term without brackets: −3 + 5 − 8 from signs | choice, multi | term NEW | BY-G 1.2; BY-M 2; BY-R 2; NW-G sample plan 6.2 | opt | BY-G, BY-R, BY-M (S1) |
| `ganzzahlen.malgeteilt` | Mal und Geteilt | Du wendest die Vorzeichenregeln beim Mal und Geteilt an. | Positive times negative as repeated addition: 3 · (−4) | Sign rules for · and :, ≤ 100 | Sign of a long product; explain with a pattern | number signed, choice | term NEW | BY-G 3.1; BY-R 2 | opt | BY-G, BY-R |
| `ganzzahlen.terme` | Alles zusammen | Du verbindest alle Rechenarten mit ganzen Zahlen. | Two operations, small integers, no brackets | Brackets and Punkt vor Strich, ≤ 100 | Set brackets for a target; work backwards | number signed, multi | term NEW | BY-G 3.2; BY-R 2 | opt | BY-G, BY-R |

### `brueche` (Brüche und Dezimalzahlen)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Schulform |
|---|---|---|---|---|---|---|---|---|---|---|
| `brueche.alltag` | Brüche im Alltag | Du nutzt ½, ¼ und ¾ bei Zeit, Gewicht und Länge. | ½, ¼, ¾ of 1 h, 1 kg, 1 m | 1½ h in min; ¾ kg in g | Compare ¾ l and 700 ml; order mixed amounts | number, order | clock, scale, container | BY-R 4; BY-M 5; NW-G Ari 9; NW-R Ari 16; NW-H Ende 6; BY-G not named in Kl. 5 | opt | alle außer BY-G (Kl. 5) |
| `brueche.anteile` | Anteile erkennen | Du siehst, welcher Bruchteil gefärbt ist, und schreibst den Bruch. | Shaded part of bar or circle, Nenner ≤ 8 | Nenner ≤ 12; same fraction in different shapes | Unequal parts: is it a Viertel? Whole from part | fraction NEW, choice | fractionModel NEW | BY Kl. 6; NW-G Ari 11; NW-R Ari 10; NW-H Ende 6; BB D | opt | NW-G, NW-R, NW-H, BB; BY Kl. 6 |
| `brueche.bruchteile` | Bruchteile von Größen | Du rechnest aus, wie viel ein Bruchteil von einer Menge ist. | Stammbruch of a quantity: ¼ von 20 € | ¾ von 60 min; change unit first | Whole from part: ⅖ sind 8 Kinder | number | fractionModel NEW | BY Kl. 6; NW-G Ari 13; NW-R Ari 11; BB D | opt | NW-G, NW-R, BB; BY Kl. 6 |
| `brueche.erweitern` | Erweitern und Kürzen | Du änderst die Einteilung, und der Wert bleibt gleich. | Erweitern with a given factor; picture refines parts | Kürzen with a given factor; missing Zähler or Nenner | Vollständig kürzen; which fractions are equal? | fraction NEW, choice | fractionModel NEW | BY Kl. 6; NW-G Ari 12; NW-R Ari 12; NW-H Ende 6; BB D | opt | NW-G, NW-R, NW-H, BB; BY Kl. 6 |
| `brueche.vergleichen` | Brüche vergleichen | Du vergleichst Brüche und ordnest sie am Zahlenstrahl. | Same Nenner or same Zähler, ≤ 12 | Different Nenner, one a multiple of the other | Compare with ½ or 1; place on Zahlenstrahl | choice, order, numberline | numberLine, fractionModel NEW | BY Kl. 6; NW-G Ari 8; NW-R Ari 15; BB D | opt | NW-G, NW-R, BB; BY Kl. 6 |
| `brueche.gleichnamig` | Brüche addieren | Du addierst und subtrahierst Brüche mit gleichem Nenner. | Plus, same Nenner, sum ≤ 1 | Minus; sum above 1 as unechter Bruch | Different Nenner, one a multiple (not NW-H) | fraction NEW | fractionModel NEW | BY Kl. 6; NW-G Ari 14; NW-R Ari 13; NW-H Ende 6 gleichnamig; BB level not pinned | opt | NW-G, NW-R, NW-H, BB; BY Kl. 6 |
| `brueche.dezimal-lesen` | Dezimalzahlen lesen | Du erweiterst die Stellentafel nach rechts. | Zehntel, Hundertstel in Stellentafel; 0,7 as ⁷⁄₁₀ | Tausendstel; Nenner 10, 100, 1 000 to Dezimalzahl | Inner zeros: 0,05; ¼ and ¾ as Dezimalzahl | number, fraction NEW | placeValue | BY Kl. 6; NW-G Ari 8; NW-R Ari 15; NW-H Ende 6; BB D | opt | NW-G, NW-R, NW-H, BB; BY Kl. 6 |
| `brueche.dezimal-ordnen` | Dezimalzahlen ordnen | Du vergleichst, ordnest und rundest Dezimalzahlen. | Same length: 0,4 and 0,7 | Different length: 0,5 and 0,45 | Order five; number between 0,3 and 0,4; runden | choice, order, numberline | numberLine, placeValue | BY Kl. 6; NW-G Ari 8; NW-R Ari 15; NW-H Ende 6; BB D | opt | NW-G, NW-R, NW-H, BB; BY Kl. 6 |
| `brueche.dezimal-rechnen` | Mit Dezimalzahlen rechnen | Du rechnest mit Dezimalzahlen und achtest auf das Komma. | Plus and minus, same length, money context | Different length: 3,5 + 1,25; align the comma | Times and geteilt by a natural number; Überschlag | number | placeValue | BY Kl. 6; NW-G Ari 14; NW-R Ari 1; NW-H Ende 6; BB D | opt | NW-G, NW-R, NW-H, BB; BY Kl. 6 |

### `groessen` (Größen und Maßstab)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Schulform |
|---|---|---|---|---|---|---|---|---|---|---|
| `groessen.einheiten` | Einheiten umrechnen | Du rechnest Längen, Gewichte und Zeiten in andere Einheiten um. | Neighbouring units: km, m; kg, g; h, min | Skip units: mm to m; t to g; s | Mixed: 2 h 35 min; time is not decimal | number, multi, order | table, ruler | BY-G 4.1; BY-R 4; BY-M 5; NW-G Ari 9; NW-R Ari 16; NW-H Ende 6 | core | alle |
| `groessen.komma` | Kommaschreibweise | Du schreibst Größen mit Komma und ohne Komma. | 3,45 € = 3 € 45 ct; 1,5 m | Einheitentafel: 2,075 km in m; 0,8 kg in g | Order mixed notations; 1,30 m is not 1 m 3 cm | multi, order | table, money | BY-G 4.1; BY-R 4; BY-M 5 Geld and Längen; NW-G Ari 9; NW-R Ari 16 | core | alle |
| `groessen.schaetzen` | Größen schätzen | Du schätzt mit bekannten Größen und prüfst, ob es passt. | Choose the unit for an everyday object | Plausible value: Türhöhe, Schulweg, Buchgewicht | Estimate with a reference size, Fermi style | choice, number | none | BY-G 4.1; BY-R 4; BY-M 5; NW-G Ari 9; NW-R Ari 16 | core | alle |
| `groessen.rechnen` | Mit Größen rechnen | Du rechnest mit Einheiten und achtest darauf, dass sie passen. | Same unit: add, subtract, times natural number | Different units: convert first; time spans across hours | Teilen: 12 m : 3 m; two steps | number, multi | money, clock | BY-G 4.1; BY-R 4; BY-M 5; NW-G Ari 14; NW-R Ari 1; NW-H Ende 6 | core | alle |
| `groessen.schlussrechnung` | Dreisatz | Du rechnest erst auf eins und dann auf die gesuchte Menge. | Many to one: 5 Hefte kosten 10 € | Three steps, table given: 4 kg, 6 kg | Does it fit? Stories that are not proportional | multi, number, choice | table | BY-G 4.1; BY-R 4; NW-G Fkt 2; NW-H Ende 8 | opt | BY-G, BY-R, NW-G |
| `groessen.massstab` | Maßstab | Du rechnest zwischen Plan und Wirklichkeit um. | 1 : 100, map cm to real m | Real length to map; 1 : 25 000, km | Find the Maßstab; enlargement 5 : 1 | number, multi | grid, ruler | BY-G 4.1; BY-R 4; NW-G Fkt 4; NW-R Fkt 4; NW-H Ende 6; BB level not pinned | opt | alle außer BY-M |
| `groessen.sachaufgaben` | Größen im Alltag | Du löst Aufgaben zu Fahrplänen, Preisen und Strecken. | One step, one unit, with Antwortsatz | Fahrplan or Preisliste from a table, two steps | Plausibility; extra information; Nicht lösbar | number, choice | table, money, clock | BY-G 4.1; BY-R 4; BY-M 5; NW-G Ari 9; NW-R Fkt 2 | core | alle |

### `geometrie` (Figuren, Lage, Winkel)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Schulform |
|---|---|---|---|---|---|---|---|---|---|---|
| `geometrie.grundbegriffe` | Punkt, Strecke, Gerade | Du benennst Strecken, Geraden und Halbgeraden. | Recognise Strecke, Gerade, Halbgerade | Notation; Abstand of a point to a Gerade | Kreis: Radius, Durchmesser; points at a given distance | choice, number | lines NEW, shape | BY-G 2; BY-R 3; BY-M 3; NW-G Geo 1; NW-R Geo 1; NW-H Ende 6 | core | alle |
| `geometrie.lage` | Parallel und senkrecht | Du erkennst parallele und senkrechte Linien. | Parallel or perpendicular, usual position | Rotated lines; symbols ∥, ⊥; Geodreieck picture | Count pairs in a figure; statements about three lines | choice, multi | lines NEW | BY-G 2; BY-R 3; BY-M 3; NW-G Geo 1; NW-R Geo 1; NW-H Ende 6 | core | alle |
| `geometrie.koordinaten` | Koordinatensystem | Du liest Punkte ab und trägst sie ein. | Read P(3\|2), first quadrant, 0–8 | Plot a point; missing corner of a rectangle | Four quadrants, negative coordinates (not BY-M) | multi, point NEW | coordinateGrid NEW | BY-G 2; BY-R 3; BY-M 3 first quadrant; NW-G Geo 6, Ari 15; NW-R Geo 6; NW-H Ende 6; BB D–E | core | alle |
| `geometrie.winkel-arten` | Winkelarten | Du erkennst spitze, rechte, stumpfe und gestreckte Winkel. | Spitz, recht, stumpf, gestreckt, usual position | Rotated; arm length varies; name Scheitel, Schenkel | Überstumpf (not BY-M); compare with 45°, 90°, 180° | choice | angle NEW | BY-G 2; BY-R 3; BY-M 3; NW-G Geo 9; NW-R Geo 9; NW-H Ende 6; BB D | core | alle |
| `geometrie.winkel-messen` | Winkel messen | Du schätzt zuerst und liest dann am Geodreieck ab. | Read on Geodreieck, step 10°, ≤ 180° | Step 1°; choose the scale; estimate first | Over 180° via 360° (not BY-M) | number tolerance | angle NEW | BY-G 2; BY-R 3; BY-M 3; NW-G Geo 9; NW-R Geo 9; NW-H Ende 6 | core | alle |
| `geometrie.winkel-zeichnen` | Winkel einstellen | Du stellst einen vorgegebenen Winkel genau ein. | Multiples of 10°, ≤ 180° | Any whole degree ≤ 180°, rotated base | Over 180° (not BY-M); angle from a description | angle NEW | angle NEW | BY-G 2; BY-R 3; BY-M 3; NW-G Geo 4; NW-R Geo 4; NW-H Ende 6 | core | alle |
| `geometrie.scheitel` | Scheitel- und Nebenwinkel | Du berechnest Winkel an sich schneidenden Geraden. | Name Nebenwinkel and Scheitelwinkel | Compute: Nebenwinkel = 180° − α | Two crossings; find all four angles | choice, number | lines NEW | BY-R 3; BB D | opt | BY-R, BB |
| `geometrie.vierecke` | Vierecke | Du ordnest Vierecke nach ihren Eigenschaften. | Quadrat, Rechteck, Parallelogramm, Raute by sides | Trapez, Drachenviereck; parallel sides | True or not: Every Quadrat is a Rechteck | choice, multi | shape | BY-G 2; BY-R 3; BY-M Kl. 6; NW-G Geo 2; NW-R Geo 2; NW-H partly Ende 8 | opt | alle; BY-M Kl. 6 |
| `geometrie.symmetrie` | Achsensymmetrie | Du findest Symmetrieachsen und spiegelst Figuren. | Symmetric or not; count axes, simple figures | Mirror on the grid, vertical axis | Diagonal axis; axes of special Vierecke | choice, cells | grid, shape | BY-R Kl. 6; NW-G Geo 5; NW-R Geo 5; NW-H Ende 6; BB D | opt | NW-G, NW-R, NW-H, BB; BY-R Kl. 6 |

### `flaeche` (Umfang, Fläche, Quader)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Schulform |
|---|---|---|---|---|---|---|---|---|---|---|
| `flaeche.umfang` | Umfang | Du rechnest den Weg einmal außen herum aus. | Rectangle and square: add all sides | Formula; side from Umfang; labelled polygons | L-shape; fence story; same Umfang, different shape | number | grid, shape | BY-G 4.2; BY-R 5; BY-M 3; NW-G Geo 12; NW-R Geo 12; NW-H Ende 6 | core | alle |
| `flaeche.rechteck` | Flächeninhalt vom Rechteck | Du rechnest aus, wie viele Quadrate in das Rechteck passen. | Rows of Kästchen, then length · width | Area in cm², m²; missing side | Same area, different sides; square from area | number | grid | BY-G 4.2; BY-R 5; BY-M 4; NW-G Geo 12; NW-R Geo 12; NW-H Ende 6; BB D | core | alle |
| `flaeche.unterscheiden` | Umfang oder Fläche? | Du entscheidest, was gefragt ist, und nimmst die passende Einheit. | Which fits: Zaun, Teppich, Rand, Rasen | Compute both; choose cm or cm² | Doubling sides: how do Umfang and Fläche change? | choice, multi | grid | BY-G 4.2; BY-R 5; BY-M 3, 4; NW-G Geo 12; NW-R Geo 12 | core | alle |
| `flaeche.einheiten` | Flächeneinheiten | Du rechnest Flächeneinheiten um und stellst sie dir vor. | Neighbouring: 1 m² = 100 dm² | Two steps; decimal notation; a and ha (not BY-M) | Order areas; compare with Klassenzimmer, Fußballfeld | number, order | grid, table | BY-G 4.2; BY-R 5; BY-M 4 neighbours; NW-G Ari 9; NW-R Ari 16; NW-H Ende 8 | core | alle |
| `flaeche.zusammengesetzt` | Zerlegen und Ergänzen | Du zerlegst Figuren oder ergänzt sie zu einem Rechteck. | L-shape on a grid, split line given | L-shape with lengths; choose your split | Cut-out: subtract; two ways give the same | number, multi | grid, shape | BY-G 4.2; BY-R 5; BY-M 4; NW-G Geo 13; NW-R Geo 13; BB D | core | alle |
| `flaeche.koerper` | Körper erkennen | Du beschreibst Körper mit Ecken, Kanten und Flächen. | Name Würfel, Quader, Zylinder, Kegel, Pyramide, Kugel | Count Ecken, Kanten, Flächen; shape of faces | Prisma; which solid from a description? | choice, number | solid | BY-R 3; BY-M Kl. 6; NW-G Geo 3; NW-R Geo 3; NW-H Ende 6; BB D | opt | alle; BY-M Kl. 6 |
| `flaeche.netze` | Netze und Schrägbilder | Du erkennst, welches Netz zum Quader passt, und liest Schrägbilder. | Is it a Würfel net? Which faces meet? | Quader net: match sides; Schrägbild, visible edges | Missing face; hidden edges dashed; spot the wrong Schrägbild | choice, cells | net, quader NEW | BY-G 4.2; BY-R 3; BY-M Kl. 6; NW-G Geo 15; NW-R Geo 15; NW-H Netze; BB D | opt | alle; BY-M Kl. 6 |
| `flaeche.oberflaeche` | Oberfläche vom Quader | Du rechnest alle sechs Flächen zusammen. | Würfel: six equal squares, edge ≤ 12 cm | Quader from a net: three face pairs | Gift wrap; open box; solid from two Quader | number, multi | quader NEW, net | BY-G 4.2; BY-R Kl. 6; BY-M Kl. 6; NW-G Geo 12; NW-R Geo 12; NW-H Ende 6; BB D | opt | BY-G, NW-G, NW-R, NW-H, BB; BY-R, BY-M Kl. 6 |
| `flaeche.volumen` | Volumen vom Quader | Du zählst Würfel in Lagen und rechnest das Volumen aus. | Count cubes by rows and layers, ≤ 60 | Length · width · height; cm³ | Litres; missing edge; solid from two Quader | number | cubeBuilding, quader NEW | BY Kl. 6; NW-G Geo 12; NW-R Geo 12; NW-H Ende 6; BB D | opt | NW-G, NW-R, NW-H, BB; BY Kl. 6 |

### `daten` (Daten und Zählen)

| id | Titel | Beschreibung | S1 | S2 | S3 | Antwort | Visual | Basis | Status | Schulform |
|---|---|---|---|---|---|---|---|---|---|---|
| `daten.strichliste` | Strichlisten und Tabellen | Du ordnest Daten in Listen und Tabellen. | Urliste to Strichliste, ≤ 30 values | Frequency table; classes like 0–4, 5–9 | Which question can the list answer? | number, multi, choice | tally, table | BY-R 6; BY-M 6; BY-G Kl. 6; NW-G Sto 1; NW-R Sto 1; NW-H Ende 6 | opt | alle; BY-G Kl. 6 |
| `daten.diagramme` | Diagramme lesen | Du liest Werte ab und vergleichst sie. | Read a bar, axis step 5 or 10 | Differences, totals; step 50 or 1 000 | Table to chart; which chart fits? | number, choice | barChart, pictogram, table | BY-R 6; BY-M 1.1, 6; BY-G Kl. 6; NW-G Sto 4; NW-R Sto 4; NW-H Ende 6; BB D | opt | alle; BY-G Kl. 6 |
| `daten.vierfelder` | Vierfeldertafel | Du liest und ergänzt eine Tafel mit zwei Merkmalen. | Read row and column totals | Fill a missing cell; compute totals | Text to table; compare two groups | number, multi | table | BY-R 6 | opt | BY-R |
| `daten.pruefen` | Diagramme prüfen | Du findest heraus, wenn ein Diagramm täuscht. | Does the chart match the table? | Axis does not start at zero | Uneven steps; which version is honest? | choice | barChart | BY-R 6; NW-G Sto 6; NW-R Sto 5 Vor- und Nachteile | opt | BY-R, NW-G, NW-R |
| `daten.zaehlprinzip` | Systematisch zählen | Du zählst Möglichkeiten mit Baumdiagramm und Zählprinzip. | Two stages, 2 · 3, tree shown | Three stages: 3 · 2 · 4 outfits | Orders of four things; when it does not fit | number, choice | tree | BY-G 3.1; BY-R 1.3; NW-H Ende 6; KMK MSA | opt | BY-G, BY-R, NW-H |
| `daten.mittelwert` | Mittelwert | Du verteilst Werte gleichmäßig und rechnest den Durchschnitt aus. | Two or three values, levelled bars, whole result | Five values; add then divide; decimals allowed | Find a missing value; effect of one outlier | number | barChart | BY-G Kl. 6; BY-M Kl. 6; NW-G Sto 3; NW-R Sto 3; NW-H Ende 6; BB E | opt | NW-G, NW-R, NW-H; BY Kl. 6 |
| `daten.median` | Median und Spannweite | Du findest die Mitte und den Abstand von Minimum zu Maximum. | Minimum, Maximum, Spannweite of ≤ 7 values | Median: sort first, odd count | Even count; Median vs Mittelwert with an outlier | number | table | NW-G Sto 3; NW-R Sto 3; NW-H Ende 6 median; BB E | opt | NW-G, NW-R, NW-H |

### New answer types and extensions

Existing kinds stay: `number` (with `decimals`, `unit`, `before`, `after`, `offerUnsolvable`), `choice`, `multi`, `cells`, `numberline`, `order`, `written`. All semantics below are our design proposal (H). **New kinds are required;** the skills named cannot be delivered well with the current set.

| Change | Kind | Exact semantics | Used by |
|---|---|---|---|
| **NEW `fraction`** | New kind | Answer: `{ kind: 'fraction', numerator, denominator, whole?, accept: 'exact' \| 'equivalent' \| 'lowest', unit?, before?, after? }`. Response: `{ kind: 'fraction', numerator: string, denominator: string, whole?: string }`. UI: Zähler field above a bar, Nenner field below; optional whole field to the left only when `whole` is set. Digits only. Empty field or Nenner 0 gives a parse message and does not use an attempt. Compare with integer cross-multiplication, never floats. `exact`: both numbers must match (`Erweitere ⅔ mit 4` gives ⁸⁄₁₂). `equivalent`: any equal value is correct. `lowest`: equal value with common divisor gets the neutral prompt "Der Wert stimmt. Kannst du noch kürzen?" and no attempt is used. Bugs match on the pair (and whole). Accessible names: "Zähler", "Nenner". | `brueche.anteile`, `erweitern`, `gleichnamig`, `dezimal-lesen` |
| **NEW `point`** | New kind | Answer: `{ kind: 'point', xMin, xMax, yMin, yMax, step, target: [x, y], tolerance: 0 }`. Response: `{ kind: 'point', x, y }`. A tap moves the marker to the nearest grid intersection; no drag is needed. Four 48 px step buttons and arrow keys move it one step. The live label shows P(x\|y). Prüfen is disabled until a marker exists. Correct only if exact. Bug matching on the pair, so swapped coordinates give `koordinaten-getauscht`. Reading a point stays `multi` with `P(` [x] `\|` [y] `)`. | `geometrie.koordinaten` |
| **NEW `angle`** | New kind | Answer: `{ kind: 'angle', value, step: 1 \| 5 \| 10, tolerance, max: 180 \| 360, baseRotation }`. Response: `{ kind: 'angle', value }`. One arm is fixed, and the child sets the other by tapping near the arc or with step buttons (−10, −1, +1, +10; arrow keys). Value snaps to `step`. Geodreieck shown on request, as in class. Correct if \|input − value\| ≤ tolerance: 0 at Stufe 1, 1 at Stufe 2–3. This replaces free drawing, which is not auto-checkable. Bugs: reverse scale (180 − value), tick-value. | `geometrie.winkel-zeichnen` |
| **Extension `number.signed`** | Extends `number`, `multi` field | `signed: true` shows an active − key and accepts a leading "−" or "-". The key toggles the sign wherever the caret is. "−0" normalises to 0. "+5" is accepted as 5. The parser already accepts a leading minus; `signed: false` should now reject it with a calm message. **Every item in a signed skill sets it, even if the result is positive,** so the key gives nothing away. | all of `ganzzahlen`, `geometrie.koordinaten` S3 |
| **Extension `number.tolerance`** | Extends `number` | Absolute tolerance, correct if \|input − value\| ≤ tolerance. Used for reading angles (0–2°) and estimates (±10°). No float comparison problems for integer data; decimals compared in integer steps. | `geometrie.winkel-messen`, `groessen.schaetzen` |
| **Extension `written`** | Extends `written` | Operands up to 12 digits for add and sub; three-digit factor and divisor at Stufe 3. Must fit 360 px, using a smaller digit size or horizontal scroll of the calculation only, never of the page. Decimals stay out of v1. Method default `abziehen` (BY-R, BY-M named). | `rechnen.schriftlich-*` |

The other answer types need no change, only that `order` and `choice` labels can render stacked fractions (`{frac:3/4}`) and U+2212.

### New visuals needed

| Visual | Exact semantics | Sources |
|---|---|---|
| `coordinateGrid` | `{ xMin, xMax, yMin, yMax, step, labelStep, points: {x, y, label}[], segments?, axisNames?: 'xy' \| 'rechtsHoch' }`. y increases **upward**, unlike `grid`. Arrowed axes, origin labelled 0, integer labels. Default 0–8 on phones so cells stay about 40 px. Four quadrants only when `xMin < 0`. | [2][3][4][8] |
| `angle` | `{ degrees, baseRotation, arm1, arm2, showArc, labels?, tool?: 'none' \| 'geodreieck' }`. Arms independent in length (F8). `geodreieck` draws the half-circle scale with **both** directions 0–180, zero on one arm and centre on the vertex; may be misplaced deliberately only in `Fehlerdetektiv` items. Over 180° draws the larger arc. | [2][3][4][28] |
| `fractionModel` | `{ form: 'bar' \| 'circle' \| 'rect', parts, filled, wholes?, refineTo?, unequal? }`. Equal parts unless `unequal`. `refineTo` adds finer lines for Erweitern, as the NRW plans describe it ("Vergröbern bzw. Verfeinern") [8][9]. | [7][8][12] |
| `quader` | `{ a, b, c, unit?, showLabels, hiddenEdges: 'dashed' \| 'none', highlightFace?, layers?, kind?: 'wuerfel' \| 'quader' }`. Schrägbild with 45° receding edges at half depth, the usual school convention (we did not open a source for it). Extends `solid`, which has no dimensions. | [2][3][8] |
| `term` | `{ lines: string[], highlight?: [start, end], bracketDepth?: boolean }`. Shows a term and its next steps line by line, highlighted region plus a text marker, never colour alone. No Rechenbaum in v1. | [2][22] |
| `lines` | `{ lines: {angle, offset, label?}[], rightAngleMarks?, parallelMarks?, geodreieck? }`. For Strecke, Gerade, Halbgerade (with end marks), parallel and senkrecht, crossings. | [2][4] |
| `thermometer` | `{ min, max, step, value, unit: '°C', marker?, change?: number }`. Vertical. `change` draws an arrow from the state. A vertical Zahlengerade, named in BY-M. | [4] |

Extensions of existing visuals. `placeValue`: columns beyond `M` (ZM, HM, Mrd, ZMrd, HMrd, B) and after a comma (z, h, t). `numberLine`: negative range, arrows on both ends, jump arcs. `barChart`: `meanLine` and levelled display for `daten.mittelwert`; `axisStart` already exists for `daten.pruefen`. `shape`: `sideLabels` and an L-form. `net`: non-cube Quader nets using the same cell grid. Not needed in Klasse 5: `spinner`, `bag`, `dice` (Zufall out of v1), and no new use of `pictogram` beyond `daten.diagramme`.

## 7. Design consequences compared with the Klasse 4 portal

### 7.1 What stays and what changes

| Area | Klasse 4 | Klasse 5 | Why |
|---|---|---|---|
| Core loop, hints | §6.1 in [42]: answer, hint, second try, worked steps, Zwillingsaufgabe | Stays. Worked steps at most 5 lines. | L4, L6 |
| **Round length** | 10 items, about 10–15 min | **10 items** (about 10–15 min), **6 items in `rechnen.schriftlich-*`**. | 7.3; H |
| **AB mix per round** | Stufe 1: 7/2/1; Stufe 2: 4/4/2; Stufe 3: 2/5/3 | **Stufe 1: 6/3/1; Stufe 2: 3/5/2; Stufe 3: 2/4/4.** Written rounds (6): 4/1/1, 2/3/1, 1/3/2. At least one harder item per round stays. | H; KMK AB [1]; C3 |
| **Timed mode** | None by default; optional Blitzrunde for mastered facts | **None in v1. No timers, no Blitzrunde.** A later opt-in would follow M10 in [42], only for mastered squares. | F1, F13, F15; H |
| Silent response time | About 3 s keeps a fact in review | **Not used.** | F1 |
| Stufen | 3, default suggestion Stufe 2 | 3. **Default suggestion Stufe 2 for Grundschule-near skills (`zahlen.lesen`, `stellenwerte`, `runden`, `rechnen.schriftlich-plusminus`, `groessen.einheiten`), Stufe 1 for new content.** Never based on profile. | 2.5; H |
| Mastery | Geübt, Sicher (≥ 8 of last 10 first try), Gemeistert | Stays, with the spaced check. | L8 (heuristic) |
| **Keypad default** | Free numeric input; Ziffernblock on touch, keys ≥ 64 px | **Ziffernblock on touch only** (`pointer: coarse`), physical keyboard elsewhere. Native keyboard suppressed on touch: iOS number pads have no minus key [50]. | F21; H |
| **Keypad keys** | 0–9, comma, ⌫, Prüfen | **0–9, `−`, `,`, ⌫, Prüfen**, with `−` and `,` always in place to keep the layout stable. Inactive keys are visually quiet. Each is active for the whole skill, never per item, so it gives no hint. Physical keyboard accepts `-`, `−`, `,`. | F5; P13 |
| **Touch targets** | 64 px primary, 48 px others | **56 px keypad and primary buttons, 48 px others**, 44 px minimum spacing for grid step controls. Hit areas extend into gaps. Keep the 400 ms holdover guard until a pilot shows otherwise. | F19; H |
| Order and drag | Tap and keyboard alternatives | Same. Drag may be offered in `numberline`, never required. | P17 |
| Choice items | Up to 8 options | Up to 8. `order` up to 6 items; `multi` up to 5 fields. | H |
| **Font** | 20 px body, 60ch | **18 px body minimum, 19 px on tablets and desktop, at most 65ch**, task expression at least 2rem, stacked fractions at least 1.5× body height. | F18; H for the numbers |
| Layout | Tablet and Chromebook first | **Phone-first at 360 px**, without horizontal page scroll. Keypad, task and field fit one screen. | F21 |
| Text | Sachaufgaben 3–4 lines | Section 4. Antwortsatz via `before`/`after`. | F16 |
| Read-aloud | Optional button, local voices only | Same, less prominent: small button, never autoplay. | F16; P12 |
| **Tone of voice** | du-form, warm and specific | **du-form, plain and adult-respecting.** Real Fachwörter. No mascot, no cartoon figures, no diminutives, no "Kids" (T17). Hints describe the next step. | F20; H |
| Visual style | Friendly, calm | **Neutral, tool-like.** No stickers or bouncing rewards. Motion stays optional under `prefers-reduced-motion`. | F20, P9; H |
| **Badges** | Mastery badges and improvement badges (M16) | **Stay, with a plainer look: small list, no cartoon art.** "Stolperstein überwunden", "Besser geworden", "Gut behalten", "Vieles behalten", mastery per topic. **No badge for trying all topics** (participation badge, banned), none naming a track or trait ("Vorzeichen-Profi"). Optional topic-specific messages name the act: "Du hast Vorzeichen und Rechenzeichen zehnmal richtig auseinandergehalten." | M6, M7, M16; F12 |
| Warm-up | 3–5 items, 8 reviews per day | Same. | L2 |
| Break prompt | After 20 min | After **25 min**. | H; [49] |
| Fehlerdetektiv | Stufe 3 or after Sicher | Stays. Do not raise its share, as evidence is mixed. | F2 |
| Einmaleins | All 100 facts, tracked | Not a topic. Weak facts show up as prerequisites in hints. A "Wiederholen" entry links to Klasse-4 style practice content if built. | H |
| Länder options | NRW extras | Profiles (2.5). Adult page explains the plans and shows the table in 2.3 in plain language. | 2.5 |
| Adult wording | Parent or teacher page | Same, in Sie. Explains that the profile changes order only. | 2.5 |
| Worksheets, phrase rotation | Per [42] | Stay. Worksheets print no profile. | M14 |
| Privacy, security, performance | P1–P6, P14–P15 | No change. Storage key `mathe5.v1`. | Section 3 |

### 7.2 Banned patterns (equivalent of Klasse 4 §6.4)

**This section is what code, tests and reviews mean when they cite "docs/research.md §6.4".** It is part of code review. The list is copied from [42] §6.4; Radesky et al. [54] show why it is needed.

- Praise for traits or speed, and superlatives (see M15 in 7.4).
- "Falsch!", "Leider falsch.", "Schon wieder falsch.", "Das war doch einfach!", "Konzentrier dich!", "Alle anderen schaffen das."
- A red X, a buzzer, alarm red for errors, or feedback shown by colour alone.
- Timers or countdowns by default, and "Zu langsam!" or "Schneller!".
- Leaderboards, rankings, percentiles or participation badges.
- Currency, a shop, loot or mystery boxes, random bonus stars, or rewards announced before a task.
- Consecutive-day streaks, and messages about losing anything ("Serie verloren", "0 Tage").
- Push notifications, reminders or e-mail.
- A mascot that guilt-trips on exit, a hidden or delayed exit button, autoplay into the next round, or pop-ups during a round.
- Any third-party request: fonts, CDNs, analytics, embeds or external images.
- Storage writes before opt-in, and cookies.
- Free-text inputs and fields for personal data.
- `type="number"` inputs, and drag-only interactions.

Added for Klasse 5:

- A Schulform shown as a label, level, target, comparison or badge; a Stufe named after a Schulform; "für Gymnasiasten", "Hauptschul-Niveau", "das solltest du am Gymnasium können".
- The profile in a URL, query string, worksheet, or any network request.
- Any timed mode in v1, and any display of response time.
- Baby talk and mascots (T17): `Aufgäbchen`, `Kids`, `Mathe-Held`, "Na, ...?", rhymes.
- Revealing the answer's sign or type through the keypad (`−` or `,` appearing only when needed).
- Hints that say "minus mal minus gibt plus" with no context, or any catchphrase as a rule on its own. Hints name the step (F5).
- Contexts about a child's or family's real debts, weight or body.

Accessibility targets stay at WCAG 2.2 AA plus the Klasse-4 AAA criteria [53].

### 7.3 Round length: recommendation

**Default 10 items, target about 10–15 minutes; 6 items in written-calculation skills. A heuristic.** Reasoning: Klasse 4 uses 10 items [42], and there is no reason to go shorter, because reading and attention are at least as good. There is also no reason to go longer: the emotional cost of a long round is highest in the first school year after the change (F12, F13), and a phone is more easily abandoned. NRW frames homework at about 60 minutes a day for Klassen 5–7 across all subjects [49]. Three sessions a week reach the lower end of the 30–75 minutes a week linked with better results (L10). Written items with large numbers take much longer than other items, so a mixed round of 10 could easily exceed 20 minutes; our estimate is not measured. We found no experiment on round length for 10–11-year-olds. Measure it in the pilot.

AB mix as in 7.1. The 3-item Einstiegs-Check counts inside the round.

### 7.4 M15 phrase bank (Klasse 5 wording)

Same rules as M15 in [42], which code and tests cite as "M15". Use plain forms and name the action.

| Situation | Use (rotate) | Never use |
|---|---|---|
| Correct | "Richtig. Du hast zuerst die Klammer gerechnet." · "Stimmt. Du hast Vorzeichen und Rechenzeichen getrennt." · "Richtig. Dein Überschlag hat gepasst." · "Stimmt. Du hast die Einheit zuerst umgerechnet." | "Du bist so schlau!" · "Du bist ein Mathe-Genie!" · "Du bist ein Naturtalent!" · "Du warst so schnell!" · "PERFEKT!" · "Unglaublich!" · "Fantastisch!" · "Weltklasse!" |
| 1st wrong attempt | "Noch nicht ganz. Probier es noch einmal." · "Fast. Schau noch einmal auf das Vorzeichen." · "Das passt noch nicht. Hier ist ein Tipp." | "Falsch!" · "Leider falsch." · "Konzentrier dich!" |
| 2nd wrong attempt | "Schauen wir es Schritt für Schritt an." · "So kannst du rechnen: …" · "Jetzt kennst du den Weg. Hier ist eine ähnliche Aufgabe." | "Schon wieder falsch." · "Das war doch einfach!" · "Alle anderen schaffen das." |
| Normalising (at most once per session) | "Fehler gehören zum Lernen." · "Das ist neu. Es dauert, bis es sitzt." · "Das kannst du noch nicht ganz, du lernst es gerade." | "Dein Gehirn wächst bei jedem Fehler." · "An dieser Schule musst du das können." |
| Round summary | "8 von 10 geschafft. 2 Aufgaben waren noch knifflig." | "2 Fehler!" · "Nicht bestanden" |
| Improvement (M16) | "Klammern, Stufe 2: Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10." · "Negative Zahlen vergleichen: Vor ein paar Tagen war das noch knifflig. Heute hast du es in der Wiederholung auf Anhieb gelöst." | "Endlich!" · "Na also!" · "Viel besser!" · "Besser als die anderen" · "Jetzt machst du keine Fehler mehr" |
| Speed | (nothing) | "Zu langsam!" · "Schneller!" |
| Leaving or a break | "Gut, dass du geübt hast. Bis zum nächsten Mal." · "Gute Idee, eine Pause zu machen." | "Willst du wirklich aufhören?" · "Dein Freund ist traurig, wenn du gehst." |
| Status labels | "Geübt" → "Sicher" → "Gemeistert" (1–3 stars with a legend) | "Serie verloren" · "Deine Serie ist in Gefahr!" · "0 Tage" |
| Profile (Klasse 5 only) | "Passt das nicht? Du kannst es jederzeit ändern." · "Noch nicht dran in deiner Klasse? Das ist okay." | "Das gehört nicht zu deiner Schule." · "Das ist zu schwer für dich." · "Für deine Schulform reicht das." |

## 8. Limitations and open questions

**Could not be verified**

- **National share of Klasse-5 pupils by Schulform.** We did not find a current federal figure; only local data and Bavarian answers turned up. The recommendation does not depend on it.
- **Baden-Württemberg.** The Klasse-5/6 plan pages for Gymnasium and Sekundarstufe I returned 404 under the URL pattern we tried, and only a catalogue summary of a G9 textbook "ab 2025" appeared. BW is therefore not covered, and a new G9 plan may exist. We read Berlin-Brandenburg as the additional Land.
- **BB's plan** was read in a copy hosted by a school [13]. The official LISUM file returned 404 at the URL we tried. We read the second level table as Brandenburg's. Several BB entries were read by searching, not end to end, and some levels are marked "not pinned" in the tables.
- **NW-H** is the 2011 plan. We did not confirm whether a newer Hauptschule plan is in force. Its Klasse-5 share is unknown, like every NRW 5/6 plan apart from the sample plan for NW-G [12].
- **NW-R and the Gesamtschule plan** look identical in the 5/6 section as we read them; we compared by reading, not by a diff.
- **No verified words-per-minute norm for Klasse 5.** Test norms were not opened, so section 4 does not use one.
- **ICO Code Annex B and the ICO mindsets file** returned 403. "Transition years" comes from a search snippet of an ICO-hosted document [48].
- **Sources seen only as abstract or search summary:** [20][24][25][29][31][32][34]. Press only: [19][39]. Springer full text was not available for [24][31]. The Georgia material [30] was seen as a search snippet only, and the download timed out.
- **Searched, not opened, not relied on:** Siegler et al. 2012 on fractions as predictors; Lortie-Forgues et al. 2015; McLaren and Isotani on erroneous examples for decimals; Madjar 2016 (only through [35]); Cai, Moyer and Grochowski on the levelling model; IQB-Bildungstrend 2024 figures on Mindeststandards (the sample size came from a KMK release, the percentages only from press, so we left them out).
- **All bugs marked H** have no source showing them as errors of this age. Their frequency is unknown.
- **Carried-over items** ([14][52][53][54][55][56][57][58][59][60][61]): figures rely on the fact-checks in [42] and [43]. URLs were not re-opened in this run. [42] itself marks [55] and [58] as not verified online.

**Weak spots in the evidence**

- Several key studies are from other countries (Turkey [22][27][28], USA, Portugal) or from one track only [18]. German data for Klasse 5 on Klammern, Winkel, Koordinaten and Quader were not found.
- F15 is a very small sample of gifted children. It does not show that timers harm.
- F20 extrapolates from teenagers. The claim that childish tone is a risk at 10–11 is plausible but unmeasured here. A pilot should ask children directly.
- All numeric limits in section 4 and all thresholds in 2.5, 7.1 and 7.3 are heuristics. A pilot with a few children across school types should check: time per item, use of "Mehr Themen", whether the profile question is understood and by whom, tone, keypad error rate at 56 px, and tap accuracy on `coordinateGrid` at 360 px.

**Curriculum questions**

- Only Bayern, NRW and BE-BB were read. Other Länder get `offen`, and the three profiles may not match them. Ask a teacher from another Land to review it.
- The `core` rule is ours. It leaves `geometrie.vierecke` and `daten.*` optional because of one plan each, although almost everyone meets them. Teachers may prefer a softer rule.
- A QUA-LiS sample plan is not binding; many NRW schools will order differently. The `bruch` profile's order is only a suggestion.
- The profile mapping groups BY-G with BY-R, though BY-R has more on data and number systems and BY-G more on Lagebeziehungen and term structure. Both show the same list; a real split can wait for feedback.
- Does a child in Klasse 5 at a grundständiges Gymnasium in Berlin or Brandenburg fit `bruch`? The Berlin page [16] covers only the change at Klasse 7, and we read no rules on this case. The KMK overview of transition rules and the Orientierungsstufe [17] dates from 2015 and was opened for structure only, so we took no Länder table from it.
- Written subtraction: the method differs by school and textbook in NRW; only BY-R and BY-M name it.

**Legal question**

The profile question is new compared with Klasse 4. Stored locally and only after opt-in, it stays on the device and is not processed by the operator, as with progress under P1 and P2 in [42]. Still: a school-type label on a shared device is mildly sensitive socially, so only a profile id is stored, and it never appears in a URL because hosting logs record URLs (P4 in [42]). The answer "Bayern: Mittelschule" together with progress is still not personal data for the operator if nothing leaves the device. This should be part of the legal review before launch. Art. 8 DSGVO remains untriggered as long as no consent-based processing happens [51]. Whether a child can give the storage opt-in under § 25 TDDDG (P1 in [42]) is a question the Klasse-4 analysis treated, and it was not re-examined here.

**Code note**

Source comments may cite IDs such as L8, M16 or P13. These live in [42]; only §6.4 and M15 are restated here (7.2, 7.4). F-numbers in this document are not those of [43].

## 9. Sources

All accessed 2026-11-03. Sources were opened unless marked. *Abstract* or *summary* means only that part was seen. *Search result* means we saw only a search-result text and did not open the page. *Carried over* means checked in [42] or [43], and the URL was not re-opened here.

1. KMK (2022). Bildungsstandards für das Fach Mathematik: Erster Schulabschluss (ESA) und Mittlerer Schulabschluss (MSA) (Beschluss vom 15.10.2004 und 04.12.2003, i. d. F. vom 23.06.2022; Korrektur 18.06.2026). https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2022/2022_06_23-Bista-ESA-MSA-Mathe.pdf
2. ISB Bayern. LehrplanPLUS Gymnasium, Mathematik 5, Fachlehrplan. https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/5/mathematik
3. ISB Bayern. LehrplanPLUS Realschule, Mathematik 5, Fachlehrplan. https://www.lehrplanplus.bayern.de/fachlehrplan/realschule/5/mathematik
4. ISB Bayern. LehrplanPLUS Mittelschule, Mathematik 5, Fachlehrplan. https://www.lehrplanplus.bayern.de/fachlehrplan/mittelschule/5/mathematik
5. ISB Bayern. LehrplanPLUS Gymnasium, Mathematik 6. https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/6/mathematik
6. ISB Bayern. LehrplanPLUS Realschule, Mathematik 6. https://www.lehrplanplus.bayern.de/fachlehrplan/realschule/6/mathematik/
7. ISB Bayern. LehrplanPLUS Mittelschule, Mathematik 6. https://www.lehrplanplus.bayern.de/fachlehrplan/mittelschule/6/mathematik
8. MSB NRW (2019). Kernlehrplan für die Sekundarstufe I, Gymnasium, Mathematik (Heft 3401). https://lehrplannavigator.nrw.de/system/files/media/document/file/g9_m_klp_3401_2019_06_23_0.pdf
9. MSB NRW (2022). Kernlehrplan für die Sekundarstufe I, Realschule, Mathematik. https://lehrplannavigator.nrw.de/system/files/media/document/file/rs_m_klp_2022_06_17.pdf
10. MSB NRW (2022). Kernlehrplan für die Sekundarstufe I, Gesamtschule/Sekundarschule, Mathematik. https://lehrplannavigator.nrw.de/system/files/media/document/file/gesk_m_klp_2022_06_17.pdf
11. MSW NRW (2011). Kernlehrplan und Richtlinien für die Hauptschule, Mathematik. https://lehrplannavigator.nrw.de/system/files/media/document/file/mathe_hs_klp_0.pdf
12. QUA-LiS NRW (2020). Beispiel für einen schulinternen Lehrplan Gymnasium, Sekundarstufe I, Mathematik. https://www.qua-lis.nrw.de/system/files/media/document/file/g9_m_silp_2020_01_31.pdf
13. LISUM (2023). Rahmenlehrplan Berlin-Brandenburg, Teil C Mathematik, Jg. 1–10 (copy hosted by a school). https://hcg-berlin.de/wp-content/uploads/rahmenlehrplan-teil-c_mathe-1-10.pdf
14. KMK (2022). Bildungsstandards Mathematik Primarbereich. *Carried over.* https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2022/2022_06_23-Bista-Primarbereich-Mathe.pdf
15. Wissenschaftliche Dienste des Deutschen Bundestages (2021). Übergang von der Grundschule auf eine weiterführende Schule der Sekundarstufe I (WD 8 – 3000 – 025/21). https://www.bundestag.de/resource/blob/835702/WD-8-025-21-pdf.pdf
16. Senatsverwaltung Berlin. Wechsel auf die weiterführende Schule zur 7. Klasse. https://www.berlin.de/sen/bildung/schule/bildungswege/uebergang-weiterfuehrende-schule/wechsel-zur-7-klasse/
17. KMK-Sekretariat (2015). Übergang von der Grundschule in Schulen des Sekundarbereichs I und Förderung, Beobachtung und Orientierung in den Jahrgangsstufen 5 und 6 (Stand 19.02.2015; opened for structure only). https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2015/2015_02_19-Uebergang_Grundschule-SI-Orientierungsstufe.pdf
18. Reinhold, F., Obersteiner, A., Hoch, S., Hofer, S. I., & Reiss, K. (2020). The interplay between the natural number bias and fraction magnitude processing in low-achieving students. *Frontiers in Education, 5*, 29. https://frontiersin.org/article/10.3389/feduc.2020.00029/full
19. Reinhold, F., Hoch, S., Werner, B., Richter-Gebert, J., & Reiss, K. (2020). Learning fractions with and without educational technology. *Learning and Instruction, 65*, 101264. *Press release only.* https://www.tum.de/en/news-and-events/all-news/press-releases/details/translate-to-en-digitale-schulbuecher-helfen-leistungsschwaecheren-kindern
20. Hillmayr, D., Ziernwald, L., Reinhold, F., Hofer, S. I., & Reiss, K. (2020). The potential of digital tools to enhance mathematics and science learning in secondary schools. *Computers & Education, 153*, 103897. *Search result.* https://epub.ub.uni-muenchen.de/84380/1/1-s2.0-S0360131520300968-main.pdf
21. Durkin, K., & Rittle-Johnson, B. (2012). The effectiveness of using incorrect examples to support learning about decimal magnitude. *Learning and Instruction, 22*(3), 206–214. *Abstract* (aggregator record). https://data.zhenzhi.com/details/1/872900741
22. Tabak, S. (2019). 6th, 7th and 8th grade students' misconceptions about the order of operations. *International Journal of Educational Methodology, 5*(3), 363–373. *Abstract page.* https://www.ijem.com/6th-7th-and-8th-grade-students-misconceptions-about-the-order-of-operations
23. Lamb, L. L., Bishop, J. P., Philipp, R. A., Schappelle, B. P., Whitacre, I., & Lewis, M. (2012). Developing symbol sense for the minus sign. *Mathematics Teaching in the Middle School, 18*(1), 5–9. https://par.nsf.gov/servlets/purl/10123109
24. Schindler, M., Hußmann, S., Nilsson, P., & Bakker, A. (2017). Sixth-grade students' reasoning on the order relation of integers as influenced by prior experience. *Mathematics Education Research Journal, 29*(4), 471–492. *Search result (abstract text).* https://link.springer.com/article/10.1007/s13394-017-0202-x
25. Bofferding, L. (2014). Negative integer understanding: Characterizing first graders' mental models. *Journal for Research in Mathematics Education, 45*(2). *Search result.* https://nctm.org/Publications/journal-for-research-in-mathematics-education/2014/Vol45/Issue2/Negative-Integer-Understanding_-Characterizing-First-Graders_-Mental-Models
26. Prediger, S., Böing, L., & Tester, A. Wie setzen sich Zahlen zusammen? Stellenwertverständnis an Würfelmaterial und Zahlenstrahl aufarbeiten (web version, undated, cites 2025 works; includes the Moser Opitz et al. 2016 figure). https://wwwold.mathematik.tu-dortmund.de/~prediger/veroeff/26-M510-Prediger_etal_Stellenwert-Verstaendnis_Webversion.pdf
27. Dağlı, H., & Peker, M. (2012). What do 5th grades know related the geometric shapes' perimeter? *Journal of Theoretical Educational Science, 5*(3), 330–351. https://dergipark.org.tr/en/download/article-file/304196
28. Sarı, M. H., Tertemiz, N. I., & Demirci, N. (2021). A study on 5th grade students' achievement levels and misconceptions in the concept of angle. *International Journal of Progressive Education, 17*(1), 338–356. https://ijpe.inased.org/makale/1997
29. Devichi, C., & Munier, V. (2013). About the concept of angle in elementary school. *Journal of Mathematical Behavior, 32*, 1–19. *Search result (citations by others).* https://esploro.umontpellier.fr/esploro/outputs/journalArticle/About-the-concept-of-angle-in/9937273209311
30. Georgia Department of Education. Unit 7, 5th grade parent letter (common misconceptions, coordinate plane). *Search result; download timed out.* https://www.georgiastandards.org/Georgia-Standards/Frameworks/Unit-7-5th-grade-parent-letter.pdf
31. Ben-Haim, D., Lappan, G., & Houang, R. T. (1985). Visualizing rectangular solids made of small cubes. *Educational Studies in Mathematics, 16*, 389–409. *Search result (abstract).* https://doi.org/10.1007/BF00417194
32. Battista, M. T., & Clements, D. H. (1996). Students' understanding of three-dimensional rectangular arrays of cubes. *Journal for Research in Mathematics Education.* *Search result.* https://www.bohrium.com/paper-details/students-understanding-of-three-dimensional-rectangular-arrays-of-cubes/812576584396439552-10867
33. Gattuso, L., & Mary, C. (1998). Development of the concept of weighted average among high-school children. ICOTS 5 (cites Cai 1995). https://fpce.uc.pt/iase-web/documents/papers/icots5/Topic6f.pdf
34. Mokros, J., & Russell, S. J. Children's concepts of average and representativeness; and Russell & Mokros, What's typical? *Search result; our fetch of the page failed.* https://www.causeweb.org/cause/node/5013
35. Evans, D., Borriello, G. A., & Field, A. P. (2018). A review of the academic and psychological impact of the transition to secondary education. *Frontiers in Psychology, 9*. https://www.frontiersin.org/articles/10.3389/fpsyg.2018.01482/full
36. Arens, A. K., Yeung, A. S., Craven, R. G., Watermann, R., & Hasselhorn, M. (2013). Does the timing of transition matter? *International Journal of Educational Research, 57*, 1–11. *Search result (abstract).* https://acuresearchbank.acu.edu.au/item/89z17/does-the-timing-of-transition-matter-comparison-of-german-students-self-perceptions-before-and-after-transition-to-secondary-school
37. Frenzel, A. C., Goetz, T., Pekrun, R., & Watt, H. M. G. (2010). Development of mathematics interest in adolescence. *Journal of Research on Adolescence, 20*(2), 507–537. *Search result (abstract).* https://research.monash.edu/en/publications/development-of-mathematics-interest-in-adolescence-influences-of-/
38. Tsui, J. M., & Mazzocco, M. M. M. (2007). Effects of math anxiety and perfectionism on timed versus untimed math testing in mathematically gifted sixth graders. *Roeper Review.* https://pmc.ncbi.nlm.nih.gov/articles/PMC2806671
39. McElvany, N., et al. (2023). IGLU 2021, Pressemappe (Kurzfassung). https://www.bllv.de/fileadmin/BLLV/Download/Studien/2021_IGLU_ZDF_Pressemappe_Kurzfassung.pdf
40. Bayerischer Landtag (2025). Drucksache 19/7945: Anteil der Schülerinnen und Schüler mit Migrationshintergrund in Bayern 2024/2025. https://www.bayern.landtag.de/www/ElanTextAblage_WP19/Drucksachen/Schriftliche%20Anfragen/19_0007945.pdf
41. Katzir, T., Hershko, S., & Halamish, V. (2013). The effect of font size on reading comprehension on second and fifth grade children. *PLoS ONE, 8*(9), e74061. https://pmc.ncbi.nlm.nih.gov/articles/PMC3777945/
42. Mathe 4 (2026). Research summary: Mathe-Portal Klasse 4. https://github.com/lev-n/mathe-4/blob/main/docs/research.md
43. Mathe 2 (2026). Research summary: Mathe-Portal Klasse 2 (local file `mathe_2/docs/research.md`).
44. Medienpädagogischer Forschungsverbund Südwest (2024). KIM-Studie 2024. https://www.pit.sachsen.de/download/KIM-Studie-2024.pdf
45. Liu, F. (2018). Design for kids based on their stage of physical development. Nielsen Norman Group. https://www.nngroup.com/articles/children-ux-physical-development/
46. Nielsen Norman Group. Teenager's UX: Designing for teens. https://www.nngroup.com/articles/usability-of-websites-for-teenagers/
47. Nielsen Norman Group. Designing for kids: Cognitive considerations. https://www.nngroup.com/articles/kids-cognition/
48. Information Commissioner's Office. Age appropriate design code (v2.1), Annex B; Age appropriate mindsets. *Search result; downloads returned 403.* https://ico.org.uk/media/about-the-ico/docu-ments/2618093/code-of-practice-dpa-2018-age-appropriate-design-code_v_2_1.pdf and https://cy.ico.org.uk/media2/migrated/4017954/age-appropriate-mindsets-pdf.pdf
49. Ministerium für Schule und Bildung NRW. Hausaufgaben. https://www.schulministerium.nrw/hausaufgaben
50. WebKit Bugzilla, bug 193825: inputmode="decimal" on iOS 12.2 doesn't have a button for negative. Status NEW, last modified 2025-08-19. https://bugs.webkit.org/show_bug.cgi?id=193825
51. Art. 8 DSGVO. https://dsgvo-gesetz.de/art-8-dsgvo/
52. Wissenschaftliche Dienste des Deutschen Bundestages (2023). WD 10 – 019/23. *Carried over.* https://www.bundestag.de/resource/blob/959324/WD-10-019-23-pdf.pdf
53. W3C. Web Content Accessibility Guidelines (WCAG) 2.2. *Carried over.* https://www.w3.org/TR/WCAG22/
54. Radesky, J., et al. (2022). Prevalence and characteristics of manipulative design in mobile applications used by children. *JAMA Network Open, 5*(6). *Carried over.* https://pmc.ncbi.nlm.nih.gov/articles/PMC9206186/
55. Rohrer, D., Dedrick, R. F., & Stershic, S. (2015). Interleaved practice improves mathematics learning. *Journal of Educational Psychology, 107*(3), 900–908. *Carried over.* https://doi.org/10.1037/edu0000001
56. Dickhäuser, O., Janke, S., Praetorius, A.-K., & Dresel, M. (2017). The effects of teachers' reference norm orientations on students' implicit theories and academic self-concepts. *Zeitschrift für Pädagogische Psychologie, 31*(3–4), 205–219. *Carried over.* https://doi.org/10.1024/1010-0652/a000208
57. Fang, J., et al. (2018). The big-fish-little-pond effect on academic self-concept: A meta-analysis. *Frontiers in Psychology, 9*, 1569. *Carried over.* https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01569/full
58. Verschaffel, L., De Corte, E., & Lasure, S. (1994). Realistic considerations in mathematical modelling of school arithmetic word problems. *Learning and Instruction, 4*(4), 273–294. *Carried over.* https://doi.org/10.1016/0959-4752(94)90002-7
59. Anthony, L., Brown, Q., Tate, B., Nias, J., Brewer, R., & Irwin, G. (2013). Designing smarter touch-based interfaces for educational contexts. *Personal and Ubiquitous Computing* (preprint). *Carried over.* https://lisa-anthony.com/wp-content/uploads/2013/04/anthony-et-al-jpuc2013.pdf
60. Daroczy, G., Wolska, M., Meurers, W. D., & Nuerk, H.-C. (2015). Word problems: a review of linguistic and numerical factors contributing to their difficulty. *Frontiers in Psychology, 6*, 348. *Carried over.* https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00348/pdf
61. Buzick, H., & Stone, E. (2014). A meta-analysis of research on the read aloud accommodation. *Educational Measurement: Issues and Practice, 33*(3), 17–30. *Carried over (summary).* https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/527e5ed2-1fd9-4abb-97fe-a9e7f93978d9
