# 🔐 Authentication & Authorization System

## Overview

NIVO App menggunakan **client-side authentication** dengan token-based session management. Sistem ini melindungi routes dari akses unauthorized dan otomatis redirect user yang belum login.

---

## 🏗️ Architecture

### Components

1. **AuthGuard** (`src/components/AuthGuard.tsx`)

   - Higher-order component untuk protect routes
   - Cek authentication status
   - Auto-redirect jika tidak authenticated
   - Listen storage changes untuk multi-tab sync

2. **useAuth Hook**
   - Custom hook untuk check auth status
   - Return: `{ isAuthenticated, isLoading }`
   - Handle session expiration
   - Auto-cleanup expired sessions

### Authentication Flow

```
User Login → Set Token → Store in localStorage → Access Protected Routes
                                ↓
                        Session Valid? → Yes → Allow Access
                                ↓
                               No → Clear Data → Redirect to /signin
```

---

## 🔒 Protected Routes

Routes yang memerlukan authentication:

```typescript
const PROTECTED_ROUTES = [
  "/home",
  "/tracker",
  "/craving-support",
  "/ai-result",
  "/pencapaian",
  "/contact-professional",
  "/craving-history",
  "/profile-settings",
  "/notifications",
];
```

**Behavior:**

- Jika user belum login → redirect ke `/signin`
- Jika user sudah login tapi session expired → clear data + redirect ke `/signin`
- Jika user logout → redirect ke `/signin`

---

## 🌐 Public Routes

Routes yang bisa diakses tanpa authentication:

```typescript
const PUBLIC_ROUTES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/otp-verification",
  "/password-reset-success",
  "/welcome",
  "/journey-start",
  "/time-selection",
  "/motivation",
  "/set-quit-date-past",
];
```

**Behavior:**

- Tidak perlu login untuk akses
- Jika sudah login dan akses `/signin` → redirect ke `/home`

---

## 💾 Session Management

### Stored Data (localStorage)

**Authentication:**

```javascript
{
  userToken: "jwt-token-here",           // JWT token dari backend
  userId: "user-uuid",                   // User UUID
  userEmail: "user@example.com",         // User email
  lastLoginAt: "1234567890",             // Timestamp login
  sessionMaxAgeDays: "30",               // Max session duration (days)
}
```

### Session Expiration

Formula:

```javascript
const isExpired =
  (Date.now() - lastLoginAt) / (1000 * 60 * 60 * 24) > sessionMaxAgeDays;
```

**Default:** 30 hari

**When Expired:**

1. Clear all auth data
2. Redirect to `/signin`
3. Show "Session expired" message (optional)

---

## 🚪 Logout Process

### Locations

1. **ProfileSettingsPage** - Tombol "Keluar / Logout" (merah)

### Implementation

```typescript
const handleLogout = () => {
  // Clear authentication data
  localStorage.removeItem("userToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("lastLoginAt");
  localStorage.removeItem("sessionMaxAgeDays");

  // Clear user data
  localStorage.removeItem("userPhase");
  localStorage.removeItem("selectedMotivations");
  localStorage.removeItem("countdownDays");
  localStorage.removeItem("streakDays");
  localStorage.removeItem("journeyStartDate");
  localStorage.removeItem("quitDate");
  localStorage.removeItem("actualQuitDate");
  localStorage.removeItem("selectedDays");
  localStorage.removeItem("homeMoneySaved");

  // Redirect to signin
  router.replace("/signin");
};
```

### After Logout

- ✅ Semua localStorage cleared
- ✅ User di-redirect ke `/signin`
- ✅ Tidak bisa akses protected routes
- ✅ Must login ulang untuk akses app

---

## 🔄 Multi-Tab Synchronization

AuthGuard listen ke **storage events** untuk sync logout across tabs:

```typescript
window.addEventListener("storage", (e) => {
  if (e.key === "userToken" || e.key === "userId") {
    checkAuth(); // Re-check authentication
  }
});
```

**Behavior:**

- Logout di tab A → Tab B otomatis logout juga
- Login di tab A → Tab B otomatis detect

---

## 🎨 Loading States

### Authentication Check Loading

Saat check authentication:

```jsx
<div className="flex min-h-screen items-center justify-center bg-gray-50">
  <div className="text-center">
    <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
    <p className="text-sm text-gray-500">Memverifikasi sesi...</p>
  </div>
</div>
```

### Redirect Loading

Saat redirect ke `/signin`:

```jsx
<div className="text-center">
  <div className="animate-spin..."></div>
  <p className="text-sm text-gray-500">Mengalihkan...</p>
</div>
```

---

## 🛠️ Implementation Guide

### Protect New Route

1. **Add to PROTECTED_ROUTES:**

```typescript
// src/components/AuthGuard.tsx
const PROTECTED_ROUTES = [
  // ... existing routes
  "/your-new-route",
];
```

2. **Wrap Component with AuthGuard:**

```tsx
// Your component file
import AuthGuard from "@/components/AuthGuard";

export default function YourPage() {
  return <AuthGuard>{/* Your content */}</AuthGuard>;
}
```

### Make Route Public

Add to PUBLIC_ROUTES:

```typescript
const PUBLIC_ROUTES = [
  // ... existing routes
  "/your-public-route",
];
```

---

## 🧪 Testing

### Test Protected Routes

1. **Without Login:**

```
1. Open browser incognito
2. Navigate to /home
3. Should redirect to /signin
4. Cannot access protected routes
```

2. **With Login:**

```
1. Login via /signin
2. Can access /home, /tracker, etc.
3. All protected routes accessible
```

3. **After Logout:**

```
1. Click "Keluar / Logout" in profile settings
2. Redirected to /signin
3. Try to go back to /home
4. Should redirect to /signin again
```

### Test Session Expiration

1. Login to app
2. Manually change `lastLoginAt` in localStorage:
   ```javascript
   // In browser console
   const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
   localStorage.setItem("lastLoginAt", String(thirtyOneDaysAgo));
   ```
3. Refresh page or navigate
4. Should auto-logout and redirect to `/signin`

### Test Multi-Tab

1. Open app in Tab A (logged in)
2. Open app in Tab B (same browser)
3. Logout from Tab A
4. Tab B should auto-redirect to `/signin`

---

## 🔧 Configuration

### Change Session Duration

```typescript
// On login, set sessionMaxAgeDays
localStorage.setItem("sessionMaxAgeDays", "60"); // 60 days
```

### Custom Redirect Path

```typescript
// In AuthGuard.tsx
if (isProtectedRoute && !authenticated) {
  router.replace("/custom-login-page"); // Change here
}
```

---

## ⚠️ Security Considerations

### ✅ Best Practices

1. **Token Storage:**

   - Token stored in localStorage (acceptable for MVP)
   - Consider httpOnly cookies for production

2. **Session Validation:**

   - Client-side validation only (current)
   - Backend should validate token on API calls

3. **HTTPS Only:**
   - Always use HTTPS in production
   - Prevent man-in-the-middle attacks

### ❌ Current Limitations

1. **No Backend Validation:**

   - Token not verified with backend on route change
   - Trust client-side token

2. **XSS Vulnerability:**

   - localStorage accessible via JavaScript
   - Malicious scripts can steal token

3. **No Token Refresh:**
   - No automatic token refresh
   - User must re-login after expiration

### 🔮 Future Enhancements

1. **Backend Token Validation:**

   ```typescript
   const validateToken = async (token: string) => {
     const response = await fetch("/api/auth/verify", {
       headers: { Authorization: `Bearer ${token}` },
     });
     return response.ok;
   };
   ```

2. **Token Refresh:**

   ```typescript
   const refreshToken = async (refreshToken: string) => {
     const response = await fetch("/api/auth/refresh", {
       method: "POST",
       body: JSON.stringify({ refreshToken }),
     });
     const { accessToken } = await response.json();
     return accessToken;
   };
   ```

3. **Secure Storage:**
   - Move to httpOnly cookies
   - Store refresh token securely
   - Access token in memory only

---

## 📊 Monitoring

### Log Authentication Events

Add to AuthGuard:

```typescript
// Login success
console.log("🔓 User authenticated:", userId);

// Session expired
console.log("⏰ Session expired for user:", userId);

// Logout
console.log("🚪 User logged out:", userId);

// Unauthorized access attempt
console.log("🔒 Unauthorized access to:", pathname);
```

### Analytics (Optional)

Track authentication events:

```typescript
// Track login
analytics.track("user_login", { userId, timestamp });

// Track logout
analytics.track("user_logout", { userId, timestamp });

// Track unauthorized access
analytics.track("unauthorized_access", { route: pathname });
```

---

## 🆘 Troubleshooting

### "Redirect loop to /signin"

**Cause:** Token present but invalid

**Fix:**

```javascript
// Clear localStorage and try again
localStorage.clear();
// Reload page
location.reload();
```

### "Cannot access app after login"

**Cause:** Token not saved correctly

**Check:**

```javascript
console.log("Token:", localStorage.getItem("userToken"));
console.log("UserID:", localStorage.getItem("userId"));
```

### "Auto-logout too frequent"

**Cause:** Short session duration

**Fix:**

```typescript
// Increase sessionMaxAgeDays
localStorage.setItem("sessionMaxAgeDays", "90"); // 90 days
```

---

## 📚 Related Files

- `src/components/AuthGuard.tsx` - Main authentication guard
- `src/components/MainLayout.tsx` - Layout with AuthGuard
- `src/components/ProfileSettingsPage.tsx` - Logout button
- `src/components/NotificationPage.tsx` - Protected page example

---

**Last Updated:** 2025-01-27
