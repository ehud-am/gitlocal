# Picker UI Contract: Release Quality and Automation

## Purpose

Defines the expected user-facing behavior of the repository selector shown when GitLocal starts without a repository path.

## Required Surfaces

- A title that identifies the screen as a folder or repository selector
- Supporting text explaining that no repository location was provided at launch
- A finder-style browsing region for moving through folders and selecting a repository
- A visible current selection state
- A clear open/confirm action
- A visible error state for invalid or inaccessible selections

## Interaction Contract

- The experience must feel like part of the main GitLocal product rather than a placeholder form.
- Users must be able to browse toward a target repository rather than relying solely on free-form path typing.
- The interface must remain understandable on macOS, Windows, and Linux.
- Selecting a valid repository must transition into the normal repository viewer.
- Invalid selections must keep the user in the selector and explain what went wrong.

## Non-Goals

- This contract does not require a native operating-system file dialog.
- This contract does not change the runtime rule that GitLocal only opens valid local git repositories.
