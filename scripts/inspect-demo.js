const mongoose = require('mongoose');

async function inspectDemo() {
  await mongoose.connect('mongodb://127.0.0.1:27017/brands_creators_dev', { directConnection: true });
  const db = mongoose.connection.db;

  const creatorUser = await db.collection('users').findOne({ email: 'creator@demo.com' });
  const brandUser = await db.collection('users').findOne({ email: 'brand@demo.com' });
  console.log('Creator User:\n', JSON.stringify(creatorUser, null, 2));
  console.log('Brand User:\n', JSON.stringify(brandUser, null, 2));

  const creatorProfileSnake = await db.collection('creator_profiles').findOne({ userId: creatorUser._id });
  const brandProfileSnake = await db.collection('brand_profiles').findOne({ userId: brandUser._id });
  console.log('Creator Profile (creator_profiles):\n', JSON.stringify(creatorProfileSnake, null, 2));
  console.log('Brand Profile (brand_profiles):\n', JSON.stringify(brandProfileSnake, null, 2));

  // Check if anything exists in creatorProfiles or brandProfiles for these user IDs
  const creatorProfileCamel = await db.collection('creatorProfiles').findOne({
    $or: [{ userId: creatorUser._id }, { userId: creatorUser._id.toString() }]
  });
  const brandProfileCamel = await db.collection('brandProfiles').findOne({
    $or: [{ userId: brandUser._id }, { userId: brandUser._id.toString() }]
  });
  console.log('Creator in creatorProfiles:', creatorProfileCamel);
  console.log('Brand in brandProfiles:', brandProfileCamel);

  await mongoose.disconnect();
}

inspectDemo().catch(console.error);
