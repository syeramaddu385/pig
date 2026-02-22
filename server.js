require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const app = express();
app.use(express.json());
app.use(cors());

const envName = process.env.PLAID_ENV || 'sandbox';
const plaidEnv = PlaidEnvironments[envName];
const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;

if (!plaidEnv) {
  throw new Error(`Invalid PLAID_ENV "${envName}". Use sandbox, development, or production.`);
}

if (!clientId || !secret) {
  console.warn('Missing PLAID_CLIENT_ID or PLAID_SECRET in .env');
}

const configuration = new Configuration({
  basePath: plaidEnv,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
    },
  },
});

const client = new PlaidApi(configuration);
let accessToken = null;

function extractPlaidError(error) {
  return error.response?.data || { message: error.message };
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

app.get('/health', (req, res) => {
  const hasCreds = Boolean(clientId && secret);
  return res.json({
    ok: true,
    plaid_env: envName,
    credentials_loaded: hasCreds,
    connected_item: Boolean(accessToken),
  });
});

app.post('/create_link_token', async (req, res) => {
  try {
    if (!clientId || !secret) {
      return res.status(500).json({
        message: 'Missing PLAID_CLIENT_ID or PLAID_SECRET in backend environment.',
      });
    }

    const response = await client.linkTokenCreate({
      user: { client_user_id: `pig-user-${Date.now()}` },
      client_name: 'Pig.e',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });

    return res.json(response.data);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create link token', plaid_error: extractPlaidError(error) });
  }
});

app.post('/exchange_public_token', async (req, res) => {
  try {
    const { public_token: publicToken } = req.body;

    if (!publicToken) {
      return res.status(400).json({ message: 'public_token is required' });
    }

    const response = await client.itemPublicTokenExchange({ public_token: publicToken });
    accessToken = response.data.access_token;
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to exchange public token', plaid_error: extractPlaidError(error) });
  }
});

app.get('/transactions', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(400).json({ message: 'Connect a bank first.' });
    }

    const response = await client.transactionsGet({
      access_token: accessToken,
      start_date: dateDaysAgo(30),
      end_date: new Date().toISOString().split('T')[0],
    });

    return res.json(response.data.transactions);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch transactions', plaid_error: extractPlaidError(error) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Pig.e backend running on port ${port} 🐷 (Plaid: ${envName})`));
