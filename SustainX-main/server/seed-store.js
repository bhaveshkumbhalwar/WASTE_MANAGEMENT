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
  // ── Stationery ─────────────────────────────────────────
  {
    name: 'Recycled Paper Notebook',
    description: 'A5 notebook with 120 ruled pages made from 100% post-consumer recycled paper. Soy-ink cover, eco-friendly binding.',
    pointsRequired: 50,
    stock: 30,
    category: 'stationery',
    image: null,
  },
  {
    name: 'Plantable Seed Pencil (5-pack)',
    description: 'Cedar-wood pencils with a seed capsule on the end — plant them when they get too short and watch herbs, flowers, or veggies grow!',
    pointsRequired: 35,
    stock: 50,
    category: 'stationery',
    image: null,
  },
  {
    name: 'Eco Pen Set (3-pack)',
    description: 'Smooth-writing ballpoint pens crafted from recycled PET bottles. Refillable cartridges included.',
    pointsRequired: 25,
    stock: 60,
    category: 'stationery',
    image: null,
  },
  {
    name: 'Recycled Desk Organizer',
    description: 'Multi-compartment desk caddy made from compressed recycled cardboard. Holds pens, sticky notes, and gadgets.',
    pointsRequired: 80,
    stock: 15,
    category: 'stationery',
    image: null,
  },

  // ── Home & Kitchen ─────────────────────────────────────
  {
    name: 'Bamboo Toothbrush',
    description: 'Biodegradable toothbrush with a sustainably-sourced bamboo handle and BPA-free charcoal bristles.',
    pointsRequired: 30,
    stock: 45,
    category: 'home',
    image: null,
  },
  {
    name: 'Stainless Steel Lunch Box',
    description: '800 ml leak-proof stainless steel tiffin with two compartments. Replaces single-use plastic containers.',
    pointsRequired: 150,
    stock: 12,
    category: 'home',
    image: null,
  },
  {
    name: 'Reusable Coffee Cup',
    description: '350 ml double-wall insulated cup made from recycled stainless steel. Splash-proof silicone lid included.',
    pointsRequired: 120,
    stock: 18,
    category: 'home',
    image: null,
  },
  {
    name: 'Recycled Coaster Set (4-pack)',
    description: 'Heat-resistant coasters made from compressed recycled paper and natural resin. Cork-backed to protect surfaces.',
    pointsRequired: 40,
    stock: 35,
    category: 'home',
    image: null,
  },
  {
    name: 'Waste Segregation Bin (3-in-1)',
    description: 'Compact desk-top trio bin with separate sections for dry, wet, and e-waste. Made from recycled HDPE plastic.',
    pointsRequired: 200,
    stock: 8,
    category: 'home',
    image: null,
  },

  // ── Accessories ────────────────────────────────────────
  {
    name: 'Cloth Shopping Tote Bag',
    description: 'Sturdy carry-all tote made from upcycled cotton fabric. Foldable, washable, and strong enough for groceries.',
    pointsRequired: 60,
    stock: 40,
    category: 'accessories',
    image: null,
  },
  {
    name: 'Steel Water Bottle (750 ml)',
    description: 'Single-wall stainless steel water bottle with a leak-proof bamboo cap. Keeps drinks cool, zero plastic.',
    pointsRequired: 100,
    stock: 20,
    category: 'accessories',
    image: null,
  },
  {
    name: 'Eco-Friendly Backpack',
    description: 'Lightweight 20L daypack made from recycled PET bottles. Padded laptop sleeve, water-resistant coating.',
    pointsRequired: 250,
    stock: 6,
    category: 'accessories',
    image: null,
  },
  {
    name: 'Upcycled Denim Pencil Pouch',
    description: 'Zippered pencil case hand-sewn from reclaimed denim scraps. Each one is unique!',
    pointsRequired: 45,
    stock: 25,
    category: 'accessories',
    image: null,
  },
  {
    name: 'Eco Badge / Pin',
    description: 'Collectible enamel badge made from recycled zinc alloy. Show your eco-warrior pride on your bag or lanyard!',
    pointsRequired: 15,
    stock: 70,
    category: 'accessories',
    image: null,
  },

  // ── Garden & Outdoors ──────────────────────────────────
  {
    name: 'Compost Starter Kit',
    description: 'Beginner-friendly composting set with a biodegradable pot, enriched soil, and herb seed packets. Grow basil, mint, or coriander!',
    pointsRequired: 90,
    stock: 14,
    category: 'garden',
    image: null,
  },
  {
    name: 'Solar Power Bank (5000 mAh)',
    description: 'Portable charger with a built-in solar panel. Made from recycled ABS plastic. USB-C and Lightning outputs.',
    pointsRequired: 300,
    stock: 5,
    category: 'other',
    image: null,
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
