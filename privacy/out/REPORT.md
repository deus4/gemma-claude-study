# Results: local privacy gate before a cloud model

Generated 2026-11-12 from `privacy/out/runs.jsonl` and `grades.jsonl`. Task set seed 20261111: 30 synthetic tasks, 403 canaries.
**68 results still wait for a blind grade; quality numbers are partial.**

## Headline

| Setup | Leaked | Tasks with any leak | Re-identified | Quality pass | Quality vs no gate | Claude cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| no gate | 403/403 (100.0 %) | 30/30 | 0 in 0 tasks | 15/16 (+14 pending) | 100.0 % (n=16) | $0.66 |
| rules | 205/403 (50.9 %) | 30/30 | 0 in 0 tasks | 15/16 (+14 pending) | 100.0 % (n=16) | $1.34 |
| Gemma | 11/403 (2.7 %) | 10/30 | 3 in 2 tasks | 15/16 (+14 pending) | 100.0 % (n=16) | $1.33 |
| rules + Gemma | 9/403 (2.2 %) | 8/30 | 0 in 0 tasks | 15/16 (+14 pending) | 100.0 % (n=16) | $0.80 |
| Gemma alone (nothing sent) | 0/403 (0.0 %) | 0/30 | 0 in 0 tasks | 12/18 (+12 pending) | 80.0 % (n=16) | $0.00 |

Claude cost for the gated setups includes the separate re-identification probe (a second call per task).
Quality vs no gate is computed only on tasks graded in both setups.

## Leakage by type

| Setup | personal | client | secret | knowhow |
| --- | ---: | ---: | ---: | ---: |
| no gate | 254/254 | 85/85 | 14/14 | 50/50 |
| rules | 70/254 | 85/85 | 0/14 | 50/50 |
| Gemma | 2/254 | 0/85 | 0/14 | 9/50 |
| rules + Gemma | 0/254 | 0/85 | 0/14 | 9/50 |
| Gemma alone (nothing sent) | 0/254 | 0/85 | 0/14 | 0/50 |

## By task kind (leaked · quality pass)

| Setup | code | sql | email | notes |
| --- | --- | --- | --- | --- |
| no gate | 100.0 % · 8/8 | 100.0 % · 7/8 | 100.0 % · 0/0 (+8) | 100.0 % · 0/0 (+6) |
| rules | 70.0 % · 8/8 | 40.0 % · 7/8 | 58.6 % · 0/0 (+8) | 66.7 % · 0/0 (+6) |
| Gemma | 11.3 % · 8/8 | 0.8 % · 7/8 | 0.0 % · 0/0 (+8) | 0.0 % · 0/0 (+6) |
| rules + Gemma | 11.3 % · 8/8 | 0.0 % · 7/8 | 0.0 % · 0/0 (+8) | 0.0 % · 0/0 (+6) |
| Gemma alone (nothing sent) | 0.0 % · 7/8 | 0.0 % · 5/8 | 0.0 % · 0/2 (+6) | 0.0 % · 0/0 (+6) |

## Failure types (quality)

- **no gate:** rows differ (2 vs 2): 1
- **rules:** rows differ (2 vs 2): 1
- **Gemma:** rows differ (2 vs 2): 1
- **rules + Gemma:** rows differ (2 vs 2): 1
- **Gemma alone (nothing sent):** 1 test(s) fail: 1, rows differ (2 vs 2): 1, rows differ (5 vs 2): 1, rows differ (6 vs 2): 1, key point missing: 2

## What still leaked through the gates

- **Gemma:** knowhow: kaldaCorrection (×3); knowhow: liivaCorrection (×2); personal: ilmar.poldsaar@pubi-vaikne-laternas.example (×1); knowhow: Virve foam compensation (×1); knowhow: reheCorrection (×1); knowhow: Saula bottle-neck curve (×1); knowhow: saulaCorrection (×1); personal: veiko.undrits@baar-vana-torvik.example (×1)
- **rules + Gemma:** knowhow: kaldaCorrection (×3); knowhow: liivaCorrection (×2); knowhow: Virve foam compensation (×1); knowhow: Rehe foam compensation (×1); knowhow: reheCorrection (×1); knowhow: Saula bottle-neck curve (×1)

## Time

- no gate: median 9.9 s per task
- rules: median 18.4 s per task
- Gemma: median 18.9 s per task
- rules + Gemma: median 18.6 s per task
- Gemma alone (nothing sent): median 12.5 s per task
