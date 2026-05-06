# Google OAuth Setup Guide - Backend Requirements

## ✅ Frontend Implementation Complete

Your Google OAuth client credentials have been configured:
- **Client ID**: 823065491927-ofmj596aj7qjl4voapnnqm9jtq33981a.apps.googleusercontent.com
- **Redirect URI**: http://localhost:3000/auth/google/callback (for development)

## 🔌 Backend Endpoint Required

The frontend is now calling this endpoint that **MUST be implemented in your auth-service**:

### Endpoint: `POST /api/auth/login/google`

**Request Body:**
```json
{
  "code": "string - authorization code from Google",
  "codeVerifier": "string - PKCE code verifier",
  "redirectUri": "http://localhost:3000/auth/google/callback"
}
```

**Response:**
```json
{
  "token": "string - JWT token",
  "userId": "number - user ID",
  "email": "string - user email",
  "fullName": "string - user full name"
}
```

## 🛠️ Backend Implementation Steps

### 1. Add Google OAuth Dependencies (Maven - pom.xml)
```xml
<!-- In your auth-service pom.xml -->
<dependency>
    <groupId>com.google.auth</groupId>
    <artifactId>google-auth-library-oauth2-http</artifactId>
    <version>1.11.0</version>
</dependency>
```

### 2. Create Google OAuth Service (Java)
```java
package com.spendsmart.auth.service;

import com.google.auth.oauth2.TokenResponse;
import com.google.auth.oauth2.GoogleIdTokenVerifier;
import com.google.auth.transport.http.HttpTransport;
import com.google.auth.transport.http.NetHttpTransport;
import com.google.common.collect.Lists;
import org.springframework.stereotype.Service;

@Service
public class GoogleOAuthService {
    
    private static final String GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_CLIENT_ID = "823065491927-ofmj596aj7qjl4voapnnqm9jtq33981a.apps.googleusercontent.com";
    private static final String GOOGLE_CLIENT_SECRET = "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";
    
    public GoogleTokenResponse exchangeCodeForToken(String code, String codeVerifier, String redirectUri) {
        try {
            HttpTransport transport = new NetHttpTransport();
            
            // Call Google OAuth endpoint
            String url = GOOGLE_TOKEN_ENDPOINT + 
                "?client_id=" + GOOGLE_CLIENT_ID +
                "&client_secret=" + GOOGLE_CLIENT_SECRET +
                "&code=" + code +
                "&code_verifier=" + codeVerifier +
                "&grant_type=authorization_code&" +
                "redirect_uri=" + redirectUri;
            
            // Make HTTP request and parse response
            // Return user info from Google ID token
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to exchange Google OAuth code", e);
        }
    }
}
```

### 3. Add Endpoint in AuthController
```java
@PostMapping("/login/google")
public ResponseEntity<AuthResponse> loginWithGoogle(@RequestBody GoogleLoginRequest req) {
    try {
        // Use GoogleOAuthService to exchange code
        GoogleTokenResponse googleToken = googleOAuthService.exchangeCodeForToken(
            req.getCode(), 
            req.getCodeVerifier(), 
            req.getRedirectUri()
        );
        
        // Extract user email and info from Google token
        String email = googleToken.getEmail();
        
        // Check if user exists
        User user = authService.getUserByEmail(email);
        if (user == null) {
            // Create new user with GOOGLE provider
            user = User.builder()
                .email(email)
                .fullName(googleToken.getFullName())
                .provider(User.Provider.GOOGLE)
                .isActive(true)
                .build();
            user = authService.register(user);
        }
        
        // Generate JWT token
        String token = jwtUtil.generateToken(user.getEmail());
        
        return ResponseEntity.ok(
            new AuthResponse(token, user.getUserId(), user.getEmail(), user.getFullName())
        );
    } catch (Exception e) {
        return ResponseEntity.badRequest().build();
    }
}
```

### 4. Update User Entity (if needed)
The User entity already has:
```java
@Enumerated(EnumType.STRING)
private Provider provider = Provider.LOCAL;  // Can be GOOGLE

public enum Provider {
    LOCAL, GOOGLE
}
```

## 🔐 Configuration Steps

### 1. Update Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Add Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `http://localhost:4200` (Angular default)
   - Your production domain
6. Add Authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - Your production callback URL

### 2. For Production
- Add production domain to both allowed origins and redirect URIs
- Move client secret to environment variables
- Use HTTPS for all URLs

## 📝 DTOs to Add in Backend

```java
// GoogleLoginRequest.java
@Data
public class GoogleLoginRequest {
    private String code;
    private String codeVerifier;
    private String redirectUri;
}

// Google token response DTO (for internal use)
@Data
public class GoogleTokenResponse {
    private String idToken;
    private String accessToken;
    private String email;
    private String fullName;
    private String picture;
}
```

## 🧪 Testing Steps

1. **Frontend**: Click "Continue with Google" button
2. Login with your Google account
3. Google redirects to `/auth/google/callback` with code
4. Frontend exchanges code with backend at `POST /api/auth/login/google`
5. Backend returns JWT token
6. Frontend redirects to dashboard

## ✅ Checklist

- [ ] Add Google OAuth dependency to pom.xml
- [ ] Create GoogleOAuthService
- [ ] Add `/login/google` endpoint to AuthController
- [ ] Add GoogleLoginRequest DTO
- [ ] Update Google Cloud Console with redirect URIs
- [ ] Test the flow locally
- [ ] Update production URLs in Google Cloud Console

## 🚀 You're All Set!

The frontend is ready. Once you implement the backend endpoint, Google login will work completely!
