import imagekit from '../config/imagekit.js';
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dishCatalog = [
  { id: 1, name: 'Fattoush Salad', file: 'fattoush.jpg' },
  { id: 2, name: 'Authentic Lebanese Tabbouleh', file: 'tabbouleh.jpg' },
  { id: 3, name: 'Silk Hummus with Pine Nuts', file: 'hummus.jpg' },
  { id: 4, name: 'Burrata & Heirloom Salad', file: 'burrata.jpg' },
  { id: 5, name: 'Margherita Di Bufala', file: 'margherita.jpg' },
  { id: 6, name: 'Fig & Goat Cheese Pizza', file: 'fig_pizza.jpg' },
  { id: 7, name: 'Spicy Soujouk Pizza', file: 'soujouk_pizza.jpg' },
  { id: 8, name: 'Fettuccine Alfredo', file: 'alfredo.jpg' },
  { id: 9, name: 'Truffle Tagliatelle', file: 'tagliatelle.jpg' },
  { id: 10, name: 'Penne all Arrabbiata', file: 'penne.jpg' },
  { id: 11, name: 'Char-Grilled Shish Tawook', file: 'shish_tawook.jpg' },
  { id: 12, name: 'Prime Ribeye Steak', file: 'ribeye.jpg' },
  { id: 13, name: 'Grilled Kafta Skewers', file: 'kafta.jpg' },
  { id: 14, name: 'Warm Ashta Knefeh', file: 'knefeh.jpg' },
  { id: 15, name: 'Classic Mascarpone Tiramisu', file: 'tiramisu.jpg' },
];

async function migrateDishes() {
  console.log('🚀 Starting ImageKit Migration for 15 Mediterranean Menu Platters...\n');

  const assetsDir = path.join(__dirname, '..', 'frontend', 'assets');
  const results = [];

  for (const dish of dishCatalog) {
    const filePath = path.join(assetsDir, dish.file);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Local file not found: ${filePath}`);
      continue;
    }

    try {
      console.log(`📤 Uploading #${dish.id} "${dish.name}" (${dish.file})...`);
      const fileBuffer = fs.readFileSync(filePath);

      const uploadResponse = await imagekit.upload({
        file: fileBuffer,
        fileName: dish.file,
        folder: '/meals/',
        useUniqueFileName: false, // Clean, predictable file names
        tags: ['restaurant_menu', 'mediterranean', dish.file.replace('.jpg', '')]
      });

      // Apply ImageKit on-the-fly transformation for responsive WebP and quality optimization
      const optimizedUrl = `${uploadResponse.url}?tr=w-800,q-80,f-auto`;

      // Update MySQL database record
      await pool.query('UPDATE meals SET image_url = ? WHERE id = ?', [optimizedUrl, dish.id]);

      console.log(`   ✅ Success! CDN URL: ${optimizedUrl}`);
      results.push({
        id: dish.id,
        name: dish.name,
        file: dish.file,
        cdnUrl: optimizedUrl,
        sizeBytes: fs.statSync(filePath).size
      });
    } catch (err) {
      console.error(`   ❌ Failed to migrate #${dish.id} "${dish.name}":`, err.message);
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 Migration Completed! Successfully uploaded ${results.length}/${dishCatalog.length} platters.`);
  console.log('======================================================\n');

  // Verify in MySQL
  const [rows] = await pool.query('SELECT id, name, image_url FROM meals ORDER BY id ASC');
  console.log('📊 Verified MySQL `meals` table:');
  console.table(rows);

  // Write mapping to scratch for future reference
  const mappingPath = path.join(__dirname, '..', 'scratch', 'imagekit_urls.json');
  fs.writeFileSync(mappingPath, JSON.stringify(results, null, 2));
  console.log(`💾 Saved CDN mapping to ${mappingPath}`);

  process.exit(0);
}

migrateDishes().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
