const mongoose = require('mongoose');

async function audit() {
  await mongoose.connect('mongodb://127.0.0.1:27017/brands_creators_dev');
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();

  console.log('=== DATABASE AUDIT REPORT ===\n');

  const stats = {};

  for (const c of cols) {
    const colName = c.name;
    const col = db.collection(colName);
    const total = await col.countDocuments();
    const explicitTestCount = await col.countDocuments({ isTestData: true });

    let potentialTestCount = 0;
    if (colName === 'users') {
      potentialTestCount = await col.countDocuments({
        $or: [
          { isTestData: true },
          { email: { $regex: /@example\.com|test/i } },
          { username: { $regex: /test|qa_|seed_/i } },
        ],
      });
    } else if (colName === 'creatorProfiles' || colName === 'brandProfiles') {
      potentialTestCount = await col.countDocuments({
        $or: [
          { isTestData: true },
          { slug: { $regex: /test|qa-|seed-/i } },
          { displayName: { $regex: /test/i } },
          { companyName: { $regex: /test/i } },
        ],
      });
    } else if (colName === 'requirements') {
      potentialTestCount = await col.countDocuments({
        $or: [
          { isTestData: true },
          { title: { $regex: /test|campaign/i } },
        ],
      });
    } else {
      potentialTestCount = explicitTestCount;
    }

    stats[colName] = {
      total,
      explicitTest: explicitTestCount,
      potentialTest: potentialTestCount,
    };

    console.log(
      `${colName.padEnd(28)} | Total: ${total.toString().padStart(5)} | isTestData=true: ${explicitTestCount.toString().padStart(5)} | Potential: ${potentialTestCount.toString().padStart(5)}`
    );
  }

  // Inspect users in detail
  console.log('\n--- DETAILED USER AUDIT ---');
  const users = await db.collection('users').find({}).toArray();
  const superAdmins = users.filter((u) => u.roles && (u.roles.includes('SUPER_ADMIN') || u.roles.includes('ADMIN')));
  console.log(`Admin/SuperAdmin accounts (${superAdmins.length}):`);
  superAdmins.forEach((u) => console.log(`  - ${u.email} [${u.roles.join(', ')}] id: ${u._id}`));

  const realLikeUsers = users.filter((u) => !u.isTestData && !u.email.includes('example.com') && !u.email.includes('test'));
  console.log(`\nNon-test users (${realLikeUsers.length}):`);
  realLikeUsers.forEach((u) => console.log(`  - ${u.email} [${u.roles ? u.roles.join(', ') : 'no role'}] id: ${u._id}`));

  // Check email_deliveries
  const emailDeliveries = await db.collection('email_deliveries').countDocuments({ isTestData: true });
  console.log(`\nemail_deliveries: total = ${stats['email_deliveries'] ? stats['email_deliveries'].total : 0}, explicit isTestData = ${emailDeliveries}`);

  await mongoose.disconnect();
}

audit().catch(console.error);

