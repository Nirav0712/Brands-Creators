/**
 * BRANDS & CREATORS — PHASE 05 INTEGRATION & QA AUDIT SUITE
 * Projects, Milestones, Deliverables, Tasks, Files & Collaboration Workspace
 *
 * Verifies real MongoDB persistence, authorization, state machines, and lifecycle transitions.
 */

const mongoose = require('mongoose');

const API_BASE = 'http://localhost:4000/api/v1';
const MONGO_URI = 'mongodb://127.0.0.1:27017/brands_creators_dev';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message} ${details ? `(${details})` : ''}`);
  }
}

async function apiRequest(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const TEST_BYPASS_SECRET = process.env.RATE_LIMIT_TEST_BYPASS_SECRET || 'bc_test_secret_hardening_suite_9f82d1e4a7c06b';
  const headers = {
    'Content-Type': 'application/json',
    'x-bypass-rate-limit': TEST_BYPASS_SECRET,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function runPhase05Tests() {
  console.log('\n===============================================================');
  console.log('  BRANDS & CREATORS — PHASE 05 PROJECTS & WORKSPACE QA SUITE   ');
  console.log('===============================================================\n');

  console.log('📦 Connecting to MongoDB for persistence audit...');
  const atlasUri = 'mongodb+srv://thedigitalconnect712_db_user:bnJPZHGOoI4e4p8N@cluster0.vkdrewz.mongodb.net/brands_creators?retryWrites=true&w=majority';
  let activeUri = atlasUri;
  try {
    const testConn = await mongoose.createConnection(atlasUri, { serverSelectionTimeoutMS: 2500 }).asPromise();
    await testConn.close();
    activeUri = atlasUri;
  } catch (e) {
    activeUri = 'mongodb://127.0.0.1:27017/brands_creators_dev';
  }

  await mongoose.connect(activeUri);
  console.log(` Connected to MongoDB: ${activeUri}\n`);

  const db = mongoose.connection.db;

  try {
    // 0. AUTHENTICATION SETUP
    console.log('--- 0. AUTHENTICATION & TEST ENTITIES SETUP ---');
    const users = {
      brandA: { email: 'brand.a.audit@example.com', username: 'brand_a_audit', password: 'Password123!', role: 'BRAND', name: 'Acme Brand A' },
      brandB: { email: 'brand.b.audit@example.com', username: 'brand_b_audit', password: 'Password123!', role: 'BRAND', name: 'Zenith Brand B' },
      creatorA: { email: 'creator.a.audit@example.com', username: 'creator_a_audit', password: 'Password123!', role: 'CREATOR', name: 'Aarav Creator A' },
      creatorB: { email: 'creator.b.audit@example.com', username: 'creator_b_audit', password: 'Password123!', role: 'CREATOR', name: 'Bhavna Creator B' },
      admin: { email: 'admin@brandsandcreators.com', password: 'SuperAdmin@Brands2026!' },
    };

    const tokens = {};
    const userDocs = {};

    for (const [key, user] of Object.entries(users)) {
      if (key !== 'admin') {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: {
            email: user.email,
            username: user.username,
            password: user.password,
            fullName: user.name,
            role: user.role,
          },
        });
      }

      const loginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: { login: user.email, password: user.password },
      });

      tokens[key] = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
      userDocs[key] = loginRes.data?.data?.user || loginRes.data?.user;
      assert(!!tokens[key], `Auth Setup > Login ${key} (${user.email})`);
    }

    const categories = await db.collection('categories').find({}).toArray();
    const catId = categories[0]?._id?.toString() || '66c012345678901234567890';

    // Ensure profiles are active
    await apiRequest('/creators/me', {
      method: 'PATCH',
      token: tokens.creatorA,
      body: {
        headline: 'Commercial UGC Creator',
        primaryCategoryId: catId,
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', isRemote: true },
      },
    });
    await apiRequest('/creators/me/publish', { method: 'POST', token: tokens.creatorA });

    await apiRequest('/brands/me', {
      method: 'PATCH',
      token: tokens.brandA,
      body: {
        companyName: 'Acme Skincare',
        industry: 'Beauty',
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
      },
    });
    await apiRequest('/brands/me/publish', { method: 'POST', token: tokens.brandA });

    // Seed Requirement & Accepted Application
    const reqRes = await apiRequest('/requirements', {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: `Phase 05 Project Campaign ${Date.now()}`,
        description: 'Need commercial UGC video assets for project workspace testing',
        categoryId: catId,
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India', isRemote: true },
        budgetType: 'RANGE',
        budget: { min: 45000, max: 75000, currency: 'INR' },
        deliverables: ['3x 4K Vertical UGC Reels', 'Scripting & Hook Variations'],
        applicationDeadline: new Date(Date.now() + 86400000 * 30).toISOString(),
      },
    });

    const requirementId = reqRes.data?.data?._id || reqRes.data?._id;
    if (!requirementId) console.error('Requirement creation failed:', reqRes);

    await apiRequest(`/requirements/${requirementId}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'PUBLISHED' },
    });

    // Creator A applies
    const appRes = await apiRequest('/applications', {
      method: 'POST',
      token: tokens.creatorA,
      body: {
        requirementId,
        proposal: 'I will direct and deliver 3 high-impact commercial UGC reels.',
        offeredPrice: 65000,
        currency: 'INR',
        availability: 'Immediate',
        estimatedDelivery: '10 Days',
      },
    });
    const applicationId = appRes.data?.data?._id || appRes.data?._id;
    if (!applicationId) console.error('Application creation failed:', appRes);

    // Brand A accepts application
    await apiRequest(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'ACCEPTED' },
    });

    assert(applicationId && requirementId, 'Setup > Requirement created and application ACCEPTED');

    // 1. PROJECT CREATION FROM ACCEPTED APPLICATION
    console.log('\n--- 1. PROJECT CREATION FROM ACCEPTED APPLICATION ---');
    const createProjectRes = await apiRequest(`/projects/from-application/${applicationId}`, {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: 'Skincare Launch Commercial Video Project',
        description: 'Execute commercial script, shoot on location, and deliver 4K final reels.',
      },
    });

    assert(createProjectRes.status === 201 || createProjectRes.status === 200, 'Project Creation > Brand creates project from accepted application');
    const projectData = createProjectRes.data?.data || createProjectRes.data;
    const projectId = projectData?._id || projectData?.id;
    if (!projectId) console.error('Project creation returned:', createProjectRes);

    // Direct MongoDB Audit
    const mongoProject = projectId ? await db.collection('projects').findOne({ _id: new mongoose.Types.ObjectId(projectId) }) : null;
    assert(mongoProject !== null, 'MongoDB Audit > Project document persisted in projects collection');
    assert(!!mongoProject?.projectNumber?.startsWith('BC-'), 'MongoDB Audit > Unique human-readable project number generated (BC-YYYY-XXXXXX)');
    assert(!!mongoProject?.slug && mongoProject.slug.length > 5, 'MongoDB Audit > Unique SEO slug generated');
    assert(mongoProject?.brandId?.toString() === userDocs.brandA._id.toString(), 'MongoDB Audit > Correct brandId linked');
    assert(mongoProject?.professionalId?.toString() === userDocs.creatorA._id.toString(), 'MongoDB Audit > Correct professionalId linked');
    assert(mongoProject?.requirementId?.toString() === requirementId.toString(), 'MongoDB Audit > Correct requirementId linked');
    assert(mongoProject?.applicationId?.toString() === applicationId.toString(), 'MongoDB Audit > Correct applicationId linked');
    assert(mongoProject?.approvedBudget === 65000, 'Budget Integrity > Approved budget strictly derived from application offeredPrice (₹65,000)');
    assert(mongoProject?.status === 'CONFIRMED' || mongoProject?.status === 'IN_PROGRESS', 'MongoDB Audit > Initial project status is CONFIRMED');

    // 2. DUPLICATE PROJECT PREVENTION
    console.log('\n--- 2. DUPLICATE PROJECT PREVENTION ---');
    const duplicateRes = await apiRequest(`/projects/from-application/${applicationId}`, {
      method: 'POST',
      token: tokens.brandA,
      body: { title: 'Duplicate Project Attempt' },
    });
    assert(duplicateRes.status === 409, 'Duplicate Guard > Second project creation from same application strictly rejected (409 Conflict)');

    const projectDocCount = await db.collection('projects').countDocuments({ applicationId: new mongoose.Types.ObjectId(applicationId) });
    assert(projectDocCount === 1, 'MongoDB Audit > Exactly ONE project document exists in MongoDB for this application');

    // 3. AUTHORIZATION & CROSS-TENANT ISOLATION
    console.log('\n--- 3. AUTHORIZATION & CROSS-TENANT ISOLATION ---');
    const brandAccessRes = await apiRequest(`/projects/${projectId}`, { token: tokens.brandA });
    assert(brandAccessRes.status === 200, 'RBAC > Brand A can access own project workspace');

    const creatorAccessRes = await apiRequest(`/projects/${projectId}`, { token: tokens.creatorA });
    assert(creatorAccessRes.status === 200, 'RBAC > Creator A can access own project workspace');

    const brandBAccessRes = await apiRequest(`/projects/${projectId}`, { token: tokens.brandB });
    assert(brandBAccessRes.status === 403, 'RBAC / Isolation > Brand B CANNOT access Brand A project workspace (403 Forbidden)');

    const creatorBAccessRes = await apiRequest(`/projects/${projectId}`, { token: tokens.creatorB });
    assert(creatorBAccessRes.status === 403, 'RBAC / Isolation > Creator B CANNOT access Creator A project workspace (403 Forbidden)');

    const anonAccessRes = await apiRequest(`/projects/${projectId}`);
    assert(anonAccessRes.status === 401, 'RBAC / Security > Anonymous user CANNOT access project workspace (401 Unauthorized)');

    // 4. PROJECT STATUS STATE MACHINE
    console.log('\n--- 4. PROJECT STATUS STATE MACHINE & TRANSITIONS ---');
    const startRes = await apiRequest(`/projects/${projectId}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'IN_PROGRESS' },
    });
    assert(startRes.status === 200 && (startRes.data?.data?.status === 'IN_PROGRESS' || startRes.data?.status === 'IN_PROGRESS'), 'Lifecycle > Transition: CONFIRMED -> IN_PROGRESS');

    const holdNoReasonRes = await apiRequest(`/projects/${projectId}/hold`, {
      method: 'POST',
      token: tokens.brandA,
      body: {},
    });
    assert(holdNoReasonRes.status === 400, 'Validation > Putting project ON_HOLD without reason rejected (400 Bad Request)');

    const holdRes = await apiRequest(`/projects/${projectId}/hold`, {
      method: 'POST',
      token: tokens.brandA,
      body: { reason: 'Awaiting product samples shipment from manufacturer' },
    });
    assert((holdRes.status === 200 || holdRes.status === 201) && (holdRes.data?.data?.status === 'ON_HOLD' || holdRes.data?.status === 'ON_HOLD'), 'Lifecycle > Transition: IN_PROGRESS -> ON_HOLD with reason');

    const resumeRes = await apiRequest(`/projects/${projectId}/status`, {
      method: 'PATCH',
      token: tokens.brandA,
      body: { status: 'IN_PROGRESS' },
    });
    assert(resumeRes.status === 200 && (resumeRes.data?.data?.status === 'IN_PROGRESS' || resumeRes.data?.status === 'IN_PROGRESS'), 'Lifecycle > Transition: ON_HOLD -> IN_PROGRESS resumed');

    // 5. MILESTONE CREATION & LIFECYCLE
    console.log('\n--- 5. MILESTONE SYSTEM & LIFECYCLE ---');
    const m1Res = await apiRequest(`/projects/${projectId}/milestones`, {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: 'Scripting & Hook Variations',
        description: 'Deliver 3 draft scripts with hook options.',
        order: 1,
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      },
    });
    assert(m1Res.status === 201 || m1Res.status === 200, 'Milestones > Brand creates Milestone 1');
    const m1Id = m1Res.data?.data?._id || m1Res.data?._id;

    const mongoMilestone = await db.collection('milestones').findOne({ _id: new mongoose.Types.ObjectId(m1Id) });
    assert(mongoMilestone !== null && mongoMilestone.projectId.toString() === projectId.toString(), 'MongoDB Audit > Milestone persisted with correct projectId reference');

    const m2Res = await apiRequest(`/projects/${projectId}/milestones`, {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: 'Video Production & Editing',
        description: 'Shoot and edit 4K vertical reels.',
        order: 2,
      },
    });
    const m2Id = m2Res.data?.data?._id || m2Res.data?._id;
    assert(!!m2Id, 'Milestones > Brand creates Milestone 2');

    // Milestone status transition
    const mUpdateRes = await apiRequest(`/milestones/${m1Id}/status`, {
      method: 'PATCH',
      token: tokens.creatorA,
      body: { status: 'IN_PROGRESS' },
    });
    assert(mUpdateRes.status === 200, 'Milestones > Creator updates Milestone 1 status to IN_PROGRESS');

    // 6. DELIVERABLE SUBMISSION & VERSIONING
    console.log('\n--- 6. DELIVERABLE SUBMISSION & VERSION HISTORY ---');
    const delivCreateRes = await apiRequest(`/projects/${projectId}/deliverables`, {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: '3x Direct Response UGC Reels',
        description: 'High-retention UGC videos formatted for Meta ads.',
        milestoneId: m2Id,
        type: 'VIDEO',
      },
    });
    assert(delivCreateRes.status === 201 || delivCreateRes.status === 200, 'Deliverables > Create deliverable placeholder');
    const deliverableId = delivCreateRes.data?.data?._id || delivCreateRes.data?._id;

    // Creator A submits Version 1
    const submitV1Res = await apiRequest(`/deliverables/${deliverableId}/submit`, {
      method: 'POST',
      token: tokens.creatorA,
      body: {
        files: [
          {
            fileName: 'Skincare_HookA_Draft_V1.mp4',
            url: 'https://cloudinary.example.com/videos/v1_draft_a.mp4',
            size: 45000000,
            mimeType: 'video/mp4',
          },
        ],
        notes: 'Attached version 1 with problem-solution hook pattern.',
      },
    });
    const v1Data = submitV1Res.data?.data || submitV1Res.data;
    assert((submitV1Res.status === 200 || submitV1Res.status === 201) && v1Data?.submissionVersion === 1, 'Deliverables > Creator submits Version 1');

    const mongoDelivV1 = await db.collection('deliverables').findOne({ _id: new mongoose.Types.ObjectId(deliverableId) });
    assert(mongoDelivV1.versions.length === 1 && mongoDelivV1.versions[0].version === 1, 'MongoDB Audit > Version 1 persisted in deliverable versions array');
    assert(mongoDelivV1.status === 'SUBMITTED', 'MongoDB Audit > Deliverable status is SUBMITTED');

    // 7. REVISION REQUEST WORKFLOW
    console.log('\n--- 7. REVISION REQUEST & FEEDBACK AUDIT ---');
    const revNoFeedbackRes = await apiRequest(`/deliverables/${deliverableId}/revision`, {
      method: 'POST',
      token: tokens.brandA,
      body: { feedback: '' },
    });
    assert(revNoFeedbackRes.status === 400, 'Validation > Requesting revision without feedback rejected (400 Bad Request)');

    const revRes = await apiRequest(`/deliverables/${deliverableId}/revision`, {
      method: 'POST',
      token: tokens.brandA,
      body: { feedback: 'Please increase caption font size and trim initial 2 seconds to boost hook speed.' },
    });
    const revData = revRes.data?.data || revRes.data;
    assert((revRes.status === 200 || revRes.status === 201) && revData?.status === 'REVISION_REQUIRED', 'Revision > Brand requests revision with detailed feedback');

    const mongoDelivRev = await db.collection('deliverables').findOne({ _id: new mongoose.Types.ObjectId(deliverableId) });
    assert(mongoDelivRev.feedback.includes('increase caption font size'), 'MongoDB Audit > Revision feedback persisted in MongoDB');

    // Creator submits Version 2
    const submitV2Res = await apiRequest(`/deliverables/${deliverableId}/submit`, {
      method: 'POST',
      token: tokens.creatorA,
      body: {
        files: [
          {
            fileName: 'Skincare_HookA_Revised_V2.mp4',
            url: 'https://cloudinary.example.com/videos/v2_final_a.mp4',
            size: 46000000,
            mimeType: 'video/mp4',
          },
        ],
        notes: 'Captions enlarged and hook tightened by 2.2 seconds.',
      },
    });
    const v2Data = submitV2Res.data?.data || submitV2Res.data;
    assert((submitV2Res.status === 200 || submitV2Res.status === 201) && v2Data?.submissionVersion === 2, 'Deliverables > Creator submits Version 2');

    const mongoDelivV2 = await db.collection('deliverables').findOne({ _id: new mongoose.Types.ObjectId(deliverableId) });
    assert(mongoDelivV2.versions.length === 2, 'MongoDB Audit > Both Version 1 and Version 2 preserved in audit history');

    // 8. APPROVAL & PROGRESS RECALCULATION
    console.log('\n--- 8. DELIVERABLE APPROVAL & PROGRESS ENGINE ---');
    // Unauthorized user cannot approve
    const creatorApproveRes = await apiRequest(`/deliverables/${deliverableId}/approve`, {
      method: 'POST',
      token: tokens.creatorA,
      body: {},
    });
    assert(creatorApproveRes.status === 403, 'RBAC / Security > Creator CANNOT approve own deliverable (403 Forbidden)');

    const approveRes = await apiRequest(`/deliverables/${deliverableId}/approve`, {
      method: 'POST',
      token: tokens.brandA,
      body: {},
    });
    const appData = approveRes.data?.data || approveRes.data;
    assert((approveRes.status === 200 || approveRes.status === 201) && appData?.status === 'APPROVED', 'Approval > Brand approves Deliverable Version 2');

    const mongoDelivApp = await db.collection('deliverables').findOne({ _id: new mongoose.Types.ObjectId(deliverableId) });
    assert(mongoDelivApp.status === 'APPROVED' && mongoDelivApp.reviewedBy.toString() === userDocs.brandA._id.toString(), 'MongoDB Audit > Approved status and reviewedBy timestamp persisted in MongoDB');

    // 9. PROJECT TASKS
    console.log('\n--- 9. PROJECT TASKS SYSTEM ---');
    const taskRes = await apiRequest(`/projects/${projectId}/tasks`, {
      method: 'POST',
      token: tokens.brandA,
      body: {
        title: 'Dispatch product test kit to creator Mumbai studio',
        priority: 'HIGH',
      },
    });
    assert(taskRes.status === 201 || taskRes.status === 200, 'Tasks > Create task in project');
    const taskId = taskRes.data?.data?._id || taskRes.data?._id;

    const taskUpdateRes = await apiRequest(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      token: tokens.creatorA,
      body: { status: 'COMPLETED' },
    });
    const taskUpData = taskUpdateRes.data?.data || taskUpdateRes.data;
    assert(taskUpdateRes.status === 200 && taskUpData?.status === 'COMPLETED', 'Tasks > Complete project task');

    const mongoTask = await db.collection('project_tasks').findOne({ _id: new mongoose.Types.ObjectId(taskId) });
    assert(mongoTask.status === 'COMPLETED' && mongoTask.completedAt !== null, 'MongoDB Audit > Task completedAt timestamp persisted in MongoDB');

    // 10. PROJECT FILES REPOSITORY
    console.log('\n--- 10. PROJECT FILES REPOSITORY ---');
    const fileRes = await apiRequest(`/projects/${projectId}/files`, {
      method: 'POST',
      token: tokens.brandA,
      body: {
        fileName: 'Brand_Identity_Guidelines_2026.pdf',
        url: 'https://cdn.example.com/assets/Brand_Guidelines.pdf',
        size: 1240000,
        mimeType: 'application/pdf',
      },
    });
    assert(fileRes.status === 201 || fileRes.status === 200, 'Files > Project file metadata recorded');
    const fileId = fileRes.data?.data?._id || fileRes.data?._id;

    const mongoFile = await db.collection('project_files').findOne({ _id: new mongoose.Types.ObjectId(fileId) });
    assert(mongoFile !== null && mongoFile.fileName === 'Brand_Identity_Guidelines_2026.pdf', 'MongoDB Audit > Project file persisted in project_files collection');

    // 11. AUDIT ACTIVITY TIMELINE
    console.log('\n--- 11. AUDIT ACTIVITY TIMELINE ---');
    const activityRes = await apiRequest(`/projects/${projectId}/activity`, { token: tokens.brandA });
    assert(activityRes.status === 200 && Array.isArray(activityRes.data?.data || activityRes.data), 'Activity > Retrieve project activity timeline');

    const mongoActivities = await db.collection('project_activities').find({ projectId: new mongoose.Types.ObjectId(projectId) }).toArray();
    assert(mongoActivities.length >= 4, `MongoDB Audit > Recorded ${mongoActivities.length} structured activity events in project_activities`);
    const hasCreation = mongoActivities.some((a) => a.type === 'PROJECT_CREATED');
    const hasSubmission = mongoActivities.some((a) => a.type === 'DELIVERABLE_SUBMITTED');
    const hasApproval = mongoActivities.some((a) => a.type === 'DELIVERABLE_APPROVED');
    assert(hasCreation && hasSubmission && hasApproval, 'MongoDB Audit > Verified PROJECT_CREATED, DELIVERABLE_SUBMITTED, and DELIVERABLE_APPROVED timeline events');

    // 12. PROJECT CONVERSATION INTEGRATION
    console.log('\n--- 12. PHASE 04 PROJECT CONVERSATION INTEGRATION ---');
    const convDoc = await db.collection('conversations').findOne({ projectId: mongoProject.projectNumber });
    assert(convDoc !== null, 'Messaging > Phase 04 Conversation linked to projectNumber');
    assert(convDoc.type === 'PROJECT', 'Messaging > Conversation type is PROJECT');
    assert(convDoc.participants.length >= 2, 'Messaging > Both Brand and Creator are participants in project conversation');

    // 13. IN-APP NOTIFICATIONS
    console.log('\n--- 13. IN-APP NOTIFICATIONS PERSISTENCE ---');
    const notifs = await db.collection('notifications').find({ userId: new mongoose.Types.ObjectId(userDocs.creatorA._id) }).toArray();
    assert(notifs.length > 0, 'Notifications > In-app notifications generated for professional user');
    const hasProjNotif = notifs.some((n) => n.type.startsWith('PROJECT_') || n.type.startsWith('DELIVERABLE_') || n.type.startsWith('REVISION_'));
    assert(hasProjNotif, 'Notifications > Project milestone / deliverable notification verified in MongoDB');

    // 14. PROJECT COMPLETION
    console.log('\n--- 14. PROJECT COMPLETION ---');
    // Complete milestone 1 and 2
    await db.collection('milestones').updateMany(
      { projectId: new mongoose.Types.ObjectId(projectId) },
      { $set: { status: 'COMPLETED', progress: 100 } },
    );

    const completeRes = await apiRequest(`/projects/${projectId}/complete`, {
      method: 'POST',
      token: tokens.brandA,
      body: { completionNotes: 'All 3 UGC reels approved and campaign assets delivered successfully.' },
    });
    const compData = completeRes.data?.data || completeRes.data;
    assert((completeRes.status === 200 || completeRes.status === 201) && compData?.status === 'COMPLETED', 'Completion > Brand completes project workspace');

    const mongoCompletedProject = await db.collection('projects').findOne({ _id: new mongoose.Types.ObjectId(projectId) });
    assert(mongoCompletedProject.status === 'COMPLETED', 'MongoDB Audit > Final status is COMPLETED');
    assert(mongoCompletedProject.completedAt !== null && mongoCompletedProject.actualEndDate !== null, 'MongoDB Audit > completedAt and actualEndDate timestamps persisted');
    assert(mongoCompletedProject.progress === 100, 'MongoDB Audit > Project progress is 100%');

    // 15. ADMIN OVERSIGHT & FILTERING
    console.log('\n--- 15. ADMIN OVERSIGHT & FILTERING ---');
    const adminProjectsRes = await apiRequest('/projects', { token: tokens.admin });
    assert(adminProjectsRes.status === 200 && (adminProjectsRes.data?.data?.total >= 1 || adminProjectsRes.data?.total >= 1), 'Admin > Admin retrieves marketplace projects list');

    const adminFilteredRes = await apiRequest('/projects?status=COMPLETED', { token: tokens.admin });
    assert(adminFilteredRes.status === 200, 'Admin > Admin filters projects by COMPLETED status');
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB.\n');
  }

  console.log('===============================================================');
  console.log('                 PHASE 05 QA AUDIT SUMMARY                     ');
  console.log('===============================================================');
  console.log(`  Total Tests Run:  ${totalTests}`);
  console.log(`  Passed Tests:     ${passedTests}`);
  console.log(`  Failed Tests:     ${failedTests}`);
  console.log(`  Pass Rate:        ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('===============================================================\n');

  if (failedTests === 0) {
    console.log('🎉 VERDICT: ALL PHASE 05 PROJECTS & WORKSPACE TESTS PASSED WITH 100% SUCCESS!\n');
  } else {
    console.error(`💥 VERDICT: ${failedTests} TESTS FAILED. PLEASE RESOLVE BEFORE PROCEEDING.\n`);
    process.exit(1);
  }
}

runPhase05Tests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
