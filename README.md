# gemma-claude-study

Can a local model (Gemma 4 12B via Ollama) keep personal data, secrets and know-how out of a cloud model
(Claude), and still get good answers back? This repository measures leakage, quality and re-identification
on a synthetic task set with planted "canaries".

**Result in one line:** rules plus the local model cut leaked values from 100 % to 2.2 % (9 of 403) with no
loss in task quality; what still leaked was know-how written as code identifiers.

- Write-up: [`WRITEUP.md`](WRITEUP.md)
- Full report: [`privacy/out/REPORT.md`](privacy/out/REPORT.md)
- Ideas not tested yet: [`FUTURE.md`](FUTURE.md)

Plain Node 24, no dependencies.

    node privacy/build.js [seed]     # synthetic task set → privacy/tasks.json
    node --test                      # harness self-tests
    node privacy/run.js              # all setups; needs Ollama with gemma4:12b and the Claude Code CLI
    node privacy/grade.js            # blind grading of e-mails and notes
    node privacy/report.js           # privacy/out/REPORT.md and summary.json
    node privacy/partial.js          # check for values leaked in pieces

## What is here
- `privacy/`: the study. Task generator (`build.js`, `kinds/`, `identities.js`), gates (`gates.js`),
  placeholder swap and restore (`placeholders.js`), runner (`run.js`), grading (`grade.js`), report
  (`report.js`), tests (`*.test.js`).
- `privacy/tasks.json`: the 30 tasks. Fully synthetic: invented people, Estonian ID codes with valid
  checksums, venues, API keys and "secret methods". Safe to publish.
- `privacy/out/`: every result. `runs.jsonl` (what was sent and answered, per task and setup),
  `grades.jsonl` (blind grades), `REPORT.md`, run logs, and the first e-mail runs replaced after a task fix
  (`runs-email-v1.jsonl`; see the write-up, section 6).
- `lib/`: model callers (Ollama, Claude Code CLI) and checks.
- `build-t1.js`, `run.js`: an earlier pilot on cost (local draft, cloud review) using private project code.
  Its tasks and results (`tasks/*.json`, `results/`) are git-ignored and not published.
