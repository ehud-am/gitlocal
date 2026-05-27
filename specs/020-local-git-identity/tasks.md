# Tasks: Local Git Identity

**Input**: Design documents from `specs/020-local-git-identity/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/git-identity-api.md, quickstart.md

**Tests**: Included because the project constitution requires 90% per-file coverage and the implementation plan explicitly calls for unit, handler, integration, and UI coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or depends only on completed earlier phases
- **[Story]**: User story label for traceability
- Every task includes exact repository-relative file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the active feature context and remove stale identity-protection assumptions from the implementation scope.

- [x] T001 Review existing identity implementation and stale `.env` protection references in `src/git/repo.ts`, `src/git/identity-settings.ts`, `src/handlers/repo.ts`, `src/server.ts`, `src/types.ts`, `ui/src/App.tsx`, `ui/src/components/AppDialogs.tsx`, `ui/src/services/api.ts`, and `ui/src/types/index.ts`
- [x] T002 [P] Review existing backend identity tests in `tests/unit/git/repo.test.ts`, `tests/unit/handlers/repo.test.ts`, and `tests/integration/server.test.ts`
- [x] T003 [P] Review existing UI identity tests in `ui/src/App.test.tsx`, `ui/src/App.logic.test.tsx`, `ui/src/App.branch-coverage.test.tsx`, and `ui/src/components/AppDialogs.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared contract and remove app-owned identity persistence paths before story work.

**CRITICAL**: No user story work should begin until this phase is complete.

- [x] T004 Update shared identity types to remove private settings protection from identity responses and use repository-local identity source semantics in `src/types.ts`
- [x] T005 Update UI identity types to match the repository-local identity contract in `ui/src/types/index.ts`
- [x] T006 Remove identity protection client calls from the API client while keeping identity and SSH-key calls in `ui/src/services/api.ts`
- [x] T007 Remove identity protection route registration for `GET /api/git/identity/protection` and `POST /api/git/identity/protection` from `src/server.ts`
- [x] T008 Refactor `src/git/identity-settings.ts` so it keeps SSH path expansion, key listing, and private key validation while removing `.env` identity read/write and `.gitignore` protection responsibilities
- [x] T009 Update repository identity imports and helper usage in `src/git/repo.ts` after removing app-owned identity settings helpers from `src/git/identity-settings.ts`
- [x] T010 [P] Update compile-time API mocks and default test fixtures for removed identity protection fields in `ui/src/App.test.tsx`, `ui/src/App.logic.test.tsx`, and `ui/src/App.branch-coverage.test.tsx`

**Checkpoint**: Shared contracts no longer expose `.env` identity persistence or identity protection endpoints.

---

## Phase 3: User Story 1 - View Repository Git Identity (Priority: P1) MVP

**Goal**: GitLocal displays the repository-local Git name, email, and SSH key path, and shows an unset state when no local identity exists.

**Independent Test**: Configure local Git identity values outside GitLocal, open or refresh GitLocal, and confirm the identity section shows only repository-local values without falling back to app-private or global identity.

### Tests for User Story 1

- [x] T011 [P] [US1] Add backend unit tests for reading local-only name/email, local SSH key path, unset local identity, partial local identity, and ignoring global fallback in `tests/unit/git/repo.test.ts`
- [x] T012 [P] [US1] Add handler tests for `GET /api/repo` returning local identity source and unset identity shape in `tests/unit/handlers/repo.test.ts`
- [x] T013 [P] [US1] Add UI tests for opening the identity dialog with local values and with no local values in `ui/src/App.test.tsx`

### Implementation for User Story 1

- [x] T014 [US1] Change `getGitUserIdentity` in `src/git/repo.ts` to read only repository-local `user.name`, `user.email`, and `core.sshCommand` for the editable identity surface
- [x] T015 [US1] Update SSH command parsing in `src/git/repo.ts` to preserve support for quoted paths, spaces, home-relative paths, and commands with additional options
- [x] T016 [US1] Update `getGitContext` response behavior in `src/git/repo.ts` so missing local identity returns `user: null` instead of a global or private-settings fallback
- [x] T017 [US1] Update repository handler response expectations in `src/handlers/repo.ts` so identity errors and empty states match the local identity contract
- [x] T018 [US1] Update identity dialog initialization and empty-state copy in `ui/src/App.tsx` and `ui/src/components/AppDialogs.tsx` to show repository-local unset state clearly
- [x] T019 [US1] Remove obsolete private-settings source labels and fallback assumptions from repository identity display in `ui/src/components/RepoContext/RepoContextHeader.tsx`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Save Repository Git Identity (Priority: P1)

**Goal**: GitLocal saves and clears repository-local Git identity values using normal Git behavior, and regular Git commands observe the saved values.

**Independent Test**: Save name, email, and SSH key path in GitLocal, verify `git config --local` shows the values, clear them in GitLocal, and verify local overrides are removed without changing another repository.

### Tests for User Story 2

- [x] T020 [P] [US2] Add backend unit tests for saving local name/email, saving local SSH key path, preserving unrelated Git config, clearing overrides, and rejecting incomplete identity payloads in `tests/unit/git/repo.test.ts`
- [x] T021 [P] [US2] Add handler tests for `PUT /api/git/identity` success, clear, validation failure, and write failure responses in `tests/unit/handlers/repo.test.ts`
- [x] T022 [P] [US2] Add integration tests proving saved identity is visible through `git config --local` and isolated per repository in `tests/integration/server.test.ts`
- [x] T023 [P] [US2] Add UI tests for saving identity, clearing identity, and showing repository-local success/error messages in `ui/src/App.test.tsx`

### Implementation for User Story 2

- [x] T024 [US2] Refactor `setRepoGitIdentity` in `src/git/repo.ts` to write only repository-local Git config values and never write `.env`
- [x] T025 [US2] Implement clearing behavior in `setRepoGitIdentity` in `src/git/repo.ts` so empty name/email/SSH key values remove repository-local overrides without touching global config
- [x] T026 [US2] Ensure `setRepoGitIdentity` in `src/git/repo.ts` validates optional SSH private key paths before writing `core.sshCommand`
- [x] T027 [US2] Update identity save handler in `src/handlers/repo.ts` to return the local identity response shape without `protection`
- [x] T028 [US2] Update UI save flow in `ui/src/App.tsx` to stop fetching or applying identity protection and to handle clear responses with `user: null`
- [x] T029 [US2] Update identity dialog controls in `ui/src/components/AppDialogs.tsx` to support clearing repository-local identity and remove `.env`/`.gitignore` warning actions
- [x] T030 [US2] Update success and error copy in `src/git/repo.ts`, `src/handlers/repo.ts`, `ui/src/App.tsx`, and `ui/src/components/AppDialogs.tsx` to say repository-local identity instead of project private settings

**Checkpoint**: User Stories 1 and 2 form the MVP and are independently functional.

---

## Phase 5: User Story 3 - Use One Identity Experience Across Distributions (Priority: P2)

**Goal**: Browser mode and native macOS app mode share the same identity behavior through the local service.

**Independent Test**: Save identity through one distribution, open the same repository through the other distribution, and confirm the same repository-local values appear.

### Tests for User Story 3

- [x] T031 [P] [US3] Add integration coverage that performs identity read after direct `git config --local` writes to simulate another distribution or Git client in `tests/integration/server.test.ts`
- [x] T032 [P] [US3] Add regression tests ensuring identity update failures mention repository-local Git identity and not private settings in `tests/unit/handlers/repo.test.ts`

### Implementation for User Story 3

- [x] T033 [US3] Audit native wrapper integration points and confirm no native-specific identity persistence path exists in `native/macos/` documentation or code
- [x] T034 [US3] Remove stale browser/native mode assumptions about private identity storage from `ui/src/components/Picker/PickerPage.tsx` if present
- [x] T035 [US3] Document the shared-service identity behavior in `specs/020-local-git-identity/quickstart.md`

**Checkpoint**: Cross-distribution identity behavior is documented and covered by shared service tests.

---

## Phase 6: User Story 4 - Keep SSH Key Selection Safe (Priority: P3)

**Goal**: SSH key browsing and validation remain safe while the saved key path becomes repository-local Git configuration.

**Independent Test**: Attempt to save valid private keys, public keys, missing files, directories, unreadable files, and passphrase-protected keys; only valid private key paths are accepted and key contents never appear in responses.

### Tests for User Story 4

- [x] T036 [P] [US4] Add SSH validation tests for valid private keys, public keys, missing paths, directories, unreadable files, and passphrase-protected key headers in `tests/unit/git/repo.test.ts`
- [x] T037 [P] [US4] Add SSH key list and validation handler tests for response shape and no private key content leakage in `tests/unit/handlers/repo.test.ts`
- [x] T038 [P] [US4] Add UI tests for SSH key selection/manual path validation without private key content display in `ui/src/components/AppDialogs.test.tsx`

### Implementation for User Story 4

- [x] T039 [US4] Keep and tighten SSH path expansion, conventional key listing, and private key validation in `src/git/identity-settings.ts`
- [x] T040 [US4] Ensure SSH key validation handler in `src/handlers/repo.ts` returns only path, validity, and message fields
- [x] T041 [US4] Ensure SSH key list handler in `src/handlers/repo.ts` returns only candidate names and paths, never file contents
- [x] T042 [US4] Update SSH key UI in `ui/src/components/AppDialogs.tsx` so validation errors remain actionable and no key contents are rendered

**Checkpoint**: SSH selection remains safe and works with repository-local identity saves.

---

## Phase 7: User Story 5 - Understand Distribution Documentation (Priority: P3)

**Goal**: GitHub and npm documentation are tailored to their channels, with a clear unsigned-alpha warning for the macOS native app and a concise npm-focused README.

**Independent Test**: Review the GitHub README and npm README and confirm that GitHub shows the icon plus native app warning/approval command, while npm stays short and links to GitHub for native macOS and source-build workflows.

### Tests for User Story 5

- [x] T043 [P] [US5] Add or update package-content tests for the npm-specific README artifact and publish inclusion behavior in `tests/integration/npm-package-contents.test.ts`
- [x] T044 [P] [US5] Add documentation preview or static assertions for the GitLocal icon reference and macOS unsigned-alpha warning in `README.md`

### Implementation for User Story 5

- [x] T045 [US5] Add the GitLocal icon near the top of the GitHub README using the existing asset at `ui/public/gitlocal-logo.svg` in `README.md`
- [x] T046 [US5] Update the GitHub macOS native app section to state the app is alpha, unsigned, and will show Apple warning messages in `README.md`
- [x] T047 [US5] Add first-run unsigned app approval guidance with `xattr -dr com.apple.quarantine /Applications/GitLocal.app` in `README.md`
- [x] T048 [US5] Create a concise npm-focused README that covers `npm install -g gitlocal`, `npx gitlocal`, basic usage, and links to GitHub for native macOS/source-build docs in `packaging/npm/README.md`
- [x] T049 [US5] Update package or release packaging so npm receives the concise npm README while GitHub continues to display the repository README in `package.json` or the relevant packaging script
- [x] T050 [US5] Update related macOS packaging documentation to match the unsigned-alpha warning if needed in `packaging/macos/README.md`

**Checkpoint**: Distribution documentation is clear, channel-specific, and ready for users.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Remove stale implementation artifacts, verify coverage, and validate the full workflow.

- [x] T051 Remove obsolete identity protection tests and fixtures from `tests/unit/git/repo.test.ts`, `tests/unit/handlers/repo.test.ts`, `tests/integration/server.test.ts`, `ui/src/App.test.tsx`, `ui/src/App.logic.test.tsx`, `ui/src/App.branch-coverage.test.tsx`, and `ui/src/components/AppDialogs.test.tsx`
- [x] T052 [P] Update contract documentation if implementation response fields differ from `specs/020-local-git-identity/contracts/git-identity-api.md`
- [x] T053 [P] Update quickstart validation notes in `specs/020-local-git-identity/quickstart.md` after implementation details settle
- [x] T054 Run `npm test` from `package.json` and fix any regressions or coverage drops below 90% per file
- [x] T055 Run `npm run lint` from `package.json` and fix TypeScript errors
- [x] T056 Run `npm run build` from `package.json` and fix build regressions
- [x] T057 Manually validate the quickstart flow in `specs/020-local-git-identity/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
- **US5 Documentation (Phase 7)**: Can start after Setup; package workflow task depends on knowing current package contents.
- **Polish (Phase 8)**: Depends on all desired user stories.

### User Story Dependencies

- **US1 View Repository Git Identity**: Starts after Foundational. Required for MVP.
- **US2 Save Repository Git Identity**: Starts after Foundational and can proceed alongside US1 at file-conflict boundaries, but full UX validation benefits from US1 display behavior. Required for MVP.
- **US3 Use One Identity Experience Across Distributions**: Starts after US1 and US2 service behavior is stable.
- **US4 Keep SSH Key Selection Safe**: Starts after Foundational and can proceed in parallel with US1/US2 because SSH validation is shared but independently testable.
- **US5 Understand Distribution Documentation**: Can start after Setup and is independent of identity code changes except final packaging verification.

### Within Each User Story

- Write or update tests before implementation.
- Backend repository logic before handlers.
- Shared types before UI service calls.
- UI state before dialog rendering assertions.
- Complete the story checkpoint before moving to lower-priority stories unless working in parallel on non-conflicting files.

---

## Parallel Opportunities

- T002 and T003 can run in parallel after T001.
- T004, T005, T006, and T007 can be prepared in parallel, then reconciled before T008-T010.
- US1 test tasks T011-T013 can run in parallel.
- US2 test tasks T020-T023 can run in parallel.
- US3 test tasks T031-T032 can run in parallel.
- US4 test tasks T036-T038 can run in parallel.
- US5 documentation tests T043-T044 can run in parallel.
- Documentation tasks T052-T053 can run in parallel with final verification after implementation stabilizes.

## Parallel Example: User Story 1

```text
Task: "Add backend unit tests for reading local-only name/email, local SSH key path, unset local identity, partial local identity, and ignoring global fallback in tests/unit/git/repo.test.ts"
Task: "Add handler tests for GET /api/repo returning local identity source and unset identity shape in tests/unit/handlers/repo.test.ts"
Task: "Add UI tests for opening the identity dialog with local values and with no local values in ui/src/App.test.tsx"
```

## Parallel Example: User Story 2

```text
Task: "Add backend unit tests for saving local name/email, saving local SSH key path, preserving unrelated Git config, clearing overrides, and rejecting incomplete identity payloads in tests/unit/git/repo.test.ts"
Task: "Add handler tests for PUT /api/git/identity success, clear, validation failure, and write failure responses in tests/unit/handlers/repo.test.ts"
Task: "Add integration tests proving saved identity is visible through git config --local and isolated per repository in tests/integration/server.test.ts"
Task: "Add UI tests for saving identity, clearing identity, and showing repository-local success/error messages in ui/src/App.test.tsx"
```

## Parallel Example: User Story 4

```text
Task: "Add SSH validation tests for valid private keys, public keys, missing paths, directories, unreadable files, and passphrase-protected key headers in tests/unit/git/repo.test.ts"
Task: "Add SSH key list and validation handler tests for response shape and no private key content leakage in tests/unit/handlers/repo.test.ts"
Task: "Add UI tests for SSH key selection/manual path validation without private key content display in ui/src/components/AppDialogs.test.tsx"
```

## Parallel Example: User Story 5

```text
Task: "Add or update package-content tests for the npm-specific README artifact and publish inclusion behavior in tests/integration/npm-package-contents.test.ts"
Task: "Add documentation preview or static assertions for the GitLocal icon reference and macOS unsigned-alpha warning in README.md"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1 and Phase 2.
2. Complete US1 to read and display repository-local identity.
3. Complete US2 to save and clear repository-local identity.
4. Validate that `git config --local` observes saved values and that the identity dialog no longer uses `.env` or `.gitignore` protection.

### Incremental Delivery

1. Deliver US1 + US2 as the core local Git identity behavior.
2. Add US4 to harden SSH key safety around the new persistence model.
3. Add US3 validation and documentation for browser/native consistency.
4. Add US5 documentation updates for GitHub, npm, and macOS alpha warning clarity.
5. Finish polish and run full verification.

### Parallel Team Strategy

1. One engineer handles backend repository logic and server tests.
2. One engineer handles UI state/dialog/API cleanup and UI tests.
3. One engineer handles SSH validation hardening and cross-distribution documentation.
4. Reconcile shared type/API contract changes before final verification.

## Notes

- Use Git's local configuration behavior; do not hand-edit `.git/config`.
- Do not reintroduce `.env` as identity storage.
- Do not expose SSH private key contents in responses, logs, test snapshots, or UI.
- Keep tasks scoped to the identity workflow; unrelated repo browsing/editing behavior should remain unchanged.
