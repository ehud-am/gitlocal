# WCAG 2.2 AA Accessibility Report

**Project**: GitLocal  
**Feature Context**: `002-release-quality-automation`  
**Report Date**: 2026-03-29  
**Assessment Scope**: Current local React UI and picker flows in this repository  
**Standard Target**: WCAG 2.2 Level AA

## Summary

GitLocal now includes automated accessibility checks in the UI test suite using `jest-axe`,
and those checks run in CI through `npm run verify`.

**Current Result**: No automated accessibility violations were detected in the covered component
test scenarios after remediation of the picker list semantics.

**Important Limitation**: This report is **not** a formal WCAG 2.2 AA certification or full
conformance claim. Automated checks catch only part of WCAG. Manual review is still required
for keyboard behavior, focus management, color contrast, zoom/reflow, screen reader usability,
and content meaning.

## Automated Assessment Coverage

The following UI areas are covered by automated accessibility assertions in the current test suite:

- Breadcrumb navigation
- Repository file tree
- Git branch and commit information panel
- Folder picker page
- Content panel empty-state rendering

These checks run as part of:

- `npm test`
- `npm run verify`
- GitHub Actions CI in [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

## Findings

### Resolved

- The folder picker previously exposed a custom list container with `role="list"` but without
  `listitem` children.
- This issue was detected by automated axe testing and fixed by giving picker rows `role="listitem"`.

### Current Automated Result

- No current automated violations detected in the covered scenarios.

## WCAG 2.2 AA Status by Evidence Type

| Area | Status | Evidence |
|------|--------|----------|
| Semantic structure in covered components | Pass (automated) | `jest-axe` checks in UI component tests |
| Basic form labeling in covered components | Pass (automated) | Accessible names present in tested controls |
| Basic ARIA misuse in covered components | Pass (automated) | Axe checks passing in CI |
| Keyboard-only workflow completeness | Needs manual review | Not fully provable by current automated assertions |
| Focus visibility and focus order | Needs manual review | Requires interactive browser testing |
| Color contrast | Needs manual review | Not currently enforced by automated checks here |
| Resize/reflow at 200%/400% | Needs manual review | Requires browser/device verification |
| Screen reader announcements and usability | Needs manual review | Requires NVDA/VoiceOver/JAWS testing |
| Error recovery and instruction clarity | Partial | Automated coverage exists for some states, but UX review is still needed |

## Test and CI Integration

Accessibility checks are enforced by the existing UI test suite rather than a separate standalone
scanner job. This means a newly introduced axe-detectable issue will fail the same CI gate used
for normal verification.

## Remaining Manual Review Checklist

Before making a stronger accessibility claim, run a manual review for:

- Keyboard navigation through the picker, repository viewer header, file tree, branch selector,
  breadcrumb, and content panel
- Focus return and focus placement when switching between repository view and picker mode
- Color contrast for text, badges, buttons, alerts, and selected states
- Zoom and responsive behavior at 200% and 400%
- Screen reader behavior for the picker, file tree, and repository metadata
- Error-state clarity for missing paths, non-git folders, and load failures

## Conclusion

GitLocal currently has **passing automated accessibility checks** for the covered UI components
and now enforces those checks in CI. That supports a stronger accessibility baseline, but it is
best described as:

**Automated WCAG-oriented validation in place, with manual WCAG 2.2 AA review still required
for full conformance confidence.**
