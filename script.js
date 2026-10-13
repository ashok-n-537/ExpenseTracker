
"use strict";

// ---------- 1. Get the HTML elements ----------

const expenseForm = document.getElementById("expenseForm");
const budgetForm = document.getElementById("budgetForm");

const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("expenseDate");
const monthFilter = document.getElementById("monthFilter");
const budgetInput = document.getElementById("budgetInput");

const totalExpensesElement = document.getElementById("totalExpenses");
const monthlyBudgetElement = document.getElementById("monthlyBudget");
const remainingBudgetElement = document.getElementById("remainingBudget");
const budgetMessageElement = document.getElementById("budgetMessage");
const expenseListElement = document.getElementById("expenseList");
const expenseCountElement = document.getElementById("expenseCount");
const historyTotalElement = document.getElementById("historyTotal");
const emptyStateElement = document.getElementById("emptyState");
const categoryListElement = document.getElementById("categoryList");
const formMessageElement = document.getElementById("formMessage");

// ---------- 2. Prepare dates and saved data ----------

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
  return getLocalDate().slice(0, 7);
}

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch (error) {
    console.error("Could not load saved data:", error);
    return fallback;
  }
}

let expenses = loadData("expenseTrackerExpenses", []);
let budgets = loadData("expenseTrackerBudgets", {});

// Recover safely if the browser has unexpected stored data.
if (!Array.isArray(expenses)) expenses = [];

if (
  budgets === null ||
  typeof budgets !== "object" ||
  Array.isArray(budgets)
) {
  budgets = {};
}

function saveData() {
  try {
    localStorage.setItem(
      "expenseTrackerExpenses",
      JSON.stringify(expenses)
    );

    localStorage.setItem(
      "expenseTrackerBudgets",
      JSON.stringify(budgets)
    );

    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    alert(
      "Your browser could not save the data. Check browser storage settings."
    );
    return false;
  }
}

// ---------- 3. Format money and dates ----------

function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}

const categoryIcons = {
  Food: "🍲",
  Travel: "🚌",
  Shopping: "🛍️",
  Bills: "🧾",
  Education: "📚",
  Health: "💊",
  Entertainment: "🎬",
  Other: "📌"
};

// ---------- 4. Filter expenses by selected month ----------

function getMonthlyExpenses() {
  const selectedMonth = monthFilter.value;

  return expenses.filter(expense =>
    typeof expense.date === "string" &&
    expense.date.startsWith(selectedMonth)
  );
}

// ---------- 5. Add an expense ----------

expenseForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  const allowedCategories = Object.keys(categoryIcons);

  if (!description || description.length > 80) {
    showMessage("Enter a description of up to 80 characters.", true);
    return;
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1000000000
  ) {
    showMessage("Enter a valid expense amount.", true);
    return;
  }

  if (!allowedCategories.includes(category)) {
    showMessage("Choose a valid category.", true);
    return;
  }

  if (
    !date ||
    date > getLocalDate() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    showMessage("Choose a valid date that is not in the future.", true);
    return;
  }

  const expense = {
    id: crypto.randomUUID(),
    description: description,
    amount: Math.round(amount * 100) / 100,
    category: category,
    date: date
  };

  expenses.push(expense);

  if (!saveData()) {
    expenses.pop();
    return;
  }

  // Show the month of the newly added expense.
  monthFilter.value = date;

  expenseForm.reset();
  dateInput.value = getLocalDate();

  showMessage("Expense added successfully!", false);
  renderDashboard();
});

// ---------- 6. Show feedback after form submission ----------

function showMessage(message, isError) {
  formMessageElement.textContent = message;
  formMessageElement.classList.toggle("error", isError);
}

// ---------- 7. Set the monthly budget ----------

budgetForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const budget = Number(budgetInput.value);
  const month = monthFilter.value;

  if (
    !month ||
    !Number.isFinite(budget) ||
    budget < 0 ||
    budget > 1000000000
  ) {
    alert("Enter a valid monthly budget.");
    return;
  }

  const hadPreviousBudget = Object.hasOwn(budgets, month);
  const previousBudget = budgets[month];

  budgets[month] = Math.round(budget * 100) / 100;

  if (!saveData()) {
    if (hadPreviousBudget) {
      budgets[month] = previousBudget;
    } else {
      delete budgets[month];
    }
    return;
  }

  budgetInput.value = "";
  renderDashboard();
});

// ---------- 8. Delete an expense ----------

function deleteExpense(id) {
  const confirmed = confirm(
    "Are you sure you want to delete this expense?"
  );

  if (!confirmed) return;

  const previousExpenses = expenses;
  expenses = expenses.filter(expense => expense.id !== id);

  if (!saveData()) {
    expenses = previousExpenses;
    return;
  }

  renderDashboard();
}

// ---------- 9. Display expense history ----------

function renderExpenseList(monthlyExpenses) {
  expenseListElement.replaceChildren();

  // Display newest expenses first.
  const sortedExpenses = [...monthlyExpenses].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return String(b.id).localeCompare(String(a.id));
  });

  emptyStateElement.hidden = sortedExpenses.length > 0;

  sortedExpenses.forEach(expense => {
    const item = document.createElement("div");
    item.className = "expense-item";

    const icon = document.createElement("div");
    icon.className = "category-icon";
    icon.textContent = categoryIcons[expense.category] || "📌";

    const details = document.createElement("div");
    details.className = "expense-details";

    const title = document.createElement("h3");
    title.textContent = expense.description;

    const metadata = document.createElement("p");
    metadata.textContent =
      `${expense.category} · ${formatDate(expense.date)}`;

    details.append(title, metadata);

    const right = document.createElement("div");
    right.className = "expense-right";

    const amount = document.createElement("div");
    amount.className = "expense-amount";
    amount.textContent = formatMoney(expense.amount);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
      "aria-label",
      `Delete expense ${expense.description}`
    );

    deleteButton.addEventListener("click", function () {
      deleteExpense(expense.id);
    });

    right.append(amount, deleteButton);
    item.append(icon, details, right);
    expenseListElement.appendChild(item);
  });

  expenseCountElement.textContent =
    `${sortedExpenses.length} ${
      sortedExpenses.length === 1 ? "record" : "records"
    }`;
}

// ---------- 10. Calculate spending by category ----------

function renderCategories(monthlyExpenses) {
  categoryListElement.replaceChildren();

  const totals = {};

  monthlyExpenses.forEach(expense => {
    totals[expense.category] =
      (totals[expense.category] || 0) + expense.amount;
  });

  const categories = Object.entries(totals)
    .sort((a, b) => b[1] - a[1]);

  if (categories.length === 0) {
    const message = document.createElement("p");
    message.className = "category-empty";
    message.textContent = "Add expenses to see your spending breakdown.";
    categoryListElement.appendChild(message);
    return;
  }

  const highestTotal = categories[0][1];

  categories.forEach(([category, total]) => {
    const row = document.createElement("div");
    row.className = "category-row";

    const top = document.createElement("div");
    top.className = "category-top";

    const name = document.createElement("span");
    name.textContent = `${categoryIcons[category] || "📌"} ${category}`;

    const value = document.createElement("strong");
    value.textContent = formatMoney(total);

    top.append(name, value);

    const track = document.createElement("div");
    track.className = "progress-track";

    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = `${(total / highestTotal) * 100}%`;

    track.appendChild(fill);
    row.append(top, track);
    categoryListElement.appendChild(row);
  });
}

// ---------- 11. Update all dashboard numbers ----------

function renderDashboard() {
  const monthlyExpenses = getMonthlyExpenses();

  const total = monthlyExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const budget = Number(budgets[monthFilter.value] ?? 10000);
  const remaining = budget - total;

  totalExpensesElement.textContent = formatMoney(total);
  monthlyBudgetElement.textContent = formatMoney(budget);
  remainingBudgetElement.textContent = formatMoney(remaining);
  historyTotalElement.textContent = formatMoney(total);

  remainingBudgetElement.style.color =
    remaining < 0 ? "#c0392b" : "#21834a";

  budgetMessageElement.textContent =
    remaining < 0
      ? `${formatMoney(Math.abs(remaining))} over budget`
      : "Available to spend";

  renderExpenseList(monthlyExpenses);
  renderCategories(monthlyExpenses);
}

// ---------- 12. React when the selected month changes ----------

monthFilter.addEventListener("change", function () {
  budgetInput.value = "";
  renderDashboard();
});

// ---------- 13. Start the application ----------

monthFilter.value = getCurrentMonth();
dateInput.value = getLocalDate();

renderDashboard();
