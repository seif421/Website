# Checkout (PayPal, United States)

How it works: the customer fills in a US address, is sent to PayPal to pay, and comes back to
`/checkout/return`. The server then asks PayPal to confirm the payment and only then marks the order paid
and lowers the stock. Prices, shipping and tax are always calculated in the database, never in the browser.

## Settings you can change (Supabase -> SQL Editor)
```sql
update private.store_config set value = '5.99' where key = 'shipping_flat';       -- flat shipping in USD
update private.store_config set value = '99'   where key = 'free_shipping_over';  -- free shipping from this subtotal ('' = never)
update private.store_config set value = '0.07' where key = 'tax_rate';            -- 0.07 = 7% tax ('0' = none)
```

## Going live with PayPal
1. developer.paypal.com -> Apps & Credentials -> create an app in **Sandbox**, copy Client ID and Secret.
2. Vercel -> Project -> Settings -> Environment Variables: add `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`. Redeploy.
3. Test a purchase with a PayPal sandbox buyer account.
4. When happy: create a **Live** app, replace the two values, set `PAYPAL_ENV=live`, redeploy.
