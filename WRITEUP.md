# A local privacy gate before a cloud model: what leaks, what breaks, what can be guessed

German Korjagin, Tallinn. November 2026. Version 2, covering two runs. Code, data and results: this
repository.

## Summary

I put a small local model (Gemma 4 12B on a laptop) and a few pattern rules in front of a cloud model
(Claude Sonnet 5.5). The gate finds personal data, secrets and business know-how in a task. Plain code swaps
them for placeholders, sends the redacted task, and puts the real values back into the answer.

I ran it twice on the same 30 synthetic work tasks with 403 planted sensitive values. An independent review
of run 1 found faults in my harness (section 3). Run 2 repeats the experiment with the faults fixed.

- **Leaks.** With rules plus Gemma, 9 of 403 planted values (2.2 %) reached the cloud model in run 1 and 11
  (2.7 %) in run 2, counted by exact match. In both runs none was a person's data, a client name or an API
  key. All were names of internal methods in code, and all 8 code tasks leaked at least one.
- **These zeros are draws, not guarantees.** The same Gemma gate without the rules missed a person's full
  name in run 1, and rules cannot catch names.
- **One missed identifier can undo the rest.** Without the rules, Gemma missed the same two e-mail addresses
  in both runs. From them Claude gave back two people's full names and one venue name that had been masked
  everywhere else. My generator builds every address from the name and the venue, so this was decoding.
- **Quality.** In run 2 the gated pipeline passed 24 of 30 tasks against 27 with no gate: 15 against 16 on
  the automatic checks (code and SQL), 9 against 11 of 14 on hand-graded e-mails and notes. In run 1,
  rescored, it was 22 against 20. A gap of three is inside the noise: on identical inputs my own pass or
  fail grade flipped in 4 of 12 cases (section 5). So I can claim neither a cost nor the absence of one. One
  of the three run-2 losses is the gate's doing.
- **Things did break:** an identifier in run 1, the greeting in every gated e-mail, and the cloud model's
  own discretion about what to repeat (section 5).
- **Time.** The gate adds about 20 seconds per task on this laptop. An ungated answer takes about 8.

This is a small study: one laptop, one seed, one grader, four text layouts, and a gate prompt written by the
person who wrote the data. Section 7 lists what it does not show.

## 1. Question

Can a local model keep sensitive material out of a cloud model without making the answers worse? I measured
three things:

1. **Leakage:** how many planted values reach the cloud model.
2. **Quality:** whether the answer still passes after the real values are put back.
3. **Re-identification:** whether the cloud model can guess what was hidden from what it was sent.

The study began as a cost question (does a local first draft save cloud spending?). A one-task pilot showed
a local draft can cost more, because the cloud model rejects it and rewrites it. I changed the question to
privacy before the task set was built.

**Threat model.** The gate is meant to keep literal values away from the cloud provider and whatever sits
behind it: logs, retention, staff access, a breach on the provider's side, reuse for training. It does not
protect against:

- anyone with access to the laptop, where the originals and the placeholder map stay;
- inference from what is left in the text (the shape of a formula, what a method does, a city);
- the provider linking the request to my account, which the command-line tool identifies in every call;
- hostile text inside the task. The gate is a language model that reads untrusted text, such as a customer
  e-mail, and follows a prompt. I did not test a sentence addressed to the gate;
- its own variation. It is sampled at temperature 1.0 and two runs on the same text disagree (section 5).

## 2. Method

**Tasks.** 30 synthetic tasks in four kinds, shaped like my daily work on a bar inventory product: fix a bug
in a code module (8), write an SQL query over staff and stock-count tables (8), answer a customer e-mail
(8), summarise meeting notes (6). Everything in them is invented by a seeded generator (`privacy/build.js`,
seed 20261111): people with names, phones, e-mail addresses and Estonian ID codes with valid checksums;
venues and companies; and, in the 14 code and notes tasks, an API key and a "secret method" with a name, a
function and two constants. Each kind has one layout, so the planted values sit in four layouts, not thirty.

**Canaries.** Each planted value is a canary: 254 personal, 85 client, 14 secret, 50 know-how. The SQL
tasks hold 240 of the 403. A canary counts as leaked when its exact text is in what was sent to the cloud
model.

**Setups.**

| Setup | What stands before the cloud model |
|---|---|
| no gate | nothing; Claude sees the whole task |
| rules | regular expressions: e-mail, ID code, phone, IBAN, key shapes. No name lists. |
| Gemma | Gemma lists the sensitive spans; a span is used only if it occurs word for word in the task |
| rules + Gemma | both |
| Gemma alone | Gemma solves the task; nothing is sent |

The model only suggests spans. Code does the swapping (`PERSON_1`, `CLIENT_2`, `METHOD_1`) and the
restoring. If Gemma's reply is not a valid list, nothing is sent (since run 2).

**Quality.** Code answers run against unit tests, including asserts the model does not see, and must leave
every other line of the module unchanged (since run 2; run 1 is rescored the same way below). SQL answers
run on SQLite and must return the reference rows. E-mails and notes were graded pass or fail by me against a
written rubric, shuffled and with the setup label hidden (`privacy/grade.js`). The label was hidden but the
answers often gave the setup away (section 7).

**Re-identification.** For every gated task, a second call gives Claude only the redacted text and asks it
to guess each placeholder and say what the text is about. A hit is a canary that appears in the guess but
was not in the text sent.

**Settings.** Gemma 4 12B (Q4_K_M, `gemma4:12b`) through Ollama on a MacBook Pro M2 Pro with 16 GB, at
Google's recommended sampling (temperature 1.0, top-k 64, top-p 0.95). Claude Sonnet 5.5
(`claude-sonnet-5-5`) through the Claude Code command line with no tools, default sampling, and the system
prompt "You are a careful assistant. Follow the task exactly.", the same for both models. One result per
task and setup: 150 per run.

## 3. Two runs: what was wrong in run 1 and what run 2 changed

Run 1 is from 11 to 13 November. I then asked for a cold critique from a separate Claude session that had
no context, and checked each of its points in the data. It found these faults.

1. **Claude was not running bare.** I called it from a folder inside my home directory. The command-line
   tool collects instruction files from the working folder upward, so every call also carried my private
   global instruction file: about 3,000 tokens of context for a one-line prompt, against about 600 from
   outside the home folder. That file has a rule not to print secrets. In two no-gate code tasks Claude
   blanked the API key and wrote that its "rules say not to print secrets in chat". When I tested the fix,
   my account's connector definitions loaded as well (4,377 tokens) until I switched them off. Run 1 kept no
   token counts, so I cannot say how many of its calls carried them. Version 1 of this write-up said "a
   one-line system prompt". That was false for run 1, and the text I searched for leaks was not all that
   left the machine.
2. **The restore step had a bug.** Version 1 called the mapping exact. It was not. When Gemma listed a word
   that sits inside an identifier (`saula` in `saulaCorrection`), the swap produced `METHOD_2Correction` and
   the restore, which looked for whole words, left it there. One answer in each Gemma-gated setup came back
   with a renamed function and still passed.
3. **The code check was too weak.** The unit tests covered only the function with the bug, so a blanked
   key, a renamed export and a wrong fix all passed.
4. **One SQL request was faulty.** SQL-06 failed in all five setups because the request left the period
   labels open.
5. **Gaps in the record.** The gate was not timed, the gate would have sent everything if Gemma's reply had
   been malformed (this did not happen), and probe replies, placeholder maps, token counts and model ids
   were not saved. Seven results (CODE-01 in all setups, SQL-04 for rules and Gemma) came from a smoke run a
   few minutes before the main run.

Run 2 is from 16 November: one process, 150 results, no errors. Changes:

- Claude is called from a folder outside the home directory with connectors off. A check refuses to start
  the run if the context for a one-line prompt is above 1,000 tokens. It measured 583.
- Restore no longer needs word boundaries, with a test on identifiers.
- The code check adds hidden asserts and fails an answer that changes any other line.
- SQL-06 names its labels. No canary changed, and no other task text changed.
- The gate is timed and fails closed. Probe replies, maps, token counts and model ids are saved.

"Bare" is still relative. Even the fixed call carries about 600 tokens that the tool adds itself, among them
the account e-mail, the working folder, the platform, the date and the model name. The answer calls in run
2 had 814 to 1,950 tokens of context in all.

Run 2 keeps the tasks, the seed, the gate prompt and the models. It is a second sample of the same
experiment with a sound harness, not an independent test.

## 4. Results

**Leaked values (of 403) and re-identification**

| Setup | Run 1 | Run 2 | Tasks with a leak (run 1, run 2) | Re-identified, both runs |
|---|---:|---:|---:|---|
| no gate | 403 | 403 | 30, 30 | not tested |
| rules | 205 (50.9 %) | 205 (50.9 %) | 30, 30 | 0 (see section 7) |
| Gemma | 12 (3.0 %) | 12 (3.0 %) | 11, 10 | 3 values in 2 tasks |
| **rules + Gemma** | **9 (2.2 %)** | **11 (2.7 %)** | 8, 8 | 0 (nothing left to decode) |
| Gemma alone | 0 | 0 | 0, 0 | nothing sent |

**Leaked, by type of value (run 1, run 2)**

| Setup | Personal (254) | Client (85) | Secret (14) | Know-how (50) |
|---|---:|---:|---:|---:|
| rules | 70, 70 | 85, 85 | 0, 0 | 50, 50 |
| Gemma | 3, 2 | 0, 0 | 0, 0 | 9, 10 |
| rules + Gemma | 0, 0 | 0, 0 | 0, 0 | 9, 11 |

**Rules + Gemma, by kind of task**

| | Code (80 values) | SQL (240) | E-mail (29) | Notes (54) |
|---|---:|---:|---:|---:|
| Leaked, run 1 | 9 | 0 | 0 | 0 |
| Leaked, run 2 | 11 | 0 | 0 | 0 |
| Tasks with a leak, both runs | 8 of 8 | 0 of 8 | 0 of 8 | 0 of 6 |

**Quality, automatic checks (tasks passed, code + SQL, 8 each).** Run 1 is rescored with today's stricter
check (`privacy/rescore.js`); under the old check every Claude setup had code 8.

| Setup | Run 1 code | Run 1 SQL | Run 2 code | Run 2 SQL |
|---|---:|---:|---:|---:|
| no gate | 5 | 7 | 8 | 8 |
| rules | 8 | 7 | 8 | 8 |
| Gemma | 7 | 7 | 7 | 8 |
| rules + Gemma | 7 | 7 | 7 | 8 |
| Gemma alone | 7 | 5 | 7 | 6 |

**Quality, graded by hand (tasks passed, e-mail 8 + notes 6).** In run 2 I graded only no gate and rules +
Gemma (28 answers).

| Setup | Run 1 e-mail | Run 1 notes | Run 2 e-mail | Run 2 notes |
|---|---:|---:|---:|---:|
| no gate | 2 | 6 | 5 | 6 |
| rules | 5 | 4 | not graded | not graded |
| Gemma | 5 | 6 | not graded | not graded |
| rules + Gemma | 3 | 5 | 4 | 5 |
| Gemma alone | 3 | 1 | not graded | not graded |

**All 30 tasks.** Run 1 as first reported: 23, 24, 26, 23, 16 in the order of the table. With today's code
check: 20, 24, 25, 22, 16. Run 2: no gate 27 of 30, rules + Gemma 24 of 30.

**Time and cost, run 2 (medians per task)**

| Setup | Gate | Answer call | Gate + answer | Answer call cost |
|---|---:|---:|---:|---:|
| no gate | none | 7.9 s | 7.9 s | $0.008 |
| rules | under 0.1 s | 7.1 s | 7.1 s | $0.008 |
| Gemma | 20.7 s | 7.8 s | 28.4 s | $0.007 |
| rules + Gemma | 18.2 s | 7.6 s | 26.1 s | $0.007 |
| Gemma alone | none | 14.4 s (local) | 14.4 s | none |

The full reports are in `privacy/out/run1/REPORT.md` and `privacy/out/run2/REPORT.md`.

## 5. What the numbers say

**Rules and the model catch different things, partly by design.** Rules caught every ID code, phone, e-mail
address and key, and nothing else. That is true by construction: I wrote both the patterns and the
generator that produces those formats, and I gave the rules no name list. Gemma caught names and client
names. Together they missed no personal, client or secret value in either run.

**The zeros are one draw each.** The Gemma setup, the same gate without the rules, missed 3 personal values
in run 1 (two e-mail addresses and one full name) and 2 in run 2 (the same two addresses). The addresses
are a repeatable miss in long SQL tables. The name is the kind of miss that nothing but Gemma can catch,
so only chance separates it from the rules + Gemma setup.

**What still leaks is know-how written as code.** Every remaining leak is in the code tasks. In run 2 they
are 7 function names (such as `kaldaCorrection`) and 4 descriptive names; in run 1, 6 and 3. Gemma masked
the constants in all 8 code tasks in both runs, but mostly treated the function name as code and left it.
In the notes it caught all 18 know-how values both times. A bigger model may not fix this; a step that
understands code (rename what is defined next to a masked constant) probably would. Much else stays visible
that the canaries do not count: the comment "our own correction, tuned on real pours. Do not share." above
the function in all 8 code tasks, the shape of the formula (`grams * METHOD_2 - METHOD_3`), and in the notes
what the method does.

**A single leak carries others with it.** In the Gemma setup, in both runs, one e-mail address slipped
through in each of two SQL tasks. From `ilmar.poldsaar@pubi-vaikne-laternas.example` Claude answered with
the person's full name, restoring the letter "õ" that the address lacks, and with the venue's name. Both had
been masked everywhere else. In the second task it gave the person's name and wrote the venue as "Baar Vana
Torvik", one letter off the real "Baar Vana Tõrvik", which exact matching does not count. Values point at
each other, so counting leaked values one by one understates the damage of a miss. With rules added there
were no leaked addresses and no hits. That "0" is weak evidence: with random invented names and everything
masked, there is nothing a model could guess exactly. The guesses in run 2 do show what context gives away.
In the four code tasks where the function name leaked and the method's descriptive name was masked, Claude
named the method "Kalda correction" or "Liiva correction", with the right proper word each time. It never
got a constant.

**What broke.**

- *An identifier, in run 1* (section 3, point 2). In run 2 no answer has a placeholder left in it.
- *The greeting.* The e-mail task says to address the sender by name. With the name masked as one
  placeholder, all 16 gated e-mails in run 2 greet with first and last name ("Hi Margus Raudsepp,"). All 16
  ungated ones use the first name.
- *The cloud model's own discretion.* With no gate, Claude left the method's constants, the API key and the
  ID code out of the team summary in 6 of 6 notes in run 2. Behind the gate it sees only `METHOD_1`, cannot
  know it is sensitive, and the restored summary carries the constants in 6 of 6, the key in 2 and the ID
  code in 2. Run 1 shows the same for the constants. The gate keeps values from the provider and at the same
  time removes a check on what flows back to the reader.
- *A needed fact.* In EMAIL-07 the Gemma gate masked "three venues", the one fact a pricing answer needs
  (run 1 in rules + Gemma, run 2 in Gemma).
- *Not the gate:* the two gated code failures in run 2 (CODE-03 with Gemma, CODE-07 with rules + Gemma). In
  both the line with the bug was sent unmasked, and Claude's fix (`<=` for `<`, `Math.ceil` for
  `Math.round`) passed the visible tests and failed a hidden one. Claude with no gate made the same
  `Math.ceil` fix in run 1.

**Quality: a three-task gap in run 2, inside the noise.** The automatic half is at ceiling:
in run 2 the cloud setups pass 16, 16, 15 and 15 of 16, and the one-task gap is of the kind the last point
describes. The tasks almost never need the cloud model to read or compute on a masked value. The
hand-graded half has a measured noise floor. In run 1, 16 tasks sent Claude exactly the same text in the
Gemma and the rules + Gemma setups. Twelve of those were hand-graded, and 4 of the 12 got opposite grades
(pass under Gemma, fail under rules + Gemma each time). Nothing differed but Claude's resampling and me. So
a difference of three or four tasks between setups means nothing, in either direction, and the 26 against
23 of run 1 is exactly that.

In run 2, by hand, no gate passed 11 of 14 and rules + Gemma 9 of 14. Twelve tasks got the same grade in
both setups; two (EMAIL-03, NOTES-05) passed with no gate and failed behind the gate; none went the other
way. With the code task above that makes 27 against 24 of 30. I can trace one of the three to the gate.
In NOTES-05 the restored summary repeats the API key and the ID code, which the ungated summary left out on
purpose, and ends with a confused remark that calls the restored values "placeholders". That is the loss of
discretion described above, and I graded it a fail. For EMAIL-03 I see no cause in the text beyond the
full-name greeting. Run 1 went the other way (22 against 20 after rescoring), so the fair reading of both
runs is: no cost shown, none ruled out, and one concrete way the gate makes an answer worse.

The no-gate e-mails went from 2 of 8 in run 1 to 5 of 8 in run 2. Run 1's calls carried my instruction
file and I graded the two runs days apart, so I cannot separate the harness from my own drift.

**Gemma alone is weaker.** In run 1 it passed 16 of 30, with 1 of 6 notes. In run 2 its automatic results
are 13 of 16, and 2 of its 8 e-mails already fail the keyword pre-check. That gap is the reason to send
anything to a cloud model at all.

**Time and cost.** The gate is the slow part: a median of about 20 seconds, 45 to 51 on the SQL tasks,
against about 8 seconds for the answer itself. A gated answer takes more than three times as long as an
ungated one on this laptop. The answer call costs about the same with or without the gate ($0.007 to
$0.008), because the redacted text is about as long as the original. In run 1 a call cost about $0.022,
most of it the extra context. The re-identification probe is a separate call (about $0.012) and is not in
these figures.

## 6. Why this may matter under EU law

This is not legal advice. Under the GDPR, pseudonymisation is a named safeguard (Articles 4(5), 25 and 32)
and sending less data is a principle of its own (Article 5(1)(c)). A gate like this is at best such a
safeguard. It does not take the transfer out of the GDPR: I hold the map, so for me as the sender the data
stays personal data. In *EDPS v SRB* (C-413/23 P, 4 September 2025), decided under Regulation (EU)
2018/1725, which applies to EU institutions and defines personal data as the GDPR does, the Court of Justice
held, as I read it, that whether pseudonymised data is personal data for a recipient depends on whether
that recipient can reasonably re-identify people, while the sender's duties are judged from the sender's
side. The recipient here is the provider, an organisation with accounts and logs, not one model call. A
re-identification test is one input to that question. Mine cannot answer it, because invented names cannot
be linked to anyone and the only hits came from values that had leaked. Know-how is a separate matter:
trade-secret protection asks for reasonable steps to keep information secret (Directive (EU) 2016/943), and
a measured leak rate is evidence about such a step.

## 7. Limits

- **The gate and the data were written to match.** The gate prompt names the four categories the generator
  plants and describes know-how much as the generator builds it. Cue words sit next to the values ("Do not
  share", "not public", "ID code", "Test key"). The rules match formats I generated myself. Read the leak
  rate as the best case for this gate, not as what it would do on real text.
- **Four layouts, one seed.** The 9 or 11 leaks are one failure seen many times, and the 240 SQL canaries
  are one row shape. The headline rate is an average dominated by SQL: by kind it is 11 to 14 % for code
  and 0 % for the rest, and 8 of 30 tasks leak something. I give no interval.
- **Two runs are two samples, not two experiments.** Same tasks, same prompts, same author.
- **One grader, who built the study, and the grading was not blind in effect.** The label was hidden, but
  the greeting form marks every gated e-mail and the repeated constants mark every gated summary. In run 1
  my standard also drifted: all three fails on Claude's notes answers came in the first grading session.
  Two e-mail tasks failed in all five setups in run 1, and with no gate only 2 of 8 e-mails passed, so that
  rubric measures my support policy as much as the answers.
- **Changes during run 1.** While grading I saw that the e-mail tasks did not state how the product's
  support works, so every setup was guessing policy. I added a short fact block and a matching rubric line,
  ran the 8 e-mail tasks again in all setups, discarded the 8 e-mail grades given until then and kept the 6
  notes grades. The first e-mail runs are kept in `privacy/out/run1/runs-email-v1.jsonl`.
- **The tasks are too easy to show damage.** Gemma alone fixes 7 of 8 code bugs.
- **Exact matching is a lower bound.** It misses values that get through in pieces or one letter off. A
  check afterwards (`privacy/partial.js`) found no piece of any personal, client or secret value in the
  rules + Gemma setup in either run; the only pieces were method words inside function names that leaked.
- **The re-identification test is close to empty.** One prompt, one model, exact matches. Random names with
  no link to the world cannot be guessed, and the one decoding it shows is built into the generator
  (`first.last@venue.example`). The "0" for rules is no test either: the names were never hidden. Inference
  of personal attributes from context, which models can do (section 8), is not tested.
- **Sensitive things the canaries do not count.** The deal price in the notes ("not public"): rules sent it
  in 6 of 6, the Gemma gates masked it in 6 of 6. City names stay in 7 of 8 SQL tasks (run 2). The vendor's
  name is in every e-mail prompt. What the method does stays in all 6 notes. Free text can be personal data in
  itself.
- **Over-masking.** In run 2, 19 of the 397 spans masked by rules + Gemma are neither a canary nor part of
  one: 9 cities, 6 prices, 3 times the product's name, 1 amount of money.
- **Missing baselines.** I did not compare against an off-the-shelf personal-data recogniser plus a secret
  scanner, which run in milliseconds and would catch names. I did not try sending less: the SQL tasks need
  only the schema, and dropping the rows removes 240 canaries with no model and no wait.
- **Not tested:** hostile input to the gate; other gate sizes; other cloud models; real data.
- **The record.** My protocol was a private working note and is not in this repository; this write-up and
  the commit history are the public record. Run 1's probe replies and token counts do not exist.
- **How it was built.** I designed the study and reviewed the code and results. The code was written with
  Claude Code agents under my direction, and Claude is also the cloud model under test. The first fault in
  section 3 is what that can look like. The measurements are plain string searches, unit tests and row
  comparisons, so they can be checked without trusting any model.

## 8. Related work and next steps

The pattern is not new. Microsoft Presidio and LLM Guard swap detected values for placeholders in code and
put them back, Hide-and-Seek (Chen et al., 2023) trains a small model to do both, and secret scanners cover
keys. PAPILLON (Li et al., NAACL 2025) has a local model rewrite a chat request before a cloud model sees
it; its abstract reports high response quality for 85.5 % of user queries with privacy leakage held to
7.5 %, on its own data and measures, which are not comparable with mine. On guessing, Staab et al., "Beyond
Memorization" (ICLR 2024), show that models infer personal attributes from ordinary text, and their "Large
Language Models are Advanced Anonymizers" (ICLR 2025) uses that inference as the adversary that drives the
anonymising. My probe tests neither.

What this study adds is narrow: planted business know-how next to personal data in developer tasks, the
finding that a general local model masks constants but leaves the function identifiers, and a worked case of
one missed address decoding the masked values around it.

Next, in order: ten held-out texts written by someone else, with no cue words and with odd formats; the two
missing baselines; a code-aware step for identifiers and a first-name handle for greetings; a hostile
sentence aimed at the gate; a second grader and several seeds. Longer-term ideas (gates on devices,
verifiable gates, confidential hardware) are in `FUTURE.md`. None of them is tested.

## Reproduce

    node privacy/build.js                  # rebuild the 30 tasks (same seed, same tasks)
    node --test                            # self-tests of the harness
    RUN=run3 node privacy/run.js           # a new run into privacy/out/run3/
    RUN=run3 node privacy/grade.js C0,RG   # grade e-mails and notes by hand (no setups given: all)
    RUN=run3 node privacy/report.js        # privacy/out/run3/REPORT.md
    RUN=run3 node privacy/partial.js       # check for values leaked in pieces
    RUN=run1 node privacy/rescore.js       # today's automatic checks on a run's stored answers

Node 24, no dependencies. A run needs Ollama with `gemma4:12b` and the Claude Code CLI. `RUN` picks the
folder under `privacy/out/` and defaults to `run2`. `run.js` resumes: it skips every task and setup already
in that folder's `runs.jsonl`, so on a clone it does nothing for `run1` or `run2`; give a new name to run
again. The published results are in `privacy/out/run1/` and `privacy/out/run2/`, each with the task set it
was run on.
