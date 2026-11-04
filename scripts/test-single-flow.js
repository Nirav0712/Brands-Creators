const mongoose = require('mongoose');

async function testSingle() {
  await mongoose.connect('mongodb://127.0.0.1:27017/brands_creators_dev');
  const db = mongoose.connection.db;

  // Clean all
  await db.collection('users').deleteMany({ email: { $in: ['brand.test@example.com', 'creator.test@example.com'] } });
  await db.collection('brandProfiles').deleteMany({ slug: 'brand_test' });
  await db.collection('creatorProfiles').deleteMany({ slug: 'creator_test' });
  await db.collection('requirements').deleteMany({});
  await db.collection('applications').deleteMany({});
  console.log('Cleaned DB.');

  // 1. Register Brand
  const regBrand = await fetch('http://localhost:4000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'brand.test@example.com',
      username: 'brand_test',
      password: 'Password123!',
      fullName: 'Brand Test Co',
      role: 'BRAND',
    }),
  }).then(r => r.json());
  console.log('Brand Register result:', regBrand);

  const brandLogin = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'brand.test@example.com', password: 'Password123!' }),
  }).then(r => r.json());
  const bToken = brandLogin.data.accessToken;
  console.log('Brand Token retrieved:', !!bToken);

  // Check BrandProfile in DB
  const bp = await db.collection('brandProfiles').findOne({ slug: 'brand_test' });
  console.log('BrandProfile in DB:', bp);

  // Categories
  const cats = await fetch('http://localhost:4000/api/v1/categories').then(r => r.json());
  const catId = cats.data[0]._id;

  // 2. Create Requirement
  const reqRes = await fetch('http://localhost:4000/api/v1/requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + bToken },
    body: JSON.stringify({
      title: 'Summer Fashion Campaign 2026',
      description: 'Looking for expert fashion creators in Mumbai.',
      categoryId: catId,
      location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', isRemote: true },
      budgetType: 'RANGE',
      budget: { min: 50000, max: 120000, currency: 'INR' },
      applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      deliverables: ['3 Instagram Reels (9:16)'],
      status: 'DRAFT',
    }),
  }).then(r => r.json());
  console.log('Create Requirement result:', reqRes);

  await mongoose.disconnect();
}

testSingle();
