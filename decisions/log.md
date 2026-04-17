# Decision Log

Append-only. When a meaningful decision is made, log it here.

Format: [YYYY-MM-DD] DECISION: ... | REASONING: ... | CONTEXT: ...

---

[2026-04-17] DECISION: Lock v3 as active Gemini prompt for M3 color-role analysis in video-templates. | REASONING: v3 produced 4/4 run consistency on template-126 (8/8/8/8 slot count, 12/12 text slots → on-primary, 0 orphan on-X violations, pink/purple/red all stable). v2's two regressions (text role copied text color, price labeled on-surface without a surface slot) are closed by v3's "text role = role of slot beneath" rule and "on-X requires X" self-check. | CONTEXT: Phase A of palette systematization goal. Artifacts in video-templates repo at reports/color-roles/template-analysis-prompt-v{1,2,3}.md and reports/2026-04-17-template-126-consistency.html. Next: scale to 5 templates and run the scorer.
