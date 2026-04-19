const apiHost = window.location.hostname || "127.0.0.1";
const API_BASE = `${window.location.protocol === "https:" ? "https" : "http"}://${apiHost}:8000/api/v1`;
const API_TIMEOUT_MS = 7000;

let token = "";
let profile = {
  full_name: "Traveler",
  email: "-",
};

const landing = document.getElementById("landing");
const dashboard = document.getElementById("dashboard");
const authModal = document.getElementById("authModal");
const apiNote = document.getElementById("apiNote");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const tripForm = document.getElementById("tripForm");
const expenseForm = document.getElementById("expenseForm");
const ledgerForm = document.getElementById("ledgerForm");

const tripList = document.getElementById("tripList");
const statusBox = document.getElementById("status");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const expenseTripSelect = expenseForm.elements.trip_id;
const expenseDaySelect = expenseForm.elements.day_label;
const ledgerTripSelect = ledgerForm.elements.trip_id;
const ledgerTotal = document.getElementById("ledgerTotal");
const ledgerCurrency = document.getElementById("ledgerCurrency");
const ledgerTable = document.getElementById("ledgerTable");

let currentTrips = [];

function setStatus(text, isError = false) {
  statusBox.textContent = text;
  statusBox.style.color = isError ? "#ff8f8f" : "#8cffbf";
}

function setApiNote(state, message) {
  apiNote.className = `api-pill ${state}`;
  apiNote.textContent = message;
}

async function apiFetch(url, options = {}) {
  setApiNote("working", "API checking...");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (response.ok) {
      setApiNote("ok", "API is working");
    } else {
      setApiNote("error", "API responded with error");
    }
    return response;
  } catch (_error) {
    setApiNote("error", "API is not reachable");
    throw _error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getErrorMessage(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload.detail || payload.message || fallbackMessage;
  } catch (_error) {
    return fallbackMessage;
  }
}

async function pingApi() {
  const rootUrl = API_BASE.replace("/api/v1", "");
  try {
    const response = await apiFetch(`${rootUrl}/`);
    if (!response.ok) {
      setApiNote("error", "API responded with error");
      return;
    }
    setApiNote("ok", "API is working");
  } catch (_error) {
    setApiNote("error", "API is not reachable");
    setStatus("Backend not reachable. Start FastAPI on port 8000.", true);
  }
}

function authHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function openModal(mode = "login") {
  document.getElementById("authTitle").textContent = mode === "signup" ? "Create Account" : "Login";
  loginForm.classList.toggle("hidden", mode !== "login");
  registerForm.classList.toggle("hidden", mode !== "signup");
  authModal.showModal();
}

function closeModal() {
  authModal.close();
}

function showDashboard() {
  landing.classList.add("hidden");
  dashboard.classList.remove("hidden");
  profileName.textContent = profile.full_name || "Traveler";
  profileEmail.textContent = profile.email || "-";
}

function getTripDurationDays(trip) {
  const start = new Date(`${trip.start_date}T00:00:00`);
  const end = new Date(`${trip.end_date}T00:00:00`);
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function buildDayOptions(trip) {
  if (!trip) {
    expenseDaySelect.innerHTML = '<option value="Day 1">Day 1</option>';
    expenseDaySelect.value = "Day 1";
    return;
  }

  const totalDays = getTripDurationDays(trip);
  const options = [];
  for (let index = 0; index < totalDays; index += 1) {
    options.push(`<option value="Day ${index + 1}">Day ${index + 1}</option>`);
  }

  expenseDaySelect.innerHTML = options.join("");
  expenseDaySelect.value = "Day 1";
}

function getTripById(tripId) {
  return currentTrips.find((trip) => String(trip.id) === String(tripId));
}

function renderLedger(expenses, trip) {
  const baseCurrency = trip?.base_currency || "INR";
  let runningTotal = 0;

  if (!expenses.length) {
    ledgerTotal.textContent = `0.00 ${baseCurrency}`;
    ledgerCurrency.textContent = baseCurrency;
    ledgerTable.innerHTML = '<p class="subtle">No expenses added yet for this trip.</p>';
    return;
  }

  const rows = expenses
    .map((expense) => {
      runningTotal += Number(expense.converted_amount || 0);
      return `
        <tr>
          <td>${expense.day_label || "Day 1"}</td>
          <td>${expense.category}</td>
          <td>${expense.amount} ${expense.currency}</td>
          <td>${expense.converted_amount} ${expense.base_currency}</td>
          <td>${expense.description || "-"}</td>
          <td>${runningTotal.toFixed(2)} ${baseCurrency}</td>
          <td><button class="btn ghost ledger-delete" type="button" data-expense-id="${expense.id}" data-trip-id="${expense.trip_id}">Delete</button></td>
        </tr>
      `;
    })
    .join("");

  ledgerTotal.textContent = `${runningTotal.toFixed(2)} ${baseCurrency}`;
  ledgerCurrency.textContent = baseCurrency;
  ledgerTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Day</th>
          <th>Category</th>
          <th>Original</th>
          <th>Base Currency</th>
          <th>Description</th>
          <th>Running Total</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function loadTripLedger(tripId) {
  if (!tripId) {
    ledgerTable.innerHTML = '<p class="subtle">Select a trip to view its ledger.</p>';
    ledgerTotal.textContent = `0.00 INR`;
    ledgerCurrency.textContent = "INR";
    return;
  }

  const response = await apiFetch(`${API_BASE}/trips/${tripId}/ledger`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    setStatus(await getErrorMessage(response, "Could not load ledger."), true);
    return;
  }

  const data = await response.json();
  renderLedger(data.expenses || [], data.trip);
  setStatus("Ledger loaded.");
}

async function loginWithPassword(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const response = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!response.ok) {
    setStatus(await getErrorMessage(response, "Login failed. Check email/password."), true);
    return false;
  }

  const data = await response.json();
  token = data.access_token;
  setStatus("Login successful. Redirected to personal information.");
  closeModal();
  showDashboard();
  await refreshTrips();
  return true;
}

async function refreshTrips() {
  if (!token) {
    return;
  }

  const response = await apiFetch(`${API_BASE}/trips`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    setStatus("Unable to fetch trips.", true);
    return;
  }

  const trips = await response.json();
  currentTrips = trips;

  if (!trips.length) {
    tripList.innerHTML = "<p>No trips yet. Create your first trip above.</p>";
    expenseTripSelect.innerHTML = '<option value="">Select a trip</option>';
    ledgerTripSelect.innerHTML = '<option value="">Select a trip</option>';
    buildDayOptions(null);
    ledgerTable.innerHTML = '<p class="subtle">Select a trip to view its ledger.</p>';
    return;
  }

  const tripOptions = `
    <option value="">Select a trip</option>
    ${trips.map((trip) => `<option value="${trip.id}">${trip.id} - ${trip.title}</option>`).join("")}
  `;
  expenseTripSelect.innerHTML = tripOptions;
  ledgerTripSelect.innerHTML = tripOptions;
  expenseTripSelect.value = trips[0].id;
  ledgerTripSelect.value = trips[0].id;
  buildDayOptions(getTripById(expenseTripSelect.value));

  tripList.innerHTML = `
    <table>
      <thead>
        <tr><th>ID</th><th>Title</th><th>Country</th><th>Date Range</th><th>Base</th></tr>
      </thead>
      <tbody>
        ${trips
          .map(
            (trip) =>
              `<tr><td>${trip.id}</td><td>${trip.title}</td><td>${trip.destination_country}</td><td>${trip.start_date} to ${trip.end_date}</td><td>${trip.base_currency}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  await loadTripLedger(ledgerTripSelect.value);
}

document.getElementById("openLogin").addEventListener("click", () => openModal("login"));
document.getElementById("openSignup").addEventListener("click", () => openModal("signup"));
document.getElementById("heroLogin").addEventListener("click", () => openModal("login"));
document.getElementById("heroSignup").addEventListener("click", () => openModal("signup"));
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("switchToSignup").addEventListener("click", () => openModal("signup"));
document.getElementById("switchToLogin").addEventListener("click", () => openModal("login"));

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(registerForm).entries());

  const response = await apiFetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    setStatus(await getErrorMessage(response, "Sign-up failed. Try a different email."), true);
    return;
  }

  profile = {
    full_name: data.full_name,
    email: data.email,
  };
  registerForm.reset();

  const success = await loginWithPassword(data.email, data.password);
  if (success) {
    setStatus("Account created and logged in. Personal information loaded.");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm).entries());
  profile = {
    full_name: data.email.split("@")[0],
    email: data.email,
  };
  await loginWithPassword(data.email, data.password);
  loginForm.reset();
});

tripForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!token) {
    setStatus("Please login first.", true);
    return;
  }

  const data = Object.fromEntries(new FormData(tripForm).entries());
  data.base_currency = data.base_currency.toUpperCase();

  const response = await apiFetch(`${API_BASE}/trips`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    setStatus(await getErrorMessage(response, "Could not create trip."), true);
    return;
  }

  setStatus("Trip created successfully.");
  tripForm.reset();
  await refreshTrips();
});

expenseTripSelect.addEventListener("change", () => {
  buildDayOptions(getTripById(expenseTripSelect.value));
});

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!token) {
    setStatus("Please login first.", true);
    return;
  }

  const formData = Object.fromEntries(new FormData(expenseForm).entries());
  const tripId = formData.trip_id;
  const payload = {
    amount: Number(formData.amount),
    currency: formData.currency.toUpperCase(),
    category: formData.category,
    day_label: formData.day_label,
    description: formData.description || null,
  };

  const response = await apiFetch(`${API_BASE}/trips/${tripId}/expenses`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    setStatus(await getErrorMessage(response, "Could not add expense."), true);
    return;
  }

  setStatus("Expense added successfully.");
  expenseForm.reset();
  expenseTripSelect.value = tripId;
  ledgerTripSelect.value = tripId;
  buildDayOptions(getTripById(tripId));
  await loadTripLedger(tripId);
});

ledgerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!token) {
    setStatus("Please login first.", true);
    return;
  }

  const formData = Object.fromEntries(new FormData(ledgerForm).entries());
  await loadTripLedger(formData.trip_id);
});

ledgerTable.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest(".ledger-delete");
  if (!deleteButton) {
    return;
  }

  if (!token) {
    setStatus("Please login first.", true);
    return;
  }

  const expenseId = deleteButton.dataset.expenseId;
  const tripId = deleteButton.dataset.tripId;

  const response = await apiFetch(`${API_BASE}/trips/${tripId}/expenses/${expenseId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!response.ok) {
    setStatus(await getErrorMessage(response, "Could not delete expense."), true);
    return;
  }

  setStatus("Expense deleted successfully.");
  await loadTripLedger(tripId);
});

window.addEventListener("DOMContentLoaded", () => {
  setApiNote("working", "API checking...");
  pingApi();
});
