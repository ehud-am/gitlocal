# Contract: Git Identity API

All endpoints operate on the currently opened repository. Responses must never include SSH private key file contents.

## Read Repository Context

Existing repository context responses should include git identity values resolved from project-private settings first, then repository/global git config fallback.

```http
GET /api/repo
```

### Relevant Response Shape

```json
{
  "gitContext": {
    "user": {
      "name": "Jane Developer",
      "email": "jane@example.com",
      "source": "private-settings",
      "sshKeyPath": "~/.ssh/id_ed25519"
    }
  }
}
```

## List Valid SSH Private Keys

```http
GET /api/git/identity/ssh-keys
```

### 200 Response

```json
{
  "directory": {
    "path": "~/.ssh",
    "exists": true,
    "readable": true
  },
  "keys": [
    {
      "name": "id_ed25519",
      "path": "~/.ssh/id_ed25519"
    }
  ],
  "message": "Found 1 SSH private key."
}
```

### Error/Fallback Response

```json
{
  "directory": {
    "path": "~/.ssh",
    "exists": false,
    "readable": false
  },
  "keys": [],
  "message": "No conventional SSH key folder was found. Enter a key path manually."
}
```

## Validate SSH Private Key Path

```http
POST /api/git/identity/ssh-key/validate
Content-Type: application/json
```

### Request

```json
{
  "sshKeyPath": "/Users/example/.ssh/id_ed25519"
}
```

### 200 Valid Response

```json
{
  "valid": true,
  "path": "/Users/example/.ssh/id_ed25519",
  "message": "SSH private key is valid."
}
```

### 400 Invalid Response

```json
{
  "valid": false,
  "path": "/Users/example/.ssh/id_ed25519.pub",
  "message": "Selected file is not a valid SSH private key."
}
```

## Get Private Settings Protection

```http
GET /api/git/identity/protection
```

### 200 Protected Response

```json
{
  "settingsPath": ".env",
  "ignoreFileExists": true,
  "protected": true,
  "status": "protected",
  "canApplyFix": false,
  "message": ".env is protected by .gitignore."
}
```

### 200 Warning Response

```json
{
  "settingsPath": ".env",
  "ignoreFileExists": true,
  "protected": false,
  "status": "missing-entry",
  "canApplyFix": true,
  "message": ".env is not ignored. Add it to .gitignore before committing private settings."
}
```

## Apply Private Settings Protection

```http
POST /api/git/identity/protection
Content-Type: application/json
```

### Request

```json
{
  "approved": true
}
```

### 200 Response

```json
{
  "settingsPath": ".env",
  "ignoreFileExists": true,
  "protected": true,
  "status": "protected",
  "canApplyFix": false,
  "message": ".env was added to .gitignore."
}
```

### 400 Response

```json
{
  "settingsPath": ".env",
  "ignoreFileExists": false,
  "protected": false,
  "status": "blocked",
  "canApplyFix": false,
  "message": "Could not update .gitignore because the repository root is not writable."
}
```

## Save Git Identity

Extends the existing endpoint.

```http
PUT /api/git/identity
Content-Type: application/json
```

### Request

```json
{
  "name": "Jane Developer",
  "email": "jane@example.com",
  "sshKeyPath": "/Users/example/.ssh/id_ed25519"
}
```

### 200 Response

```json
{
  "ok": true,
  "message": "Project git identity updated.",
  "user": {
    "name": "Jane Developer",
    "email": "jane@example.com",
    "source": "private-settings",
    "sshKeyPath": "/Users/example/.ssh/id_ed25519"
  },
  "protection": {
    "settingsPath": ".env",
    "ignoreFileExists": true,
    "protected": true,
    "status": "protected",
    "canApplyFix": false,
    "message": ".env is protected by .gitignore."
  }
}
```

### 400 Response

```json
{
  "ok": false,
  "message": "Selected file is not a valid SSH private key."
}
```
