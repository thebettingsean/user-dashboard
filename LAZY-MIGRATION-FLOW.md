# Lazy Migration Flow - Visual Guide

## **How It Works: Step by Step**

### **Scenario 1: NEW USER (First Visit After Deploy)**

```
User signs up with Clerk
         ↓
User visits dashboard
         ↓
AICreditBadge component loads
         ↓
Calls: GET /api/ai-credits/check
         ↓
API checks: "Does user exist in Supabase?"
         ↓
❌ NO → User not found
         ↓
API calls: POST /api/users/sync (internal)
         ↓
/users/sync fetches Clerk metadata:
  - Email: user@example.com
  - stripeCustomerId: null (free user)
  - isPremium: false
         ↓
Creates user in Supabase:
  {
    clerk_user_id: "user_abc123",
    email: "user@example.com",
    stripe_customer_id: null,
    is_premium: false,
    ai_scripts_used: 0,
    ai_scripts_limit: 3,
    ai_scripts_reset_at: "2025-11-04T00:00:00Z"
  }
         ↓
✅ Returns to /ai-credits/check
         ↓
Badge displays: "3/3 Scripts Remaining"
```

---

### **Scenario 2: EXISTING USER (Subsequent Visits)**

```
User visits dashboard (already signed in)
         ↓
AICreditBadge component loads
         ↓
Calls: GET /api/ai-credits/check
         ↓
API checks: "Does user exist in Supabase?"
         ↓
✅ YES → User found in Supabase
         ↓
Returns credit status:
  {
    authenticated: true,
    hasAccess: true,
    scriptsUsed: 1,  // Used 1 script previously
    scriptsLimit: 3,
    isPremium: false
  }
         ↓
Badge displays: "2/3 Scripts Remaining"
```

**No duplicate creation** - UNIQUE constraint on `clerk_user_id` prevents duplicates.

---

### **Scenario 3: FREE USER UPGRADES TO PREMIUM**

```
User purchases subscription
         ↓
Stripe webhook adds stripeCustomerId to Clerk metadata
  (publicMetadata.stripeCustomerId = "cus_abc123")
         ↓
User visits dashboard
         ↓
AICreditBadge component loads
         ↓
Calls: GET /api/ai-credits/check
         ↓
API fetches user from Supabase
         ↓
User exists, but we check if premium status changed
         ↓
/users/sync is called (on every visit)
         ↓
Detects new stripeCustomerId in Clerk
         ↓
Updates Supabase:
  {
    stripe_customer_id: "cus_abc123",
    is_premium: true  // ← UPDATED
  }
         ↓
Returns to /ai-credits/check
         ↓
Badge displays: "∞ Unlimited Scripts"
```

**Premium status is ALWAYS in sync** because `/users/sync` updates it on every visit.

---

### **Scenario 4: PREMIUM USER CANCELS SUBSCRIPTION**

```
User cancels subscription in Stripe
         ↓
Stripe webhook removes stripeCustomerId from Clerk
  (publicMetadata.stripeCustomerId = null)
         ↓
User visits dashboard
         ↓
AICreditBadge component loads
         ↓
Calls: GET /api/ai-credits/check
         ↓
/users/sync is called
         ↓
Detects stripeCustomerId is now null
         ↓
Updates Supabase:
  {
    stripe_customer_id: null,
    is_premium: false  // ← UPDATED
  }
         ↓
Returns to /ai-credits/check
         ↓
Badge displays: "3/3 Scripts Remaining" (reset to free tier)
```

---

## **Performance & Efficiency**

### **API Call Frequency**

| Event | API Calls | Supabase Operations |
|-------|-----------|---------------------|
| **First visit** | `GET /ai-credits/check` → `POST /users/sync` | 1 INSERT |
| **Subsequent visits** | `GET /ai-credits/check` → `POST /users/sync` | 1 SELECT + 1 UPDATE |
| **Generate script** | `POST /api/ai-credits/use` | 1 UPDATE |

### **Why It's Efficient**

✅ **No polling** - Only checks on page load
✅ **Single sync per visit** - `/users/sync` called once per session
✅ **Indexed queries** - `clerk_user_id` is indexed for fast lookups
✅ **UNIQUE constraint** - Prevents duplicate user creation

---

## **Key Questions Answered**

### **Q: Will it pass user info every time they visit?**
**A:** Yes, but **only to update premium status**. The sync checks:
- Does user exist? If NO → Create
- If YES → Update `is_premium` and `stripe_customer_id`

This ensures premium status is always accurate.

---

### **Q: Will it update based on subscription status in Clerk?**
**A:** **YES!** Every visit:
1. `/users/sync` fetches Clerk `publicMetadata.stripeCustomerId`
2. Updates `is_premium` in Supabase accordingly
3. Returns updated status to badge

**Example:**
- User upgrades → Next visit, badge shows "∞ Unlimited"
- User cancels → Next visit, badge shows "3/3 Remaining"

---

### **Q: What about inactive users (6K total)?**
**A:** They'll be created **when they visit**. But if they never visit after deploy, they're never created. This is fine because:
- They're not using AI scripts anyway
- Saves database storage
- Premium status will be correct when they do visit

---

## **Migration Timeline (Lazy Approach)**

```
Day 1: Deploy + SQL script
  ↓
  0 users in Supabase
  
Day 2: Active users visit
  ↓
  ~500 users created automatically
  
Week 1: Most active users migrated
  ↓
  ~2,000 users created (30-40% of total)
  
Month 1: All active users migrated
  ↓
  ~3,500 users created (50-60% of total)
  
Inactive users: Never migrated (and that's OK!)
```

---

## **Alternative: Instant Migration**

If you want ALL 6K users in Supabase immediately:

```bash
# Run this once after deploy
curl -X POST https://dashboard.thebettinginsider.com/api/admin/migrate-users \
  -H "Authorization: Bearer your-secret-key"

# Result: All 6K users migrated in ~10 minutes
```

But honestly, **lazy is better** because:
- Automatic
- No maintenance
- Premium status always accurate
- Only migrates active users

