# Results: local privacy gate before a cloud model

Generated 2026-11-16 from `privacy/out/runs.jsonl` and `grades.jsonl`. Task set seed 20261111: 30 synthetic tasks, 403 canaries.
All results graded.

## Headline

| Setup | Leaked | Tasks with any leak | Re-identified | Quality pass | Quality vs no gate | Claude cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| no gate | 403/403 (100.0 %) | 30/30 | 0 in 0 tasks | 23/30 | 100.0 % (n=30) | $0.67 |
| rules | 205/403 (50.9 %) | 30/30 | 0 in 0 tasks | 24/30 | 104.3 % (n=30) | $1.34 |
| Gemma | 12/403 (3.0 %) | 11/30 | 3 in 2 tasks | 26/30 | 113.0 % (n=30) | $1.34 |
| rules + Gemma | 9/403 (2.2 %) | 8/30 | 0 in 0 tasks | 23/30 | 100.0 % (n=30) | $0.80 |
| Gemma alone (nothing sent) | 0/403 (0.0 %) | 0/30 | 0 in 0 tasks | 16/30 | 69.6 % (n=30) | $0.00 |

Claude cost for the gated setups includes the separate re-identification probe (a second call per task).
Quality vs no gate is computed only on tasks graded in both setups.

## Leakage by type

| Setup | personal | client | secret | knowhow |
| --- | ---: | ---: | ---: | ---: |
| no gate | 254/254 | 85/85 | 14/14 | 50/50 |
| rules | 70/254 | 85/85 | 0/14 | 50/50 |
| Gemma | 3/254 | 0/85 | 0/14 | 9/50 |
| rules + Gemma | 0/254 | 0/85 | 0/14 | 9/50 |
| Gemma alone (nothing sent) | 0/254 | 0/85 | 0/14 | 0/50 |

## By task kind (leaked · quality pass)

| Setup | code | sql | notes | email |
| --- | --- | --- | --- | --- |
| no gate | 100.0 % · 8/8 | 100.0 % · 7/8 | 100.0 % · 6/6 | 100.0 % · 2/8 |
| rules | 70.0 % · 8/8 | 40.0 % · 7/8 | 66.7 % · 4/6 | 58.6 % · 5/8 |
| Gemma | 11.3 % · 8/8 | 0.8 % · 7/8 | 0.0 % · 6/6 | 3.4 % · 5/8 |
| rules + Gemma | 11.3 % · 8/8 | 0.0 % · 7/8 | 0.0 % · 5/6 | 0.0 % · 3/8 |
| Gemma alone (nothing sent) | 0.0 % · 7/8 | 0.0 % · 5/8 | 0.0 % · 1/6 | 0.0 % · 3/8 |

## Failure types (quality)

- **no gate:** rows differ (2 vs 2): 1, missed requirement: 3, wrong: 1, format: 1, style: 1
- **rules:** rows differ (2 vs 2): 1, missed requirement: 3, wrong: 1, style: 1
- **Gemma:** rows differ (2 vs 2): 1, missed requirement: 2, invented fact: 1
- **rules + Gemma:** rows differ (2 vs 2): 1, wrong: 1, missed requirement: 4, format: 1
- **Gemma alone (nothing sent):** 1 test(s) fail: 1, rows differ (2 vs 2): 1, rows differ (5 vs 2): 1, rows differ (6 vs 2): 1, missed requirement: 8, invented fact: 1, key point missing: 1

## What still leaked through the gates

- **Gemma:** knowhow: kaldaCorrection (×3); knowhow: liivaCorrection (×2); personal: ilmar.poldsaar@pubi-vaikne-laternas.example (×1); knowhow: Virve foam compensation (×1); knowhow: reheCorrection (×1); knowhow: Saula bottle-neck curve (×1); knowhow: saulaCorrection (×1); personal: veiko.undrits@baar-vana-torvik.example (×1); personal: Janno Raudsepp (×1)
- **rules + Gemma:** knowhow: kaldaCorrection (×3); knowhow: liivaCorrection (×2); knowhow: Virve foam compensation (×1); knowhow: Rehe foam compensation (×1); knowhow: reheCorrection (×1); knowhow: Saula bottle-neck curve (×1)

## Time

- no gate: median 9.2 s per task
- rules: median 17.8 s per task
- Gemma: median 18.8 s per task
- rules + Gemma: median 18.5 s per task
- Gemma alone (nothing sent): median 12.5 s per task
