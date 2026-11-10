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
    renderCustomers();
    renderMedicineOptions();
    renderCustomerOptions();
    renderBills();
    renderSummary(results[3]);
  } catch (error) {
    alert("Data load nahi hua: " + error.message);
  }
}

function renderSummary(data) {
  $("totalMedicines").textContent = data.totalMedicines ?? 0;
  $("totalStock").textContent = data.totalStock ?? 0;
  $("totalRevenue").textContent = money(data.totalRevenue);
  $("lowStock").textContent = data.lowStock ?? 0;
}

function renderMedicines() {
  $("medicineTableBody").innerHTML = medicines.map(m => `
    <tr>
      <td>${safe(m.name)}</td>
      <td>${m.stock}</td>
      <td>${money(m.selling_price)}</td>
      <td>${safe(m.expiry || "-")}</td>
      <td>
        <button class="secondary-btn" data-delete="${m.id}">
          Delete
        </button>
      </td>
    </tr>
  `).join("");
}

function renderCustomers() {
  $("customerList").innerHTML = customers.map(c => `
    <li>${safe(c.name)} - ${safe(c.phone || "")}</li>
  `).join("");
}

function renderMedicineOptions() {
  $("medicineSelect").innerHTML = medicines
    .filter(m => Number(m.stock) > 0)
    .map(m => `
      <option value="${m.id}">
        ${safe(m.name)} (Stock: ${m.stock})
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
        <td>${safe(b.created_at || b.date || "-")}</td>
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

  const existing = billItems.find(item => item.medicineId === id);
  const alreadyAdded = existing ? existing.quantity : 0;

  if (alreadyAdded + quantity > Number(medicine.stock)) {
    alert("Itna stock available nahi hai.");
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
