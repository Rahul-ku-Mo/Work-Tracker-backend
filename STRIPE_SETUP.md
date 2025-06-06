# Stripe Configuration Setup

To enable billing functionality in PulseBoard, you need to add the following environment variables to your `.env` file:

## Required Environment Variables

Add these lines to your `backend/.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_ID_PRO=price_your_stripe_price_id_for_pro_plan

# Optional: For production
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## How to Get These Values

### 1. Stripe Secret Key
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers > API Keys**
3. Copy the **Secret key** (starts with `sk_test_` for test mode)

### 2. Stripe Price ID for Pro Plan
1. In Stripe Dashboard, go to **Products**
2. Create a new product for "PulseBoard Professional" 
3. Set the price to $10/month (or your desired amount)
4. Copy the **Price ID** (starts with `price_`)

### 3. Webhook Secret (Optional, for production)
1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Create a new webhook endpoint pointing to your server: `https://yourdomain.com/api/billing/webhook`
3. Select the following events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing secret** (starts with `whsec_`)

## Testing Without Stripe

The application will work without Stripe configuration, but with limited functionality:
- ✅ Pricing page will display plans
- ✅ Free plan will work normally
- ❌ Upgrade to Pro plan will show error
- ❌ Billing management features will be disabled

## Current Status

Your PulseBoard application is running with billing infrastructure ready. To enable full billing functionality:

1. Sign up for a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add the environment variables to your `.env` file
4. Restart the backend server

## Frontend Environment Variables

You may also want to add to your `frontend/.env` file:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

This allows the frontend to initialize Stripe for payment processing. 