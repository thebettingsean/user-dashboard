# Subscription Migration Guide

## ✅ What's Done

1. **Webhook Handler Updated** (`/api/webhooks/stripe-credits`)
   - Now handles both credit purchases AND subscriptions
   - Updates Clerk privateMetadata with subscription info
   - Tracks subscriptions in Supabase for internal records
   - Handles all subscription events:
     - `checkout.session.completed` (for subscriptions)
     - `customer.subscription.created`
     - `customer.subscription.updated` (cancellations, plan changes)
     - `customer.subscription.deleted`

2. **Checkout Flow Updated**
   - `/api/checkout/create-session` already supports subscriptions
   - `/pricing` page now routes to `/checkout/[priceId]` for all plans
   - Same fast, clean UX as credit purchases

3. **Clerk Metadata Structure**
   Your webhook now updates `privateMetadata`:
   ```json
   {
     "stripeCustomerId": "cus_xxx",
     "plan": "price_1SIZoN07WIhZOuSIm8hTDjy4",
     "subscriptionId": "sub_xxx",
     "subscriptionStatus": "active",
     "currentPeriodEnd": 1234567890,
     "cancelAtPeriodEnd": false
   }
   ```

## 🔧 Next Steps (Manual)

### Step 1: Update Stripe Webhook Settings

1. Go to Stripe Dashboard → Developers → Webhooks
2. Find the webhook pointing to `https://ws.insideredgeanalytics.com/clerk-update/webhook`
3. **Option A: Update existing webhook URL** to:
   ```
   https://dashboard.thebettinginsider.com/api/webhooks/stripe-credits
   ```
4. **Option B: Create new webhook** and disable the old one
5. Ensure these events are enabled:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded` (optional, for logging)

6. **Important**: Use the same webhook secret as `STRIPE_WEBHOOK_SECRET_CREDITS` in your env vars

### Step 2: Test Subscription Flow

#### Test Purchase (Stripe Test Mode):
1. Go to `/pricing` on staging
2. Select a subscription plan ($29, $99, or $299)
3. Click "Continue"
4. Complete checkout with test card: `4242 4242 4242 4242`
5. Verify:
   - Webhook receives `checkout.session.completed`
   - Clerk metadata is updated (check `/api/debug/clerk-metadata`)
   - User gains access to premium features
   - Supabase `users` table updated with `is_premium: true`

#### Test Cancellation:
1. Go to Stripe Dashboard → Customers
2. Find test customer, cancel subscription
3. Verify:
   - Webhook receives `customer.subscription.updated` with `cancel_at_period_end: true`
   - Clerk metadata updated
   - User still has access until period end

#### Test Deletion:
1. Delete subscription in Stripe
2. Verify:
   - Webhook receives `customer.subscription.deleted`
   - Clerk metadata cleared (`plan: null`)
   - User loses access immediately
   - Supabase updated with `is_premium: false`

### Step 3: Monitor Webhook Logs

Check your webhook logs for any errors:
```bash
vercel logs --follow
```

Look for these log messages:
- `🔔 Subscription checkout completed`
- `✅ Subscription activated for user`
- `🔄 Subscription updated`
- `🗑️ Subscription deleted`

### Step 4: Disable Old Webhook (After Testing)

Once you've confirmed everything works:
1. Disable the external webhook at `ws.insideredgeanalytics.com`
2. All subscription management is now in-house!

## 🛠️ Troubleshooting

### Webhook Not Receiving Events
- Check Stripe webhook URL is correct
- Verify webhook secret matches `STRIPE_WEBHOOK_SECRET_CREDITS`
- Check webhook signature verification isn't failing

### Metadata Not Updating
- Check Clerk user ID is being found correctly
- Verify Supabase has `stripe_customer_id` stored for user
- Check webhook logs for errors

### User Not Getting Access
- Verify `useSubscription` hook checks `privateMetadata.plan`
- Check `/api/ai-credits/check` is reading Clerk metadata
- Confirm subscription status is `active`

## 📊 Price IDs Reference

- **Weekly Sub**: `price_1SIZoo07WIhZOuSIJB8OGgVU` ($29)
- **Monthly Sub**: `price_1SIZoN07WIhZOuSIm8hTDjy4` ($99)
- **6-Month Sub**: `price_1SIZp507WIhZOuSIFMzU7Kkm` ($299)
- **Credit Pack**: `price_1SPoAC07WIhZOuSIkWA98Qwy` ($10)

## 🎉 Benefits

- ✅ Full control over subscription logic
- ✅ Faster, smoother checkout experience
- ✅ Easier debugging (all logs in one place)
- ✅ No dependency on external services
- ✅ Same fast UX as credit purchases

