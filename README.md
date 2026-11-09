const api = {
  async get(endpoint) {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    return response.json();
  },

  async post(endpoint, body) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  },

  async put(endpoint, body) {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  },

  async delete(endpoint) {
    const response = await fetch(endpoint, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  },
};

const state = {
  medicines: [],
  customers: [],
  bills: [],
  billItems: [],
};

const elements = {
  totalMedicines: document.getElementById('totalMedicines'),
  totalStock: document.getElementById('totalStock'),
  totalRevenue: document.getElementById('totalRevenue'),
  lowStock: document.getElementById('lowStock'),
  medicineTableBody: document.getElementById('medicineTableBody'),
  medicineForm: document.getElementById('medicineForm'),
  customerForm: document.getElementById('customerForm'),
  customerList: document.getElementById('customerList'),
  customerSelect: document.getElementById('customerSelect'),
  medicineSelect: document.getElementById('medicineSelect'),
  qtyInput: document.getElementById('qtyInput'),
  addToBillBtn: document.getElementById('addToBillBtn'),
  billItemsBody: document.getElementById('billItemsBody'),
  subtotalValue: document.getElementById('subtotalValue'),
  taxValue: document.getElementById('taxValue'),
  discountValue: document.getElementById('discountValue'),
  grandTotalValue: document.getElementById('grandTotalValue'),
  discountInput: document.getElementById('discountInput'),
  saveBillBtn: document.getElementById('saveBillBtn'),
  billHistoryBody: document.getElementById('billHistoryBody'),
  refreshBtn: document.getElementById('refreshBtn'),
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function calculateBillTotals() {
  const subtotal = state.billItems.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0);
  const tax = subtotal * 0.05;
  const discount = Number(elements.discountInput.value || 0);
  const grandTotal = subtotal + tax - discount;

  elements.subtotalValue.textContent = formatCurrency(subtotal);
  elements.taxValue.textContent = formatCurrency(tax);
  elements.discountValue.textContent = formatCurrency(discount);
  elements.grandTotalValue.textContent = formatCurrency(grandTotal);
}

function renderSummary(summary) {
  elements.totalMedicines.textContent = summary.totalMedicines || 0;
  elements.totalStock.textContent = summary.totalStock || 0;
  elements.totalRevenue.textContent = formatCurrency(summary.totalRevenue || 0);
  elements.lowStock.textContent = summary.lowStock || 0;
}

function renderMedicines() {
  if (!state.medicines.length) {
    elements.medicineTableBody.innerHTML = '<tr><td colspan="5">No medicines added yet.</td></tr>';
    elements.medicineSelect.innerHTML = '<option value="">Select medicine</option>';
    return;
  }

  elements.medicineTableBody.innerHTML = state.medicines
    .map(
      (medicine) => `
        <tr>
          <td>
            <strong>${medicine.name}</strong><br>
            <small>${medicine.generic || 'N/A'} • ${medicine.batch || 'N/A'}</small>
          </td>
          <td>${medicine.stock}</td>
          <td>${formatCurrency(medicine.selling_price)}</td>
          <td>${medicine.expiry || 'N/A'}</td>
          <td>
            <button class="action-btn" data-add="${medicine.id}">Add</button>
            <button class="action-btn delete" data-delete="${medicine.id}">Delete</button>
          </td>
        </tr>
      `
    )
    .join('');

  elements.medicineSelect.innerHTML = state.medicines
    .map(
      (medicine) => `<option value="${medicine.id}">${medicine.name} (${medicine.stock} in stock)</option>`
    )
    .join('');

  const addButtons = document.querySelectorAll('[data-add]');
  addButtons.forEach((button) => {
    button.addEventListener('click', () => addMedicineToBill(Number(button.dataset.add)));
  });

  const deleteButtons = document.querySelectorAll('[data-delete]');
  deleteButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api.delete(`/api/medicines/${button.dataset.delete}`);
        await loadData();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function renderCustomers() {
  elements.customerList.innerHTML = state.customers
    .map(
      (customer) => `
        <li>
          <strong>${customer.name}</strong><br>
          <small>${customer.phone || 'No phone'} • ${customer.address || 'No address'}</small>
        </li>
      `
    )
    .join('');

  elements.customerSelect.innerHTML = state.customers
    .map(
      (customer) => `<option value="${customer.id}">${customer.name}</option>`
    )
    .join('');
}

function renderBillItems() {
  if (!state.billItems.length) {
    elements.billItemsBody.innerHTML = '<tr><td colspan="5">No items added yet.</td></tr>';
    calculateBillTotals();
    return;
  }

  elements.billItemsBody.innerHTML = state.billItems
    .map(
      (item, index) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.sellingPrice)}</td>
          <td>${formatCurrency(item.quantity * item.sellingPrice)}</td>
          <td><button class="action-btn delete" data-remove-index="${index}">Remove</button></td>
        </tr>
      `
    )
    .join('');

  document.querySelectorAll('[data-remove-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.removeIndex);
      state.billItems.splice(index, 1);
      renderBillItems();
    });
  });

  calculateBillTotals();
}

function renderBills() {
  if (!state.bills.length) {
    elements.billHistoryBody.innerHTML = '<tr><td colspan="5">No bills recorded yet.</td></tr>';
    return;
  }

  elements.billHistoryBody.innerHTML = state.bills
    .slice(0, 10)
    .map(
      (bill) => `
        <tr>
          <td>#${bill.id}</td>
          <td>${bill.customer_name || 'Walk-in'}</td>
          <td>${bill.bill_date}</td>
          <td>${(bill.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ') || 'No items'}</td>
          <td>${formatCurrency(bill.total)}</td>
        </tr>
      `
    )
    .join('');
}

function addMedicineToBill(medicineId) {
  const medicine = state.medicines.find((item) => item.id === medicineId);
  if (!medicine) return;

  const existingItem = state.billItems.find((item) => item.medicineId === medicineId);
  if (existingItem) {
    existingItem.quantity += Number(elements.qtyInput.value || 1);
    if (existingItem.quantity > medicine.stock) {
      existingItem.quantity = medicine.stock;
    }
  } else {
    state.billItems.push({
      medicineId: medicine.id,
      name: medicine.name,
      sellingPrice: Number(medicine.selling_price),
      quantity: Number(elements.qtyInput.value || 1),
    });
  }

  renderBillItems();
}

async function loadData() {
  try {
    const [summary, medicines, customers, bills] = await Promise.all([
      api.get('/api/summary'),
      api.get('/api/medicines'),
      api.get('/api/customers'),
      api.get('/api/bills'),
    ]);

    state.medicines = medicines;
    state.customers = customers;
    state.bills = bills;

    renderSummary(summary);
    renderMedicines();
    renderCustomers();
    renderBills();
    renderBillItems();
  } catch (error) {
    console.error(error);
    alert('Unable to load the application data.');
  }
}

elements.medicineForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.medicineForm);
  const payload = {
    name: formData.get('name'),
    generic: formData.get('generic'),
    category: formData.get('category'),
    batch: formData.get('batch'),
    expiry: formData.get('expiry'),
    costPrice: formData.get('costPrice'),
    sellingPrice: formData.get('sellingPrice'),
    stock: formData.get('stock'),
    reorderLevel: formData.get('reorderLevel'),
  };

  try {
    await api.post('/api/medicines', payload);
    elements.medicineForm.reset();
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});

elements.customerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.customerForm);

  try {
    await api.post('/api/customers', {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: formData.get('address'),
    });
    elements.customerForm.reset();
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});

elements.addToBillBtn.addEventListener('click', () => {
  const medicineId = Number(elements.medicineSelect.value);
  if (!medicineId) {
    alert('Please select a medicine first.');
    return;
  }
  addMedicineToBill(medicineId);
});

elements.discountInput.addEventListener('input', calculateBillTotals);

elements.saveBillBtn.addEventListener('click', async () => {
  if (!state.billItems.length) {
    alert('Add at least one medicine before saving the bill.');
    return;
  }

  const customerId = Number(elements.customerSelect.value);
  const customer = state.customers.find((item) => item.id === customerId);

  try {
    const billPayload = {
      customerId: customer ? customer.id : null,
      customerName: customer ? customer.name : 'Walk-in Customer',
      items: state.billItems,
      discount: Number(elements.discountInput.value || 0),
      paidAmount: Number(elements.grandTotalValue.textContent.replace(/[^\d.-]/g, '')),
      paymentStatus: 'Paid',
    };

    await api.post('/api/bills', billPayload);
    state.billItems = [];
    elements.discountInput.value = '0';
    renderBillItems();
    await loadData();
  } catch (error) {
    alert(error.message);
  }
});

elements.refreshBtn.addEventListener('click', loadData);

loadData();
