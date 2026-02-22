# pig.E (Hackathon Demo)

Simple demo app using Plaid Sandbox:
- Connect a bank account with Plaid Link.
- Pull recent transactions.
- For each transaction, choose **Round Up** or **Skip**.
- Allocate round-ups to **Investments**, **Long-Term Goal**, or **General Savings**.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Add Plaid sandbox credentials to `.env`:
   ```env
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_sandbox_secret
   PORT=3000
   ```
3. Start backend:
   ```bash
   node server.js
   ```
4. Open `index.html` in your browser.

## Notes
- This is intentionally lightweight for demo/hackathon use.
- Uses in-memory totals (refresh resets allocations).
