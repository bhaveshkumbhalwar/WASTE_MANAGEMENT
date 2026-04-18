/**
 * Seed script: Populates the store with eco-friendly daily-use products.
 *
 * Usage:
 *   node seed-store.js          → inserts only if store is empty
 *   node seed-store.js --force  → clears existing items and reseeds
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const StoreItem = require('./models/StoreItem');

const PRODUCTS = [
  {
    name: 'Bamboo Toothbrush',
    description: 'Eco-friendly toothbrush made from 100% biodegradable bamboo with BPA-free soft bristles.',
    pointsRequired: 30,
    stock: 50,
    category: 'home',
    image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Steel Water Bottle',
    description: 'Durable, leak-proof stainless steel bottle. Helps eliminate single-use plastic waste.',
    pointsRequired: 120,
    stock: 25,
    category: 'accessories',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Cloth Shopping Bag',
    description: 'Sturdy, reusable cotton tote bag. Perfect for reducing plastic bag waste during shopping.',
    pointsRequired: 40,
    stock: 100,
    category: 'accessories',
    image: 'https://images.unsplash.com/photo-1544816153-199d88767942?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Recycled Notebook',
    description: 'A5 notebook made from 100% recycled paper. Ideal for journaling and eco-conscious note-taking.',
    pointsRequired: 60,
    stock: 40,
    category: 'stationery',
    image: 'https://images.unsplash.com/photo-1531346878377-a5be2016584c?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Desk Organizer',
    description: 'Minimalist organizer made from reclaimed or recycled materials. Keep your workspace tidy.',
    pointsRequired: 150,
    stock: 15,
    category: 'stationery',
    image: 'https://images.unsplash.com/photo-1587614382346-ac5c9c6e3a2f?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Stainless Steel Lunch Box',
    description: 'Leak-proof, two-tier tiffin. Safe for food storage and extremely durable for daily use.',
    pointsRequired: 180,
    stock: 20,
    category: 'home',
    image: 'https://images.unsplash.com/photo-1621466561453-7313670989ea?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Reusable Coffee Cup',
    description: 'Insulated cup with a silicone lid. Perfect for coffee or tea on the go while protecting the planet.',
    pointsRequired: 100,
    stock: 30,
    category: 'home',
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Eco Backpack',
    description: 'Ergonomic backpack made from recycled plastic bottles (rPET). Water-resistant and stylish.',
    pointsRequired: 500,
    stock: 10,
    category: 'accessories',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Waste Segregation Bin',
    description: 'Partitioned bin for easy waste sorting at home. Made from high-quality recycled plastic.',
    pointsRequired: 250,
    stock: 12,
    category: 'home',
    image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Solar Power Bank',
    description: 'Portable charger with solar charging panels. Recharge your devices using clean energy.',
    pointsRequired: 400,
    stock: 8,
    category: 'other',
    image: 'https://images.unsplash.com/photo-1617788131756-0b39129bd23d?auto=format&fit=crop&q=80&w=800',
  },
];

async function seed() {
  await connectDB();

  const forceReseed = process.argv.includes('--force');

  if (forceReseed) {
    const deleted = await StoreItem.deleteMany({});
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing store item(s).`);
  } else {
    const existing = await StoreItem.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Store already has ${existing} items. Run with --force to clear and reseed.`);
      process.exit(0);
    }
  }

  const result = await StoreItem.insertMany(PRODUCTS);
  console.log(`✅ Seeded ${result.length} eco-friendly store items:`);
  result.forEach((item) => {
    console.log(`   • ${item.name} — ${item.pointsRequired} pts (${item.stock} in stock)`);
  });

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
