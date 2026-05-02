# Research: Unified Action Menus

## Decision: Use One Three-Dots Menu Pattern For Optional Commands

**Rationale**: The app already uses a Radix-backed dropdown menu for file actions and picker setup actions. Reusing that pattern for non-git setup actions, file actions, and git folder actions gives users one affordance to learn while preserving keyboard and screen-reader behavior from the existing primitive.

**Alternatives considered**: Keeping folder create/delete buttons visible was rejected because it preserves the inconsistency called out in the spec. Replacing every action with a toolbar was rejected because it would make file and setup actions less consistent with the existing three-dots menu.

## Decision: Hide Empty Menus Instead Of Rendering Disabled Empty Triggers

**Rationale**: A three-dots trigger with no available commands creates a dead control and fails the requirement that no empty menu appears. Conditional rendering keeps the interface quieter and avoids keyboard stops that do nothing.

**Alternatives considered**: Rendering a disabled trigger was rejected because users cannot tell why it exists. Showing a menu with disabled items was rejected because unavailable actions should not be presented as current options.

## Decision: Keep Delete As Red Text Inside Menus

**Rationale**: Red text communicates destructive intent while preserving the common menu layout. The existing `.dropdown-danger` styling can be reused or refined so destructive actions are distinct without becoming separate alert buttons inside the menu.

**Alternatives considered**: Full red filled menu rows were rejected because they would overstate risk before the user reaches the confirmation step. Keeping delete in normal text was rejected because it fails the destructive-action recognition requirement.

## Decision: Upgrade File Delete Confirmation To Exact Typed Display Name

**Rationale**: Folder deletion already requires strong confirmation. Files should meet the same safety standard so every delete entry point is protected by an exact typed-name match before the final action is enabled.

**Alternatives considered**: Keeping file delete as a simple confirmation button was rejected because it contradicts the requested GitHub-style delete flow. Requiring the full path was rejected because names can be long and the spec asks for typing the file or folder name, not the whole path.

## Decision: Show Name And Location In Delete Confirmation

**Rationale**: Exact name matching protects against accidental confirmation, but duplicate names can exist in different folders. Showing both the required name and the containing location identifies the target while keeping the typed challenge focused on the displayed name.

**Alternatives considered**: Showing only the name was rejected because duplicate names are an explicit edge case. Requiring users to type both name and path was rejected because it adds friction beyond the stated requirement and is harder for paths with separators or spaces.

## Decision: Preserve Folder Delete Impact And Stale-Preview Safety

**Rationale**: The feature changes where delete is launched, not the safety model for recursive folder deletion. Existing file counts, stale-preview checks, and failure paths must continue to guard folder deletes after the action moves into a menu.

**Alternatives considered**: Replacing folder delete with the simpler file confirmation dialog was rejected because it would weaken the existing recursive delete safeguards.
