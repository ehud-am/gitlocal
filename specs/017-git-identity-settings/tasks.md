# Tasks: Git Identity Settings

**Input**: Design documents from `specs/017-git-identity-settings/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/git-identity-api.md](contracts/git-identity-api.md), [quickstart.md](quickstart.md)

**Tests**: Test tasks are included because the implementation plan and quickstart require unit, handler, integration, and UI coverage while preserving the repository's 90% per-file coverage gate.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task.
- **[Story]**: Maps to the user story implemented by the task: US1, US2, or US3.
- All tasks include exact repository-relative file paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared types and route placeholders required by the feature.

- [X] T001 Add git identity API contract types for SSH key listing, SSH key validation, private settings protection, and extended identity update responses in src/types.ts
- [X] T002 [P] Mirror the git identity API contract types in ui/src/types/index.ts
- [X] T003 Create src/git/identity-settings.ts with exported stubs for private settings, SSH key validation, SSH key listing, and `.gitignore` protection helpers
- [X] T004 Register placeholder routes for `/api/git/identity/ssh-keys`, `/api/git/identity/ssh-key/validate`, and `/api/git/identity/protection` in src/server.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build reusable server behavior needed by all user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Implement path expansion and conventional SSH directory resolution for macOS/POSIX and Windows in src/git/identity-settings.ts
- [X] T006 Implement bounded SSH private key header validation that accepts common encrypted and unencrypted private key formats without exposing file contents in src/git/identity-settings.ts
- [X] T007 Implement `.env` parsing and serialization helpers that preserve unrelated variables and support GitLocal-owned identity keys in src/git/identity-settings.ts
- [X] T008 Implement `.gitignore` protection state detection for `.env`, including missing file, missing entry, protected, duplicate avoidance, and blocked read states in src/git/identity-settings.ts
- [X] T009 [P] Add shared fake SSH private key, public key, known_hosts, and unrelated file fixture helpers in tests/unit/git/repo.test.ts
- [X] T010 [P] Add API client methods for SSH key listing, SSH key validation, private settings protection fetch, and protection apply in ui/src/services/api.ts

**Checkpoint**: Foundation ready; user story implementation can now begin.

---

## Phase 3: User Story 1 - Choose a Valid SSH Key for a Project (Priority: P1) MVP

**Goal**: Users can choose a valid SSH private key from a file-oriented selector that starts in the conventional SSH folder and can also validate an arbitrary path.

**Independent Test**: Open the identity dialog in a repo with a conventional SSH folder containing mixed files; only valid private keys appear, selecting one fills the path, and manual invalid paths show validation errors.

### Tests for User Story 1

- [X] T011 [P] [US1] Add unit tests for SSH private key validation success, public key rejection, known_hosts rejection, directory rejection, unreadable path handling, encrypted private key acceptance, and bounded content reading in tests/unit/git/repo.test.ts
- [X] T012 [P] [US1] Add handler tests for `GET /api/git/identity/ssh-keys` and `POST /api/git/identity/ssh-key/validate` success and error responses in tests/unit/handlers/repo.test.ts
- [X] T013 [P] [US1] Add UI tests for loading key candidates, selecting a listed key, validating a manual key path, and displaying invalid-key errors in ui/src/components/AppDialogs.test.tsx
- [X] T014 [P] [US1] Add app orchestration tests for opening the identity dialog, fetching SSH keys once per open flow, and guarding pending validation state in ui/src/App.logic.test.tsx

### Implementation for User Story 1

- [X] T015 [US1] Implement valid SSH private key listing for the conventional SSH directory in src/git/identity-settings.ts
- [X] T016 [US1] Implement SSH key listing and manual path validation handlers in src/handlers/repo.ts
- [X] T017 [US1] Wire SSH key listing and validation routes to handlers in src/server.ts
- [X] T018 [US1] Add UI service calls for SSH key list and manual key validation responses in ui/src/services/api.ts
- [X] T019 [US1] Extend GitIdentityDialog props and layout with a file-oriented SSH key selector, listed key options, manual path entry, validation error display, and pending states in ui/src/components/AppDialogs.tsx
- [X] T020 [US1] Wire identity dialog key loading, key selection, manual validation, pending guards, and error handling in ui/src/App.tsx
- [X] T021 [US1] Ensure selected and manually validated SSH key paths are included in the existing identity save payload in ui/src/App.tsx

**Checkpoint**: US1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Persist Git Identity per Project (Priority: P2)

**Goal**: Users can save name, email, and SSH key path per project and see those values restored when returning to that project without leaking them into other projects.

**Independent Test**: Save different identity values in two repositories, reopen each repository, and confirm each project restores only its own values while local git config remains synchronized.

### Tests for User Story 2

- [X] T022 [P] [US2] Add unit tests for `.env` identity read, write, update, value clearing, unrelated variable preservation, git config fallback, and per-project isolation in tests/unit/git/repo.test.ts
- [X] T023 [P] [US2] Add handler tests for `PUT /api/git/identity` writing `.env`, synchronizing repository-local git config, returning `source: private-settings`, and rejecting invalid SSH key paths in tests/unit/handlers/repo.test.ts
- [X] T024 [P] [US2] Add integration tests for saving identity, reopening the same repo, and switching between two repos with different saved identities in tests/integration/server.test.ts
- [X] T025 [P] [US2] Add UI tests for restored identity values and save payload handling with persisted SSH key paths in ui/src/App.test.tsx

### Implementation for User Story 2

- [X] T026 [US2] Implement project-local `.env` identity read/write helpers using GitLocal-owned keys in src/git/identity-settings.ts
- [X] T027 [US2] Update getGitUserIdentity to prefer `.env` identity values before repository/global git config fallback in src/git/repo.ts
- [X] T028 [US2] Update setRepoGitIdentity to validate SSH key paths, persist `.env` identity values, and keep repository-local `user.name`, `user.email`, and `core.sshCommand` synchronized in src/git/repo.ts
- [X] T029 [US2] Extend GitIdentityUpdateResponse with private settings protection data while preserving existing error handling in src/types.ts
- [X] T030 [US2] Update gitIdentityUpdateHandler to return persisted identity source and protection state in src/handlers/repo.ts
- [X] T031 [US2] Update UI identity response handling to consume `source: private-settings`, restored SSH key path, and protection metadata in ui/src/App.tsx
- [X] T032 [US2] Update UI type definitions for identity source and extended update response in ui/src/types/index.ts

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Prevent Private Settings from Being Sent to Remote (Priority: P3)

**Goal**: Users are warned when `.env` is not protected by `.gitignore`, and can explicitly approve creating or updating `.gitignore`.

**Independent Test**: In repos with no `.gitignore`, with `.gitignore` missing `.env`, and with `.env` already ignored, save identity settings and confirm warning, approval, no duplicate entries, and clear blocked-state messages.

### Tests for User Story 3

- [X] T033 [P] [US3] Add unit tests for `.gitignore` protection detection, creation, append, duplicate avoidance, equivalent `.env` entry handling, and blocked read/write states in tests/unit/git/repo.test.ts
- [X] T034 [P] [US3] Add handler tests for `GET /api/git/identity/protection` and `POST /api/git/identity/protection` approval, missing approval rejection, no-op protected state, and blocked update responses in tests/unit/handlers/repo.test.ts
- [X] T035 [P] [US3] Add integration tests for no `.gitignore`, `.gitignore` missing `.env`, and `.gitignore` already protecting `.env` scenarios in tests/integration/server.test.ts
- [X] T036 [P] [US3] Add UI tests for warning display, approve-fix action, declined/unfixed warning persistence, and protected-state warning suppression in ui/src/App.test.tsx

### Implementation for User Story 3

- [X] T037 [US3] Implement approved `.gitignore` create/update behavior for `.env` protection in src/git/identity-settings.ts
- [X] T038 [US3] Implement private settings protection status and approved update handlers in src/handlers/repo.ts
- [X] T039 [US3] Register private settings protection GET and POST routes in src/server.ts
- [X] T040 [US3] Add UI API methods for fetching and applying private settings protection in ui/src/services/api.ts
- [X] T041 [US3] Add protection warning, approval action, blocked-state messaging, and warning persistence to the identity dialog in ui/src/components/AppDialogs.tsx
- [X] T042 [US3] Wire protection status loading, approve-fix action, declined/unfixed warning state, and post-save refresh behavior in ui/src/App.tsx

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, accessibility, and cleanup across all stories.

- [X] T043 [P] Update branch coverage tests for new identity dialog branches, failed API calls, missing SSH directory fallback, and protection pending guards in ui/src/App.branch-coverage.test.tsx
- [X] T044 [P] Review identity dialog accessibility labels, alert roles, focus behavior, and keyboard operation in ui/src/components/AppDialogs.tsx
- [X] T045 Verify private SSH key contents are never returned, logged, rendered, or stored in tests by reviewing src/git/identity-settings.ts, src/handlers/repo.ts, ui/src/App.tsx, and ui/src/components/AppDialogs.tsx
- [X] T046 Run the quickstart manual verification checklist and record any deviations in specs/017-git-identity-settings/quickstart.md
- [X] T047 Run `npm run lint` from the repository root using package.json
- [X] T048 Run `npm test` from the repository root using package.json
- [X] T049 Run `npm run build` from the repository root using package.json

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2; MVP scope.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and integrates cleanly after US1, but can be implemented independently if SSH validation contracts are stable.
- **User Story 3 (Phase 5)**: Depends on Phase 2 and can proceed in parallel with US1/US2 after protection helper contracts are stable.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories after foundational helpers.
- **US2 (P2)**: Uses SSH key validation from the foundation and benefits from US1 UI controls, but persistence can be tested independently through API and repository reloads.
- **US3 (P3)**: Uses `.env` storage path from US2's design but protection status/update helpers can be implemented independently after foundational `.gitignore` detection exists.

### Within Each User Story

- Write and run the story's tests first; confirm they fail for the missing behavior.
- Implement server helpers before handlers.
- Implement handlers and route registration before UI API calls.
- Implement UI services before UI state orchestration.
- Complete the story checkpoint before moving to the next priority.

---

## Parallel Opportunities

- T002 can run in parallel with T001 because it only touches UI type mirrors.
- T009 and T010 can run in parallel after T003 because they touch test fixtures and UI API service scaffolding.
- US1 test tasks T011-T014 can run in parallel.
- US2 test tasks T022-T025 can run in parallel.
- US3 test tasks T033-T036 can run in parallel.
- T043 and T044 can run in parallel during polish because they target different UI validation concerns.

## Parallel Example: User Story 1

```text
Task: "T011 [P] [US1] Add unit tests for SSH private key validation success, public key rejection, known_hosts rejection, directory rejection, unreadable path handling, encrypted private key acceptance, and bounded content reading in tests/unit/git/repo.test.ts"
Task: "T012 [P] [US1] Add handler tests for GET /api/git/identity/ssh-keys and POST /api/git/identity/ssh-key/validate success and error responses in tests/unit/handlers/repo.test.ts"
Task: "T013 [P] [US1] Add UI tests for loading key candidates, selecting a listed key, validating a manual key path, and displaying invalid-key errors in ui/src/components/AppDialogs.test.tsx"
Task: "T014 [P] [US1] Add app orchestration tests for opening the identity dialog, fetching SSH keys once per open flow, and guarding pending validation state in ui/src/App.logic.test.tsx"
```

## Parallel Example: User Story 2

```text
Task: "T022 [P] [US2] Add unit tests for .env identity read, write, update, value clearing, unrelated variable preservation, git config fallback, and per-project isolation in tests/unit/git/repo.test.ts"
Task: "T023 [P] [US2] Add handler tests for PUT /api/git/identity writing .env, synchronizing repository-local git config, returning source: private-settings, and rejecting invalid SSH key paths in tests/unit/handlers/repo.test.ts"
Task: "T024 [P] [US2] Add integration tests for saving identity, reopening the same repo, and switching between two repos with different saved identities in tests/integration/server.test.ts"
Task: "T025 [P] [US2] Add UI tests for restored identity values and save payload handling with persisted SSH key paths in ui/src/App.test.tsx"
```

## Parallel Example: User Story 3

```text
Task: "T033 [P] [US3] Add unit tests for .gitignore protection detection, creation, append, duplicate avoidance, equivalent .env entry handling, and blocked read/write states in tests/unit/git/repo.test.ts"
Task: "T034 [P] [US3] Add handler tests for GET /api/git/identity/protection and POST /api/git/identity/protection approval, missing approval rejection, no-op protected state, and blocked update responses in tests/unit/handlers/repo.test.ts"
Task: "T035 [P] [US3] Add integration tests for no .gitignore, .gitignore missing .env, and .gitignore already protecting .env scenarios in tests/integration/server.test.ts"
Task: "T036 [P] [US3] Add UI tests for warning display, approve-fix action, declined/unfixed warning persistence, and protected-state warning suppression in ui/src/App.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational helpers.
3. Complete Phase 3 US1.
4. Validate US1 independently with server/unit/UI tests and a manual dialog check.

### Incremental Delivery

1. Deliver US1 so users can select and validate SSH private keys.
2. Deliver US2 so identity values persist per project and git config remains synchronized.
3. Deliver US3 so private settings receive `.gitignore` warning and approved protection.
4. Complete polish, coverage, quickstart, lint, test, and build checks.

### Suggested MVP Scope

US1 is the MVP: SSH private key discovery, filtering, manual validation, and save payload integration.

## Notes

- Keep `.env` parsing targeted to GitLocal-owned keys and preserve unrelated user values.
- Do not add runtime dependencies unless implementation proves the built-in Node.js filesystem/path/os APIs are insufficient.
- Do not return or render SSH private key contents in any API response, UI state, error message, or test assertion.
- Use repository-relative paths in all documentation updates.
