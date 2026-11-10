# Checkout (Egypt, cash on delivery)

Customers choose a governorate, enter their details and place the order. They pay the courier in cash when it arrives.
Nothing is charged online. PayPal was removed for the Egypt launch (the database functions for it are left in place, unused).

## How an order flows

1. Customer places the order on `/checkout`. The order is saved as **Pending** with the tag `needs-confirmation`.
2. In **Admin > Orders**, open the order, call or WhatsApp the customer, then press **Confirmed by phone**.
3. Copy the details from **Send to supplier** and place the order with your supplier (for example Taager). Save the supplier's order number.
4. When the courier takes the parcel, set the status to **Shipped** and save the tracking number.
5. When the courier delivers and the cash is collected, press **Delivered, cash received**. The payment is marked paid.
   If the customer refuses the parcel, press **Refused or returned**.

## Settings (Admin > Delivery fees)

- Delivery fee per governorate (EGP). The starting numbers are placeholders: replace them with your courier's rates.
- Free delivery over a given order value (optional).
- Largest cash on delivery order (default 10,000 EGP).

## Database

Prices, delivery fees and totals are calculated in the database (`quote_order_eg`, `create_cod_order`), never trusted from the browser.
Fees and settings live in the private schema and are changed through admin-only functions. See
`supabase/migrations/20261105100000_egypt_cod_checkout.sql`.
