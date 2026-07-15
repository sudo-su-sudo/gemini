# Security Specification for AVH-01 Kernel

## Data Invariants
1. A RelayState must have valid stats (cpu/memory 0-100).
2. Only the creator of a relay (if authenticated) can update it.
3. UserProfiles are only accessible by the owner.

## The Dirty Dozen Payloads

### 1. RelayState: Invalid Stats (Resource Poisoning)
```json
{
  "logs": [],
  "stats": { "cpu": 500, "memory": -10 },
  "fs": {},
  "terminalOutput": "",
  "timestamp": "2026-07-04T17:26:00Z"
}
```
**Expected Result**: PERMISSION_DENIED (stats out of range).

### 2. RelayState: Shadow Field Injection
```json
{
  "logs": [],
  "stats": { "cpu": 50, "memory": 50 },
  "fs": {},
  "terminalOutput": "",
  "timestamp": "2026-07-04T17:26:00Z",
  "isAdmin": true
}
```
**Expected Result**: PERMISSION_DENIED (extra field `isAdmin`).

### 3. RelayState: ID Poisoning
Write to `/relays/!!invalid!!id!!`
**Expected Result**: PERMISSION_DENIED (regex mismatch).

### 4. UserProfile: Identity Spoofing
Write to `/users/another_uid` as `current_uid`.
**Expected Result**: PERMISSION_DENIED.

### 5. UserProfile: Privilege Escalation
```json
{
  "uid": "current_uid",
  "email": "user@example.com",
  "role": "admin"
}
```
**Expected Result**: PERMISSION_DENIED (extra field `role`).

### 6. RelayState: Giant Logs (Denial of Wallet)
```json
{
  "logs": ["a".repeat(1000000)],
  "stats": { "cpu": 50, "memory": 50 },
  "fs": {},
  "terminalOutput": "",
  "timestamp": "2026-07-04T17:26:00Z"
}
```
**Expected Result**: PERMISSION_DENIED (size limit).

### 7. RelayState: Unauthorized Delete
Delete `/relays/some_id` by another user.
**Expected Result**: PERMISSION_DENIED.

### 8. RelayState: Missing Required Field
```json
{
  "logs": [],
  "stats": { "cpu": 50, "memory": 50 },
  "fs": {},
  "timestamp": "2026-07-04T17:26:00Z"
}
```
**Expected Result**: PERMISSION_DENIED (missing `terminalOutput`).

### 9. RelayState: Invalid Timestamp Format
```json
{
  "logs": [],
  "stats": { "cpu": 50, "memory": 50 },
  "fs": {},
  "terminalOutput": "",
  "timestamp": "not-a-date"
}
```
**Expected Result**: PERMISSION_DENIED.

### 10. RelayState: Future Timestamp
```json
{
  "logs": [],
  "stats": { "cpu": 50, "memory": 50 },
  "fs": {},
  "terminalOutput": "",
  "timestamp": "2099-01-01T00:00:00Z"
}
```
**Expected Result**: PERMISSION_DENIED (must be close to `request.time`).

### 11. UserProfile: Email Spoofing
Attempt to create profile with email `admin@kernel.com` without verification.
**Expected Result**: PERMISSION_DENIED.

### 12. RelayState: Update Owner
Attempt to change `ownerId` (if we add one).
**Expected Result**: PERMISSION_DENIED.
