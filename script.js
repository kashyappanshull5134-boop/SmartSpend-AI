const toastContainer = document.getElementById("toastContainer");
const expenseModal = document.getElementById("expenseModal");
const expenseForm = document.getElementById("expenseForm");
const expenseName = document.getElementById("expenseName");
const expenseAmount = document.getElementById("expenseAmount");
const expenseDate = document.getElementById("expenseDate");
const formError = document.getElementById("formError");
const sidebar = document.getElementById("sidebar");
const baseBalance = 24680.5;
const baseMonthlySpend = 3240.8;
const categoryTotals = { food: 1238, shopping: 842, transport: 616, other: 544.8 };
const profileStorageKey = "smartspend.profile.v1";
const transactionsStorageKey = "smartspend.transactions.v1";
const supportedCurrencies = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];
let profile = { name: "Alex Morgan", currency: "USD" };
let savedTransactions = [];
let monthlyAddedSpend = 0;
let lifetimeAddedSpend = 0;
let deferredInstallPrompt = null;
let previousFocus = null;
let balanceHidden = false;
let chartRange = "Month";
const today = new Date();

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: profile.currency,
    minimumFractionDigits: 2,
  }).format(amount);

function readStoredValue(key) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (error) {
    console.error(`Could not read SmartSpend data from ${key}.`, error);
    showToast("Saved data could not be read. Your existing entries have not been changed.");
    return null;
  }
}

function saveStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    document.getElementById("saveStatus").textContent = "Saved on this device";
    return true;
  } catch (error) {
    console.error(`Could not save SmartSpend data to ${key}.`, error);
    document.getElementById("saveStatus").textContent = "Could not save changes";
    showToast("This browser could not save your changes. Check its storage settings.");
    return false;
  }
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  toastContainer.append(toast);
  window.setTimeout(() => toast.remove(), 3400);
}

document.querySelectorAll("[data-toast]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.toast));
});

document.getElementById("toggleBalance").addEventListener("click", (event) => {
  const amount = document.getElementById("balanceAmount");
  balanceHidden = !balanceHidden;
  amount.textContent = balanceHidden ? "••••••••" : formatCurrency(baseBalance - lifetimeAddedSpend);
  event.currentTarget.setAttribute("aria-label", balanceHidden ? "Show balance" : "Hide balance");
  event.currentTarget.setAttribute("aria-pressed", String(balanceHidden));
});

const rangeData = {
  Week: {
    total: 812.45,
    change: "↑ 2.1%",
    comparison: "from last week",
    labels: Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + index);
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
    }),
    current: "M0 130 C42 117 58 73 103 89 S158 113 203 79 S260 98 303 60 S359 81 403 53 S460 67 503 32 S560 61 603 42 S659 51 700 28",
    previous: "M0 107 C45 94 56 112 103 75 S156 84 203 98 S260 56 303 73 S359 47 403 64 S460 33 503 57 S560 29 603 52 S659 25 700 38",
    marker: [503, 32],
  },
  Month: {
    total: 3240.8,
    change: "↓ 4.6%",
    comparison: "from last month",
    labels: [1, 5, 10, 15, 20, 25, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()].map(
      (day) => `${new Intl.DateTimeFormat("en-US", { month: "short" }).format(today)} ${day}`,
    ),
    current: "M0 122 C45 106 56 120 99 99 S158 111 199 88 S260 67 299 81 S360 103 399 68 S458 77 499 67 S558 83 599 55 S660 61 700 44",
    previous: "M0 102 C45 91 50 64 99 72 S155 92 199 55 S259 39 299 52 S359 86 399 47 S459 20 499 40 S559 69 599 31 S659 37 700 16",
    marker: [499, 67],
  },
  Year: {
    total: 38612.24,
    change: "↓ 3.2%",
    comparison: "from last year",
    labels: [0, 2, 4, 6, 8, 10, 11].map((month) =>
      new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(today.getFullYear(), month, 1)),
    ),
    current: "M0 125 C43 116 58 90 100 103 S159 81 200 91 S260 110 300 73 S358 86 400 61 S457 73 500 49 S558 61 600 34 S657 52 700 25",
    previous: "M0 105 C42 82 58 110 100 83 S157 102 200 66 S260 75 300 44 S359 64 400 36 S459 55 500 29 S556 46 600 19 S661 37 700 13",
    marker: [600, 34],
  },
};

const storedProfile = readStoredValue(profileStorageKey);
if (storedProfile && typeof storedProfile === "object" && !Array.isArray(storedProfile)) {
  if (typeof storedProfile.name === "string" && storedProfile.name.trim()) {
    profile.name = storedProfile.name.trim().slice(0, 32);
  }
  if (supportedCurrencies.includes(storedProfile.currency)) {
    profile.currency = storedProfile.currency;
  }
}

document.getElementById("profileName").value = profile.name;
document.getElementById("profileCurrency").value = profile.currency;
document.getElementById("currentMonthLabel").textContent = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
}).format(today);
document.getElementById("greetingPeriod").textContent =
  today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";
document.querySelector(".date-button").setAttribute("aria-label", "Current month");
document.querySelector(".date-button").dataset.toast = `Showing your overview for ${document.getElementById("currentMonthLabel").textContent}.`;
updateProfileDetails();
updateCurrencyDisplays();

document.querySelectorAll(".range-button").forEach((button) => {
  button.addEventListener("click", () => {
    const range = button.dataset.range;
    const data = rangeData[range];
    if (!data) return;
    document.querySelectorAll(".range-button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    chartRange = range;
    document.getElementById("chartTotal").textContent = formatCurrency(
      data.total + (range === "Month" ? monthlyAddedSpend : 0),
    );
    document.getElementById("chartPeriod").innerHTML = `<span>${data.change}</span> ${data.comparison}`;
    document.getElementById("currentLine").setAttribute("d", data.current);
    document.getElementById("previousLine").setAttribute("d", data.previous);
    document.getElementById("currentArea").setAttribute("d", `${data.current} L700 190 L0 190Z`);
    document.querySelector(".chart-previous-area").setAttribute("d", `${data.previous} L700 190 L0 190Z`);
    const marker = document.querySelector(".chart-highlight");
    marker.setAttribute("cx", String(data.marker[0]));
    marker.setAttribute("cy", String(data.marker[1]));
    document.getElementById("xAxisLabels").innerHTML = data.labels.map((label) => `<span>${label}</span>`).join("");
    document.getElementById("spendingChart").setAttribute("aria-label", `${range} spending compared with the previous ${range.toLowerCase()}`);
  });
});

const searchInput = document.getElementById("globalSearch");
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const rows = [...document.querySelectorAll("#transactionRows tr")];
  let visibleRows = 0;
  rows.forEach((row) => {
    const matches = row.dataset.search.includes(query);
    row.hidden = !matches;
    if (matches) visibleRows += 1;
  });
  document.getElementById("emptySearch").hidden = visibleRows !== 0;
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape") {
    if (!expenseModal.hidden) closeExpenseModal();
    if (!profileModal.hidden) closeProfileModal();
    if (sidebar.classList.contains("open")) closeSidebar();
  }
});

document.getElementById("notificationButton").addEventListener("click", () => {
  showToast("You’re all caught up. Your next money check-in is tomorrow.");
});
document.getElementById("allTransactionsButton").addEventListener("click", () => {
  searchInput.value = "";
  searchInput.dispatchEvent(new Event("input"));
  document.getElementById("transactions").scrollIntoView({ behavior: "smooth", block: "center" });
  showToast("Showing your latest transactions.");
});
document.getElementById("dismissTip").addEventListener("click", () => {
  document.querySelector(".category-tip").remove();
});
document.getElementById("aiActionButton").addEventListener("click", () => {
  showToast("This preview does not move money or make real transfers.");
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (link.dataset.page === "Settings") {
      event.preventDefault();
      openProfileModal();
      closeSidebar();
      return;
    }
    const target = document.getElementById(link.getAttribute("href").slice(1));
    if (!target) {
      event.preventDefault();
      showToast(`${link.dataset.page} is coming soon.`);
      closeSidebar();
      return;
    }
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    document.getElementById("breadcrumbCurrent").textContent = link.dataset.page;
    closeSidebar();
  });
});

function openExpenseModal() {
  previousFocus = document.activeElement;
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  expenseDate.value = localDate;
  formError.hidden = true;
  expenseModal.hidden = false;
  document.body.style.overflow = "hidden";
  expenseName.focus();
}

function closeExpenseModal() {
  expenseModal.hidden = true;
  document.body.style.overflow = "";
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
}

document.getElementById("addExpenseButton").addEventListener("click", openExpenseModal);
document.getElementById("closeModalButton").addEventListener("click", closeExpenseModal);
expenseModal.addEventListener("click", (event) => {
  if (event.target === expenseModal) closeExpenseModal();
});

function formatDate(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

const categoryStyles = {
  "Food & dining": ["food-pill", "food", "food"],
  Shopping: ["shopping-pill", "shopping", "shopping"],
  Transport: ["transport-pill", "transport", "transport"],
  Entertainment: ["entertainment-pill", "entertainment", "other"],
  Health: ["food-pill", "health", "other"],
  Other: ["shopping-pill", "other", "other"],
};

function updateProfileDetails() {
  const firstName = profile.name.split(/\s+/)[0];
  document.getElementById("userName").textContent = firstName;
  document.querySelectorAll(".profile-copy strong").forEach((element) => {
    element.textContent = profile.name;
  });
  document.querySelectorAll(".avatar, .top-avatar").forEach((element) => {
    element.textContent = profile.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase())
      .join("");
  });
  document.getElementById("profileName").value = profile.name;
}

function updateCurrencyDisplays() {
  document.getElementById("balanceAmount").textContent = balanceHidden
    ? "••••••••"
    : formatCurrency(baseBalance - lifetimeAddedSpend);
  document.getElementById("monthlySpendAmount").textContent = formatCurrency(baseMonthlySpend + monthlyAddedSpend);
  document.getElementById("chartTotal").textContent = formatCurrency(
    rangeData[chartRange].total + (chartRange === "Month" ? monthlyAddedSpend : 0),
  );
  document.getElementById("categoryDonutTotal").textContent = formatCurrency(baseMonthlySpend + monthlyAddedSpend);
  const currencySymbol = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: profile.currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((part) => part.type === "currency");
  document.getElementById("amountCurrencySymbol").textContent = currencySymbol ? currencySymbol.value : profile.currency;
  document.querySelectorAll(".metric-amount").forEach((element) => {
    const value = Number(element.textContent.replace(/[^\d.]/g, ""));
    if (Number.isFinite(value)) element.textContent = formatCurrency(value);
  });
  document.querySelectorAll(".donut-legend [data-category-total]").forEach((element) => {
    element.textContent = formatCurrency(categoryTotals[element.dataset.categoryTotal] || 0);
  });
  document.querySelectorAll(".amount-cell").forEach((element) => {
    const value = Number(element.textContent.replace(/[^\d.]/g, ""));
    const sign = element.classList.contains("income-amount") ? "+" : "−";
    if (Number.isFinite(value)) element.textContent = `${sign}${formatCurrency(value)}`;
  });
  updateCategoryDonut();
}

function updateCategoryDonut() {
  const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  if (!total) return;
  const colors = ["#668469", "#aab28e", "#d8ab88", "#e7e9e2"];
  let position = 0;
  const segments = Object.values(categoryTotals).map((amount, index) => {
    const start = position;
    position += (amount / total) * 100;
    return `${colors[index]} ${start}% ${position}%`;
  });
  document.getElementById("categoryDonut").style.background = `conic-gradient(${segments.join(", ")})`;
}

function addTransaction(name, amount, category, date, options = {}) {
  const row = document.createElement("tr");
  const normalizedCategory = categoryStyles[category] ? category : "Other";
  const [pillClass, searchCategory, totalCategory] = categoryStyles[normalizedCategory];
  row.dataset.search = `${name} ${normalizedCategory} ${searchCategory} expense`.toLocaleLowerCase();

  const nameCell = document.createElement("td");
  const merchant = document.createElement("span");
  merchant.className = "transaction-name";
  const merchantIcon = document.createElement("span");
  merchantIcon.className = "merchant-icon whole-foods";
  merchantIcon.textContent = name.trim().charAt(0).toLocaleUpperCase();
  const merchantDetails = document.createElement("span");
  const merchantName = document.createElement("strong");
  merchantName.textContent = name.trim();
  const account = document.createElement("small");
  account.textContent = "Manually added";
  merchantDetails.append(merchantName, account);
  merchant.append(merchantIcon, merchantDetails);
  nameCell.append(merchant);

  const categoryCell = document.createElement("td");
  const categoryPill = document.createElement("span");
  categoryPill.className = `category-pill ${pillClass}`;
  categoryPill.textContent = normalizedCategory;
  categoryCell.append(categoryPill);

  const dateCell = document.createElement("td");
  dateCell.className = "date-cell";
  dateCell.textContent = formatDate(date);

  const amountCell = document.createElement("td");
  amountCell.className = "amount-cell";
  amountCell.textContent = `−${formatCurrency(amount)}`;

  const actionCell = document.createElement("td");
  const actionButton = document.createElement("button");
  actionButton.className = "row-more";
  actionButton.type = "button";
  actionButton.setAttribute("aria-label", `${name.trim()} transaction details`);
  actionButton.textContent = "···";
  actionButton.addEventListener("click", () => {
    showToast(`${name.trim()} · ${formatDate(date)} · ${formatCurrency(amount)}`);
  });
  actionCell.append(actionButton);
  row.append(nameCell, categoryCell, dateCell, amountCell, actionCell);
  document.getElementById("transactionRows").prepend(row);
  document.getElementById("transactionCount").textContent = String(
    document.querySelectorAll("#transactionRows tr").length,
  );
  if (options.persist !== false) {
    savedTransactions.push({ name: name.trim(), amount, category: normalizedCategory, date });
    saveStoredValue(transactionsStorageKey, savedTransactions);
  }
  lifetimeAddedSpend += amount;
  const transactionMonth = new Date(`${date}T12:00:00`);
  const currentDate = new Date();
  if (
    transactionMonth.getFullYear() === currentDate.getFullYear() &&
    transactionMonth.getMonth() === currentDate.getMonth()
  ) {
    monthlyAddedSpend += amount;
    categoryTotals[totalCategory] += amount;
  }
  updateCurrencyDisplays();
  searchInput.dispatchEvent(new Event("input"));
}

const storedTransactions = readStoredValue(transactionsStorageKey);
if (Array.isArray(storedTransactions)) {
  savedTransactions = storedTransactions.filter(
    (transaction) =>
      transaction &&
      typeof transaction.name === "string" &&
      transaction.name.trim() &&
      Number.isFinite(transaction.amount) &&
      transaction.amount > 0 &&
      typeof transaction.category === "string" &&
      categoryStyles[transaction.category] &&
      typeof transaction.date === "string" &&
      !Number.isNaN(new Date(`${transaction.date}T12:00:00`).getTime()),
  );
  savedTransactions.forEach((transaction) =>
    addTransaction(transaction.name, transaction.amount, transaction.category, transaction.date, {
      persist: false,
    }),
  );
}
if (storedProfile || savedTransactions.length) {
  document.getElementById("saveStatus").textContent = "Saved on this device";
}

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.hidden = true;
  if (!expenseForm.reportValidity()) return;

  const name = expenseName.value.trim();
  const amount = Number(expenseAmount.value);
  if (!name || !Number.isFinite(amount) || amount <= 0 || amount > 999999.99) {
    formError.textContent = "Enter a description and an amount between 0.01 and 999,999.99.";
    formError.hidden = false;
    return;
  }
  if (!expenseDate.value || Number.isNaN(new Date(`${expenseDate.value}T12:00:00`).getTime())) {
    formError.textContent = "Choose a valid date for this expense.";
    formError.hidden = false;
    return;
  }

  const category = document.getElementById("expenseCategory").value;
  addTransaction(name, amount, category, expenseDate.value);
  expenseForm.reset();
  closeExpenseModal();
  showToast(`${name} added to your transactions.`);
});

const profileModal = document.getElementById("profileModal");
const profileForm = document.getElementById("profileForm");

function openProfileModal() {
  previousFocus = document.activeElement;
  document.getElementById("profileName").value = profile.name;
  document.getElementById("profileCurrency").value = profile.currency;
  profileModal.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("profileName").focus();
}

function closeProfileModal() {
  profileModal.hidden = true;
  document.body.style.overflow = "";
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
}

document.getElementById("profileButton").addEventListener("click", openProfileModal);
document.getElementById("topProfileButton").addEventListener("click", openProfileModal);
document.getElementById("closeProfileModalButton").addEventListener("click", closeProfileModal);
profileModal.addEventListener("click", (event) => {
  if (event.target === profileModal) closeProfileModal();
});
profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("profileName").value.trim();
  const currency = document.getElementById("profileCurrency").value;
  if (!name || !supportedCurrencies.includes(currency)) {
    showToast("Enter a name and choose a supported currency.");
    return;
  }
  const nextProfile = { name: name.slice(0, 32), currency };
  if (!saveStoredValue(profileStorageKey, nextProfile)) return;
  profile = nextProfile;
  updateProfileDetails();
  updateCurrencyDisplays();
  closeProfileModal();
  showToast("Your preferences have been saved on this device.");
});

document.getElementById("saveSiteButton").addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    showToast(choice.outcome === "accepted" ? "SmartSpend AI is ready to install." : "You can install SmartSpend AI any time.");
    deferredInstallPrompt = null;
    return;
  }
  showToast(
    window.matchMedia("(display-mode: standalone)").matches
      ? "SmartSpend AI is already saved as an app."
      : "Press Ctrl+D (or ⌘D on Mac) to bookmark this site in your browser.",
  );
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.getElementById("saveSiteButton").classList.add("install-available");
  document.getElementById("saveSiteButton").setAttribute("title", "Install SmartSpend AI");
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  showToast("SmartSpend AI has been installed.");
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./service-worker.js").catch((error) => {
    console.error("SmartSpend offline support could not be started.", error);
  });
}

const mobileMenuButton = document.getElementById("mobileMenuButton");
const sidebarBackdrop = document.createElement("div");
sidebarBackdrop.className = "mobile-sidebar-backdrop";
sidebarBackdrop.hidden = true;
sidebarBackdrop.setAttribute("aria-hidden", "true");
document.body.append(sidebarBackdrop);

function openSidebar() {
  sidebar.classList.add("open");
  sidebarBackdrop.hidden = false;
  mobileMenuButton.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarBackdrop.hidden = true;
  mobileMenuButton.setAttribute("aria-expanded", "false");
}

mobileMenuButton.addEventListener("click", () => {
  if (sidebar.classList.contains("open")) closeSidebar();
  else openSidebar();
});
sidebarBackdrop.addEventListener("click", closeSidebar);