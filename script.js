const API_BASE = 'http://localhost:3000';

let plaidHandler;
const state = {
  total: 0,
  allocations: {
    investments: 0,
    longTermGoal: 0,
    generalSavings: 0,
  },
};

function updateTotals() {
  document.getElementById('totalSaved').textContent = state.total.toFixed(2);
  document.getElementById('investmentsTotal').textContent = state.allocations.investments.toFixed(2);
  document.getElementById('longTermTotal').textContent = state.allocations.longTermGoal.toFixed(2);
  document.getElementById('generalTotal').textContent = state.allocations.generalSavings.toFixed(2);
}

function setStatus(message) {
  document.getElementById('status').textContent = message;
}

function roundUpAmount(amount) {
  return Math.max(0, Number((Math.ceil(amount) - amount).toFixed(2)));
}

function applyRoundUp(amount, bucket) {
  state.total += amount;
  state.allocations[bucket] += amount;
  updateTotals();
}

function renderTransactions(transactions) {
  const container = document.getElementById('transactions');
  container.innerHTML = '';

  const debitTransactions = transactions
    .filter((tx) => tx.amount > 0)
    .slice(0, 8);

  if (!debitTransactions.length) {
    container.innerHTML = '<p>No transactions found yet in sandbox.</p>';
    return;
  }

  debitTransactions.forEach((tx) => {
    const card = document.createElement('div');
    card.className = 'transaction-card';

    const roundUp = roundUpAmount(tx.amount);

    card.innerHTML = `
      <div class="transaction-header">
        <strong>${tx.name}</strong>
        <span>$${tx.amount.toFixed(2)}</span>
      </div>
      <small>Round up amount: $${roundUp.toFixed(2)}</small>
      <div class="transaction-actions">
        <select>
          <option value="investments">Investments</option>
          <option value="longTermGoal">Long-Term Goal</option>
          <option value="generalSavings">General Savings</option>
        </select>
        <button>Round Up</button>
        <button>Skip</button>
      </div>
    `;

    const select = card.querySelector('select');
    const [roundBtn, skipBtn] = card.querySelectorAll('button');

    roundBtn.addEventListener('click', () => {
      applyRoundUp(roundUp, select.value);
      setStatus(`Saved $${roundUp.toFixed(2)} from ${tx.name}.`);
      roundBtn.disabled = true;
      skipBtn.disabled = true;
      select.disabled = true;
    });

    skipBtn.addEventListener('click', () => {
      setStatus(`Skipped ${tx.name}.`);
      roundBtn.disabled = true;
      skipBtn.disabled = true;
      select.disabled = true;
    });

    container.appendChild(card);
  });
}

async function fetchTransactions() {
  const response = await fetch(`${API_BASE}/transactions`);
  if (!response.ok) {
    throw new Error('Unable to fetch transactions. Connect bank first.');
  }

  const data = await response.json();
  renderTransactions(data);
}

async function createLinkToken() {
  const response = await fetch(`${API_BASE}/create_link_token`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Unable to create link token. Check Plaid env values.');
  }

  const data = await response.json();
  return data.link_token;
}

async function exchangePublicToken(publicToken) {
  const response = await fetch(`${API_BASE}/exchange_public_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_token: publicToken }),
  });

  if (!response.ok) {
    throw new Error('Unable to exchange public token.');
  }
}

async function initializePlaid() {
  const linkToken = await createLinkToken();

  plaidHandler = Plaid.create({
    token: linkToken,
    onSuccess: async (publicToken) => {
      await exchangePublicToken(publicToken);
      setStatus('Bank connected. Loading transactions...');
      await fetchTransactions();
    },
    onExit: () => setStatus('Plaid Link closed.'),
  });
}

async function connectBank() {
  try {
    setStatus('Initializing Plaid Link...');
    if (!plaidHandler) {
      await initializePlaid();
    }
    plaidHandler.open();
  } catch (error) {
    setStatus(error.message);
  }
}

document.getElementById('connectBankBtn').addEventListener('click', connectBank);
updateTotals();
