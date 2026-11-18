# gemma-claude-study

Can a local model (Gemma 4 12B via Ollama) keep personal data, secrets and know-how out of a cloud model
(Claude), and still get good answers back? This repository measures leakage, quality and re-identification
on a synthetic task set with planted "canaries".

**Result in short:** in two runs, rules plus the local model cut the planted values that reached the cloud
model from all 403 to 9 (2.2 %) and 11 (2.7 %). What still leaked was know-how written as code identifiers.
Task quality was within grading noise in both runs (run 2: 24 of 30 tasks passed behind the gate, 27
without), so neither a cost nor the absence of one is shown. Run 1 had harness faults that an independent
review found; run 2 repeats it with the faults fixed. The write-up covers both.

- Write-up: [`WRITEUP.md`](WRITEUP.md)
- Full reports: [`privacy/out/run1/REPORT.md`](privacy/out/run1/REPORT.md),
  [`privacy/out/run2/REPORT.md`](privacy/out/run2/REPORT.md)
- Ideas not tested yet: [`FUTURE.md`](FUTURE.md)

Plain Node 24, no dependencies.

    node privacy/build.js [seed]           # synthetic task set → privacy/tasks.json
    node --test                            # harness self-tests
    RUN=run3 node privacy/run.js           # all setups into privacy/out/run3/; needs Ollama with gemma4:12b
                                           # and the Claude Code CLI
    RUN=run3 node privacy/grade.js         # grading of e-mails and notes by hand, setup label hidden
    RUN=run3 node privacy/report.js        # privacy/out/run3/REPORT.md and summary.json
    RUN=run3 node privacy/partial.js       # check for values leaked in pieces
    RUN=run1 node privacy/rescore.js       # today's automatic checks on a run's stored answers

`RUN` picks the folder under `privacy/out/` and defaults to `run2`. `run.js` resumes and skips what a folder
already holds, so use a new name to run again.

## What is here
- `privacy/`: the study. Task generator (`build.js`, `kinds/`, `identities.js`), gates (`gates.js`),
  placeholder swap and restore (`placeholders.js`), runner (`run.js`), grading (`grade.js`), report
  (`report.js`), tests (`*.test.js`).
- `privacy/tasks.json`: the 30 tasks (as used in run 2). Fully synthetic: invented people, Estonian ID codes
  with valid
  checksums, venues, API keys and "secret methods". Safe to publish.
- `privacy/out/run1/`, `privacy/out/run2/`: every result, one folder per run. `runs.jsonl` (what was sent
  and answered, per task and setup), `grades.jsonl` (grades given by hand), `REPORT.md`, run logs and the
  task set of that run. Run 1 also keeps the first e-mail runs, replaced after a task fix
  (`runs-email-v1.jsonl`; see the write-up, section 7).
- `lib/`: model callers (Ollama, Claude Code CLI) and checks.
- `build-t1.js`, `run.js`: an earlier pilot on cost (local draft, cloud review) using private project code.
  Its tasks and results (`tasks/*.json`, `results/`) are git-ignored and not published.
