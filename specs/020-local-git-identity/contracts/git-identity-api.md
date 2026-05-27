# Contract: Local Git Identity API

All endpoints operate on the currently opened repository through the shared local GitLocal service. Browser mode and native app mode use the same contracts. Responses must never include SSH private key file contents.

## Read Repository Context

Existing repository context responses include repository-local Git identity values when available. The identity source must not report app-private settings.

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
      "source": "local",
      "sshKeyPath": "~/.ssh/id_ed25519"
    }
  }
}
```

### Unset Local Identity Shape

```json
{
  "gitContext": {
    "user": null
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

### 200 Fallback Response

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
  "sshKeyPath": "~/.ssh/id_ed25519"
}
```

### 200 Valid Response

```json
{
  "valid": true,
  "path": "~/.ssh/id_ed25519",
  "message": "SSH private key is valid."
}
```

### 400 Invalid Response

```json
{
  "valid": false,
  "path": "~/.ssh/id_ed25519.pub",
  "message": "Selected file is not a valid SSH private key."
}
```

## Save Repository Git Identity

```http
PUT /api/git/identity
Content-Type: application/json
```

### Request

```json
{
  "name": "Jane Developer",
  "email": "jane@example.com",
  "sshKeyPath": "~/.ssh/id_ed25519"
}
```

### 200 Response

```json
{
  "ok": true,
  "message": "Repository git identity updated.",
  "user": {
    "name": "Jane Developer",
    "email": "jane@example.com",
    "source": "local",
    "sshKeyPath": "~/.ssh/id_ed25519"
  }
}
```

### 400 Validation Response

```json
{
  "ok": false,
  "message": "Selected file is not a valid SSH private key."
}
```

### 500 Write Failure Response

```json
{
  "ok": false,
  "message": "Could not update the repository-local Git identity."
}
```

## Clear Repository Git Identity

Clearing can use the same save endpoint with empty values. After a successful clear, repository-local overrides are removed and the response reflects the unset local identity state.

```http
PUT /api/git/identity
Content-Type: application/json
```

### Request

```json
{
  "name": "",
  "email": "",
  "sshKeyPath": ""
}
```

### 200 Response

```json
{
  "ok": true,
  "message": "Repository git identity cleared.",
  "user": null
}
```

## Removed Identity Protection Contract

The identity workflow no longer exposes `.env` protection endpoints because identity values are not stored in an app-owned private settings file.

Removed from the identity contract:

- `GET /api/git/identity/protection`
- `POST /api/git/identity/protection`
