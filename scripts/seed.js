import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

/**
 * Production Database Seeder
 * Initializes all required tables, categories, dishes, dining tables, and staff demo accounts.
 * Safe to run multiple times (idempotent with INSERT IGNORE).
 */
async function seedDatabase() {
  console.log('🌱 Starting Fig & Olive Production Database Seed...\n');

  try {
    // 1. Create Tables
    console.log('1️⃣ Creating relational schema tables if not exist...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        price DECIMAL(10,2) NOT NULL,
        category_id INT NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        image_url VARCHAR(500) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin','waiter','cashier','customer') NOT NULL DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS restaurant_tables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_number VARCHAR(10) NOT NULL UNIQUE,
        capacity INT NOT NULL,
        status ENUM('available','occupied') NOT NULL DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_id INT NOT NULL,
        user_id INT NOT NULL,
        status ENUM('pending', 'preparing', 'served', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
        total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE RESTRICT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        meal_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE RESTRICT
      );
    `);

    console.log('   ✅ All 6 schema tables verified.');

    // 2. Seed Categories
    console.log('2️⃣ Seeding Mediterranean categories...');
    await pool.query(`
      INSERT IGNORE INTO categories (id, name, description) VALUES
      (1, 'Pasta', 'Handmade Mediterranean pasta dishes'),
      (2, 'Salad', 'Crisp garden salads, fresh mezze, and virgin olive oil dressings'),
      (3, 'Pizza', 'Authentic wood-fired hearthstone pizzas'),
      (4, 'Grill', 'Char-grilled skewers, prime meats, and coastal specialties'),
      (5, 'Dessert', 'Artisanal Mediterranean desserts and dolce');
    `);
    console.log('   ✅ 5 categories active.');

    // 3. Seed Meals
    console.log('3️⃣ Seeding 15 Mediterranean dishes with ImageKit CDN URLs...');
    const meals = [
      {
        id: 1,
        name: 'Fattoush Salad',
        price: 8.50,
        category_id: 2,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/fattoush.jpg?tr=w-800,q-80,f-auto',
        description: 'Crisp garden vegetables, purslane, and radishes tossed with ruby pomegranate molasses, wild sumac, and olive-oil pita crisps.'
      },
      {
        id: 2,
        name: 'Authentic Lebanese Tabbouleh',
        price: 7.50,
        category_id: 2,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/tabbouleh.jpg?tr=w-800,q-80,f-auto',
        description: 'Finely hand-chopped parsley, fresh spearmint, vine tomatoes, sweet onions, and cracked wheat in cold-pressed virgin olive oil and lemon.'
      },
      {
        id: 3,
        name: 'Silk Hummus with Pine Nuts',
        price: 7.00,
        category_id: 2,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/hummus.jpg?tr=w-800,q-80,f-auto',
        description: 'Velvety chickpea puree with sesame tahini, fresh lemon, toasted pine nuts, and a generous pool of virgin olive oil.'
      },
      {
        id: 4,
        name: 'Burrata & Heirloom Salad',
        price: 11.50,
        category_id: 2,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/burrata.jpg?tr=w-800,q-80,f-auto',
        description: 'Fresh Italian burrata with sweet coastal tomatoes, wild peppery arugula, extra virgin olive oil, and aged balsamic reduction.'
      },
      {
        id: 5,
        name: 'Margherita Di Bufala',
        price: 12.50,
        category_id: 3,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/margherita.jpg?tr=w-800,q-80,f-auto',
        description: 'Wood-fired crust with San Marzano tomato sauce, fresh buffalo mozzarella, virgin olive oil, and torn sweet basil.'
      },
      {
        id: 6,
        name: 'Fig & Goat Cheese Pizza',
        price: 14.50,
        category_id: 3,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/fig_pizza.jpg?tr=w-800,q-80,f-auto',
        description: 'Our signature hearth pizza with sweet caramelized figs, creamy goat cheese, mozzarella, baby rocket, and wildflower honey drizzle.'
      },
      {
        id: 7,
        name: 'Spicy Soujouk Pizza',
        price: 14.00,
        category_id: 3,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/soujouk_pizza.jpg?tr=w-800,q-80,f-auto',
        description: 'Artisan stone-baked crust topped with spiced beef soujouk, roasted peppers, melted mozzarella, and wild mountain zaatar.'
      },
      {
        id: 8,
        name: 'Fettuccine Alfredo',
        price: 13.50,
        category_id: 1,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/alfredo.jpg?tr=w-800,q-80,f-auto',
        description: 'Hand-rolled egg fettuccine tossed in a 24-month parmigiano-reggiano emulsion, cultured butter, and cracked Tellicherry black pepper.'
      },
      {
        id: 9,
        name: 'Truffle Tagliatelle',
        price: 17.50,
        category_id: 1,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/tagliatelle.jpg?tr=w-800,q-80,f-auto',
        description: 'Fresh ribbon pasta bathed in black truffle butter, roasted garlic confit, and shaved parmigiano crisp.'
      },
      {
        id: 10,
        name: 'Penne all Arrabbiata',
        price: 11.00,
        category_id: 1,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/penne.jpg?tr=w-800,q-80,f-auto',
        description: 'Al dente penne tossed in slow-simmered San Marzano tomatoes, garlic, fresh red chilies, olive oil, and fragrant sweet basil.'
      },
      {
        id: 11,
        name: 'Char-Grilled Shish Tawook',
        price: 15.50,
        category_id: 4,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/shish_tawook.jpg?tr=w-800,q-80,f-auto',
        description: 'Skewers of tender chicken breast marinated in lemon, garlic, and Mediterranean spices, flame-grilled and served with garlic toum.'
      },
      {
        id: 12,
        name: 'Prime Ribeye Steak',
        price: 26.00,
        category_id: 4,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/ribeye.jpg?tr=w-800,q-80,f-auto',
        description: 'Center-cut prime beef seared over wood embers, basted in rosemary-garlic butter, finished with crunchy Cyprus sea salt.'
      },
      {
        id: 13,
        name: 'Grilled Kafta Skewers',
        price: 16.50,
        category_id: 4,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/kafta.jpg?tr=w-800,q-80,f-auto',
        description: 'Hand-minced lamb and beef with garden parsley, onions, and Lebanese spices, grilled over embers with charred tomatoes.'
      },
      {
        id: 14,
        name: 'Warm Ashta Knefeh',
        price: 7.50,
        category_id: 5,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/knefeh.jpg?tr=w-800,q-80,f-auto',
        description: 'Golden baked semolina pastry filled with sweet clotted ashta cream, finished with roasted Aleppo pistachios and orange blossom syrup.'
      },
      {
        id: 15,
        name: 'Classic Mascarpone Tiramisu',
        price: 7.00,
        category_id: 5,
        image_url: 'https://ik.imagekit.io/z5fkmijzk/meals/tiramisu.jpg?tr=w-800,q-80,f-auto',
        description: 'Delicate espresso-soaked Italian savoiardi layered with whipped mascarpone cream and dusted with bitter Dutch cocoa.'
      }
    ];

    for (const m of meals) {
      await pool.query(
        `INSERT INTO meals (id, name, price, category_id, is_available, image_url, description)
         VALUES (?, ?, ?, ?, TRUE, ?, ?)
         ON DUPLICATE KEY UPDATE
           price = VALUES(price),
           image_url = VALUES(image_url),
           description = VALUES(description);`,
        [m.id, m.name, m.price, m.category_id, m.image_url, m.description]
      );
    }
    console.log('   ✅ 15 dishes seeded with ImageKit CDN assets.');

    // 4. Seed Dining Tables
    console.log('4️⃣ Seeding restaurant tables...');
    const tables = [
      { id: 1, table_number: 'T-1', capacity: 4 },
      { id: 2, table_number: 'F-01', capacity: 4 },
      { id: 3, table_number: 'T-2', capacity: 2 },
      { id: 4, table_number: 'T-3', capacity: 6 },
      { id: 5, table_number: 'T-4', capacity: 4 },
      { id: 6, table_number: 'VIP-1', capacity: 8 },
      { id: 7, table_number: 'Patio-1', capacity: 2 }
    ];

    for (const t of tables) {
      await pool.query(
        `INSERT IGNORE INTO restaurant_tables (id, table_number, capacity, status)
         VALUES (?, ?, ?, 'available');`,
        [t.id, t.table_number, t.capacity]
      );
    }
    console.log('   ✅ 7 dining tables seeded.');

    // 5. Seed Demo Staff Users
    console.log('5️⃣ Seeding demo staff accounts with secure bcrypt hashes...');
    const salt = await bcrypt.genSalt(10);
    const hashAdmin = await bcrypt.hash('admin123', salt);
    const hashWaiter = await bcrypt.hash('waiter123', salt);
    const hashCashier = await bcrypt.hash('cashier123', salt);

    const users = [
      { username: 'admin_demo', email: 'admin@restaurant.com', hash: hashAdmin, role: 'admin' },
      { username: 'waiter_demo', email: 'waiter@restaurant.com', hash: hashWaiter, role: 'waiter' },
      { username: 'cashier_demo', email: 'cashier@restaurant.com', hash: hashCashier, role: 'cashier' }
    ];

    for (const u of users) {
      await pool.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           password_hash = VALUES(password_hash),
           role = VALUES(role);`,
        [u.username, u.email, u.hash, u.role]
      );
    }
    console.log('   ✅ 3 demo accounts ready (Admin, Waiter, Cashier).');

    console.log('\n🎉 Production Database Seeding Complete!');
    console.log('----------------------------------------------------');
    console.log('Credentials:');
    console.log('  👑 Admin:   admin@restaurant.com   / admin123');
    console.log('  🍽️ Waiter:  waiter@restaurant.com  / waiter123');
    console.log('  💳 Cashier: cashier@restaurant.com / cashier123');
    console.log('----------------------------------------------------\n');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
