# gemma-claude-study

Can a local model (Gemma 4 12B via Ollama) keep personal data, secrets and know-how out of a cloud model
(Claude), and still get good fixes back? Measures leakage, quality and re-identification on a synthetic task
set with planted "canaries". Protocol (fixed before runs): GK_base wiki `career/STUDY_gemma-claude.md`.

Plain Node 24, no dependencies.

    node build-t1.js ~/Documents/Getti/gitClone/GettiApp   # T1 tasks from Getti modules + their tests
    node run.js C,G,H [T1]                                  # resumable; appends results/runs.jsonl
    node privacy/build.js [seed]                            # synthetic privacy task set → privacy/tasks.json
    node --test                                             # harness self-tests

`privacy/tasks.json` is fully synthetic (invented people, Estonian ID codes with valid checksums, venues,
API keys, "secret methods") and safe to publish. 30 tasks: 8 code bug-fixes (auto: tests), 8 SQL (auto:
same rows on SQLite), 8 support e-mails and 6 meeting notes (pre-check + blind grade).

`tasks/*.json` and `results/` hold private project code: git-ignored, never published without owner approval.
Still to build: the gates (rules, Gemma, rules+Gemma) with placeholder mapping, the re-identification probe,
`grade.js` (blind grading), `report.js`.

Possible next steps (IoT edge gates, EU-hosted business gates with Mistral Large 4): see `FUTURE.md`.
