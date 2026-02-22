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

app.post('/create_link_token', async (req, res) => {
  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: `pig-user-${Date.now()}` },
      client_name: 'Pig.e',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create link token', error: error.response?.data || error.message });
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
    return res.status(500).json({ message: 'Failed to exchange public token', error: error.response?.data || error.message });
  }
});

app.get('/transactions', async (req, res) => {
  try {
    if (!accessToken) {
      return res.status(400).json({ message: 'Connect a bank first.' });
    }

    const response = await client.transactionsGet({
      access_token: accessToken,
      start_date: '2023-01-01',
      end_date: new Date().toISOString().split('T')[0],
    });

    return res.json(response.data.transactions);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch transactions', error: error.response?.data || error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Pig.e backend running on port ${port} 🐷`));
