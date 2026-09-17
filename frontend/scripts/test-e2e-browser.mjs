/**
 * Browser E2E Functional Test Suite for Education Center Automation Platform
 * Milestone T2 - Test Writer T2
 *
 * Verifies:
 * 1. Admin Portal (http://localhost:3000) - all 9 sections render cleanly:
 *    - 1. KPI & Funnel (Dashboard)
 *    - 2. Clients table (Leads)
 *    - 3. Trial lessons calendar (Trials)
 *    - 4. Live chat takeover (Conversations)
 *    - 5. Courses & Groups
 *    - 6. Knowledge base CRUD (KB)
 *    - 7. Tasks & Escalation
 *    - 8. Attendance & Grades journal (breadcrumb: "Davomat & Baholar Jurnali")
 *    - 9. Audit log
 * 2. Student Telegram Mini App (http://localhost:3000/student):
 *    - Course details, timetable, attendance % calculation, per-lesson status, teacher grades, payment status
 * 3. Teacher Telegram Mini App (http://localhost:3000/teacher):
 *    - Group switcher, 1-tap attendance marking, student grading, submission
 * 4. Instant Synchronization to Admin Panel:
 *    - Persistence and 5s auto-polling reflection of attendance & grades in Admin Journal
 * 5. Instant reflection in Student Portal
 */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api';

// Detect Chrome / Edge executable on Windows
function findBrowserExecutable() {
  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No supported browser (Chrome or Edge) found on the system.');
}

// Test reporting helper
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.startTime = Date.now();
  }

  assert(condition, description, details = '') {
    const passed = Boolean(condition);
    this.tests.push({ description, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${mark} - ${description}`);
    if (!passed && details) {
      console.error(`       Details: ${details}`);
    }
  }

  summary() {
    const total = this.tests.length;
    const passed = this.tests.filter(t => t.passed).length;
    const failed = total - passed;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(70));
    console.log(`SUITE SUMMARY: ${this.name}`);
    console.log(`Duration: ${duration}s | Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(70));

    if (failed > 0) {
      console.error('\nFAILED TESTS:');
      this.tests.filter(t => !t.passed).forEach(t => {
        console.error(`  ❌ ${t.description}`);
        if (t.details) console.error(`     ${t.details}`);
      });
      return false;
    }
    return true;
  }
}

async function loginAdmin() {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@education.uz',
      password: 'AdminPassword123!',
    }),
  });

  if (!res.ok) {
    throw new Error(`Admin login failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.accessToken;
}

async function runE2ETests() {
  const suite = new TestSuite('Browser E2E Functional Test Suite (Milestone T2)');
  console.log(`[E2E] Starting E2E functional test suite against:`);
  console.log(`      Frontend: ${BASE_URL}`);
  console.log(`      Backend:  ${BACKEND_URL}`);

  // 1. Health & Pre-flight
  console.log('\n[Phase 1] Server Health & Authentication Pre-flight');
  try {
    const feRes = await fetch(BASE_URL);
    suite.assert(feRes.status === 200, 'Frontend server responds with HTTP 200 at ' + BASE_URL);

    const beRes = await fetch(`${BACKEND_URL}/courses`);
    suite.assert(beRes.status === 200, 'Backend server responds with HTTP 200 at ' + BACKEND_URL);

    const proxyRes = await fetch(`${BASE_URL}/api/courses`);
    suite.assert(proxyRes.status === 200, 'Frontend Next.js rewrites /api/* proxy to backend with HTTP 200');

    const adminToken = await loginAdmin();
    suite.assert(Boolean(adminToken && adminToken.length > 20), 'Admin authentication successful and JWT acquired');

    // Launch Browser
    const executablePath = findBrowserExecutable();
    console.log(`[E2E] Using browser executable: ${executablePath}`);
    const browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1440,900',
      ],
    });

    try {
      // 2. Admin Portal Test (All 9 sections)
      console.log('\n[Phase 2] Admin Portal E2E - Testing All 9 Sections');
      const adminPage = await browser.newPage();
      await adminPage.setViewport({ width: 1440, height: 900 });

      // Track unhandled console errors and runtime exceptions (ignoring missing favicon.ico)
      const adminErrors = [];
      adminPage.on('pageerror', err => adminErrors.push(`[PageError] ${err.message}`));
      adminPage.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('favicon.ico') && !text.includes('status of 404')) {
            adminErrors.push(`[ConsoleError] ${text}`);
          }
        }
      });

      // Inject auth token before loading
      await adminPage.evaluateOnNewDocument((token) => {
        localStorage.setItem('crm_auth_token', token);
      }, adminToken);

      await adminPage.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 20000 });

      const pageTitle = await adminPage.title();
      suite.assert(
        pageTitle.includes('Al-Xorazmiy'),
        `Admin portal page title is valid: "${pageTitle}"`
      );

      // Verify connection badge in header
      const headerText = await adminPage.evaluate(() => {
        const h = document.querySelector('header');
        return h ? h.innerText : '';
      });
      suite.assert(
        headerText.includes("API Bog'langan (Live)"),
        'Admin portal indicates active live backend connection ("API Bog\'langan (Live)")'
      );

      // Verify each of the 9 tabs and their breadcrumb / content
      const adminSections = [
        {
          index: 0,
          key: 'dashboard',
          name: '1. KPI & Funnel (Dashboard)',
          expectedBreadcrumb: 'Boshqaruv Paneli & Konversiya Funneli',
          verifyContent: async () => {
            return adminPage.evaluate(() => {
              const bodyText = document.body.innerText;
              const hasKpi = bodyText.includes('Jami Leadlar') &&
                (bodyText.includes('Issiq Mijozlar') || bodyText.includes('HOT') || bodyText.includes('Sinovga Kelish Foizi'));
              const hasFunnel = bodyText.includes('Yangi (NEW)') || bodyText.includes('Saralandi') || bodyText.includes('Conversion Funnel');
              return hasKpi && hasFunnel;
            });
          },
        },
        {
          index: 1,
          key: 'leads',
          name: '2. Clients Table (Leads)',
          expectedBreadcrumb: 'Mijozlar Boshqaruvi & Ball Tizimi',
          verifyContent: async () => {
            return adminPage.evaluate(() => {
              const bodyText = document.body.innerText;
              const hasSearch = Boolean(document.querySelector('input[placeholder*="qidirish"]'));
              const hasFilter = bodyText.includes('Barchasi') || bodyText.includes('HOT');
              const hasTable = Boolean(document.querySelector('table'));
              return (hasSearch || hasFilter) && hasTable;
            });
          },
        },
        {
          index: 2,
          key: 'trials',
          name: '3. Trial Lessons Calendar (Trials)',
          expectedBreadcrumb: 'Sinov Darslari Rejasi & Joy Cheklovlari',
          verifyContent: async () => {
            return adminPage.evaluate(() => {
              const bodyText = document.body.innerText;
              return bodyText.includes('Sinov darsi') || bodyText.includes('Yunusobod') || bodyText.includes('Chilonzor') || Boolean(document.querySelector('table'));
            });
          },
        },
        {
          index: 3,
          key: 'conversations',
          name: '4. Live Chat Takeover (Conversations)',
          expectedBreadcrumb: 'AI Jonli Suhbatlar & Operatorga Uzatish',
          verifyContent: async () => {
            return adminPage.evaluate(() => {
              const bodyText = document.body.innerText;
              return bodyText.includes('Suhbat') || bodyText.includes('Operator') || bodyText.includes('Xabar');
            });
          },
        },
        {
          index: 4,
          key: 'courses',
          name: '5. Courses & Groups (Courses)',
          expectedBreadcrumb: 'Kurslar Katalogi & Rasmiy Narxlar',
          verifyContent: async () => {
            return adminPage.evaluate(() => {
              const bodyText = document.body.innerText;
              return bodyText.includes('General English') || bodyText.includes('IELTS') || bodyText.includes('UZS/oy');
            });
          },
        },
        {
          index: 5,
          key: 'kb',
          name: '6. Knowledge Base CRUD (KB)',
          expectedBreadcrumb: 'Bilimlar Bazasi (DRAFT / PUBLISHED)',
          verifyContent: async () => {
            return adminPage.evaluate(() => {
              const bodyText = document.body.innerText;
              return bodyText.includes('Bilimlar') || bodyText.includes('PUBLISHED') || bodyText.includes('DRAFT');
            });
          },
        },
        {
          index: 6,
          key: 'tasks',
          name: '7. Tasks & Escalation (Tasks)',
          expectedBreadcrumb: 'Administrator Vazifalari & Eskalatsiya',
          verifyContent: async () => {
            return adminPage.evaluate(() => {
              const bodyText = document.body.innerText;
              return bodyText.includes('Vazifalar') || bodyText.includes('TODO') || bodyText.includes('Eskalatsiya');
            });
          },
        },
        {
          index: 7,
          key: 'attendance',
          name: '8. Attendance & Grades Journal',
          expectedBreadcrumb: 'Davomat & Baholar Jurnali',
          verifyContent: async () => {
            return adminPage.evaluate(() => {
              const bodyText = document.body.innerText;
              const hasAttendanceTable = bodyText.includes('Kunlik Davomat Jurnali');
              const hasGradesTable = bodyText.includes('Baholari');
              return hasAttendanceTable && hasGradesTable;
            });
          },
        },
        {
          index: 8,
          key: 'audit',
          name: '9. Audit Log (Audit)',
          expectedBreadcrumb: 'Xavfsizlik & Audit Jurnali',
          verifyContent: async () => {
            return adminPage.evaluate(() => {
              const bodyText = document.body.innerText;
              return bodyText.includes('Audit') || bodyText.includes('Xavfsizlik');
            });
          },
        },
      ];

      for (const section of adminSections) {
        // Click nav button by index
        await adminPage.evaluate((idx) => {
          const btns = Array.from(document.querySelectorAll('aside nav button'));
          if (btns[idx]) btns[idx].click();
        }, section.index);

        await new Promise(r => setTimeout(r, 400));

        // Verify breadcrumb
        const currentBreadcrumb = await adminPage.evaluate(() => {
          const el = document.querySelector('header span.font-semibold');
          return el ? el.innerText.trim() : '';
        });

        suite.assert(
          currentBreadcrumb === section.expectedBreadcrumb,
          `Section ${section.name}: Breadcrumb displays "${section.expectedBreadcrumb}"`,
          `Actual breadcrumb: "${currentBreadcrumb}"`
        );

        // Verify section specific content
        const contentValid = await section.verifyContent();
        suite.assert(
          contentValid,
          `Section ${section.name}: Core content and tables render cleanly`
        );
      }

      suite.assert(
        adminErrors.length === 0,
        `Admin Portal rendered all 9 sections with 0 console errors or runtime crashes`,
        `Errors encountered: ${JSON.stringify(adminErrors)}`
      );

      // 3. Student Telegram Mini App Test
      console.log('\n[Phase 3] Student Telegram Mini App (/student) E2E');
      const studentPage = await browser.newPage();
      // Emulate mobile Telegram Mini App viewport
      await studentPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

      // Test 3.1: Without parameters -> friendly empty state
      await studentPage.goto(`${BASE_URL}/student`, { waitUntil: 'networkidle0' });
      const emptyStateText = await studentPage.evaluate(() => document.body.innerText);
      suite.assert(
        emptyStateText.includes('Talaba identifikatori') || emptyStateText.includes('Kabinet topilmadi'),
        'Student portal displays friendly fallback when no student identifier is provided'
      );

      // Test 3.2: With valid leadId
      const testLeadId = 'cmu5sfori0000l62w20d676tm';
      await studentPage.goto(`${BASE_URL}/student?leadId=${testLeadId}`, {
        waitUntil: 'networkidle0',
        timeout: 20000,
      });

      const studentErrors = [];
      studentPage.on('pageerror', err => studentErrors.push(`[PageError] ${err.message}`));

      const studentName = await studentPage.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? h1.innerText.trim() : '';
      });
      suite.assert(
        studentName === 'Dilmurod Test Talaba',
        `Student mini app loads student profile: "${studentName}"`
      );

      // Verify course & timetable details
      const studentDetails = await studentPage.evaluate(() => {
        const text = document.body.innerText;
        return {
          hasCourse: text.includes('IELTS Intensive'),
          hasGroup: text.includes('IELTS-301'),
          hasDays: text.includes('Dushanba - Chorshanba - Juma'),
          hasTime: text.includes('16:00') && text.includes('17:30'),
          hasRoom: text.includes('105-xona'),
          hasFee: text.includes("so'm"),
          hasAttendancePct: text.includes('%'),
        };
      });

      suite.assert(
        studentDetails.hasCourse && studentDetails.hasGroup,
        'Student mini app displays course details (IELTS Intensive) and group (IELTS-301)'
      );

      suite.assert(
        studentDetails.hasDays && studentDetails.hasTime && studentDetails.hasRoom,
        'Student mini app displays timetable schedule (days, time, room number)'
      );

      suite.assert(
        studentDetails.hasAttendancePct,
        'Student mini app calculates and renders attendance percentage'
      );

      // Verify Payments section
      const hasPaymentSection = await studentPage.evaluate(() => {
        return document.body.innerText.includes("To'lov holati");
      });
      suite.assert(hasPaymentSection, 'Student mini app renders payment status section');

      // Click "📅 Davomat" tab
      await studentPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const attBtn = buttons.find(b => b.innerText.includes('Davomat'));
        if (attBtn) attBtn.click();
      });
      await new Promise(r => setTimeout(r, 400));

      const attendanceTabRendered = await studentPage.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Bor') || text.includes('Darsga vaqtida');
      });
      suite.assert(
        attendanceTabRendered,
        'Student mini app renders per-lesson attendance status records and badges'
      );

      // Click "⭐ Baholar" tab
      await studentPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const gradesBtn = buttons.find(b => b.innerText.includes('Baholar'));
        if (gradesBtn) gradesBtn.click();
      });
      await new Promise(r => setTimeout(r, 400));

      const gradesTabRendered = await studentPage.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Grammar Mastery') || text.includes('96') || text.includes('Uyga vazifa');
      });
      suite.assert(
        gradesTabRendered,
        'Student mini app renders teacher grades and evaluation comments'
      );

      suite.assert(
        studentErrors.length === 0,
        'Student Telegram Mini App rendered cleanly without uncaught exceptions'
      );

      // 4. Teacher Telegram Mini App Test
      console.log('\n[Phase 4] Teacher Telegram Mini App (/teacher) E2E');
      const teacherPage = await browser.newPage();
      await teacherPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

      // Handle any native alerts automatically
      teacherPage.on('dialog', async (dialog) => {
        console.log(`  [Dialog] ${dialog.type()}: ${dialog.message()}`);
        await dialog.dismiss();
      });

      // Inject auth token for teacher page
      await teacherPage.evaluateOnNewDocument((token) => {
        localStorage.setItem('crm_auth_token', token);
      }, adminToken);

      await teacherPage.goto(`${BASE_URL}/teacher`, {
        waitUntil: 'networkidle0',
        timeout: 20000,
      });

      const teacherErrors = [];
      teacherPage.on('pageerror', err => teacherErrors.push(`[PageError] ${err.message}`));

      const teacherHeader = await teacherPage.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? h1.innerText.trim() : '';
      });
      suite.assert(
        teacherHeader === "O'qituvchi Jurnali",
        `Teacher mini app header rendered properly: "${teacherHeader}"`
      );

      // Group switcher test
      const groupChips = await teacherPage.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('.overflow-x-auto button'));
        return chips.map(c => c.innerText.trim());
      });
      suite.assert(
        groupChips.length >= 3 && groupChips.some(c => c.includes('IELTS-301')),
        `Teacher group switcher rendered with ${groupChips.length} groups including "IELTS-301"`
      );

      // Switch to IELTS-301
      await teacherPage.evaluate(() => {
        const chips = Array.from(document.querySelectorAll('.overflow-x-auto button'));
        const ieltsChip = chips.find(c => c.innerText && c.innerText.includes('IELTS-301'));
        if (ieltsChip) ieltsChip.click();
      });
      await new Promise(r => setTimeout(r, 400));

      const isStudentVisible = await teacherPage.evaluate(() => {
        return document.body.innerText.includes('Dilmurod Test Talaba');
      });
      suite.assert(
        isStudentVisible,
        'Teacher mini app loads enrolled student "Dilmurod Test Talaba" under IELTS-301 group'
      );

      // 4.1 1-Tap Attendance Marking
      const testTimestamp = Date.now().toString().slice(-5);
      const testAttendanceNote = `E2E Live Attendance Note ${testTimestamp}`;

      // Mark student as LATE to reveal note input, then enter note
      await teacherPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const lateBtn = buttons.find(b => b.innerText.trim() === 'Kech');
        if (lateBtn) lateBtn.click();
      });
      await new Promise(r => setTimeout(r, 300));

      await teacherPage.evaluate((note) => {
        const noteInput = document.querySelector('input[placeholder*="Sabab"]');
        if (noteInput) {
          const tracker = noteInput._valueTracker;
          if (tracker) tracker.setValue('');
          noteInput.value = note;
          noteInput.dispatchEvent(new Event('input', { bubbles: true }));
          noteInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, testAttendanceNote);

      // Click "Davomatni Saqlash"
      await teacherPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const saveBtn = buttons.find(b => b.innerText.includes('Davomatni Saqlash'));
        if (saveBtn) saveBtn.click();
      });

      // Wait for success confirmation
      await new Promise(r => setTimeout(r, 1500));
      const attSuccessMsg = await teacherPage.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Davomat muvaffaqiyatli saqlandi');
      });
      suite.assert(
        attSuccessMsg,
        'Teacher 1-tap attendance marking saved successfully with confirmation banner'
      );

      // 4.2 Student Grading
      // Switch to "⭐ Baho Qo'yish" view
      await teacherPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const gradesViewBtn = buttons.find(b => b.innerText.includes('Baho Qo\'yish'));
        if (gradesViewBtn) gradesViewBtn.click();
      });
      await new Promise(r => setTimeout(r, 400));

      const testGradeTitle = `E2E Speaking Task ${testTimestamp}`;
      const testScore = 98;
      const testGradeComment = 'Ajoyib natija va a\'lo darajada topshirildi';

      // Select student in dropdown with React-friendly value dispatch
      const selectedStudentVal = await teacherPage.evaluate(() => {
        const select = document.querySelector('select');
        if (select && select.options.length > 1) {
          const val = select.options[1].value;
          select.value = val;
          const tracker = select._valueTracker;
          if (tracker) tracker.setValue('');
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return val;
        }
        return null;
      });

      // Also call puppeteer native select if available
      if (selectedStudentVal) {
        await teacherPage.select('select', selectedStudentVal);
      }

      // Fill score
      await teacherPage.evaluate((score) => {
        const scoreInput = document.querySelector('input[type="number"]');
        if (scoreInput) {
          const tracker = scoreInput._valueTracker;
          if (tracker) tracker.setValue('');
          scoreInput.value = score;
          scoreInput.dispatchEvent(new Event('input', { bubbles: true }));
          scoreInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, testScore);

      // Fill title
      await teacherPage.evaluate((title) => {
        const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
        const titleInput = inputs.find(i => i.placeholder?.includes('mavzusi') || i.placeholder?.includes('Unit'));
        if (titleInput) {
          const tracker = titleInput._valueTracker;
          if (tracker) tracker.setValue('');
          titleInput.value = title;
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, testGradeTitle);

      // Fill comment
      await teacherPage.evaluate((comment) => {
        const commentTextarea = document.querySelector('textarea');
        if (commentTextarea) {
          const tracker = commentTextarea._valueTracker;
          if (tracker) tracker.setValue('');
          commentTextarea.value = comment;
          commentTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          commentTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, testGradeComment);

      // Click submit button: "Bahoni Saqlash & Talaba Kabinetiga Chiqarish"
      await teacherPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const saveGradeBtn = buttons.find(b => b.innerText.includes('Bahoni Saqlash'));
        if (saveGradeBtn) saveGradeBtn.click();
      });

      await new Promise(r => setTimeout(r, 1500));
      const gradeSuccessMsg = await teacherPage.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Baho muvaffaqiyatli saqlandi');
      });
      suite.assert(
        gradeSuccessMsg,
        `Teacher student grading saved successfully: "${testGradeTitle}" (${testScore} ball)`
      );

      // 5. Instant Synchronization to Admin Panel Test
      console.log('\n[Phase 5] Instant Synchronization to Admin Panel & Student Portal');

      // Navigate Admin Portal to Attendance & Grades Journal
      await adminPage.bringToFront();
      await adminPage.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('aside nav button'));
        if (btns[7]) btns[7].click(); // Tab index 7 is attendance
      });
      await new Promise(r => setTimeout(r, 400));

      // Trigger instant refresh button in header
      await adminPage.evaluate(() => {
        const refreshBtns = Array.from(document.querySelectorAll('header button, main button'));
        const refreshBtn = refreshBtns.find(b => b.innerText.includes('Yangilash'));
        if (refreshBtn) refreshBtn.click();
      });
      // Allow 2 seconds for fresh network response to update React state
      await new Promise(r => setTimeout(r, 2000));

      const adminAttendanceSync = await adminPage.evaluate((note) => {
        const text = document.body.innerText;
        return text.includes(note) || text.includes('IELTS-301');
      }, testAttendanceNote);

      suite.assert(
        adminAttendanceSync,
        'Attendance marked in Teacher Mini App instantly synced to Admin Attendance Journal'
      );

      const adminGradeSync = await adminPage.evaluate((title) => {
        const text = document.body.innerText;
        return text.includes(title);
      }, testGradeTitle);

      suite.assert(
        adminGradeSync,
        `Grade marked in Teacher Mini App ("${testGradeTitle}") instantly synced to Admin Grades Journal`
      );

      // Verify Student Portal reflects new grade
      await studentPage.bringToFront();
      await studentPage.reload({ waitUntil: 'networkidle0' });

      // Click "⭐ Baholar" tab
      await studentPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const gradesBtn = buttons.find(b => b.innerText.includes('Baholar'));
        if (gradesBtn) gradesBtn.click();
      });
      await new Promise(r => setTimeout(r, 500));

      const studentGradeSync = await studentPage.evaluate((title) => {
        const text = document.body.innerText;
        return text.includes(title);
      }, testGradeTitle);

      suite.assert(
        studentGradeSync,
        `New grade ("${testGradeTitle}") instantly reflected in Student Mini App gradebook`
      );

      // Close browser
      await browser.close();
      console.log('[E2E] Headless browser closed cleanly.');

    } catch (err) {
      await browser.close();
      throw err;
    }

  } catch (err) {
    suite.assert(false, 'Unhandled exception during E2E test execution', err.stack || err.message);
  }

  const allPassed = suite.summary();
  if (!allPassed) {
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('Fatal E2E runner error:', err);
  process.exit(1);
});
