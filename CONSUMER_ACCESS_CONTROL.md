# Consumer Access Control Feature

## Overview
This feature allows file owners to control who can access their files by requiring sign-in and limiting the number of views per individual consumer (user).

## Features

### 1. Require Sign-In
When enabled, only authenticated users can access the file. Anonymous access is blocked.

**UI:** Checkbox "Require sign-in to view file" in FileUpload component

**Backend Enforcement:**
- `validate()` endpoint checks `require_signin` flag
- `serve()` endpoint checks authentication status
- Returns 401 if user not authenticated when required

### 2. Per-Consumer View Limits
When sign-in is required, you can limit how many times each individual user can view the file.

**UI:** Dropdown with options: Unlimited, 1, 2, 3, 5, or 10 views per consumer

**Backend Tracking:**
- AccessLog tracks `consumer` (authenticated user) for each access
- `get_consumer_view_count(consumer_id)` counts views for specific user
- `has_consumer_exceeded_limit(consumer_id)` checks if user reached their limit
- Returns 403 if consumer exceeded their personal limit

## Database Schema

### FileUpload Model Additions
```python
require_signin = models.BooleanField(default=False)
max_views_per_consumer = models.IntegerField(default=0)  # 0 = unlimited
```

### AccessLog Model Additions
```python
consumer = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='file_accesses'
)
```

## Flow

### Upload Flow
1. Owner uploads file and selects:
   - ✅ Require sign-in: Yes/No
   - ✅ Max views per consumer: 0 (unlimited), 1, 2, 3, 5, or 10
2. Backend saves `require_signin` and `max_views_per_consumer` on FileUpload

### Access Flow (Authenticated User)
1. Consumer navigates to `/access/{token}`
2. Frontend calls `/api/v1/access/validate/` with access_token
3. Backend checks:
   - Is file deleted? → 410
   - Is file inactive? → 403
   - Is file expired? → 410
   - Global view limit reached? → 403
   - Password required and correct? → 401 if wrong
   - **NEW: Require signin?** → 401 if not authenticated
   - **NEW: Consumer view limit exceeded?** → 403 if user over limit
4. If all checks pass, frontend gets view URL
5. Frontend loads file from `/api/v1/access/serve/{token}/`
6. Backend serves file and:
   - Increments global view counter
   - Creates AccessLog with consumer ID
   - Counts toward that consumer's individual limit

### Access Flow (Anonymous User)
1. Consumer navigates to `/access/{token}`
2. Frontend calls `/api/v1/access/validate/`
3. Backend checks:
   - Basic validations (deleted, inactive, expired, view limit, password)
   - **NEW: Require signin?** → 401 with error "You must be signed in to access this file"
4. If `require_signin=True`, access is BLOCKED for anonymous users
5. If `require_signin=False`, access proceeds normally (tracked by IP)

## Implementation Details

### Backend Enforcement Points

**validate() endpoint** (`/api/v1/access/validate/`):
```python
# After password check
if file_upload.require_signin:
    if not request.user.is_authenticated:
        return Response({'error': 'You must be signed in to access this file'}, status=401)
    
    if file_upload.has_consumer_exceeded_limit(consumer_id=request.user.id):
        return Response({'error': 'You have exceeded your view limit for this file'}, status=403)
```

**serve() endpoint** (`/api/v1/access/serve/{token}/`):
```python
# After basic validations
if file_upload.require_signin:
    if not request.user.is_authenticated:
        return HttpResponse('You must be signed in to access this file', status=401)
    
    if file_upload.has_consumer_exceeded_limit(consumer_id=request.user.id):
        return HttpResponse('You have exceeded your view limit for this file', status=403)
```

### Access Logging
All access attempts are logged with consumer information:
```python
consumer = request.user if request.user.is_authenticated else None
self.create_access_log(file_upload, request, granted=True, method='view', consumer=consumer)
```

This enables:
- Per-consumer view tracking
- Analytics showing which users accessed files
- Audit trail with user identity (when authenticated)

### View Counting Methods

**get_consumer_view_count(consumer_id=None, ip_address=None)**
- Returns count of successful accesses by specific consumer or IP
- Filters by `access_granted=True` and `access_method__in=['view', 'download']`

**has_consumer_exceeded_limit(consumer_id=None, ip_address=None)**
- Returns True if consumer has reached/exceeded their limit
- Only checks when `max_views_per_consumer > 0`
- Compares `get_consumer_view_count()` against `max_views_per_consumer`

## UI Components

### FileUpload.tsx
Lines 232-265:
```typescript
{/* Consumer Access Controls */}
<div className="space-y-4">
  <div className="flex items-center space-x-2">
    <Checkbox
      id="requireSignin"
      checked={requireSignin}
      onCheckedChange={(checked) => setRequireSignin(checked as boolean)}
    />
    <label htmlFor="requireSignin">Require sign-in to view file</label>
  </div>

  {requireSignin && (
    <div className="ml-6 space-y-2">
      <Label htmlFor="maxViewsPerConsumer">Max views per consumer</Label>
      <Select
        value={maxViewsPerConsumer.toString()}
        onValueChange={(value) => setMaxViewsPerConsumer(parseInt(value))}
      >
        <SelectTrigger id="maxViewsPerConsumer">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Unlimited</SelectItem>
          <SelectItem value="1">1 view</SelectItem>
          <SelectItem value="2">2 views</SelectItem>
          <SelectItem value="3">3 views</SelectItem>
          <SelectItem value="5">5 views</SelectItem>
          <SelectItem value="10">10 views</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Each signed-in user can view the file up to this many times
      </p>
    </div>
  )}
</div>
```

## Migration

**File:** `backend/apps/files/migrations/0003_add_consumer_access_control.py`

Adds:
- `require_signin` field to FileUpload
- `max_views_per_consumer` field to FileUpload
- `consumer` ForeignKey to AccessLog

## API Changes

### Upload Endpoint
**Request** (`POST /api/v1/files/upload/`):
```json
{
  "file": <file>,
  "require_signin": true,
  "max_views_per_consumer": 5
}
```

**Response:**
```json
{
  "id": 123,
  "require_signin": true,
  "max_views_per_consumer": 5,
  ...
}
```

### Validate Endpoint
**New Error Responses:**

Sign-in required:
```json
{
  "error": "You must be signed in to access this file"
}
```
Status: 401

Consumer limit exceeded:
```json
{
  "error": "You have exceeded your view limit for this file"
}
```
Status: 403

### File Detail Response
Includes new fields:
```json
{
  "id": 123,
  "require_signin": true,
  "max_views_per_consumer": 5,
  ...
}
```

### Access Log Response
Includes consumer email (when authenticated):
```json
{
  "id": 456,
  "consumer_email": "user@example.com",
  "ip_address": "192.168.1.1",
  "access_granted": true,
  ...
}
```

## Use Cases

### 1. Public Link with Individual Limits
- `require_signin: True`
- `max_views_per_consumer: 3`
- **Result:** Anyone with the link can sign up/sign in and view the file up to 3 times

### 2. Authenticated-Only Access
- `require_signin: True`
- `max_views_per_consumer: 0` (unlimited)
- **Result:** Only signed-in users can access, no per-user limits

### 3. One-Time Viewer
- `require_signin: True`
- `max_views_per_consumer: 1`
- **Result:** Each user can only view the file once (useful for exam answers, exclusive content)

### 4. Traditional Public Link (Default)
- `require_signin: False`
- `max_views_per_consumer: 0`
- **Result:** Anyone with the link can access (existing behavior)

## Future Enhancements

### Potential Features
1. **Consumer Authentication Flow for Public Access**
   - Redirect to sign-in page when `require_signin=True`
   - Return to file after authentication
   - Better UX for required sign-in scenario

2. **Per-Consumer Analytics Dashboard**
   - Show which users accessed files
   - View counts per consumer
   - Last access timestamp per user

3. **Consumer Allowlist/Blocklist**
   - Explicitly allow/deny specific users
   - Email domain restrictions
   - Organization-based access control

4. **Time-Based Consumer Limits**
   - Reset view counts after X days
   - Limit views per day/week/month
   - Subscription-based access patterns

5. **View Count Display**
   - Show users how many views they have remaining
   - "You have 2 views remaining" message
   - Warning when approaching limit

## Testing Checklist

- [ ] Upload file with require_signin=True
- [ ] Attempt access while logged out → 401 error
- [ ] Sign in and access file → success
- [ ] Set max_views_per_consumer=2
- [ ] View file twice as same user → success both times
- [ ] Attempt third view → 403 error
- [ ] Sign in as different user → success (separate limit)
- [ ] Verify AccessLog records consumer_id correctly
- [ ] Verify get_consumer_view_count() returns correct counts
- [ ] Upload file with require_signin=False → anonymous access works
- [ ] Verify existing public links still work (backward compatibility)
