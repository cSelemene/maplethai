# Payment amounts and credit

- QR receiver data was decoded from the original KBank image; recipient fields are preserved. Tag 54 contains the remaining amount in THB and the checksum is recalculated. The original payment image is composed at runtime with the generated QR. No bank account is inferred from another identifier.
- Credit uses integer satang. Prices and receiver snapshots come from the server. Creating an order atomically reserves available credit; cancelling an awaiting-slip order releases it. If credit covers the price, the server grants access without asking for another transfer.
- A verified transfer below the remaining amount becomes credit, releases reserved credit, closes the order as `credited`, and does not grant its product. The customer chooses a new product/order. A transfer meeting the remaining amount grants the selected product; the excess stays as credit.
- Credit records are append-only through private server functions. Customers can read only their own ledger. The database atomically consumes each bank reference once across all orders and also checks historical payment references.
- EasySlip's cached/duplicate response means the provider has inspected the slip, not that MapleThai granted a product. Valid cached results can be reconciled only through the database reference constraint; the provider still verifies recipient, actual amount and timestamp.
- Existing pending payments are not silently credited. An admin can retry automatic verification or inspect the bank transaction and record its actual amount/reference. A duplicate pending order using a receipt already recorded for the same customer closes without another credit or entitlement.
- Manual review supports whole baht with the existing RPC and decimals through `admin_record_transfer`. Do not approve from the image alone: confirm the incoming bank transaction/reference.

Validation: rolled-back SQL receipt/credit/reservation tests; Node receipt and QR checks; original-frame QR generation decoded independently at 49 and 99 THB; browser checkout/account/admin tests in CI. There are no withdrawals or automated refunds in this version; those remain admin support workflows.
