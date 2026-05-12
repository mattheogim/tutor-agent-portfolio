# Error Notes — test_cs101 / TestProf

---

### pass_by_reference — ★★

**When**: 2026-03-28, Practice Q Set 1, Q3
**What**: Confused pass-by-value with pass-by-reference. Predicted original variable unchanged after reference call.
**Context**: Given `void swap(int& a, int& b)`, predicted a and b unchanged in main.
**Thought process**: "함수 안에서 바꿔도 원래 변수는 안 바뀌는 거 아닌가요?"
**Connection Tags**: [pass_by_value] [function_parameters]

---

### type_truncation — ★

**When**: 2026-03-28, Practice Q Set 1, Q5
**What**: Thought double-to-int conversion rounds instead of truncates.
**Context**: `int x = static_cast<int>(3.7);` → answered 4, correct is 3.
**Thought process**: "반올림 아닌가요?"
**Connection Tags**: [type_conversion] [static_cast]

---

### loop_off_by_one — ★

**When**: 2026-03-29, Practice Q Set 2, Q2
**What**: Off-by-one error in for loop. Predicted 10 iterations for `for(int i=0; i<=10; i++)`.
**Context**: Counted 10 iterations, actual is 11 (0 through 10 inclusive).
**Thought process**: "0부터 10이면 10번 아닌가요?"
**Connection Tags**: [for_loop] [control_flow]

---

### equals_vs_assign — ★★
**STATUS**: RESOLVED — moved to temp/resolved_2026-03-30.md

**When**: 2026-03-27, Practice Q Set 1, Q1
**What**: Used = instead of == in if condition.
**Context**: Wrote `if (x = 5)` instead of `if (x == 5)`.
**Thought process**: "같은 거 아닌가요?"
**Connection Tags**: [operators] [control_flow]
