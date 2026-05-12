# eval/ — Behavioral Evaluation Framework

Scenarios that verify Claude follows skill rules correctly.

```
eval/
├── scenarios/   # Test scenarios by category (skill-tutor, behavioral, consistency)
├── rubrics/     # Scoring rubrics for eval-judge agent
├── fixtures/    # Test data for scenario setup
├── results/     # Run outputs (gitignored)
├── work/        # Scratch space for eval runs (gitignored)
```

Run: `/eval run <scenario>` or `/eval run-all`
