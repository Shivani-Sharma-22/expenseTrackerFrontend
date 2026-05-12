# Google OAuth Setup Guide

## Frontend Status

The Angular app is set up to start the Google OAuth authorization-code flow with PKCE.

Important security note: do not commit Google OAuth secrets to this repository. The frontend should only receive the public Google OAuth client ID from the backend endpoint:

```http
GET /api/auth/google/config
```

Expected response:

```json
{
  "clientId": "your-google-client-id.apps.googleusercontent.com"
}
```

## Backend Endpoints

### `GET /api/auth/google/config`

Return only the public OAuth client ID. Never return the client secret.

### `POST /api/auth/login/google`

Request body:

```json
{
  "code": "authorization code from Google",
  "codeVerifier": "PKCE code verifier",
  "redirectUri": "http://localhost:4200/auth/google/callback"
}
```

Response:

```json
{
  "token": "jwt-token",
  "userId": 1,
  "email": "user@example.com",
  "fullName": "User Name"
}
```

## Backend Configuration

Store credentials in environment variables or a private backend config file that is ignored by Git:

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4200/auth/google/callback
```

Example Spring Boot properties:

```properties
google.oauth.client-id=${GOOGLE_CLIENT_ID}
google.oauth.client-secret=${GOOGLE_CLIENT_SECRET}
google.oauth.redirect-uri=${GOOGLE_REDIRECT_URI}
```

Example service fields:

```java
@Value("${google.oauth.client-id}")
private String googleClientId;

@Value("${google.oauth.client-secret}")
private String googleClientSecret;
```

## Google Cloud Console

1. Open Google Cloud Console.
2. Go to APIs & Services, then Credentials.
3. Select your OAuth 2.0 Client ID.
4. Add authorized JavaScript origins:
   - `http://localhost:4200`
   - your production domain
5. Add authorized redirect URIs:
   - `http://localhost:4200/auth/google/callback`
   - your production callback URL

## Before Pushing To GitHub

1. Keep real values only in ignored `.env` files or deployment secrets.
2. Commit only placeholder/example files such as `.env.example`.
3. If a real client secret was ever committed, revoke or rotate it in Google Cloud Console before pushing.
4. Check the staged diff before pushing:

```bash
git diff --cached
```
