require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const app = express();
app.use(express.json());
app.use(cors());

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

let accessToken = null;

// Create Link Token
app.post('/create_link_token', async (req, res) => {
  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: 'pig-e-user' },
      client_name: 'Pig.e',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });

    res.json(response.data);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Exchange public token
app.post('/exchange_public_token', async (req, res) => {
  try {
    const { public_token } = req.body;

    const response = await client.itemPublicTokenExchange({
      public_token: public_token,
    });

    accessToken = response.data.access_token;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get transactions
app.get('/transactions', async (req, res) => {
  try {
    const response = await client.transactionsGet({
      access_token: accessToken,
      start_date: '2023-01-01',
      end_date: new Date().toISOString().split('T')[0],
    });

    res.json(response.data.transactions);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.listen(3000, () => console.log("Pig.e backend running on port 3000 🐷"));