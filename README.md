# pig.E (Hackathon Demo)

Simple demo app using Plaid Sandbox:
- Connect a bank account with Plaid Link.
- Pull recent transactions.
- For each transaction, choose **Round Up**, **Save %** (for transactions > $50), or **Skip**.
- Allocate savings to **Investments**, **Long-Term Goal**, or **General Savings**.
- Processed items are removed from Recent Transactions and tracked in `history.html`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add Plaid sandbox credentials to `.env`:
   ```env
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_sandbox_secret
   PLAID_ENV=sandbox
   PORT=3000
   ```
3. Start backend:
   ```bash
   node server.js
   ```
4. Confirm backend health:
   ```bash
   curl http://localhost:3000/health
   ```
5. Open `connect.html` in your browser (or `index.html`, which redirects).

## Troubleshooting

- If the app says env variables are wrong, open `http://localhost:3000/health`.
  - `credentials_loaded: true` means backend read your `.env`.
- The UI now shows the backend/Plaid error message directly so you can see exactly what Plaid returned.
- Transactions endpoint uses last 30 days to avoid Plaid date-range validation issues.

## Notes
- This is intentionally lightweight for demo/hackathon use.
- Uses in-memory totals (refresh resets allocations).


## Pages
- `connect.html`: Plaid bank connection page.
- `transactions.html`: piggy bank + recent transactions actions.
- `history.html`: round up / save% / skip history.
