const API = "https://aman-medicos.onrender.com/api";

let medicines = [];
let customers = [];
let billItems = [];

const $ = (id) => document.getElementById(id);
const money = (value) =>
  "₹" + Number(value || 0).toFixed(2);

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function api(url, options = {}) {
  const response = await fetch(API + url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Something went wrong");
  }

  return data;
}

async function loadData() {
  try {
    const results = await Promise.all([
      api("/medicines"),
      api("/customers"),
      api("/bills"),
      api("/summary")
    ]);

    medicines = results[0];
    customers = results[1];

    renderMedicines();
    renderExpiryAlerts();
    renderCustomers();
    renderMedicineOptions();
    renderCustomerOptions();
    renderBills();
    renderSummary(results[3]);
  } catch (error) {
    alert("Data load nahi hua: " + error.message);
  }
}

function renderExpiryAlerts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alerts = medicines.filter(m => {
    if (!m.expiry || Number(m.stock) <= 0) return false;

    const expiryDate = new Date(m.expiry + "T00:00:00");
    const daysLeft = Math.ceil(
      (expiryDate - today) / (1000 * 60 * 60 * 24)
    );

    return daysLeft <= 30;
  });

  $("expiryAlerts").innerHTML = alerts.map(m => {
    const expiryDate = new Date(m.expiry + "T00:00:00");
    const daysLeft = Math.ceil(
      (expiryDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) {
      return `<p style="color:red;">Expired: ${safe(m.name)} | Batch: ${safe(m.batch || "-")}</p>`;
    }

    return `<p style="color:#b36b00;">Expiring Soon: ${safe(m.name)} | Batch: ${safe(m.batch || "-")} | ${daysLeft} days left</p>`;
  }).join("");
}
function renderSummary(data) {
  $("totalMedicines").textContent = data.totalMedicines ?? 0;
  $("totalStock").textContent = data.totalStock ?? 0;
  $("totalRevenue").textContent = money(data.totalRevenue);
  $("lowStock").textContent = data.lowStock ?? 0;
}

function renderMedicines() {
  const groups = {};
  const searchText = ($("medicineSearch").value || "").trim().toLowerCase();

  medicines.forEach(m => {
    const key = m.name.trim().toLowerCase();

    if (!groups[key]) {
      groups[key] = {
        name: m.name,
        stock: 0,
        batches: []
      };
    }

    groups[key].stock += Number(m.stock) || 0;
    groups[key].batches.push(m);
  });

  const filteredGroups = Object.values(groups).filter(group =>
    group.name.toLowerCase().includes(searchText)
  );

  $("medicineTableBody").innerHTML = filteredGroups.map(group => `
    <tr>
      <td>
        <strong>${safe(group.name)}</strong>
        <br>
        ${group.batches.map(b => `
          <small>
            Batch: ${safe(b.batch || "-")}
            | Expiry: ${safe(b.expiry || "-")}
            | Stock: ${b.stock}
            <button class="secondary-btn" data-add-stock="${b.id}">+ Add Stock</button>
            <button class="secondary-btn" data-delete="${b.id}">Delete Batch</button>
          </small><br>
        `).join("")}
      </td>
      <td>${group.stock}</td>
      <td>${money(group.batches[0].selling_price)}</td>
      <td>${safe(group.batches.map(b => b.expiry || "-").join(", "))}</td>
      <td>अलग-अलग Batch</td>
    </tr>
  `).join("");
}
function renderCustomers() {
  $("customerList").innerHTML = customers.map(c => `
    <li>${safe(c.name)} - ${safe(c.phone || "")}</li>
  `).join("");
}

function renderMedicineOptions() {
  const groups = {};
  const today = new Date().toISOString().slice(0, 10);

  medicines.forEach(m => {
    const key = m.name.trim().toLowerCase();
    const expiry = m.expiry || "";

    if (Number(m.stock) <= 0 || (expiry && expiry < today)) return;

    if (!groups[key]) {
      groups[key] = {
        id: m.id,
        name: m.name,
        stock: 0
      };
    }

    groups[key].stock += Number(m.stock) || 0;
  });

  $("medicineSelect").innerHTML = Object.values(groups).map(m => `
    <option value="${m.id}">
      ${safe(m.name)} (Total Stock: ${m.stock})
    </option>
  `).join("");
}

function renderCustomerOptions() {
  $("customerSelect").innerHTML = customers.map(c => `
    <option value="${c.id}">${safe(c.name)}</option>
  `).join("");
}

function renderBills() {
  $("billHistoryBody").innerHTML = "";

  // Recent bills are loaded from the server.
  api("/bills").then(bills => {
    $("billHistoryBody").innerHTML = bills.map(b => `
      <tr>
        <td>${safe(b.id)}</td>
        <td>${safe(b.customer_name || b.customerName || "-")}</td>
        <td>${safe(b.bill_date || b.created_at || b.date || "-")}</td>
        <td>${Array.isArray(b.items) ? b.items.length : 0}</td>
        <td>${money(b.total)}</td>
      </tr>
    `).join("");
  }).catch(error => console.error(error));
}

$("medicineForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = new FormData(event.target);
  const data = Object.fromEntries(form.entries());

  data.costPrice = Number(data.costPrice);
  data.sellingPrice = Number(data.sellingPrice);
  data.stock = Number(data.stock);
  data.reorderLevel = Number(data.reorderLevel);

  try {
    await api("/medicines", {
      method: "POST",
      body: JSON.stringify(data)
    });

    alert("Medicine save ho gayi!");
    event.target.reset();
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});
$("medicineSearch").addEventListener("input", renderMedicines);
$("medicineTableBody").addEventListener("click", async (event) => {
  const id = event.target.dataset.delete;
  if (!id) return;

  if (!confirm("Kya aap is medicine ko delete karna chahte hain?")) return;

  try {
    await api("/medicines/" + id, { method: "DELETE" });
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});

$("medicineTableBody").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-add-stock]");
  if (!button) return;

  const id = button.dataset.addStock;
  const quantity = Number(prompt("Kitni tablets stock mein add karni hain?"));

  if (!Number.isInteger(quantity) || quantity <= 0) {
    alert("Sahi quantity enter karein.");
    return;
  }

  try {
    await api("/medicines/" + id + "/add-stock", {
      method: "POST",
      body: JSON.stringify({ quantity })
    });

    alert("Stock successfully badh gaya!");
    await loadData();
  } catch (error) {
    alert("Stock update nahi hua: " + error.message);
  }
});
$("customerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = new FormData(event.target);
  const data = Object.fromEntries(form.entries());

  try {
    await api("/customers", {
      method: "POST",
      body: JSON.stringify(data)
    });

    alert("Customer add ho gaya!");
    event.target.reset();
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});

$("addToBillBtn").addEventListener("click", () => {
  const id = Number($("medicineSelect").value);
  const quantity = Number($("qtyInput").value);
  const medicine = medicines.find(m => Number(m.id) === id);

  if (!medicine) {
    alert("Pehle medicine add karein.");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    alert("Quantity sahi enter karein.");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const availableStock = medicines
    .filter(m =>
      m.name.trim().toLowerCase() === medicine.name.trim().toLowerCase() &&
      Number(m.stock) > 0 &&
      (!m.expiry || m.expiry >= today)
    )
    .reduce((sum, m) => sum + Number(m.stock), 0);

  const existing = billItems.find(item => item.medicineId === id);
  const alreadyAdded = existing ? existing.quantity : 0;

  if (alreadyAdded + quantity > availableStock) {
    alert("Itna stock available nahi hai. Available: " + availableStock);
    return;
  }

  if (existing) {
    existing.quantity += quantity;
  } else {
    billItems.push({
      medicineId: id,
      name: medicine.name,
      sellingPrice: Number(medicine.selling_price),
      quantity
    });
  }

  renderBillItems();
});
function renderBillItems() {
  $("billItemsBody").innerHTML = billItems.map((item, index) => `
    <tr>
      <td>${safe(item.name)}</td>
      <td>${item.quantity}</td>
      <td>${money(item.sellingPrice)}</td>
      <td>${money(item.sellingPrice * item.quantity)}</td>
      <td>
        <button class="secondary-btn" data-remove="${index}">
          Remove
        </button>
      </td>
    </tr>
  `).join("");

  updateTotals();
}

$("billItemsBody").addEventListener("click", (event) => {
  const index = event.target.dataset.remove;
  if (index === undefined) return;

  billItems.splice(Number(index), 1);
  renderBillItems();
});

function updateTotals() {
  const subtotal = billItems.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity, 0
  );

  const tax = subtotal * 0.05;
  const discount = Math.max(0, Number($("discountInput").value) || 0);
  const total = Math.max(0, subtotal + tax - discount);

  $("subtotalValue").textContent = money(subtotal);
  $("taxValue").textContent = money(tax);
  $("discountValue").textContent = money(discount);
  $("grandTotalValue").textContent = money(total);
}

$("discountInput").addEventListener("input", updateTotals);

$("saveBillBtn").addEventListener("click", async () => {
  if (billItems.length === 0) {
    alert("Bill mein medicine add karein.");
    return;
  }

  const customerId = Number($("customerSelect").value);
  const customer = customers.find(c => Number(c.id) === customerId);

  if (!customer) {
    alert("Customer select karein.");
    return;
  }

  const subtotal = billItems.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity, 0
  );
  const discount = Math.max(0, Number($("discountInput").value) || 0);
  const total = Math.max(0, subtotal + subtotal * 0.05 - discount);

  const data = {
    customerId,
    customerName: customer.name,
    items: billItems.map(item => ({
      medicineId: item.medicineId,
      quantity: item.quantity
    })),
    discount,
    paidAmount: total,
    paymentStatus: "Paid"
  };

  try {
    await api("/bills", {
      method: "POST",
      body: JSON.stringify(data)
    });

    alert("Bill successfully save ho gaya!");
    billItems = [];
    $("discountInput").value = 0;
    renderBillItems();
    await loadData();
  } catch (error) {
    alert("Bill save nahi hua: " + error.message);
  }
});

$("refreshBtn").addEventListener("click", loadData);

loadData();
