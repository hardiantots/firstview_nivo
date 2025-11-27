# 🔐 Security Best Practices - NIVO App

## 📌 Critical: Never Commit Secrets!

### ✅ What's Safe to Commit:

- `.env.example` (template with dummy values)
- Public configuration files
- Code files
- Documentation

### ❌ Never Commit:

- `.env` or `.env.local` (contains real secrets!)
- API keys
- Database passwords
- Service account credentials
- Private keys

---

## 🛡️ Environment Variables Security

### Public vs Private Variables

**Public Variables (NEXT*PUBLIC*\*):**

- Exposed to the browser
- Safe for frontend use
- Can be seen in Network tab
- Examples: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SITE_URL`

**Private Variables:**

- Only available on server-side
- Never exposed to browser
- Examples: `OPENROUTER_API_KEY`, `DATABASE_URL`

### Rule of Thumb:

> If it starts with `NEXT_PUBLIC_`, it's visible to users. Only use for non-sensitive data!

---

## 🔒 Supabase Security

### 1. Row Level Security (RLS)

**Enable RLS on ALL tables:**

```sql
-- Enable RLS
ALTER TABLE craving_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE smoke_free_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can view own data"
ON craving_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
ON craving_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
ON craving_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
ON craving_logs FOR DELETE
USING (auth.uid() = user_id);
```

**Apply similar policies to all tables!**

### 2. API Key Types

- **anon key** ✅ - Safe for frontend, respects RLS
- **service_role key** ❌ - NEVER expose to frontend! Bypasses RLS

### 3. CORS Configuration

In Supabase Dashboard → **Settings** → **API Settings**:

**Allowed Origins:**

```
https://your-domain.vercel.app
http://localhost:3000
```

---

## 🔐 OpenRouter API Security

### Best Practices:

1. **Monitor Usage:**

   - Check https://openrouter.ai/activity regularly
   - Set spending limits in OpenRouter dashboard

2. **Rate Limiting:**

   - Implement rate limiting in your API routes
   - Consider adding user-based quotas

3. **Error Handling:**
   - Don't expose API key in error messages
   - Log errors server-side, not client-side

### Example Rate Limiting (Future Enhancement):

```typescript
// app/api/ai-support/route.ts
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Check rate limit (e.g., 10 requests per hour per user)
  const userId = getUserIdFromRequest(req);
  const isAllowed = await rateLimit(userId, 10, 3600);

  if (!isAllowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  // ... rest of the code
}
```

---

## 🌐 Production Security Checklist

### Before Deployment:

- [ ] All `.env*` files in `.gitignore`
- [ ] No hardcoded secrets in code
- [ ] Environment variables set in Vercel
- [ ] Supabase RLS enabled on all tables
- [ ] Only `anon` key used in frontend
- [ ] CORS configured in Supabase
- [ ] API rate limiting considered
- [ ] Error messages don't expose secrets

### After Deployment:

- [ ] Test authentication flows
- [ ] Verify RLS policies work
- [ ] Check for console errors
- [ ] Monitor API usage
- [ ] Set up alerts for unusual activity

---

## 🚨 If Secrets Are Exposed

### Immediate Actions:

1. **Rotate All Keys:**

   - Generate new Supabase anon key
   - Generate new OpenRouter API key
   - Update environment variables

2. **Supabase:**

   - Dashboard → Settings → API → Reset anon key
   - Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel

3. **OpenRouter:**

   - https://openrouter.ai/keys → Revoke old key
   - Create new key
   - Update `OPENROUTER_API_KEY` in Vercel

4. **GitHub:**
   - If secrets were committed, consider them compromised
   - Use `git filter-branch` or `BFG Repo-Cleaner` to remove from history
   - Force push to GitHub (⚠️ only if repository is private and you're the only contributor)

---

## 🔍 Security Auditing

### Regular Checks:

**Weekly:**

- Review Supabase logs for suspicious activity
- Check OpenRouter usage for unusual spikes
- Monitor Vercel deployment logs

**Monthly:**

- Audit RLS policies
- Review user access patterns
- Update dependencies (`npm audit`)

**Quarterly:**

- Rotate API keys (best practice)
- Review and update security policies
- Penetration testing (if possible)

---

## 🛠️ Tools for Security

### Recommended Tools:

1. **git-secrets** - Prevent committing secrets

   ```bash
   # Install
   brew install git-secrets  # macOS

   # Setup
   git secrets --install
   git secrets --register-aws
   ```

2. **npm audit** - Check for vulnerable dependencies

   ```bash
   npm audit
   npm audit fix
   ```

3. **Dependabot** - Automated security updates (GitHub)

   - Enable in repository settings

4. **Snyk** - Continuous security monitoring
   - https://snyk.io/

---

## 📞 Incident Response

### If You Suspect a Security Breach:

1. **Immediately:**

   - Rotate all API keys
   - Check Supabase logs for unauthorized access
   - Review recent code changes

2. **Investigate:**

   - Check user_profile table for suspicious accounts
   - Review ai_suggestions for unusual patterns
   - Monitor OpenRouter usage

3. **Notify:**

   - Inform affected users if data was compromised
   - Report to relevant authorities if required by law

4. **Document:**
   - Keep detailed logs of the incident
   - Document steps taken to resolve
   - Update security practices

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Vercel Security](https://vercel.com/security)

---

## 💡 Security Tips

1. **Use Strong Passwords** for all services
2. **Enable 2FA** on GitHub, Vercel, Supabase, OpenRouter
3. **Limit Access** - Only give team members necessary permissions
4. **Regular Backups** - Backup Supabase database regularly
5. **Stay Updated** - Keep all dependencies up to date
6. **Monitor** - Set up alerts for unusual activity
7. **Educate** - Ensure all team members understand security best practices

---

> 🔒 **Remember:** Security is an ongoing process, not a one-time task!
