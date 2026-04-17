# Auth Testing Playbook (Emergent Google Auth)

## Test Session Setup (via mongosh)
```
mongosh --eval "
use('test_database');
var userId = 'test-admin-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'himasri.yellapu@ncplconsulting.net',
  name: 'Test Admin',
  role: 'admin',
  department: null,
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
"
```

## Browser Testing (Playwright)
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "work-tracker-230.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://work-tracker-230.preview.emergentagent.com/dashboard")
```

## Backend API Test
```
curl -X GET "$REACT_APP_BACKEND_URL/api/auth/me" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN"
```

## Checklist
- users collection has user_id (custom), role, email
- user_sessions has user_id matching users.user_id
- All queries exclude _id via {"_id": 0} projection
- /api/auth/me returns user with role field
