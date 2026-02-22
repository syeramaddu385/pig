const API_BASE = 'http://localhost:3000';
const HISTORY_KEY = 'pigEHistory';

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
  const totalSaved = document.getElementById('totalSaved');
  if (!totalSaved) {
    return;
  }
  totalSaved.textContent = state.total.toFixed(2);
  document.getElementById('investmentsTotal').textContent = state.allocations.investments.toFixed(2);
  document.getElementById('longTermTotal').textContent = state.allocations.longTermGoal.toFixed(2);
  document.getElementById('generalTotal').textContent = state.allocations.generalSavings.toFixed(2);
}

function setStatus(message) {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = message;
  }
}

function saveHistoryEntry(entry) {
  const current = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  current.unshift({ ...entry, decided_at: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(current.slice(0, 200)));
}

async function getErrorMessage(response, fallbackMessage) {
  try {
    const body = await response.json();
    return body?.message || body?.plaid_error?.error_message || JSON.stringify(body);
  } catch {
    return fallbackMessage;
  }
}

function roundUpAmount(amount) {
  return Math.max(0, Number((Math.ceil(amount) - amount).toFixed(2)));
}

function addSavings(amount, bucket) {
  state.total += amount;
  state.allocations[bucket] += amount;
  updateTotals();
}

function removeCard(card) {
  card.remove();
  const container = document.getElementById('transactions');
  if (!container.children.length) {
    container.innerHTML = '<p>All recent transactions processed.</p>';
  }
}

function renderTransactions(transactions) {
  const container = document.getElementById('transactions');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const debitTransactions = transactions
    .filter((tx) => tx.amount > 0)
    .slice(0, 8);

  if (!debitTransactions.length) {
    container.innerHTML = '<p>No recent debit transactions found in sandbox.</p>';
    return;
  }

  debitTransactions.forEach((tx) => {
    const card = document.createElement('div');
    card.className = 'transaction-card';

    const roundUp = roundUpAmount(tx.amount);
    const allowPercent = tx.amount > 50;

    card.innerHTML = `
      <div class="transaction-header">
        <strong>${tx.name}</strong>
        <span>$${tx.amount.toFixed(2)}</span>
      </div>
      <small>Round up amount: $${roundUp.toFixed(2)}</small>
      <div class="transaction-actions">
        <select class="bucket-select">
          <option value="investments">Investments</option>
          <option value="longTermGoal">Long-Term Goal</option>
          <option value="generalSavings">General Savings</option>
        </select>
        <button class="round-btn">Round Up</button>
        ${allowPercent ? '<input class="percent-input" type="number" min="1" max="100" value="5" />' : ''}
        ${allowPercent ? '<button class="percent-btn">Save %</button>' : ''}
        <button class="skip-btn">Skip</button>
      </div>
    `;

    const select = card.querySelector('.bucket-select');
    const roundBtn = card.querySelector('.round-btn');
    const skipBtn = card.querySelector('.skip-btn');
    const percentBtn = card.querySelector('.percent-btn');
    const percentInput = card.querySelector('.percent-input');

    roundBtn.addEventListener('click', () => {
      addSavings(roundUp, select.value);
      saveHistoryEntry({ transaction_name: tx.name, transaction_amount: tx.amount, decision: 'round_up', amount_saved: roundUp, bucket: select.value });
      setStatus(`Saved $${roundUp.toFixed(2)} from ${tx.name}.`);
      removeCard(card);
    });

    if (percentBtn && percentInput) {
      percentBtn.addEventListener('click', () => {
        const percent = Number(percentInput.value);
        if (!percent || percent < 1 || percent > 100) {
          setStatus('Please enter a percent between 1 and 100.');
          return;
        }
        const percentAmount = Number((tx.amount * (percent / 100)).toFixed(2));
        addSavings(percentAmount, select.value);
        saveHistoryEntry({ transaction_name: tx.name, transaction_amount: tx.amount, decision: `save_${percent}_percent`, amount_saved: percentAmount, bucket: select.value });
        setStatus(`Saved ${percent}% ($${percentAmount.toFixed(2)}) from ${tx.name}.`);
        removeCard(card);
      });
    }

    skipBtn.addEventListener('click', () => {
      saveHistoryEntry({ transaction_name: tx.name, transaction_amount: tx.amount, decision: 'skip', amount_saved: 0, bucket: null });
      setStatus(`Skipped ${tx.name}.`);
      removeCard(card);
    });

    container.appendChild(card);
  });
}

async function fetchTransactions() {
  const response = await fetch(`${API_BASE}/transactions`);
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to fetch transactions.'));
  }

  const data = await response.json();
  renderTransactions(data);
}

async function createLinkToken() {
  const response = await fetch(`${API_BASE}/create_link_token`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to create link token.'));
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
    throw new Error(await getErrorMessage(response, 'Unable to exchange public token.'));
  }
}

async function initializePlaid() {
  const linkToken = await createLinkToken();

  plaidHandler = Plaid.create({
    token: linkToken,
    onSuccess: async (publicToken) => {
      await exchangePublicToken(publicToken);
      setStatus('Bank connected. Redirecting to transactions...');
      window.location.href = 'transactions.html';
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

function initConnectPage() {
  const connectBtn = document.getElementById('connectBankBtn');
  if (!connectBtn) {
    return;
  }
  connectBtn.addEventListener('click', connectBank);
}

async function initTransactionsPage() {
  if (!document.getElementById('transactions')) {
    return;
  }
  updateTotals();
  try {
    await fetchTransactions();
    setStatus('Transactions loaded.');
  } catch (error) {
    setStatus(error.message);
  }
}

initConnectPage();
initTransactionsPage();
