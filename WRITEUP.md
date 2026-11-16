# A local privacy gate before a cloud model: what leaks, what breaks, what can be guessed

German Korjagin, Tallinn. November 2026. Code, data and every result: this repository.

## Summary

I put a small local model (Gemma 4 12B on a laptop) and a few pattern rules in front of a cloud model
(Claude Sonnet 5.5). The gate finds personal data, secrets and business know-how in a task. Plain code swaps
them for placeholders, sends the redacted task, and puts the real values back into the answer.

On 30 synthetic work tasks with 403 planted sensitive values:

- **Leakage fell from 100 % to 2.2 %** (9 of 403) with rules plus Gemma. No personal data, client name or
  API key got through. All 9 leaks were names of internal methods in code.
- **Quality did not drop.** The gated pipeline passed 23 of 30 tasks, the same as Claude with no gate. Gemma
  working alone, with nothing sent, passed 16.
- **One missed identifier can undo the rest.** With Gemma alone as the gate, two e-mail addresses slipped
  through, and from them Claude rebuilt a full name (with its Estonian letter) and a venue name that had
  both been redacted. Adding the rules closed this.

This is a small study: one laptop, one seed, one grader. Section 6 lists what it does not show.

## 1. Question

Can a local model keep sensitive material out of a cloud model without making the answers worse? I measured
three things:

1. **Leakage:** how many planted values reach the cloud model.
2. **Quality:** whether the answer still passes after the real values are put back.
3. **Re-identification:** whether the cloud model can guess what was hidden from what it was sent.

The study began as a cost question (does a local first draft save cloud spending?). A one-task pilot showed
a local draft can cost more, because the cloud model rejects it and rewrites it. I changed the question to
privacy before the task set was built.

## 2. Method

**Tasks.** 30 synthetic tasks in four kinds, shaped like my daily work on a bar inventory product: fix a bug
in a code module (8), write an SQL query over staff and stock-count tables (8), answer a customer e-mail
(8), summarise meeting notes (6). Everything in them is invented by a seeded generator (`privacy/build.js`,
seed 20261111): people with names, phones, e-mail addresses and Estonian ID codes with valid checksums;
venues and companies; API keys; and one "secret method" per task with a name, a function and two constants.

**Canaries.** Each planted value is a canary: 254 personal, 85 client, 14 secret, 50 know-how. A canary
counts as leaked when its exact text is in what was sent to the cloud model.

**Setups.**

| Setup | What stands before the cloud model |
|---|---|
| no gate | nothing; Claude sees the whole task |
| rules | regular expressions: e-mail, ID code, phone, IBAN, key shapes. No name lists. |
| Gemma | Gemma lists the sensitive spans; a span is used only if it occurs word for word in the task |
| rules + Gemma | both |
| Gemma alone | Gemma solves the task; nothing is sent |

The model only *suggests* spans. Code does the swapping (`PERSON_1`, `CLIENT_2`, `METHOD_1`) and the
restoring, so the mapping is exact and can be tested.

**Quality.** Code answers run against unit tests. SQL answers run on SQLite and must return the reference
rows. E-mails and notes were graded pass or fail by me against a written rubric, blind: answers were
shuffled and the setup was hidden (`privacy/grade.js`, 69 answers).

**Re-identification.** For every gated task, a second call gives Claude only the redacted text and asks it
to guess each placeholder and say what the text is about. A hit is a canary that appears in the guess but
was not in the text sent.

**Settings.** Gemma 4 12B (Q4_K_M) through Ollama on a MacBook Pro M2 Pro with 16 GB, at Google's
recommended sampling (temperature 1.0, top-k 64, top-p 0.95). Claude Sonnet 5.5 through the Claude Code
command line with no tools and a one-line system prompt, the same for both models. One run per task and
setup: 150 results, no errors.

## 3. Results

| Setup | Leaked | Re-identified | Tasks passed (of 30) |
|---|---:|---:|---:|
| no gate | 403 of 403 (100 %) | not tested | 23 |
| rules | 205 (50.9 %) | 0 | 24 |
| Gemma | 12 (3.0 %) | 3 values in 2 tasks | 26 |
| **rules + Gemma** | **9 (2.2 %)** | **0** | **23** |
| Gemma alone | 0 | nothing sent | 16 |

**Leaked, by type of value**

| Setup | Personal (254) | Client (85) | Secret (14) | Know-how (50) |
|---|---:|---:|---:|---:|
| rules | 70 | 85 | 0 | 50 |
| Gemma | 3 | 0 | 0 | 9 |
| rules + Gemma | 0 | 0 | 0 | 9 |

**Passed, by kind of task**

| Setup | Code (8) | SQL (8) | Notes (6) | E-mail (8) |
|---|---:|---:|---:|---:|
| no gate | 8 | 7 | 6 | 2 |
| rules | 8 | 7 | 4 | 5 |
| Gemma | 8 | 7 | 6 | 5 |
| rules + Gemma | 8 | 7 | 5 | 3 |
| Gemma alone | 7 | 5 | 1 | 3 |

The full report, with failure types and every leaked value, is in `privacy/out/REPORT.md`.

## 4. What the numbers say

**Rules and the model catch different things.** Rules caught every ID code, phone, e-mail address and key,
and nothing else: every person's name, every client name and all know-how went through. Gemma caught the
names and almost everything else, but missed 2 e-mail addresses in long SQL tables and 1 full name in an
e-mail. Together they missed no personal, client or secret value.

**What still leaks is know-how written as code.** All 9 remaining leaks are in the code tasks, and every
one of the 8 code tasks has at least one: the secret method's function name (such as `kaldaCorrection`) in
6 tasks and its descriptive name in 3. Gemma masked the constants in all 8 and the comment above the
function in 5, yet treated the function name as code and left it. In the meeting notes it caught all 18
know-how values. A bigger model may not fix this; a step that understands code (rename what is defined
next to a masked constant) probably would. The shape of the formula also stays visible, for example
`grams * METHOD_2 - METHOD_3`. The canaries do not measure that.

**A single leak carries others with it.** In the Gemma-only setup, Claude was asked to guess the
placeholders in two SQL tasks where one e-mail address had slipped through. From
`ilmar.poldsaar@pubi-vaikne-laternas.example` it answered with the person's full name, restoring the letter
"õ" that the address does not contain, and with the venue's name. Both had been redacted everywhere else in
the text. This is decoding more than guessing, and that is the point: values point at each other, so
counting leaked values one by one understates the damage of a miss. With rules added there were no leaked
addresses and no hits.

**Redaction did not cost quality here.** Rules plus Gemma and no gate gave the same result on 28 of 30
tasks; one task went each way. The differences between the sent setups (23 to 26 passes) are within what
one grader and 30 tasks can resolve, so I read them as "no difference seen", not as "the gate helps".
Gemma alone is clearly weaker (16), mostly on notes and SQL. That gap is the reason to send anything to a
cloud model at all.

**Cost and time.** A call with no gate cost about $0.02 and took about 9 seconds. A gated call sends about
as much text, so the cloud cost per task should be about the same. I did not time the gate on its own:
gated setups took a median of 18 seconds, which includes the gate and a second cloud call. The totals in
the report are not comparable across setups: gated setups include that second, re-identification call, and
the lower total for rules + Gemma is most likely the provider's prompt cache, because in 16 of 30 tasks it
sent exactly the same text as the Gemma setup had sent before it.

## 5. Why this may matter under EU law

This is not legal advice. Under the GDPR, pseudonymisation is a named safeguard (Articles 4(5), 25 and
32) and sending less data is a principle of its own (Article 5(1)(c)). In *EDPS v SRB* (C-413/23 P,
4 September 2025) the Court of Justice held that pseudonymised data is not personal data for every
recipient in every case: it depends on whether that recipient can reasonably re-identify people. For a
language model as the recipient, a re-identification test like the one here is a way to produce evidence
on that question. The Gemma-only result shows the answer can be "yes, it can" after a single miss.
Know-how is a separate matter: trade-secret protection asks for reasonable steps to keep information
secret (Directive (EU) 2016/943), and a measured leak rate is evidence about such a step.

## 6. Limits

- **Synthetic data, one seed, one run.** Invented values in templates are easier to spot than real ones.
  Gemma was sampled at temperature 1.0, so a second run would differ. I did not repeat runs.
- **One grader, who built the study.** Grading was blind to the setup but not independent. The e-mail
  rubric was strict for every setup: with no gate only 2 of 8 e-mails passed, and one e-mail task failed in
  all five setups.
- **The tasks are too easy to show damage.** Gemma alone fixed 7 of 8 code bugs, so the code tasks could
  not have shown a quality loss from redaction. Harder tasks may.
- **One SQL task has a faulty check.** It failed in all five setups because the answers used different
  period labels from the reference, which the request left open. I did not regrade it.
- **Exact matching is a lower bound.** It misses a value that gets through in pieces. A check afterwards
  (`privacy/partial.js`) found no pieces of any personal, client or secret value in the rules + Gemma
  setup; the only pieces were the method names inside the function names already counted.
- **The re-identification test is a lower bound too:** one prompt, one model, exact matches only.
- **Not measured:** what the formula's shape or the surrounding context gives away; how much Gemma
  redacted without need (it also masked the product's own name and a price); other gate sizes; real data.
- **Changes after the first run.** (1) Before grading I fixed a rule: an answer may contain an ID code that
  the customer gave, but must not ask for one. (2) During grading I saw that the e-mail tasks did not state
  how the product's support works, so every setup was guessing policy. I added a short fact block to the
  e-mail tasks, ran the 8 e-mail tasks again in all setups, discarded the 8 e-mail grades given until then
  and kept the 6 notes grades. The canaries did not change. The first e-mail runs are kept in
  `privacy/out/runs-email-v1.jsonl`.
- **How it was built.** I designed the study, wrote the protocol and reviewed the code and results. The
  code was written with Claude Code agents under my direction, and Claude is also the cloud model under
  test. The measurements are plain string searches, unit tests and row comparisons, so they can be
  checked without trusting any model.

## 7. Related work and next steps

PAPILLON (Li et al., NAACL 2025) studied the same pattern for personal data in chat requests, with a
local model rewriting the request, and reported 85.5 % of quality kept at 7.5 % leakage. This study
differs in three ways: the tasks are developer work (code, SQL, notes), it plants business know-how as well
as personal data, and the swap is done by code, not by the model.

Next, in order: a code-aware step for identifiers; harder tasks and a second grader; several seeds and
repeated runs; smaller and larger gate models. Longer-term ideas (gates on devices, verifiable gates,
confidential hardware) are in `FUTURE.md`. None of them is tested.

## Reproduce

    node privacy/build.js            # rebuild the 30 tasks (same seed, same tasks)
    node --test                      # self-tests of the harness
    node privacy/run.js              # all setups; needs Ollama with gemma4:12b and the Claude Code CLI
    node privacy/grade.js            # blind grading of e-mails and notes
    node privacy/report.js           # privacy/out/REPORT.md
    node privacy/partial.js          # check for values leaked in pieces

Node 24, no dependencies. All results are in `privacy/out/`.
