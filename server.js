const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(path.join(dataDir, 'aman_medicos.db'), (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Database connected');
  }
});

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function initializeDatabase() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      generic TEXT,
      category TEXT,
      batch TEXT,
      expiry TEXT,
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 5
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      customer_name TEXT,
      bill_date TEXT DEFAULT CURRENT_DATE,
      items TEXT NOT NULL,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'Paid'
    )
  `);

  const defaultCustomer = await dbGet('SELECT id FROM customers WHERE phone = ?', ['walk-in']);
  if (!defaultCustomer) {
    await dbRun(
      'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)',
      ['Walk-in Customer', 'walk-in', 'General']
    );
  }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/summary', async (req, res) => {
  try {
    const medicines = await dbAll('SELECT COUNT(*) as total_medicines, SUM(stock) as total_stock FROM medicines');
    const revenue = await dbGet('SELECT COALESCE(SUM(total), 0) as total_revenue FROM bills');
    const lowStock = await dbGet('SELECT COUNT(*) as low_stock FROM medicines WHERE stock <= reorder_level');
    const bills = await dbGet('SELECT COUNT(*) as total_bills FROM bills');

    res.json({
      totalMedicines: medicines[0]?.total_medicines || 0,
      totalStock: medicines[0]?.total_stock || 0,
      totalRevenue: Number(revenue?.total_revenue || 0),
      lowStock: lowStock?.low_stock || 0,
      totalBills: bills?.total_bills || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch summary', error: error.message });
  }
});

app.get('/api/medicines', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM medicines ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch medicines', error: error.message });
  }
});

app.post('/api/medicines', async (req, res) => {
  const { name, generic, category, batch, expiry, costPrice, sellingPrice, stock, reorderLevel } = req.body;

  if (!name || !sellingPrice || !stock) {
    return res.status(400).json({ message: 'Medicine name, selling price, and stock are required.' });
  }

  try {
    const result = await dbRun(
      `INSERT INTO medicines (name, generic, category, batch, expiry, cost_price, selling_price, stock, reorder_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        generic || '',
        category || '',
        batch || '',
        expiry || '',
        Number(costPrice || 0),
        Number(sellingPrice),
        Number(stock),
        Number(reorderLevel || 5),
      ]
    );

    const inserted = await dbGet('SELECT * FROM medicines WHERE id = ?', [result.id]);
    res.status(201).json(inserted);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add medicine', error: error.message });
  }
});

app.put('/api/medicines/:id', async (req, res) => {
  const { id } = req.params;
  const { name, generic, category, batch, expiry, costPrice, sellingPrice, stock, reorderLevel } = req.body;

  try {
    await dbRun(
      `UPDATE medicines SET
        name = ?, generic = ?, category = ?, batch = ?, expiry = ?, cost_price = ?, selling_price = ?, stock = ?, reorder_level = ?
        WHERE id = ?`,
      [
        name,
        generic || '',
        category || '',
        batch || '',
        expiry || '',
        Number(costPrice || 0),
        Number(sellingPrice),
        Number(stock),
        Number(reorderLevel || 5),
        id,
      ]
    );

    const updated = await dbGet('SELECT * FROM medicines WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update medicine', error: error.message });
  }
});

app.delete('/api/medicines/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM medicines WHERE id = ?', [req.params.id]);
    res.json({ message: 'Medicine deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete medicine', error: error.message });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM customers ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, address } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Customer name is required.' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)',
      [name, phone || '', address || '']
    );

    const inserted = await dbGet('SELECT * FROM customers WHERE id = ?', [result.id]);
    res.status(201).json(inserted);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add customer', error: error.message });
  }
});

app.get('/api/bills', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM bills ORDER BY id DESC');
    const mappedRows = rows.map((bill) => ({
      ...bill,
      items: JSON.parse(bill.items || '[]'),
    }));
    res.json(mappedRows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bills', error: error.message });
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

      const selectedMedicine = await dbGet(
        'SELECT * FROM medicines WHERE id = ?',
        [item.medicineId]
      );

      if (!selectedMedicine) {
        throw new Error('Medicine not found.');
      }

      const batches = await dbAll(
        `SELECT * FROM medicines
         WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
         ORDER BY
           CASE WHEN expiry IS NULL OR expiry = '' THEN 1 ELSE 0 END,
           expiry ASC,
           id ASC`,
        [selectedMedicine.name]
      );

      let remaining = quantity;

      for (const batch of batches) {
        if (remaining <= 0) break;

        const expiry = batch.expiry || '';

        if (expiry && expiry < today) continue;

        const available = Number(batch.stock) || 0;
        if (available <= 0) continue;

        const used = Math.min(remaining, available);
        const lineTotal = used * Number(selectedMedicine.selling_price);

        processedItems.push({
          medicineId: batch.id,
          name: batch.name,
          generic: batch.generic,
          batch: batch.batch,
          expiry: batch.expiry,
          quantity: used,
          sellingPrice: Number(selectedMedicine.selling_price),
          lineTotal
        });

        stockUpdates.push({
          id: batch.id,
          quantity: used
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

    if (discountAmount < 0 || discountAmount > subtotal + tax) {
      throw new Error('Invalid discount amount.');
    }

    for (const update of stockUpdates) {
      await dbRun(
        'UPDATE medicines SET stock = stock - ? WHERE id = ?',
        [update.quantity, update.id]
      );
    }

    const billResult = await dbRun(
      `INSERT INTO bills
       (customer_id, customer_name, bill_date, items, subtotal, discount, tax, total, paid_amount, payment_status)
       VALUES (?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId || null,
        customerName || 'Walk-in Customer',
        JSON.stringify(processedItems),
        subtotal,
        discountAmount,
        tax,
        total,
        Number(paidAmount || total),
        paymentStatus || 'Paid'
      ]
    );

    const savedBill = await dbGet(
      'SELECT * FROM bills WHERE id = ?',
      [billResult.id]
    );

    savedBill.items = JSON.parse(savedBill.items || '[]');

    res.status(201).json(savedBill);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save bill',
      error: error.message
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Aman Medicos server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
