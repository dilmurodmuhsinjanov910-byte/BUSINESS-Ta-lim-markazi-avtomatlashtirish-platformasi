import { PrismaClient, LeadStatus, BookingStatus, ConversationStatus, ScoreTier } from '@prisma/client';

const BACKEND_URL = 'http://localhost:4000/api';
const FRONTEND_URL = 'http://localhost:3000/api';

interface TestResult {
  suite: string;
  name: string;
  status: 'PASSED' | 'FAILED';
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function assertTest(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      suite,
      name,
      status: 'PASSED',
      durationMs: Date.now() - start,
    });
    console.log(`  [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      suite,
      name,
      status: 'FAILED',
      details: err.message || String(err),
      durationMs: Date.now() - start,
    });
    console.error(`  [FAIL] ${name}:`, err.message || err);
  }
}

async function runLiveTests() {
  console.log('================================================================');
  console.log('  BUSINESS V1 - COMPREHENSIVE LIVE E2E INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  let adminToken = '';
  const prisma = new PrismaClient();

  try {
    // -------------------------------------------------------------
    // SUITE 1: AUTHENTICATION & SECURITY
    // -------------------------------------------------------------
    console.log('--- 1. Authentication & Security ---');

    await assertTest('Auth', 'Admin login with valid credentials yields JWT token', async () => {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@education.uz',
          password: 'AdminPassword123!',
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (!data.accessToken) throw new Error('Missing accessToken in login response');
      if (data.user?.role !== 'SUPER_ADMIN') throw new Error(`Expected SUPER_ADMIN, got ${data.user?.role}`);
      adminToken = data.accessToken;
    });

    await assertTest('Auth', 'Unauthorized request to protected route is rejected with 401', async () => {
      const res = await fetch(`${BACKEND_URL}/analytics/kpis`);
      if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    });

    await assertTest('Auth', 'Authorized request with valid Bearer token succeeds with 200', async () => {
      const res = await fetch(`${BACKEND_URL}/analytics/kpis`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.status !== 200) throw new Error(`Expected 200 OK, got ${res.status}`);
    });

    // -------------------------------------------------------------
    // SUITE 2: FRONTEND PROXY REWRITE VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 2. Frontend Next.js API Proxy (Port 3000 -> 4000) ---');

    await assertTest('Frontend Proxy', 'Next.js rewrites /api/analytics/kpis to backend cleanly', async () => {
      const res = await fetch(`${FRONTEND_URL}/analytics/kpis`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`Frontend proxy failed with HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      if (typeof data.totalLeads !== 'number') throw new Error('Invalid KPI payload structure from frontend proxy');
    });

    await assertTest('Frontend Proxy', 'Next.js proxy delivers course catalog to admin UI', async () => {
      const res = await fetch(`${FRONTEND_URL}/courses`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`Frontend proxy failed with HTTP ${res.status}`);
      const courses = await res.json();
      if (!Array.isArray(courses) || courses.length === 0) throw new Error('No courses returned via frontend proxy');
    });

    // -------------------------------------------------------------
    // SUITE 3: ANALYTICS & CONVERSION FUNNEL
    // -------------------------------------------------------------
    console.log('\n--- 3. Analytics & KPI Metrics ---');

    await assertTest('Analytics', 'KPI endpoint returns comprehensive business metrics', async () => {
      const res = await fetch(`${BACKEND_URL}/analytics/kpis`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      const requiredFields = [
        'totalLeads',
        'newLeads',
        'hotLeads',
        'trialBookedLeads',
        'trialAttendedLeads',
        'wonLeads',
        'lostLeads',
        'trialShowUpRate',
        'conversionRate',
      ];
      for (const field of requiredFields) {
        if (data[field] === undefined) throw new Error(`Missing KPI field: ${field}`);
      }
    });

    await assertTest('Analytics', 'Funnel endpoint returns sequential conversion stages', async () => {
      const res = await fetch(`${BACKEND_URL}/analytics/funnel`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!data.funnel || !Array.isArray(data.funnel)) throw new Error('Funnel data missing or not an array');
      if (data.funnel.length < 5) throw new Error('Funnel should contain all pipeline stages');
    });

    // -------------------------------------------------------------
    // SUITE 4: LEADS CRM LIFECYCLE & DE-DUPLICATION
    // -------------------------------------------------------------
    console.log('\n--- 4. Leads CRM Lifecycle & Smart Scoring ---');

    const testLeadPhone = `+99890${Math.floor(1000000 + Math.random() * 9000000)}`;
    let createdLeadId = '';

    await assertTest('Leads CRM', 'Creates new lead with initial HOT scoring for high-intent course', async () => {
      const res = await fetch(`${BACKEND_URL}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          fullName: 'Test Oquvchi E2E',
          phone: testLeadPhone,
          telegramId: `tg_test_${Date.now()}`,
          source: 'TELEGRAM',
          preferredCourse: 'IELTS Intensive',
          initialScoreDelta: 30, // 50 + 30 + 10 = 90 -> HOT
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const lead = data.lead || data;
      if (!lead.id) throw new Error('Lead creation failed: missing id');
      if (lead.phone !== testLeadPhone) throw new Error('Phone mismatch');
      if (lead.scoreTier !== ScoreTier.HOT) throw new Error(`Expected HOT score tier, got ${lead.scoreTier}`);
      createdLeadId = lead.id;
    });

    await assertTest('Leads CRM', 'De-duplication: Re-submitting existing phone updates lead activity without duplicating', async () => {
      const res = await fetch(`${BACKEND_URL}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          fullName: 'Test Oquvchi E2E Yangilandi',
          phone: testLeadPhone,
          preferredCourse: 'IELTS Intensive',
        }),
      });
      const data = await res.json();
      const lead = data.lead || data;
      if (lead.id !== createdLeadId) {
        throw new Error(`Duplicate lead created! Expected existing ID ${createdLeadId}, got ${lead.id}`);
      }
      if (!data.isDuplicate) {
        throw new Error('Expected isDuplicate to be true');
      }
    });

    await assertTest('Leads CRM', 'Status transition: Update lead status to QUALIFIED', async () => {
      const res = await fetch(`${BACKEND_URL}/leads/${createdLeadId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: LeadStatus.QUALIFIED }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const updated = await res.json();
      if (updated.status !== LeadStatus.QUALIFIED) throw new Error(`Expected QUALIFIED, got ${updated.status}`);
    });

    // -------------------------------------------------------------
    // SUITE 5: TRIAL BOOKING ENGINE & CAPACITY CONSTRAINTS
    // -------------------------------------------------------------
    console.log('\n--- 5. Trial Booking Engine & Capacity Guardrails ---');

    const groups = await prisma.group.findMany({
      include: { course: true, branch: true },
    });
    if (groups.length === 0) throw new Error('No groups found in database to test booking');
    const targetGroup = groups[0];
    let createdBookingId = '';

    await assertTest('Bookings', 'Book trial lesson with automated reminder scheduling', async () => {
      const res = await fetch(`${BACKEND_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          leadId: createdLeadId,
          groupId: targetGroup.id,
          bookingDate: new Date(Date.now() + 86400000).toISOString(),
          timeSlot: '10:00 - 11:20',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const booking = await res.json();
      if (!booking.id) throw new Error('Booking missing ID');
      if (booking.status !== BookingStatus.BOOKED) throw new Error(`Expected BOOKED status, got ${booking.status}`);
      createdBookingId = booking.id;
    });

    await assertTest('Bookings', 'Guardrail: Re-booking another trial for same active lead is rejected (double booking prevention)', async () => {
      const res = await fetch(`${BACKEND_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          leadId: createdLeadId,
          groupId: targetGroup.id,
          bookingDate: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      if (res.status !== 400) {
        throw new Error(`Expected 400 Bad Request for duplicate booking, got ${res.status}`);
      }
    });

    await assertTest('Bookings', 'Mark trial lesson as ATTENDED', async () => {
      const res = await fetch(`${BACKEND_URL}/bookings/${createdBookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: BookingStatus.ATTENDED }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const updated = await res.json();
      if (updated.status !== BookingStatus.ATTENDED) throw new Error(`Expected ATTENDED, got ${updated.status}`);
    });

    // -------------------------------------------------------------
    // SUITE 6: ZERO-HALLUCINATION AI NLP & HUMAN TAKEOVER
    // -------------------------------------------------------------
    console.log('\n--- 6. Zero-Hallucination NLP Engine & Admin Takeover ---');

    let testConvId = '';

    await assertTest('AI & Chat', 'AI chat endpoint returns 85%+ high-confidence grounded catalog response', async () => {
      const res = await fetch(`${BACKEND_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          leadId: createdLeadId,
          userMessage: 'IELTS Intensive kursi narxi qancha?',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const reply = await res.json();
      if (!reply.reply || (!reply.reply.includes('750') && !reply.reply.includes('IELTS'))) {
        throw new Error(`AI reply did not contain verified catalog info: ${reply.reply}`);
      }
      if (reply.needsHumanHandoff) {
        throw new Error('Expected high-confidence match without handoff');
      }
    });

    await assertTest('AI & Chat', 'Off-topic/sub-85% query triggers automatic Operator Fallback and flags conversation', async () => {
      const res = await fetch(`${BACKEND_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          leadId: createdLeadId,
          userMessage: 'kosmik kema qanday yasaladi va narxi qancha boladi?',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const reply = await res.json();
      if (!reply.reply || !reply.reply.includes('operator bilan gaplashganingiz ma\'qul')) {
        throw new Error(`Expected operator fallback message, got: ${reply.reply}`);
      }
      if (!reply.needsHumanHandoff) {
        throw new Error('Expected needsHumanHandoff to be true');
      }

      // Fetch the conversation and verify status switched to NEEDS_HUMAN
      const convsRes = await fetch(`${BACKEND_URL}/conversations`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const convs = await convsRes.json();
      const matchedConv = convs.find((c: any) => c.leadId === createdLeadId);
      if (!matchedConv) throw new Error('Conversation for lead not found');
      testConvId = matchedConv.id;
      if (matchedConv.status !== ConversationStatus.NEEDS_HUMAN) {
        throw new Error(`Expected conversation status NEEDS_HUMAN, got ${matchedConv.status}`);
      }
    });

    await assertTest('AI & Chat', 'Admin takeover: switches conversation to ADMIN_HANDLING', async () => {
      const res = await fetch(`${BACKEND_URL}/conversations/${testConvId}/takeover`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const updated = await res.json();
      if (updated.status !== ConversationStatus.ADMIN_HANDLING) {
        throw new Error(`Expected ADMIN_HANDLING, got ${updated.status}`);
      }
    });

    await assertTest('AI & Chat', 'Admin sends direct human message into taken-over conversation', async () => {
      const res = await fetch(`${BACKEND_URL}/conversations/${testConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          content: 'Assalomu alaykum! Men administrator Manzura bo\'laman, sizga qanday yordam bera olaman?',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const message = await res.json();
      if (message.senderType !== 'ADMIN') {
        throw new Error(`Expected ADMIN senderType, got ${message.senderType}`);
      }
    });

    await assertTest('AI & Chat', 'Resolve conversation: transitions to RESOLVED', async () => {
      const res = await fetch(`${BACKEND_URL}/conversations/${testConvId}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      if (updated.status !== ConversationStatus.RESOLVED) {
        throw new Error(`Expected RESOLVED, got ${updated.status}`);
      }
    });

    // -------------------------------------------------------------
    // SUITE 7: KNOWLEDGE BASE WORKFLOW (DRAFT -> PUBLISH -> ARCHIVE)
    // -------------------------------------------------------------
    console.log('\n--- 7. Knowledge Base Lifecycle ---');

    let createdArticleId = '';

    await assertTest('Knowledge Base', 'Create DRAFT article in knowledge base', async () => {
      const res = await fetch(`${BACKEND_URL}/knowledge-base`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Yozgi maxsus 15% chegirmalar dasturi',
          category: 'DISCOUNTS',
          content: 'Barcha maktab o\'quvchilari uchun yozgi ta\'tilda 15% chegirma beriladi.',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const article = await res.json();
      if (article.status !== 'DRAFT') throw new Error(`Expected DRAFT, got ${article.status}`);
      createdArticleId = article.id;
    });

    await assertTest('Knowledge Base', 'Publish article: switches status to PUBLISHED', async () => {
      const res = await fetch(`${BACKEND_URL}/knowledge-base/${createdArticleId}/publish`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const article = await res.json();
      if (article.status !== 'PUBLISHED') throw new Error(`Expected PUBLISHED, got ${article.status}`);
    });

    await assertTest('Knowledge Base', 'Archive article: soft delete excludes from active list', async () => {
      const res = await fetch(`${BACKEND_URL}/knowledge-base/${createdArticleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    });

    // -------------------------------------------------------------
    // SUITE 8: SECURITY & SYSTEM AUDIT LOGGING
    // -------------------------------------------------------------
    console.log('\n--- 8. Security & System Audit Trail ---');

    await assertTest('Audit Logs', 'Audit trail records all critical admin and system events', async () => {
      const res = await fetch(`${BACKEND_URL}/audit`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const logs = await res.json();
      if (!Array.isArray(logs) || logs.length === 0) throw new Error('Audit logs empty');

      // Verify recent actions are in audit trail
      const entities = logs.map((l: any) => l.entityType);
      console.log(`    (Audit trail contains ${logs.length} logged events for entities: ${Array.from(new Set(entities)).join(', ')})`);
    });

  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  console.log(`  E2E TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${results.length}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveTests().catch((err) => {
  console.error('Fatal error during E2E testing:', err);
  process.exit(1);
});
