# Results: local privacy gate before a cloud model

Generated 2026-11-18 from `privacy/out/run2/runs.jsonl` and `grades.jsonl`. Task set seed 20261111: 30 synthetic tasks, 403 canaries.
**40 results have no human grade; quality numbers cover graded results only.**

## Headline

| Setup | Leaked | Tasks with any leak | Re-identified | Quality pass | Quality vs no gate | Claude cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| no gate | 403/403 (100.0 %) | 30/30 | 0 in 0 tasks | 27/30 | 100.0 % (n=30) | $0.23 |
| rules | 205/403 (50.9 %) | 30/30 | 0 in 0 tasks | 16/16 (+14 pending) | 100.0 % (n=16) | $0.23 |
| Gemma | 12/403 (3.0 %) | 10/30 | 3 in 2 tasks | 15/16 (+14 pending) | 93.8 % (n=16) | $0.22 |
| rules + Gemma | 11/403 (2.7 %) | 8/30 | 0 in 0 tasks | 24/30 | 88.9 % (n=30) | $0.22 |
| Gemma alone (nothing sent) | 0/403 (0.0 %) | 0/30 | 0 in 0 tasks | 13/18 (+12 pending) | 76.5 % (n=18) | $0.00 |

Claude cost is for the answer call only; the re-identification probe (a second call per gated task) is not included.
Quality vs no gate is computed only on tasks graded in both setups.

## Leakage by type

| Setup | personal | client | secret | knowhow |
| --- | ---: | ---: | ---: | ---: |
| no gate | 254/254 | 85/85 | 14/14 | 50/50 |
| rules | 70/254 | 85/85 | 0/14 | 50/50 |
| Gemma | 2/254 | 0/85 | 0/14 | 10/50 |
| rules + Gemma | 0/254 | 0/85 | 0/14 | 11/50 |
| Gemma alone (nothing sent) | 0/254 | 0/85 | 0/14 | 0/50 |

## By task kind (leaked · quality pass)

| Setup | code | sql | email | notes |
| --- | --- | --- | --- | --- |
| no gate | 100.0 % · 8/8 | 100.0 % · 8/8 | 100.0 % · 5/8 | 100.0 % · 6/6 |
| rules | 70.0 % · 8/8 | 40.0 % · 8/8 | 58.6 % · 0/0 (+8) | 66.7 % · 0/0 (+6) |
| Gemma | 12.5 % · 7/8 | 0.8 % · 8/8 | 0.0 % · 0/0 (+8) | 0.0 % · 0/0 (+6) |
| rules + Gemma | 13.8 % · 7/8 | 0.0 % · 8/8 | 0.0 % · 4/8 | 0.0 % · 5/6 |
| Gemma alone (nothing sent) | 0.0 % · 7/8 | 0.0 % · 6/8 | 0.0 % · 0/2 (+6) | 0.0 % · 0/0 (+6) |

## Failure types (quality)

- **no gate:** missed requirement: 1, wrong: 2
- **rules:** none
- **Gemma:** 1 test(s) fail: 1
- **rules + Gemma:** 1 test(s) fail: 1, wrong: 1, missed requirement: 4
- **Gemma alone (nothing sent):** 1 test(s) fail: 1, rows differ (5 vs 2): 1, rows differ (6 vs 2): 1, key point missing: 2

## What still leaked through the gates

- **Gemma:** knowhow: kaldaCorrection (×3); knowhow: liivaCorrection (×2); knowhow: Virve foam compensation (×1); knowhow: virveCorrection (×1); knowhow: reheCorrection (×1); knowhow: Saula bottle-neck curve (×1); knowhow: saulaCorrection (×1); personal: ilmar.poldsaar@pubi-vaikne-laternas.example (×1); personal: veiko.undrits@baar-vana-torvik.example (×1)
- **rules + Gemma:** knowhow: liivaCorrection (×2); knowhow: kaldaCorrection (×2); knowhow: Kalda foam compensation (×1); knowhow: Virve foam compensation (×1); knowhow: virveCorrection (×1); knowhow: Rehe foam compensation (×1); knowhow: reheCorrection (×1); knowhow: Saula bottle-neck curve (×1); knowhow: saulaCorrection (×1)

## Time

- no gate: median 7.9 s per task (gate 0.0 s of that; the probe call is not included)
- rules: median 7.1 s per task (gate 0.0 s of that; the probe call is not included)
- Gemma: median 28.4 s per task (gate 20.7 s of that; the probe call is not included)
- rules + Gemma: median 26.1 s per task (gate 18.2 s of that; the probe call is not included)
- Gemma alone (nothing sent): median 14.4 s per task (gate 0.0 s of that; the probe call is not included)
