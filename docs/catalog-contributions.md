# Catalog prices and author listings

Explore opens on **Books**. Choose **Free only** or **Paid only** from Access.
For paid books, **Price: Low to high** orders all matching offers by their
peso amounts before pagination. Books without a reviewed price appear after
priced titles. The publisher handles sales and checkout.

The initial snapshot covers 108 of the 166 paid catalog titles. Each record
in `backend/app/data/publisher_prices.json` links to the publisher or authorized
offer and identifies its format and check date. Sources whose offer, currency,
edition, or availability could not be established keep **Check price at publisher**.
The USD estimates use the [November 24, 2026 BSP daily USD rate](https://www.bsp.gov.ph/statistics/external/day99_data.aspx)
of ₱63.863 per dollar. The EUR estimates use ₱71.3865 per euro from the October 30,
2026 row of the [BSP Philippine Peso Cross Rates sheet](https://www.bsp.gov.ph/statistics/external/dailycrossrates.xlsx).
Treat prices as dated snapshots. In **Administration → Book management**, use the
**Price** action to enter a verified offer, refresh its dates and rate, or clear it.

## Contributor workflow

1. On the website, sign in and choose **Submit a listing** in Explore.
2. Enter the official HTTPS link and a separate link that shows your authorship
   or permission. Confirm that you authorize the listing. **My submissions**
   shows review status and decline reasons.
3. In **Administration → Review submissions**, open the source and evidence to
   verify the identity or permission claim. Approve, decline with a reason,
   or archive an approved listing.
4. Approved books join the regular catalog. Tutorials, courses, documentation,
   and tools appear under **Resources** in Explore on web and Android.
   They open at their original sites. Permission evidence stays in the review queue.

## Release order

Apply Alembic revision `0004` before starting the new backend. Run the existing
catalog seed if the target does not already have the catalog, then import the
reviewed price snapshot:

```bash
cd backend
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.services.offer_seed
```

For the packaged Wasmer backend, use `migrate` and `seed-prices` with the existing
server-side environment as documented in [deployment.md](deployment.md). The price
import adds missing offers for active seed records and preserves administrator
edits and decisions. Continue updates through the admin price editor.

Deploy the compatible backend before the web build or distributing the updated
APK. Verify a public paid price, a free filter, and an approved test resource on
the target environment. Roll back application versions first if needed. Dropping
revision `0004` also drops new price and submission data, so export it before any
explicit schema downgrade. The original catalog, book IDs, favorites, and download
history remain in place.
