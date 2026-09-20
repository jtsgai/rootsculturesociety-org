# Admin flow — issue a member for 1 year

Operator: site administrator (jtsgai).

1. Receive S$99 offline (PayNow / cash / cheque). Record date and payer name outside the website.
2. Open `/admin/members`.
3. System suggests next ID (first live ID = R1001).
4. Enter: member name, required email, required phone number, membership start date (default today), end date (start + 1 year). Contact details are private and used only for Society administration.
5. Generate initial password (8 characters). Show once. Send via WhatsApp or paper. Do not email passwords to a shared inbox.
6. Member logs in at `/studio/login` with ID + password, must change password.
7. 30 days before expiry, admin contacts member to renew. If not renewed, account status = suspended; data kept 24 months then deleted or de-identified.
8. Forgotten password: admin sets a new initial password. No public reset form in Phase 1.

Admin never sees the new password hash; only the one-time plaintext at creation/reset.
