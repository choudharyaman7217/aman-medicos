const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===============================
// DASHBOARD SUMMARY
// ===============================

app.get('/api/summary', async (req, res) => {
  try {
    const { data: medicines, error: medicineError } = await supabase
      .from('medicines')
      .select('id, stock, reorder_level');

    if (medicineError) throw medicineError;

    const { data: bills, error: billError } = await supabase
      .from('bills')
      .select('total');

    if (billError) throw billError;

    const totalStock = medicines.reduce(
      (sum, item) => sum + Number(item.stock || 0), 0
    );

    const totalRevenue = bills.reduce(
      (sum, item) => sum + Number(item.total || 0), 0
    );

    const lowStock = medicines.filter(
      item => Number(item.stock || 0) <= Number(item.reorder_level || 0)
    ).length;

    res.json({
      totalMedicines: medicines.length,
      totalStock,
      totalRevenue,
      lowStock,
      totalBills: bills.length
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch summary',
      error: error.message
    });
  }
});

// ===============================
// MEDICINES
// ===============================

app.get('/api/medicines', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch medicines',
      error: error.message
    });
  }
});

app.post('/api/medicines', async (req, res) => {
  const {
    name,
    generic,
    category,
    batch,
    expiry,
    costPrice,
    sellingPrice,
    stock,
    reorderLevel
  } = req.body;

  if (
    !name ||
    sellingPrice === undefined ||
    sellingPrice === '' ||
    stock === undefined ||
    stock === ''
  ) {
    return res.status(400).json({
      message: 'Medicine name, selling price, and stock are required.'
    });
  }

  try {
    const { data, error } = await supabase
      .from('medicines')
      .insert([{
        name,
        generic: generic || '',
        category: category || '',
        batch: batch || '',
        expiry: expiry || '',
        cost_price: Number(costPrice || 0),
        selling_price: Number(sellingPrice),
        stock: Number(stock),
        reorder_level: Number(reorderLevel || 5)
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to add medicine',
      error: error.message
    });
  }
});

app.put('/api/medicines/:id', async (req, res) => {
  const {
    name,
    generic,
    category,
    batch,
    expiry,
    costPrice,
    sellingPrice,
    stock,
    reorderLevel
  } = req.body;

  try {
    const { data, error } = await supabase
      .from('medicines')
      .update({
        name,
        generic: generic || '',
        category: category || '',
        batch: batch || '',
        expiry: expiry || '',
        cost_price: Number(costPrice || 0),
        selling_price: Number(sellingPrice),
        stock: Number(stock),
        reorder_level: Number(reorderLevel || 5)
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update medicine',
      error: error.message
    });
  }
});

app.post('/api/medicines/:id/add-stock', async (req, res) => {
  const amount = Number(req.body.quantity);

  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({
      message: 'Sahi stock quantity enter karein.'
    });
  }

  try {
    const { data: medicine, error: findError } = await supabase
      .from('medicines')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw findError;

    if (!medicine) {
      return res.status(404).json({
        message: 'Medicine nahi mili.'
      });
    }

    const { data, error } = await supabase
      .from('medicines')
      .update({
        stock: Number(medicine.stock || 0) + amount
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: 'Stock update nahi hua.',
      error: error.message
    });
  }
});

app.delete('/api/medicines/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('medicines')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({
      message: 'Medicine deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete medicine',
      error: error.message
    });
  }
});

// ===============================
// CUSTOMERS
// ===============================

app.get('/api/customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, address } = req.body;

  if (!name) {
    return res.status(400).json({
      message: 'Customer name is required.'
    });
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        name,
        phone: phone || '',
        address: address || ''
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to add customer',
      error: error.message
    });
  }
});

// ===============================
// BILLS
// ===============================

app.get('/api/bills', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch bills',
      error: error.message
    });
  }
});

app.post('/api/bills', async (req, res) => {
  const {
    customerId,
    customerName,
    items,
    discount = 0,
    paidAmount = 0,
    paymentStatus = 'Paid'
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: 'At least one medicine is required for billing.'
    });
  }

  try {
    const processedItems = [];
    const stockUpdates = [];
    let subtotal = 0;

    const today = new Date().toISOString().slice(0, 10);

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Medicine quantity must be a positive whole number.');
      }

      const { data: selectedMedicine, error: findError } = await supabase
        .from('medicines')
        .select('*')
        .eq('id', item.medicineId)
        .maybeSingle();

      if (findError) throw findError;
      if (!selectedMedicine) throw new Error('Medicine not found.');

      const { data: allMedicines, error: batchError } = await supabase
        .from('medicines')
        .select('*');

      if (batchError) throw batchError;

      const batches = allMedicines
        .filter(m =>
          m.name.trim().toLowerCase() ===
          selectedMedicine.name.trim().toLowerCase()
        )
        .sort((a, b) => {
          if (!a.expiry && b.expiry) return 1;
          if (a.expiry && !b.expiry) return -1;
          if (a.expiry && b.expiry) {
            return a.expiry.localeCompare(b.expiry);
          }
          return Number(a.id) - Number(b.id);
        });

      let remaining = quantity;

      for (const batch of batches) {
        if (remaining <= 0) break;

        const expiry = batch.expiry || '';
        if (expiry && expiry < today) continue;

        const available = Number(batch.stock) || 0;
        if (available <= 0) continue;

        const used = Math.min(remaining, available);
        const sellingPrice = Number(selectedMedicine.selling_price);
        const lineTotal = used * sellingPrice;

        processedItems.push({
          medicineId: batch.id,
          name: batch.name,
          generic: batch.generic,
          batch: batch.batch,
          expiry: batch.expiry,
          quantity: used,
          sellingPrice,
          lineTotal
        });

        stockUpdates.push({
          id: batch.id,
          stock: available - used
        });

        subtotal += lineTotal;
        remaining -= used;
      }

      if (remaining > 0) {
        throw new Error(
          `${selectedMedicine.name}: sufficient non-expired stock is not available.`
        );
      }
    }

    const tax = subtotal * 0.05;
    const discountAmount = Number(discount || 0);
    const total = subtotal + tax - discountAmount;

    if (
      !Number.isFinite(discountAmount) ||
      discountAmount < 0 ||
      discountAmount > subtotal + tax
    ) {
      throw new Error('Invalid discount amount.');
    }

    for (const update of stockUpdates) {
      const { error } = await supabase
        .from('medicines')
        .update({ stock: update.stock })
        .eq('id', update.id);

      if (error) throw error;
    }

    const { data: savedBill, error: billError } = await supabase
      .from('bills')
      .insert([{
        customer_id: customerId || null,
        customer_name: customerName || 'Walk-in Customer',
        bill_date: today,
        items: processedItems,
        subtotal,
        discount: discountAmount,
        tax,
        total,
        paid_amount: Number(paidAmount ?? total),
        payment_status: paymentStatus || 'Paid'
      }])
      .select()
      .single();

    if (billError) throw billError;

    res.status(201).json(savedBill);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save bill',
      error: error.message
    });
  }
});

// ===============================
// FRONTEND
// ===============================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Aman Medicos server running on port ${PORT}`);
});
