"use client";

import React, { useState, useEffect } from "react";
import { crmApi, ensureAuthenticated } from "@/lib/api";
import { translations, Language } from "@/lib/translations";
import {
  Users,
  CalendarCheck,
  MessageSquare,
  BookOpen,
  CheckSquare,
  FileText,
  ShieldCheck,
  TrendingUp,
  Flame,
  Sun,
  Moon,
  Globe,
  Check,
  Snowflake,
  UserCheck,
  PhoneCall,
  Send,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  UserX,
  Layers,
  GraduationCap,
  Award,
  ClipboardCheck,
  CreditCard,
  Receipt,
  Printer,
  Wallet,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/Toast";

export default function AdminPortal() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "leads" | "trials" | "conversations" | "courses" | "kb" | "tasks" | "teachers" | "attendance" | "audit" | "finance" | "teacherChat"
  >("dashboard");

  const [isConnectedToBackend, setIsConnectedToBackend] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sample and live state
  const [kpis, setKpis] = useState({
    totalLeads: 42,
    newLeads: 8,
    hotLeads: 14,
    trialBookedLeads: 12,
    trialAttendedLeads: 18,
    wonLeads: 9,
    lostLeads: 3,
    trialShowUpRate: 75,
    conversionRate: 21,
  });

  const [funnel, setFunnel] = useState([
    { stage: "Yangi (NEW)", count: 42, color: "bg-blue-500", pct: 100 },
    { stage: "Bog'lanildi (CONTACTED)", count: 34, color: "bg-indigo-500", pct: 80 },
    { stage: "Saralandi (QUALIFIED)", count: 26, color: "bg-purple-500", pct: 62 },
    { stage: "Sinov darsi bron (TRIAL_BOOKED)", count: 20, color: "bg-amber-500", pct: 48 },
    { stage: "Darsga keldi (TRIAL_ATTENDED)", count: 15, color: "bg-emerald-500", pct: 36 },
    { stage: "O'qishga kirdi (WON)", count: 9, color: "bg-green-600", pct: 21 },
  ]);

  const [leads, setLeads] = useState([
    {
      id: "lead-1",
      fullName: "Jasur Rahimov",
      phone: "+998901112233",
      source: "TELEGRAM",
      score: 85,
      scoreTier: "HOT",
      status: "TRIAL_BOOKED",
      preferredCourse: "General English (Beginner)",
      preferredBranch: "Chilonzor filiali",
      createdAt: "2026-09-17 14:30",
    },
    {
      id: "lead-2",
      fullName: "Malika Karimova",
      phone: "+998933334455",
      source: "INSTAGRAM",
      score: 55,
      scoreTier: "WARM",
      status: "CONTACTED",
      preferredCourse: "IELTS Intensive",
      preferredBranch: "Yunusobod filiali",
      createdAt: "2026-09-17 11:15",
    },
    {
      id: "lead-3",
      fullName: "Bobur Mirzayev",
      phone: "+998977778899",
      source: "WEBSITE",
      score: 90,
      scoreTier: "HOT",
      status: "TRIAL_ATTENDED",
      preferredCourse: "Rus tili (So'zlashuv)",
      preferredBranch: "Chilonzor filiali",
      createdAt: "2026-09-16 16:45",
    },
    {
      id: "lead-4",
      fullName: "Aziza Saidova",
      phone: "+998912223344",
      source: "TELEGRAM",
      score: 30,
      scoreTier: "COLD",
      status: "LOST",
      lostReason: "Narx to'g'ri kelmadi",
      preferredCourse: "General English",
      preferredBranch: "Yunusobod filiali",
      createdAt: "2026-09-15 09:20",
    },
  ]);

  const [trials, setTrials] = useState([
    {
      id: "tb-1",
      leadName: "Jasur Rahimov",
      course: "General English (Beginner)",
      group: "ENG-BEG-101",
      branch: "Chilonzor filiali",
      date: "2026-09-18",
      time: "10:00 - 11:20",
      status: "BOOKED",
      capacity: "6/12",
    },
    {
      id: "tb-2",
      leadName: "Bobur Mirzayev",
      course: "Rus tili (So'zlashuv)",
      group: "RUS-101",
      branch: "Chilonzor filiali",
      date: "2026-09-17",
      time: "14:00 - 15:20",
      status: "ATTENDED",
      capacity: "10/12",
    },
    {
      id: "tb-3",
      leadName: "Sanjar Aliyev",
      course: "IELTS Intensive",
      group: "IELTS-301",
      branch: "Yunusobod filiali",
      date: "2026-09-17",
      time: "16:00 - 17:30",
      status: "MISSED",
      capacity: "5/10",
    },
  ]);

  const [conversations, setConversations] = useState([
    {
      id: "conv-1",
      leadName: "Nodira Karimova",
      phone: "+998905556677",
      status: "NEEDS_HUMAN",
      handoffReason: "OPERATOR_REQUEST",
      lastMessage: "Operator bilan bog'lang, chegirma bo'yicha gaplashmoqchi edim",
      time: "12 daqiqa oldin",
      messages: [
        { sender: "USER", text: "Assalomu alaykum, ingliz tili kursi narxi qancha?" },
        { sender: "AI", text: "Bizning rasmiy kurslar: General English Beginner - 450,000 so'm/oy. Sinov darsi bepul!" },
        { sender: "USER", text: "Operator bilan bog'lang, chegirma bo'yicha gaplashmoqchi edim" },
        { sender: "SYSTEM", text: "[TIZIM]: Suhbat operatorga yo'naltirildi (Sabab: OPERATOR_REQUEST)." },
      ],
    },
    {
      id: "conv-2",
      leadName: "Jasur Rahimov",
      phone: "+998901112233",
      status: "AI_HANDLING",
      lastMessage: "Ertaga soat 10:00 dagi sinov darsiga boraman, rahmat!",
      time: "1 soat oldin",
      messages: [
        { sender: "USER", text: "Sinov darsiga qanday yozilsam bo'ladi?" },
        { sender: "AI", text: "ENG-BEG-101 guruhida 6 ta bo'sh joy bor (10:00 - 11:20). Joyingizni band qilaymi?" },
        { sender: "USER", text: "Ertaga soat 10:00 dagi sinov darsiga boraman, rahmat!" },
        { sender: "AI", text: "Ajoyib! Sizga eslatma xabari jo'natamiz. 15 daqiqa oldin kelishingizni so'raymiz." },
      ],
    },
  ]);

  const [selectedConv, setSelectedConv] = useState(conversations[0]);
  const [adminReply, setAdminReply] = useState("");

  const [courses, setCourses] = useState([
    {
      id: "c-1",
      name: "General English (Beginner)",
      price: "450,000 UZS/oy",
      duration: "3 oy (haftada 3 kun, 80 daqiqa)",
      groupsCount: 3,
      status: "FAOL",
    },
    {
      id: "c-2",
      name: "General English (Intermediate)",
      price: "520,000 UZS/oy",
      duration: "3 oy (haftada 3 kun, 80 daqiqa)",
      groupsCount: 2,
      status: "FAOL",
    },
    {
      id: "c-3",
      name: "IELTS Intensive",
      price: "750,000 UZS/oy",
      duration: "2 oy (haftada 3 kun, 90 daqiqa)",
      groupsCount: 2,
      status: "FAOL",
    },
    {
      id: "c-4",
      name: "Rus tili (So'zlashuv)",
      price: "420,000 UZS/oy",
      duration: "3 oy (haftada 3 kun, 80 daqiqa)",
      groupsCount: 1,
      status: "FAOL",
    },
  ]);

  const [kbArticles, setKbArticles] = useState([
    {
      id: "kb-1",
      title: "Kurslar va narxlar katalogi (Rasmiy)",
      category: "PRICING",
      status: "PUBLISHED",
      views: 142,
      content: "General English: 450k-520k UZS. IELTS: 750k UZS. Bir oiladan 2 kishiga 10% chegirma.",
    },
    {
      id: "kb-2",
      title: "Bepul sinov darsi (Trial lesson) qoidalari",
      category: "RULES",
      status: "PUBLISHED",
      views: 89,
      content: "Birinchi dars bepul. 15 daqiqa oldin kelish shart. Guruh to'lgan bo'lsa darsga yozilmaydi.",
    },
    {
      id: "kb-3",
      title: "Filiallar va aloqa ma'lumotlari",
      category: "BRANCHES",
      status: "PUBLISHED",
      views: 204,
      content: "Chilonzor: Qatortol 12 (+998712001123). Yunusobod: Ahmad Donish 7 (+998712001124).",
    },
    {
      id: "kb-4",
      title: "Yangi maxsus chegirmalar loyihasi (Qoralama)",
      category: "DISCOUNTS",
      status: "DRAFT",
      views: 5,
      content: "Talabalar uchun 20% chegirma aksiyasi (Hali tasdiqlanmagan).",
    },
  ]);

  const [tasks, setTasks] = useState([
    {
      id: "t-1",
      title: "Dars qoldirgan o'quvchi bilan bog'lanish: Sanjar Aliyev",
      type: "CONTACT_TRIAL_MISSED",
      priority: "HIGH",
      status: "TODO",
      leadPhone: "+998909990011",
      desc: "2 marta avtomatik follow-up xabarga javob bermadi. Shaxsiy qo'ng'iroq qilish zarur!",
    },
    {
      id: "t-2",
      title: "Operatorga murojaat: Nodira Karimova",
      type: "CALL_LEAD",
      priority: "URGENT",
      status: "TODO",
      leadPhone: "+998905556677",
      desc: "Mijoz suhbatda chegirma bo'yicha operatorni so'radi.",
    },
    {
      id: "t-3",
      title: "Bobur Mirzayev birinchi to'lovini tekshirish",
      type: "CHECK_PAYMENT",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      leadPhone: "+998977778899",
      desc: "Sinov darsida qatnashdi, Click orqali to'lov qilinganligini kvitansiya bilan solishtirish.",
    },
  ]);

  const [auditLogs, setAuditLogs] = useState([
    {
      id: "a-1",
      entity: "TrialBooking",
      action: "STATUS_REVERSION_ATTENDED_TO_MISSED",
      user: "Bosh Administrator",
      reason: "Texnik adashish sababli to'g'rilandi",
      time: "Bugun 15:40",
    },
    {
      id: "a-2",
      entity: "Lead",
      action: "STATUS_CHANGE",
      user: "Tizim (Telegram Bot)",
      reason: "Mijoz sinov darsiga yozildi",
      time: "Bugun 14:30",
    },
    {
      id: "a-3",
      entity: "KnowledgeBase",
      action: "PUBLISH",
      user: "Bosh Administrator",
      reason: "Yangi narxlar tasdiqlandi",
      time: "Kecha 18:00",
    },
  ]);

  // Groups and Enrollments State
  const [groups, setGroups] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  // Enrollment Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollingLead, setEnrollingLead] = useState<any | null>(null);
  const [selectedEnrollGroupId, setSelectedEnrollGroupId] = useState<string>("");
  const [enrollMonthlyFee, setEnrollMonthlyFee] = useState<number>(450000);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Attendance Tab Filter
  const [selectedAttendanceGroup, setSelectedAttendanceGroup] = useState<string>("ALL");

  // Finance, Invoicing and Debtors State
  const [financeSummary, setFinanceSummary] = useState<any>({
    totalRevenue: 24500000,
    monthlyRevenue: 8500000,
    totalDebts: 2100000,
    totalPaymentsCount: 19,
    activeStudentsCount: 14,
    methodBreakdown: { CASH: 10500000, CLICK: 7000000, PAYME: 5000000, UZUM: 1000000, BANK_TRANSFER: 1000000 },
    currency: "UZS",
  });
  const [payments, setPayments] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [financeSubTab, setFinanceSubTab] = useState<"history" | "debtors">("history");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("ALL");
  const [paymentSearch, setPaymentSearch] = useState<string>("");

  // Payment & Receipt Modals
  const [showDirectPaymentModal, setShowDirectPaymentModal] = useState(false);
  const [selectedPayLeadId, setSelectedPayLeadId] = useState<string>("");
  const [directPayAmount, setDirectPayAmount] = useState<number>(500000);
  const [directPayMethod, setDirectPayMethod] = useState<string>("CASH");
  const [directPayNotes, setDirectPayNotes] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [notifyingDebtorId, setNotifyingDebtorId] = useState<string | null>(null);

  // Language & Theme
  const [language, setLanguage] = useState<Language>("uz");
  const t = translations[language];
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Teachers Management State
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherPhone, setNewTeacherPhone] = useState("+998");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("Ustoz123!");
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [teacherActionSuccess, setTeacherActionSuccess] = useState<string | null>(null);
  const [isDeletingTeacherId, setIsDeletingTeacherId] = useState<string | null>(null);

  // Group & Schedule Assignment State
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [selectedTeacherForGroup, setSelectedTeacherForGroup] = useState<any | null>(null);
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignDaysOfWeek, setAssignDaysOfWeek] = useState("Dushanba - Chorshanba - Juma");
  const [assignStartTime, setAssignStartTime] = useState("16:00");
  const [assignEndTime, setAssignEndTime] = useState("17:30");
  const [assignRoomNumber, setAssignRoomNumber] = useState("105-xona");
  const [isAssigningGroup, setIsAssigningGroup] = useState(false);

  // Teacher-Admin Chat State
  const [teacherConversations, setTeacherConversations] = useState<any[]>([]);
  const [selectedTeacherChat, setSelectedTeacherChat] = useState<any | null>(null);
  const [teacherMessages, setTeacherMessages] = useState<any[]>([]);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Load real data from backend (Supports silent auto-polling)
  const refreshData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      await ensureAuthenticated();
      const [
        kpiData,
        funnelData,
        leadsData,
        bookingsData,
        convsData,
        coursesData,
        kbData,
        tasksData,
        auditData,
        groupsData,
        enrollmentsData,
        financeData,
        paymentsData,
        debtorsData,
        teachersData,
        teacherConvsData,
      ] = await Promise.allSettled([
        crmApi.getKpis(),
        crmApi.getFunnel(),
        crmApi.getLeads(),
        crmApi.getBookings(),
        crmApi.getConversations(),
        crmApi.getCourses(),
        crmApi.getKnowledgeBase(),
        crmApi.getTasks(),
        crmApi.getAuditLogs(),
        crmApi.getGroups(),
        crmApi.getEnrollments(),
        crmApi.getFinanceSummary(),
        crmApi.getPayments(),
        crmApi.getDebtors(),
        crmApi.getTeachers(),
        crmApi.getTeacherConversations(),
      ]);

      let anySuccess = false;

      if (kpiData.status === "fulfilled" && kpiData.value) {
        setKpis(kpiData.value);
        anySuccess = true;
      }
      if (funnelData.status === "fulfilled" && funnelData.value?.funnel) {
        const colors = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-amber-500", "bg-emerald-500", "bg-green-600"];
        const total = funnelData.value.funnel[0]?.count || 1;
        setFunnel(
          funnelData.value.funnel.map((f: any, i: number) => ({
            stage: f.stage,
            count: f.count,
            color: colors[i % colors.length],
            pct: Math.round((f.count / (total || 1)) * 100),
          }))
        );
        anySuccess = true;
      }
      if (leadsData.status === "fulfilled" && Array.isArray(leadsData.value) && leadsData.value.length > 0) {
        setLeads(
          leadsData.value.map((l: any) => ({
            id: l.id,
            fullName: l.fullName,
            phone: l.phone,
            age: l.age,
            source: l.source,
            score: l.score,
            scoreTier: l.scoreTier,
            status: l.status,
            lostReason: l.lostReason,
            preferredCourse: l.preferredCourse || "General English",
            preferredBranch: l.preferredBranch?.name || "Chilonzor filiali",
            createdAt: new Date(l.createdAt).toLocaleDateString(),
          }))
        );
        anySuccess = true;
      }
      if (bookingsData.status === "fulfilled" && Array.isArray(bookingsData.value) && bookingsData.value.length > 0) {
        setTrials(
          bookingsData.value.map((b: any) => ({
            id: b.id,
            leadName: b.lead?.fullName || "Noma'lum",
            course: b.group?.course?.name || "Kurs",
            group: b.group?.name || "Guruh",
            branch: b.branch?.name || "Filial",
            date: new Date(b.bookingDate).toLocaleDateString(),
            time: b.timeSlot,
            status: b.status,
            capacity: `${b.group?.currentStudents || 0}/${b.group?.maxStudents || 12}`,
          }))
        );
        anySuccess = true;
      }
      if (convsData.status === "fulfilled" && Array.isArray(convsData.value) && convsData.value.length > 0) {
        const mapped = convsData.value.map((c: any) => ({
          id: c.id,
          leadName: c.lead?.fullName || "Foydalanuvchi",
          phone: c.lead?.phone || "",
          age: c.lead?.age,
          status: c.status,
          handoffReason: c.handoffReason,
          lastMessage: c.messages?.[c.messages.length - 1]?.content || "Xabar yo'q",
          time: new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          messages: (c.messages || []).map((m: any) => ({
            sender: m.senderType,
            text: m.content,
          })),
        }));
        setConversations(mapped);
        setSelectedConv((prev: any) => {
          if (!prev) return mapped[0] || null;
          const current = mapped.find((c: any) => c.id === prev.id);
          return current || mapped[0] || prev;
        });
        anySuccess = true;
      }
      if (coursesData.status === "fulfilled" && Array.isArray(coursesData.value) && coursesData.value.length > 0) {
        setCourses(
          coursesData.value.map((c: any) => ({
            id: c.id,
            name: c.name,
            price: `${c.monthlyPrice.toLocaleString()} UZS/oy`,
            duration: `${c.durationMonths} oy (haftada ${c.lessonsPerWeek} kun)`,
            groupsCount: c._count?.groups || 1,
            status: c.isActive ? "FAOL" : "NOFAOL",
          }))
        );
        anySuccess = true;
      }
      if (kbData.status === "fulfilled" && Array.isArray(kbData.value) && kbData.value.length > 0) {
        setKbArticles(
          kbData.value.map((k: any) => ({
            id: k.id,
            title: k.title,
            category: k.category,
            status: k.status,
            views: k.viewCount || 0,
            content: k.content,
          }))
        );
        anySuccess = true;
      }
      if (tasksData.status === "fulfilled" && Array.isArray(tasksData.value) && tasksData.value.length > 0) {
        setTasks(
          tasksData.value.map((t: any) => ({
            id: t.id,
            title: t.title,
            type: t.taskType,
            priority: t.priority,
            status: t.status,
            leadPhone: t.lead?.phone || "+998901234567",
            desc: t.description || "",
          }))
        );
        anySuccess = true;
      }
      if (auditData.status === "fulfilled" && Array.isArray(auditData.value) && auditData.value.length > 0) {
        setAuditLogs(
          auditData.value.map((a: any) => ({
            id: a.id,
            entity: a.entityType,
            action: a.action,
            user: a.changedBy?.fullName || "Tizim",
            reason: a.reason || "Avtomatik qayd",
            time: new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }))
        );
        anySuccess = true;
      }
      if (groupsData.status === "fulfilled" && Array.isArray(groupsData.value)) {
        setGroups(groupsData.value);
        anySuccess = true;
      }
      if (enrollmentsData.status === "fulfilled" && Array.isArray(enrollmentsData.value)) {
        setEnrollments(enrollmentsData.value);
        anySuccess = true;
      }
      if (financeData.status === "fulfilled" && financeData.value) {
        setFinanceSummary(financeData.value);
        anySuccess = true;
      }
      if (paymentsData.status === "fulfilled" && Array.isArray(paymentsData.value)) {
        setPayments(paymentsData.value);
        anySuccess = true;
      }
      if (debtorsData.status === "fulfilled" && Array.isArray(debtorsData.value)) {
        setDebtors(debtorsData.value);
        anySuccess = true;
      }
      if (teachersData.status === "fulfilled" && Array.isArray(teachersData.value)) {
        setTeachers(teachersData.value);
        anySuccess = true;
      }
      if (teacherConvsData.status === "fulfilled" && Array.isArray(teacherConvsData.value)) {
        setTeacherConversations(teacherConvsData.value);
        anySuccess = true;
      }

      setIsConnectedToBackend(anySuccess);
    } catch (err) {
      console.warn("Backend sync failed, using cache:", err);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = (localStorage.getItem("portal_theme") as "light" | "dark") || "light";
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      const savedLang = (localStorage.getItem("portal_lang") as Language) || "uz";
      setLanguage(savedLang);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("portal_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const switchLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("portal_lang", lang);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherPhone.trim()) return;
    try {
      setIsSavingTeacher(true);
      setTeacherActionSuccess(null);
      await crmApi.createTeacher({
        fullName: newTeacherName.trim(),
        phone: newTeacherPhone.trim(),
        email: newTeacherEmail.trim() || undefined,
        password: newTeacherPassword || undefined,
      });
      setTeacherActionSuccess(t.teacherCreated);
      toast.success(t.teacherCreated);
      setNewTeacherName("");
      setNewTeacherPhone("+998");
      setNewTeacherEmail("");
      setNewTeacherPassword("Ustoz123!");
      setShowAddTeacherModal(false);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "O'qituvchi qo'shishda xatolik yuz berdi");
    } finally {
      setIsSavingTeacher(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm(t.confirmRemoveTeacher)) return;
    try {
      setIsDeletingTeacherId(teacherId);
      await crmApi.deleteTeacher(teacherId);
      setTeacherActionSuccess(t.teacherRemoved);
      toast.success(t.teacherRemoved);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "O'qituvchini olib tashlashda xatolik yuz berdi");
    } finally {
      setIsDeletingTeacherId(null);
    }
  };

  const handleOpenAssignGroup = (teacherItem: any) => {
    setSelectedTeacherForGroup(teacherItem);
    const firstAssigned = (teacherItem.assignedGroupDetails || [])[0];
    if (firstAssigned) {
      setAssignGroupId(firstAssigned.id);
      setAssignDaysOfWeek(firstAssigned.daysOfWeek || "Dushanba - Chorshanba - Juma");
      setAssignStartTime(firstAssigned.startTime || "16:00");
      setAssignEndTime(firstAssigned.endTime || "17:30");
      setAssignRoomNumber(firstAssigned.roomNumber || "105-xona");
    } else if (groups.length > 0) {
      setAssignGroupId(groups[0].id);
      setAssignDaysOfWeek(groups[0].daysOfWeek || "Dushanba - Chorshanba - Juma");
      setAssignStartTime(groups[0].startTime || "16:00");
      setAssignEndTime(groups[0].endTime || "17:30");
      setAssignRoomNumber(groups[0].roomNumber || "105-xona");
    }
    setShowAssignGroupModal(true);
  };

  const handleSaveAssignGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForGroup || !assignGroupId) return;
    try {
      setIsAssigningGroup(true);
      await crmApi.assignTeacherGroup(selectedTeacherForGroup.id, {
        groupId: assignGroupId,
        daysOfWeek: assignDaysOfWeek,
        startTime: assignStartTime,
        endTime: assignEndTime,
        roomNumber: assignRoomNumber,
      });
      setTeacherActionSuccess(t.groupAssigned);
      toast.success(t.groupAssigned);
      setShowAssignGroupModal(false);
      await refreshData();
    } catch (err: any) {
      toast.error("Guruh biriktirishda xatolik: " + (err.message || "Noma'lum"));
    } finally {
      setIsAssigningGroup(false);
    }
  };

  const handleSelectTeacherChat = async (conv: any) => {
    setSelectedTeacherChat(conv);
    try {
      const msgs = await crmApi.getTeacherMessages(conv.teacherId);
      setTeacherMessages(msgs);
      const updatedConvs = await crmApi.getTeacherConversations();
      setTeacherConversations(updatedConvs);
    } catch (e: any) {
      console.error("Xabarlarni yuklashda xato:", e);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherChat || !adminReplyText.trim()) return;
    try {
      setIsSendingReply(true);
      const newMsg = await crmApi.replyTeacherMessage(selectedTeacherChat.teacherId, adminReplyText.trim());
      setTeacherMessages((prev) => [...prev, newMsg]);
      setAdminReplyText("");
      setTeacherActionSuccess(t.replySent);
      toast.success(t.replySent);
      const updatedConvs = await crmApi.getTeacherConversations();
      setTeacherConversations(updatedConvs);
    } catch (e: any) {
      toast.error("Javob yuborishda xatolik: " + (e.message || "Noma'lum"));
    } finally {
      setIsSendingReply(false);
    }
  };

  useEffect(() => {
    refreshData(true);
    // Real-time live auto-polling every 5 seconds
    const interval = setInterval(() => {
      refreshData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Modals / forms state
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadCourse, setNewLeadCourse] = useState("General English (Beginner)");
  const [newLeadSource, setNewLeadSource] = useState("TELEGRAM");

  // Knowledge Base modal state
  const [showNewKbModal, setShowNewKbModal] = useState(false);
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbCategory, setNewKbCategory] = useState("Kurslar va narxlar");
  const [newKbContent, setNewKbContent] = useState("");
  const [newKbTags, setNewKbTags] = useState("");
  const [newKbStatus, setNewKbStatus] = useState("PUBLISHED");

  // Filter state for leads
  const [searchLead, setSearchLead] = useState("");
  const [scoreFilter, setScoreFilter] = useState("ALL");

  const filteredLeads = leads.filter((l) => {
    const matchSearch =
      l.fullName.toLowerCase().includes(searchLead.toLowerCase()) ||
      l.phone.includes(searchLead);
    const matchScore = scoreFilter === "ALL" || l.scoreTier === scoreFilter;
    return matchSearch && matchScore;
  });

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone) return;

    try {
      const res = await crmApi.createLead({
        fullName: newLeadName,
        phone: newLeadPhone,
        preferredCourse: newLeadCourse,
        source: newLeadSource,
      });

      if (res?.isDuplicate) {
        toast.info(
          `[DE-DUPLICATION]: ${newLeadPhone} raqamli o'quvchi allaqachon mavjud! Dublikat yaratilmadi, uning bali oshirildi: ${res.lead?.score} (${res.lead?.scoreTier}).`
        );
      } else {
        toast.success(`[YANGI LEAD]: ${newLeadName} muvaffaqiyatli saqlandi!`);
      }
      await refreshData();
    } catch (err: any) {
      console.warn("API createLead failed, local fallback:", err.message);
      const existingIndex = leads.findIndex((l) => l.phone.includes(newLeadPhone.trim()));
      if (existingIndex !== -1) {
        toast.info(`[DE-DUPLICATION]: ${newLeadPhone} raqamli o'quvchi allaqachon mavjud! Dublikat yaratilmadi, uning bali oshirildi.`);
        const updated = [...leads];
        updated[existingIndex].score = Math.min(100, updated[existingIndex].score + 10);
        setLeads(updated);
      } else {
        const newEntry = {
          id: `lead-${Date.now()}`,
          fullName: newLeadName,
          phone: newLeadPhone.startsWith("+") ? newLeadPhone : `+998${newLeadPhone}`,
          source: newLeadSource,
          score: 65,
          scoreTier: "WARM",
          status: "NEW",
          lostReason: undefined,
          preferredCourse: newLeadCourse,
          preferredBranch: "Chilonzor filiali",
          createdAt: "Hozirgina",
        };
        setLeads([newEntry, ...leads]);
        toast.success(`[YANGI LEAD]: ${newLeadName} muvaffaqiyatli saqlandi!`);
      }
    }

    setNewLeadName("");
    setNewLeadPhone("");
    setShowNewLeadModal(false);
  };

  const handleCreateKbArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbTitle.trim() || !newKbContent.trim()) return;

    try {
      await crmApi.createArticle({
        title: newKbTitle.trim(),
        content: newKbContent.trim(),
        category: newKbCategory,
        tags: newKbTags.trim() || undefined,
        status: newKbStatus,
      });
      setShowNewKbModal(false);
      setNewKbTitle("");
      setNewKbContent("");
      setNewKbTags("");
      await refreshData(true);
      toast.success("✅ Yangi savol-javob muvaffaqiyatli saqlandi va Telegram bot bilimlar bazasiga qo'shildi!");
    } catch (err: any) {
      console.warn("createArticle API failed, fallback:", err.message);
      const newArt = {
        id: `kb-${Date.now()}`,
        title: newKbTitle,
        category: newKbCategory,
        status: newKbStatus,
        views: 1,
        content: newKbContent,
      };
      setKbArticles([newArt, ...kbArticles]);
      setShowNewKbModal(false);
      setNewKbTitle("");
      setNewKbContent("");
      setNewKbTags("");
      toast.success("✅ Yangi savol-javob qo'shildi!");
    }
  };

  const handleSendAdminMessage = async () => {
    if (!adminReply.trim()) return;
    const msgText = adminReply;
    setAdminReply("");

    try {
      await crmApi.sendMessage(selectedConv.id, msgText);
      await refreshData();
    } catch (err: any) {
      console.warn("API sendMessage failed, local fallback:", err.message);
      const updatedMessages = [
        ...selectedConv.messages,
        { sender: "ADMIN", text: msgText },
      ];
      const updatedConv = {
        ...selectedConv,
        status: "ADMIN_HANDLING",
        messages: updatedMessages,
        lastMessage: msgText,
      };
      setSelectedConv(updatedConv);
      setConversations(conversations.map((c) => (c.id === updatedConv.id ? updatedConv : c)));
    }
  };

  const handleTakeOver = async () => {
    try {
      await crmApi.takeOverConversation(selectedConv.id);
      await refreshData();
    } catch (err: any) {
      console.warn("API takeOver failed, local fallback:", err.message);
      const updated = { ...selectedConv, status: "ADMIN_HANDLING" };
      setSelectedConv(updated);
      setConversations(conversations.map((c) => (c.id === updated.id ? updated : c)));
    }
  };

  const handleResolveHandoff = async () => {
    try {
      await crmApi.resolveConversation(selectedConv.id);
      await refreshData();
    } catch (err: any) {
      console.warn("API resolve failed, local fallback:", err.message);
      const updated = {
        ...selectedConv,
        status: "RESOLVED",
        messages: [
          ...selectedConv.messages,
          { sender: "SYSTEM", text: "[TIZIM]: Suhbat muvaffaqiyatli yakunlandi va yopildi." },
        ],
      };
      setSelectedConv(updated);
      setConversations(conversations.map((c) => (c.id === updated.id ? updated : c)));
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollingLead || !selectedEnrollGroupId) return;

    try {
      setIsEnrolling(true);
      await crmApi.enrollStudent({
        leadId: enrollingLead.id,
        groupId: selectedEnrollGroupId,
        monthlyFee: Number(enrollMonthlyFee),
      });

      setShowEnrollModal(false);
      setEnrollingLead(null);
      await refreshData(true);
      toast.success("🎉 O'quvchi kursga muvaffaqiyatli qabul qilindi!\nTelegram bot orqali o'quvchiga Mini App havolasi yuborildi.");
    } catch (err: any) {
      toast.error(err.message || "Qabul qilishda xatolik yuz berdi");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const receipt = await crmApi.getReceipt(paymentId);
      setSelectedReceipt(receipt);
      setShowReceiptModal(true);
    } catch (err: any) {
      toast.error("Kvitansiyani yuklashda xatolik: " + (err.message || err));
    }
  };

  const handleDirectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayLeadId || !directPayAmount) return;
    setIsProcessingPayment(true);
    try {
      const res = await crmApi.directPay({
        leadId: selectedPayLeadId,
        amount: Number(directPayAmount),
        method: directPayMethod,
        notes: directPayNotes || undefined,
      });
      setShowDirectPaymentModal(false);
      setSelectedPayLeadId("");
      setDirectPayNotes("");
      await refreshData(true);
      if (res?.id) {
        toast.success("✅ To'lov muvaffaqiyatli qabul qilindi va kvitansiya Telegramga yuborildi!");
        handleOpenReceipt(res.id);
      } else {
        toast.success("✅ To'lov muvaffaqiyatli qabul qilindi va kvitansiya Telegramga yuborildi!");
      }
    } catch (err: any) {
      toast.error("To'lovni saqlashda xato: " + (err.message || err));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleNotifyDebtor = async (leadId: string) => {
    setNotifyingDebtorId(leadId);
    try {
      await crmApi.notifyDebtor(leadId);
      toast.success("✅ Telegram orqali qarzdorlik eslatmasi muvaffaqiyatli yuborildi!");
      await refreshData();
    } catch (err: any) {
      toast.error("Eslatmani yuborishda xato: " + (err.message || err));
    } finally {
      setNotifyingDebtorId(null);
    }
  };

  return (
    <div className={`flex h-screen ${theme === "dark" ? "dark" : ""} bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors`}>
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 dark:bg-black text-white flex flex-col justify-between p-4 shadow-xl select-none border-r border-slate-800 shrink-0">
        <div>
          {/* Institutional Academic Emblem */}
          <div className="flex items-center space-x-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-100 shadow-xs">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-wide text-white">{t.brandName}</h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">{t.brandAcademy}</p>
            </div>
          </div>



          {/* Navigation Links */}
          <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "dashboard"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>{t.navDashboard}</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("leads")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "leads"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Users className="w-4 h-4" />
                    <span>{t.navLeads}</span>
                  </div>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-semibold">
                    {leads.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("trials")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "trials"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CalendarCheck className="w-4 h-4" />
                    <span>{t.navTrials}</span>
                  </div>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                    {trials.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("conversations")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "conversations"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>{t.navChats}</span>
                  </div>
                  {conversations.some((c) => c.status === "NEEDS_HUMAN") && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("courses")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "courses"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <BookOpen className="w-4 h-4" />
                    <span>{t.navCourses}</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("kb")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "kb"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4" />
                    <span>{t.navKb}</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "tasks"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CheckSquare className="w-4 h-4" />
                    <span>{t.navTasks}</span>
                  </div>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold">
                    {tasks.filter((t) => t.status === "TODO").length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("teachers")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "teachers"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <GraduationCap className="w-4 h-4" />
                    <span>{t.navTeachers}</span>
                  </div>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                    {teachers.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("teacherChat" as any);
                    if (!selectedTeacherChat && teacherConversations.length > 0) {
                      handleSelectTeacherChat(teacherConversations[0]);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === ("teacherChat" as any)
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <MessageSquare className="w-4 h-4" />
                    <span>{t.teacherChatTab}</span>
                  </div>
                  {teacherConversations.reduce((acc: number, curr: any) => acc + (curr.unreadCount || 0), 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
                      {teacherConversations.reduce((acc: number, curr: any) => acc + (curr.unreadCount || 0), 0)}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("attendance")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "attendance"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <GraduationCap className="w-4 h-4" />
                    <span>{t.navAttendance}</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("finance")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "finance"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CreditCard className="w-4 h-4" />
                    <span>{t.navFinance}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase">
                    Kassa
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("audit")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "audit"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t.navAudit}</span>
                  </div>
                </button>
          </nav>
        </div>

        {/* User Info footer */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
              BA
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">Bosh Administrator</p>
              <p className="text-[10px] text-slate-400 font-mono">SUPER_ADMIN</p>
            </div>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs shrink-0 transition-colors">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.adminMode}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
              {activeTab === "dashboard"
                ? t.navDashboard
                : activeTab === "leads"
                ? t.navLeads
                : activeTab === "trials"
                ? t.navTrials
                : activeTab === "conversations"
                ? t.navChats
                : activeTab === "courses"
                ? t.navCourses
                : activeTab === "teachers"
                ? t.navTeachers
                : activeTab === ("teacherChat" as any)
                ? t.teacherChatTab
                : activeTab === "kb"
                ? t.navKb
                : activeTab === "tasks"
                ? t.navTasks
                : activeTab === "attendance"
                ? t.navAttendance
                : activeTab === "finance"
                ? t.navFinance
                : t.navAudit}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live API status */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t.connectedStatus}</span>
            </div>

            {/* Language Switcher: UZ / RU */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => switchLanguage("uz")}
                className={`px-2 py-1 rounded-md transition-all ${
                  language === "uz"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                O'zb
              </button>
              <button
                onClick={() => switchLanguage("ru")}
                className={`px-2 py-1 rounded-md transition-all ${
                  language === "ru"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Рус
              </button>
            </div>

            {/* Theme Switcher: Tong (Light) / Tun (Dark) */}
            <button
              onClick={toggleTheme}
              title={theme === "light" ? `${t.darkTheme} rejimiga o'tish` : `${t.lightTheme} rejimiga o'tish`}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
            >
              {theme === "light" ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span>{t.darkTheme}</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.lightTheme}</span>
                </>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => refreshData(true)}
              title={t.actionRefresh}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span>{t.actionRefresh}</span>
            </button>

            {/* Add Lead */}
            <button
              onClick={() => setShowNewLeadModal(true)}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.actionNewLead}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Tab Content */}
        <div className="p-8">
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.totalLeads}</span>
                    <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                      <Users className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{kpis.totalLeads}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+18% </span> {t.vsLastWeek}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.hotLeads}</span>
                    <span className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                      <Flame className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{kpis.hotLeads}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t.hotSubtitle}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.trialAttendance}</span>
                    <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.trialShowUpRate}%</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t.trialSubtitle}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.enrolledWon}</span>
                    <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      <Award className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{kpis.wonLeads}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t.conversionRateLabel}: {kpis.conversionRate}%</p>
                </div>
              </div>

              {/* Visual Conversion Funnel */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.conversionFunnel}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t.funnelSubtitle}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {funnel.map((item, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-700 dark:text-slate-300">{item.stage}</span>
                        <span className="text-slate-900 dark:text-white font-bold">
                          {item.count} ta ({item.pct}%)
                        </span>
                      </div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-700`}
                          style={{ width: `${item.pct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LEADS TAB */}
          {activeTab === "leads" && (
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ism yoki telefon orqali qidirish..."
                    value={searchLead}
                    onChange={(e) => setSearchLead(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 font-medium">Saralash:</span>
                  <button
                    onClick={() => setScoreFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      scoreFilter === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Barchasi
                  </button>
                  <button
                    onClick={() => setScoreFilter("HOT")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 ${
                      scoreFilter === "HOT" ? "bg-orange-600 text-white" : "bg-orange-50 text-orange-700"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>HOT (70-100)</span>
                  </button>
                  <button
                    onClick={() => setScoreFilter("WARM")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 ${
                      scoreFilter === "WARM" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>WARM (40-69)</span>
                  </button>
                  <button
                    onClick={() => setScoreFilter("COLD")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 ${
                      scoreFilter === "COLD" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>COLD (0-39)</span>
                  </button>
                </div>
              </div>

              {/* Leads Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Mijoz (Lead)</th>
                      <th className="py-3.5 px-6">Telefon & Manba</th>
                      <th className="py-3.5 px-6">Qiziqish / Filial</th>
                      <th className="py-3.5 px-6">Ball & Daraja</th>
                      <th className="py-3.5 px-6">Holat (Status)</th>
                      <th className="py-3.5 px-6 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          <div className="flex items-center space-x-2">
                            <span>{lead.fullName}</span>
                            {(lead as any).age && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                🎂 {(lead as any).age} yosh
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-normal">{lead.createdAt}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-mono text-slate-700">{lead.phone}</div>
                          <span className="inline-block mt-0.5 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {lead.source}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800">{lead.preferredCourse}</div>
                          <div className="text-xs text-slate-500">{lead.preferredBranch}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900">{lead.score} ball</span>
                            {lead.scoreTier === "HOT" && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 flex items-center space-x-1">
                                <Flame className="w-3 h-3" />
                                <span>HOT</span>
                              </span>
                            )}
                            {lead.scoreTier === "WARM" && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center space-x-1">
                                <Sun className="w-3 h-3" />
                                <span>WARM</span>
                              </span>
                            )}
                            {lead.scoreTier === "COLD" && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center space-x-1">
                                <Snowflake className="w-3 h-3" />
                                <span>COLD</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              lead.status === "WON"
                                ? "bg-emerald-100 text-emerald-800"
                                : lead.status === "TRIAL_BOOKED"
                                ? "bg-amber-100 text-amber-800"
                                : lead.status === "TRIAL_ATTENDED"
                                ? "bg-indigo-100 text-indigo-800"
                                : lead.status === "LOST"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {lead.status}
                          </span>
                          {lead.lostReason && (
                            <div className="text-xs text-red-500 mt-1">Sabab: {lead.lostReason}</div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                          {lead.status === "WON" ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>✓ Qabul qilingan</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setEnrollingLead(lead);
                                if (groups.length > 0) {
                                  setSelectedEnrollGroupId(groups[0].id);
                                  setEnrollMonthlyFee(groups[0].course?.monthlyPrice || 450000);
                                }
                                setShowEnrollModal(true);
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
                              title="Talabani kursga qabul qilish va Telegram Mini App ochish"
                            >
                              <span>🎓 Qabul qilish</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              const foundConv = conversations.find(
                                (c) => c.phone === lead.phone || c.leadName === lead.fullName
                              );
                              if (foundConv) {
                                setSelectedConv(foundConv);
                              }
                              setActiveTab("conversations");
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-xs"
                            title="Telegram yozishmalarini to'liq ko'rish va qabul qilish"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Suhbatni ko'rish</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SINOV DARSLARI (TRIALS) TAB */}
          {activeTab === "trials" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-1">Sinov darslari (Trial Lessons) Rejasi</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Avtomatlashtirilgan eslatmalar (24 soat va 2 soat oldin) va qatnashuv monitoringi
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {trials.map((tb) => (
                    <div
                      key={tb.id}
                      className="p-5 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {tb.group}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              tb.status === "ATTENDED"
                                ? "bg-emerald-100 text-emerald-800"
                                : tb.status === "MISSED"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {tb.status}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900">{tb.leadName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{tb.course}</p>

                        <div className="mt-4 space-y-1 text-xs text-slate-600">
                          <div>📅 {tb.date} | ⏰ {tb.time}</div>
                          <div>📍 {tb.branch}</div>
                          <div>👥 Guruh to'laligi: <strong className="text-slate-900">{tb.capacity}</strong> talaba</div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                        {tb.status === "BOOKED" && (
                          <div className="flex space-x-2 w-full">
                            <button
                              onClick={async () => {
                                try {
                                  await crmApi.updateBookingStatus(tb.id, "ATTENDED");
                                  toast.success("O'quvchi sinov darsiga kelgan deb belgilandi!");
                                  await refreshData();
                                } catch (e: any) {
                                  toast.error(`Xatolik: ${e.message}`);
                                }
                              }}
                              className="flex-1 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                            >
                              Keldi (Attended)
                            </button>
                            <button
                              onClick={async () => {
                                const reason = prompt("Dars qoldirish sababini kiriting:") || "Sababsiz kelmadi";
                                try {
                                  await crmApi.updateBookingStatus(tb.id, "MISSED", reason);
                                  toast.info("O'quvchi kelmadi deb belgilandi.");
                                  await refreshData();
                                } catch (e: any) {
                                  toast.error(`Xatolik: ${e.message}`);
                                }
                              }}
                              className="flex-1 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                              Kelmadi (Missed)
                            </button>
                          </div>
                        )}
                        {tb.status === "ATTENDED" && (
                          <div className="text-xs text-emerald-700 font-semibold flex items-center space-x-1">
                            <UserCheck className="w-4 h-4" />
                            <span>Darsda qatnashdi</span>
                          </div>
                        )}
                        {tb.status === "MISSED" && (
                          <div className="text-xs text-red-600 font-semibold flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>Follow-up yuborilmoqda</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* JONLI SUHBATLAR (CONVERSATIONS) TAB */}
          {activeTab === "conversations" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-[680px] flex overflow-hidden">
              {/* Chat list */}
              <div className="w-80 border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between">
                  <span>Muloqotlar ({conversations.length})</span>
                  <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-semibold">
                    Telegram
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConv(conv)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedConv.id === conv.id ? "bg-indigo-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-slate-900">{conv.leadName}</span>
                        <span className="text-xs text-slate-400">{conv.time}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 mb-1.5">
                        {conv.status === "NEEDS_HUMAN" ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Operator so'ralgan</span>
                          </span>
                        ) : conv.status === "ADMIN_HANDLING" ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                            Operator javob berdi
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            AI assistent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Messages Window */}
              <div className="flex-1 flex flex-col justify-between bg-slate-50/50">
                {/* Header */}
                <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900">{selectedConv.leadName}</h3>
                      {(selectedConv as any).age && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          🎂 {(selectedConv as any).age} yosh
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{selectedConv.phone} | Kanal: Telegram</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    {selectedConv.status === "NEEDS_HUMAN" && (
                      <button
                        onClick={handleTakeOver}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                      >
                        Suhbatni qabul qilish (Takeover)
                      </button>
                    )}
                    <button
                      onClick={handleResolveHandoff}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700"
                    >
                      Yopish (Resolve)
                    </button>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {selectedConv.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.sender === "USER"
                          ? "justify-start"
                          : msg.sender === "SYSTEM"
                          ? "justify-center"
                          : "justify-end"
                      }`}
                    >
                      {msg.sender === "SYSTEM" ? (
                        <div className="bg-amber-100 text-amber-800 text-xs px-4 py-2 rounded-full font-medium shadow-xs">
                          {msg.text}
                        </div>
                      ) : (
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-sm ${
                            msg.sender === "USER"
                              ? "bg-white text-slate-800 border border-slate-200 shadow-xs"
                              : msg.sender === "ADMIN"
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-indigo-600 text-white shadow-sm"
                          }`}
                        >
                          <div className="text-[10px] font-semibold opacity-75 mb-1">
                            {msg.sender === "USER" ? selectedConv.leadName : msg.sender === "ADMIN" ? "Operator (Siz)" : "AI Assistent"}
                          </div>
                          <div>{msg.text}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reply Composer */}
                <div className="p-4 bg-white border-t border-slate-200 flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Mijozga operator sifatida javob yozing..."
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendAdminMessage();
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleSendAdminMessage}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KURSLAR & NARXLAR TAB */}
          {activeTab === "courses" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Rasmiy Kurslar va Narxlar Katalogi</h2>
                    <p className="text-sm text-slate-500">
                      AI Assistenti faqat ushbu katalogdagi narxlarni taqdim etadi (Zero-Hallucination Policy)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.map((course) => (
                    <div key={course.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-900 text-base">{course.name}</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          {course.status}
                        </span>
                      </div>
                      <div className="text-2xl font-extrabold text-indigo-600 my-2">{course.price}</div>
                      <p className="text-xs text-slate-500 mb-3">{course.duration}</p>
                      <div className="text-xs text-slate-600 flex items-center justify-between pt-3 border-t border-slate-100">
                        <span>Faol guruhlar soni: <strong>{course.groupsCount} ta</strong></span>
                        <span className="text-indigo-600 font-medium">Tekshirilgan narx ✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BILIMLAR BAZASI (KB) TAB */}
          {activeTab === "kb" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Bilimlar Bazasi (Knowledge Base)</h2>
                    <p className="text-sm text-slate-500">
                      AI Assistenti <strong>faqat PUBLISHED</strong> maqolalardan ma'lumot oladi. Qoralama (DRAFT) maqolalar AI ga ko'rinmaydi.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewKbModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yangi Savol / FAQ qo'shish</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {kbArticles.map((article) => (
                    <div key={article.id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {article.category}
                          </span>
                          <h3 className="font-bold text-slate-900">{article.title}</h3>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            article.status === "PUBLISHED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {article.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 my-2">{article.content}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                        <span>Ko'rishlar soni: {article.views} marta</span>
                        {article.status === "DRAFT" ? (
                          <button
                            onClick={async () => {
                              try {
                                await crmApi.publishArticle(article.id);
                                toast.success("Maqola nashr etildi!");
                                await refreshData();
                              } catch (e: any) {
                                toast.error(`Xatolik: ${e.message}`);
                              }
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold"
                          >
                            Nashr etish (Publish)
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-semibold">AI tomonidan o'qiladi ✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VAZIFALAR & ESKALATSIYA (TASKS) TAB */}
          {activeTab === "tasks" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-1">Administrator Vazifalari & Eskalatsiyalar</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Dars qoldirgan o'quvchilarga 2 marta follow-up natija bermasa, avtomatik shaxsiy qo'ng'iroq vazifasi shakllanadi.
                </p>

                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              task.priority === "URGENT"
                                ? "bg-red-100 text-red-800"
                                : task.priority === "HIGH"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {task.priority}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm">{task.title}</h3>
                        </div>
                        <p className="text-xs text-slate-500">{task.desc}</p>
                        <div className="text-xs font-mono text-indigo-600">Tel: {task.leadPhone}</div>
                      </div>

                      <div>
                        {task.status === "TODO" ? (
                          <button
                            onClick={async () => {
                              try {
                                await crmApi.updateTask(task.id, { status: "DONE" });
                                toast.success("Vazifa bajarildi!");
                                await refreshData();
                              } catch (e: any) {
                                toast.error(`Xatolik: ${e.message}`);
                              }
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                          >
                            Bajarildi deb belgilash
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                            ✓ Bajarilgan
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TEACHERS TAB */}
          {activeTab === "teachers" && (
            <div className="space-y-6">
              {/* Header card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                      {t.teachersTitle}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {teachers.length} ta o'qituvchi
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {t.teachersTitle}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.teachersSubtitle}
                  </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <button
                    onClick={() => setShowAddTeacherModal(true)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.newTeacherBtn}</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
                    <span>{t.totalTeachers}</span>
                    <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                      <Users className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                    {teachers.length}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Ro'yxatdan o'tgan ustozlar</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
                    <span>{t.activeTeachers}</span>
                    <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                      <UserCheck className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                    {teachers.filter((tItem: any) => tItem.isActive).length}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Faol dars berayotganlar</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
                    <span>{t.assignedGroups}</span>
                    <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                      <GraduationCap className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
                    {teachers.reduce((acc: number, curr: any) => acc + (curr.assignedGroupsCount || 0), 0)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Biriktirilgan dars guruhlari</p>
                </div>
              </div>

              {/* Teachers Table */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">
                  {t.teachersTitle}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        <th className="py-3 px-4 w-12">#</th>
                        <th className="py-3 px-4">{t.teacherName}</th>
                        <th className="py-3 px-4">{t.teacherPhone}</th>
                        <th className="py-3 px-4">{t.teacherEmail}</th>
                        <th className="py-3 px-4">{t.assignedGroups}</th>
                        <th className="py-3 px-4">Holati</th>
                        <th className="py-3 px-4 text-right">Harakat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {teachers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            {t.noTeachers}
                          </td>
                        </tr>
                      ) : (
                        teachers.map((tItem: any, idx: number) => (
                          <tr key={tItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                                  {tItem.fullName?.charAt(0) || "U"}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-slate-100">{tItem.fullName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{tItem.branchName || "Asosiy filial"}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                              {tItem.phone || "—"}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                              {tItem.email}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1.5">
                                {(tItem.assignedGroupDetails || []).length === 0 && (tItem.assignedGroups || []).length === 0 ? (
                                  <span className="text-slate-400 text-[11px] italic">Guruh biriktirilmagan</span>
                                ) : (
                                  ((tItem.assignedGroupDetails && tItem.assignedGroupDetails.length > 0)
                                    ? tItem.assignedGroupDetails
                                    : (tItem.assignedGroups || []).map((name: string) => ({ name, daysOfWeek: '', startTime: '', endTime: '', roomNumber: '' }))
                                  ).map((grp: any, gi: number) => (
                                    <div
                                      key={gi}
                                      className="px-2.5 py-1 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px]"
                                    >
                                      <div className="font-bold font-mono text-indigo-700 dark:text-indigo-300">{grp.name}</div>
                                      {grp.daysOfWeek && (
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                          🗓 {grp.daysOfWeek} {grp.startTime ? `(${grp.startTime} - ${grp.endTime})` : ''} {grp.roomNumber ? `• ${grp.roomNumber}` : ''}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tItem.isActive
                                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                                    : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                                }`}
                              >
                                {tItem.isActive ? "FAOL" : "NOFAOL"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleOpenAssignGroup(tItem)}
                                  className="px-2.5 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-semibold transition-colors border border-indigo-200 dark:border-indigo-900/50 flex items-center space-x-1"
                                >
                                  <CalendarCheck className="w-3.5 h-3.5" />
                                  <span>{t.assignGroup}</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteTeacher(tItem.id)}
                                  disabled={isDeletingTeacherId === tItem.id}
                                  className="px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-semibold transition-colors border border-rose-200 dark:border-rose-900/50 disabled:opacity-50"
                                >
                                  {isDeletingTeacherId === tItem.id ? "O'chirilmoqda..." : t.removeTeacher}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TEACHER-ADMIN CHAT TAB */}
          {activeTab === ("teacherChat" as any) && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <MessageSquare className="w-4 h-4" />
                    <span>{t.teacherChatTab}</span>
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full font-mono text-[10px]">
                      {teacherConversations.length} ta ustoz
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {t.teacherChatTitle}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.teacherChatSubtitle}
                  </p>
                </div>
              </div>

              {/* Chat Interface Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[550px]">
                {/* Teachers List Column */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">
                    Ustozlar Ro'yxati
                  </h3>
                  <div className="space-y-1.5 overflow-y-auto flex-1">
                    {teacherConversations.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        {t.noTeacherMessages}
                      </div>
                    ) : (
                      teacherConversations.map((conv: any) => (
                        <button
                          key={conv.teacherId}
                          onClick={() => handleSelectTeacherChat(conv)}
                          className={`w-full text-left p-3 rounded-xl transition-all border ${
                            selectedTeacherChat?.teacherId === conv.teacherId
                              ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700"
                              : "bg-slate-50/50 dark:bg-slate-800/30 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {conv.teacherName}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                                {conv.unreadCount} {t.unread}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {conv.teacherPhone || conv.teacherEmail}
                          </p>
                          {conv.lastMessage && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-1">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {conv.lastMessage.senderRole === "TEACHER" ? "Ustoz: " : "Admin: "}
                              </span>
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Active Chat Column */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col">
                  {selectedTeacherChat ? (
                    <>
                      {/* Chat Header */}
                      <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">
                            {selectedTeacherChat.teacherName}
                          </h3>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>📞 {selectedTeacherChat.teacherPhone || "Telefon yo'q"}</span>
                            <span>•</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                              📱 Telegram: {selectedTeacherChat.telegramId ? `Faol (${selectedTeacherChat.telegramId})` : "Ulanmagan"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Chat Message Stream */}
                      <div className="flex-1 py-4 space-y-3 overflow-y-auto max-h-[380px]">
                        {teacherMessages.length === 0 ? (
                          <div className="text-center py-16 text-slate-400 text-xs">
                            Ushbu o'qituvchi bilan yozishmalar mavjud emas. Birinchi xabarni yuboring.
                          </div>
                        ) : (
                          teacherMessages.map((msg: any) => (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${
                                msg.senderRole === "ADMIN" ? "items-end" : "items-start"
                              }`}
                            >
                              <div
                                className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                  msg.senderRole === "ADMIN"
                                    ? "bg-indigo-600 text-white rounded-br-xs shadow-xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                <div className="text-[10px] font-bold opacity-75 mb-1">
                                  {msg.senderRole === "ADMIN" ? "Administrator" : selectedTeacherChat.teacherName}
                                </div>
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 px-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Reply Box */}
                      <form onSubmit={handleSendAdminReply} className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                        <input
                          type="text"
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          placeholder={t.writeReply}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={isSendingReply || !adminReplyText.trim()}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSendingReply ? "..." : t.sendReply}</span>
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      Suhbatlashish uchun chap tomondan biror o'qituvchini tanlang.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ASSIGN GROUP & SCHEDULE MODAL */}
          {showAssignGroupModal && selectedTeacherForGroup && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {t.assignGroupModalTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ustoz: <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedTeacherForGroup.fullName}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAssignGroupModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveAssignGroup} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.selectGroup} *
                    </label>
                    <select
                      value={assignGroupId}
                      onChange={(e) => {
                        const gid = e.target.value;
                        setAssignGroupId(gid);
                        const grp = groups.find((g: any) => g.id === gid);
                        if (grp) {
                          if (grp.daysOfWeek) setAssignDaysOfWeek(grp.daysOfWeek);
                          if (grp.startTime) setAssignStartTime(grp.startTime);
                          if (grp.endTime) setAssignEndTime(grp.endTime);
                          if (grp.roomNumber) setAssignRoomNumber(grp.roomNumber);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {groups.map((grp: any) => (
                        <option key={grp.id} value={grp.id}>
                          {grp.name} — {grp.course?.name || "Kurs"} ({grp.daysOfWeek || "Vaqt belgilanmagan"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.daysOfWeek} *
                    </label>
                    <input
                      type="text"
                      required
                      value={assignDaysOfWeek}
                      onChange={(e) => setAssignDaysOfWeek(e.target.value)}
                      placeholder="Masalan: Dushanba - Chorshanba - Juma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t.startTime} *
                      </label>
                      <input
                        type="text"
                        required
                        value={assignStartTime}
                        onChange={(e) => setAssignStartTime(e.target.value)}
                        placeholder="16:00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t.endTime} *
                      </label>
                      <input
                        type="text"
                        required
                        value={assignEndTime}
                        onChange={(e) => setAssignEndTime(e.target.value)}
                        placeholder="17:30"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.roomNumber}
                    </label>
                    <input
                      type="text"
                      value={assignRoomNumber}
                      onChange={(e) => setAssignRoomNumber(e.target.value)}
                      placeholder="Masalan: 105-xona"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAssignGroupModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      disabled={isAssigningGroup}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      {isAssigningGroup ? "Saqlanmoqda..." : t.saveAssignment}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* DAVOMAT & BAHOLAR (ATTENDANCE & GRADES) TAB */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              {/* Header card with Mini App launchers */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 rounded-2xl shadow-lg border border-indigo-700/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        📱 Telegram Mini App Integratsiyasi
                      </span>
                      <span className="text-xs text-indigo-200">Real vaqtda sinxronizatsiya</span>
                    </div>
                    <h2 className="text-xl font-black mt-2 tracking-tight text-white">
                      {t.attendanceJournalTitle || "Davomat & Baholar Nazorat Jurnali"}
                    </h2>
                    <p className="text-xs text-indigo-100/80 mt-1 max-w-xl leading-relaxed">
                      {t.attendanceJournalSubtitle || "O'qituvchilar Telegram orqali qo'ygan davomat va baholar avtomatik tarzda ushbu markaziy boshqaruv paneliga tushadi hamda o'quvchining shaxsiy Telegram Mini App kabinetida aks etadi."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href="/student"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <span>🎓</span>
                      <span>{t.openStudentMiniApp || "Talaba Portali ↗"}</span>
                    </a>
                    <a
                      href="/teacher"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-purple-500/30 hover:bg-purple-500/40 text-purple-100 text-xs font-bold border border-purple-400/40 transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <span>👨‍🏫</span>
                      <span>{t.openTeacherMiniApp || "O'qituvchi Portali ↗"}</span>
                    </a>
                  </div>
                </div>

                {/* KPI counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-indigo-700/60">
                  <div className="bg-white/5 backdrop-blur p-3.5 rounded-xl border border-white/10">
                    <span className="text-xs text-indigo-200">Faol O'quvchilar</span>
                    <p className="text-2xl font-black mt-1 text-white">{enrollments.length} ta</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur p-3.5 rounded-xl border border-white/10">
                    <span className="text-xs text-indigo-200">Guruhlar Soni</span>
                    <p className="text-2xl font-black mt-1 text-white">{groups.length} ta</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur p-3.5 rounded-xl border border-white/10">
                    <span className="text-xs text-indigo-200">Jami Davomatlar</span>
                    <p className="text-2xl font-black mt-1 text-emerald-400">
                      {enrollments.reduce((acc, e) => acc + (e.attendances?.length || 0), 0)} dars
                    </p>
                  </div>
                  <div className="bg-white/5 backdrop-blur p-3.5 rounded-xl border border-white/10">
                    <span className="text-xs text-indigo-200">Markaz O'rtacha Bali</span>
                    <p className="text-2xl font-black mt-1 text-amber-300">
                      {(() => {
                        const allGrades = enrollments.flatMap((e) => e.grades || []);
                        if (allGrades.length === 0) return "—";
                        const sum = allGrades.reduce((a, b) => a + (b.score || 0), 0);
                        return `${Math.round(sum / allGrades.length)} / 100`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Group Filter bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-700">Guruh bo'yicha saralash:</span>
                  <select
                    value={selectedAttendanceGroup}
                    onChange={(e) => setSelectedAttendanceGroup(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Barcha Guruhlar ({groups.length})</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} — {g.course?.name || "Kurs"} ({g.currentStudents}/{g.maxStudents})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => refreshData(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span>Yangilash</span>
                </button>
              </div>

              {/* Attendance and Grades Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Daily Attendance Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-sm text-slate-900">
                        Kunlik Davomat Jurnali
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Ustoz kiritgan qaydlar</span>
                  </div>

                  {(() => {
                    const filteredEnrollments =
                      selectedAttendanceGroup === "ALL"
                        ? enrollments
                        : enrollments.filter((e) => e.groupId === selectedAttendanceGroup);

                    const allAtts = filteredEnrollments.flatMap((e) =>
                      (e.attendances || []).map((att: any) => ({
                        ...att,
                        studentName: e.lead?.fullName || "O'quvchi",
                        groupName: e.group?.name || "Guruh",
                        courseName: e.group?.course?.name || "",
                      }))
                    );

                    if (allAtts.length === 0) {
                      return (
                        <div className="py-12 text-center text-slate-400 text-xs my-auto">
                          <p>Hozircha davomat qaydlari mavjud emas.</p>
                          <p className="mt-1 text-slate-500">
                            O'qituvchi <a href="/teacher" target="_blank" className="text-indigo-600 underline font-semibold">O'qituvchi Jurnali</a> orqali davomat belgilashi mumkin.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                              <th className="py-2.5 px-3">O'quvchi</th>
                              <th className="py-2.5 px-3">Guruh</th>
                              <th className="py-2.5 px-3">Sana</th>
                              <th className="py-2.5 px-3">Holat</th>
                              <th className="py-2.5 px-3">Izoh</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {allAtts.slice(0, 20).map((att: any) => (
                              <tr key={att.id} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  {att.studentName}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {att.groupName}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">
                                  {new Date(att.date).toLocaleDateString("uz-UZ")}
                                </td>
                                <td className="py-2.5 px-3">
                                  {att.status === "PRESENT" && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Bor</span>
                                  )}
                                  {att.status === "LATE" && (
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Kech</span>
                                  )}
                                  {att.status === "EXCUSED" && (
                                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">Sababli</span>
                                  )}
                                  {att.status === "ABSENT" && (
                                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">Yo'q</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 italic">
                                  {att.notes || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Grades and Homework Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <h3 className="font-bold text-sm text-slate-900">
                        O'quvchilar Baholari & Topshiriqlar
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Baho va uy vazifalar</span>
                  </div>

                  {(() => {
                    const filteredEnrollments =
                      selectedAttendanceGroup === "ALL"
                        ? enrollments
                        : enrollments.filter((e) => e.groupId === selectedAttendanceGroup);

                    const allGrades = filteredEnrollments.flatMap((e) =>
                      (e.grades || []).map((grd: any) => ({
                        ...grd,
                        studentName: e.lead?.fullName || "O'quvchi",
                        groupName: e.group?.name || "Guruh",
                      }))
                    );

                    if (allGrades.length === 0) {
                      return (
                        <div className="py-12 text-center text-slate-400 text-xs my-auto">
                          <p>Hozircha baholash qaydlari mavjud emas.</p>
                          <p className="mt-1 text-slate-500">
                            O'qituvchi <a href="/teacher" target="_blank" className="text-indigo-600 underline font-semibold">O'qituvchi Jurnali</a> orqali ball qo'yishi mumkin.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                              <th className="py-2.5 px-3">O'quvchi</th>
                              <th className="py-2.5 px-3">Mavzu / Vazifa</th>
                              <th className="py-2.5 px-3">Turi</th>
                              <th className="py-2.5 px-3 text-center">Ball</th>
                              <th className="py-2.5 px-3">Izoh</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y border-slate-100">
                            {allGrades.slice(0, 20).map((grd: any) => (
                              <tr key={grd.id} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  {grd.studentName}
                                  <span className="block text-[11px] text-slate-400 font-normal">
                                    {grd.groupName}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-800 font-medium">
                                  {grd.title}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                                    {grd.gradeType}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-black text-indigo-600">
                                  {grd.score} / {grd.maxScore}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px] italic">
                                  {grd.comment || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* AUDIT JURNALI TAB */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-1">Xavfsizlik va Audit Jurnali</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Muhim amallar (status qaytarish, darsni bekor qilish, narx o'zgartirish) qat'iy nazorat ostida qayd etiladi.
                </p>

                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                        <th className="py-3 px-4">Ob'ekt</th>
                        <th className="py-3 px-4">Amal</th>
                        <th className="py-3 px-4">Foydalanuvchi</th>
                        <th className="py-3 px-4">Asos / Sabab</th>
                        <th className="py-3 px-4 text-right">Vaqt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">{log.entity}</td>
                          <td className="py-3 px-4 font-semibold text-indigo-600">{log.action}</td>
                          <td className="py-3 px-4 text-slate-800">{log.user}</td>
                          <td className="py-3 px-4 text-slate-600">{log.reason}</td>
                          <td className="py-3 px-4 text-right text-slate-400">{log.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MOLIYA & TO'LOVLAR (FINANCE & INVOICES) TAB */}
          {activeTab === "finance" && (
            <div className="space-y-6">
              {/* Header & New Payment action */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <CreditCard className="w-6 h-6 text-indigo-600" />
                    <h2 className="text-xl font-bold text-slate-900">Moliya va To'lovlar Markazi</h2>
                  </div>
                  <p className="text-sm text-slate-500">
                    O'quv markazining barcha kassa tushumlari, rasmiy kvitansiyalar, usullar bo'yicha taqsimot va qarzdorlar monitoringi
                  </p>
                </div>
                <button
                  onClick={() => setShowDirectPaymentModal(true)}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all self-start md:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yangi To'lov Qabul Qilish</span>
                </button>
              </div>

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Jami Tushum</span>
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                      <Wallet className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {(financeSummary.totalRevenue || 0).toLocaleString()}{" "}
                    <span className="text-xs font-semibold text-slate-400">UZS</span>
                  </div>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">Platforma ishga tushgandan beri</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Shu Oy Tushumi</span>
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <TrendingUp className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-blue-600">
                    {(financeSummary.monthlyRevenue || 0).toLocaleString()}{" "}
                    <span className="text-xs font-semibold text-slate-400">UZS</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">Joriy hisob-kitob davri</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Qoldiq Qarzdorlik</span>
                    <span className="p-2 rounded-xl bg-rose-50 text-rose-600 font-bold">
                      <AlertCircle className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-rose-600">
                    {(financeSummary.totalDebts || 0).toLocaleString()}{" "}
                    <span className="text-xs font-semibold text-slate-400">UZS</span>
                  </div>
                  <p className="text-xs text-rose-500 font-medium mt-1">To'lanmagan oylik to'lovlar</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Faol Talabalar</span>
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                      <UserCheck className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-indigo-600">
                    {financeSummary.activeStudentsCount || enrollments.length || 0}{" "}
                    <span className="text-xs font-semibold text-slate-400">o'quvchi</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Jami {financeSummary.totalPaymentsCount || payments.length || 0} ta to'lov operatsiyasi
                  </p>
                </div>
              </div>

              {/* Payment Methods Distribution Cards */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  To'lov Usullari Bo'yicha Taqsimot
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs font-medium text-slate-500">💵 Naqd pul (CASH)</div>
                    <div className="text-sm font-bold text-slate-800 mt-1">
                      {(financeSummary.methodBreakdown?.CASH || 0).toLocaleString()} UZS
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                    <div className="text-xs font-medium text-blue-600">💳 Click</div>
                    <div className="text-sm font-bold text-blue-900 mt-1">
                      {(financeSummary.methodBreakdown?.CLICK || 0).toLocaleString()} UZS
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <div className="text-xs font-medium text-emerald-600">📱 Payme</div>
                    <div className="text-sm font-bold text-emerald-900 mt-1">
                      {(financeSummary.methodBreakdown?.PAYME || 0).toLocaleString()} UZS
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                    <div className="text-xs font-medium text-purple-600">🍇 Uzum Bank</div>
                    <div className="text-sm font-bold text-purple-900 mt-1">
                      {(financeSummary.methodBreakdown?.UZUM || 0).toLocaleString()} UZS
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                    <div className="text-xs font-medium text-amber-600">🏦 Bank O'tkazmasi</div>
                    <div className="text-sm font-bold text-amber-900 mt-1">
                      {(financeSummary.methodBreakdown?.BANK_TRANSFER || 0).toLocaleString()} UZS
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtabs Switcher */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setFinanceSubTab("history")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                    financeSubTab === "history"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>To'lovlar Tarixi & Kvitansiyalar ({payments.length})</span>
                </button>
                <button
                  onClick={() => setFinanceSubTab("debtors")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                    financeSubTab === "debtors"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Qarzdorlar Ro'yxati ({debtors.length})</span>
                </button>
              </div>

              {/* Subtab 1: Payment History */}
              {financeSubTab === "history" && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Talaba ismi yoki telefon raqami..."
                        value={paymentSearch}
                        onChange={(e) => setPaymentSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400 font-medium">To'lov usuli:</span>
                      <select
                        value={paymentMethodFilter}
                        onChange={(e) => setPaymentMethodFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                      >
                        <option value="ALL">Barcha Usullar</option>
                        <option value="CASH">Naqd Pul (CASH)</option>
                        <option value="CLICK">Click</option>
                        <option value="PAYME">Payme</option>
                        <option value="UZUM">Uzum Bank</option>
                        <option value="BANK_TRANSFER">Bank O'tkazmasi</option>
                      </select>
                    </div>
                  </div>

                  {/* Payments Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                          <th className="py-3 px-4">Kvitansiya №</th>
                          <th className="py-3 px-4">Talaba</th>
                          <th className="py-3 px-4">Summa</th>
                          <th className="py-3 px-4">To'lov Usuli</th>
                          <th className="py-3 px-4">Holat</th>
                          <th className="py-3 px-4">Sana & Vaqt</th>
                          <th className="py-3 px-4 text-right">Amal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {(() => {
                          const filtered = payments.filter((p) => {
                            const matchesSearch =
                              !paymentSearch ||
                              p.lead?.fullName?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                              p.lead?.phone?.includes(paymentSearch);
                            const matchesMethod =
                              paymentMethodFilter === "ALL" || p.method === paymentMethodFilter;
                            return matchesSearch && matchesMethod;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                                  To'lovlar topilmadi.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((p) => {
                            const receiptNum = `INV-${p.id.slice(-6).toUpperCase()}`;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                                  {receiptNum}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-800">{p.lead?.fullName || "Talaba"}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">{p.lead?.phone}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-black text-slate-900 text-sm">
                                    {p.amount.toLocaleString()}
                                  </span>{" "}
                                  <span className="text-[10px] font-semibold text-slate-400">{p.currency}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                    {p.method}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    TO'LANDI
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-500">
                                  {new Date(p.paidAt || p.createdAt).toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => handleOpenReceipt(p.id)}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 ml-auto border border-indigo-200"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                    <span>Kvitansiya</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Subtab 2: Debtors List */}
              {financeSubTab === "debtors" && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Muddati Yaqinlashgan va Qarzdor Talabalar</h3>
                      <p className="text-xs text-slate-500">Oylik to'lovi to'liq qoplanmagan talabalar ro'yxati</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                          <th className="py-3 px-4">Talaba</th>
                          <th className="py-3 px-4">Guruh & Kurs</th>
                          <th className="py-3 px-4">Oylik To'lov</th>
                          <th className="py-3 px-4">To'langan</th>
                          <th className="py-3 px-4">Qoldiq Qarz</th>
                          <th className="py-3 px-4">To'lov Muddati</th>
                          <th className="py-3 px-4 text-right">Eslatma Yuborish</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {debtors.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                              Qarzdor talabalar mavjud emas. Barcha o'quvchilar hisobi toza! 🎉
                            </td>
                          </tr>
                        ) : (
                          debtors.map((d) => (
                            <tr key={d.enrollmentId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-800">{d.fullName}</div>
                                <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5">
                                  <span>{d.phone}</span>
                                  {d.telegramId && (
                                    <span className="text-blue-500 font-sans text-[10px] bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
                                      Telegram
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-800">{d.groupName}</div>
                                <div className="text-[11px] text-slate-400">{d.courseName}</div>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-700">
                                {d.monthlyFee.toLocaleString()} UZS
                              </td>
                              <td className="py-3 px-4 font-semibold text-emerald-600">
                                {d.paidThisMonth.toLocaleString()} UZS
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-black text-rose-600 text-sm">
                                  {d.remainingDebt.toLocaleString()} UZS
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-500">
                                {d.dueDate}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleNotifyDebtor(d.leadId)}
                                  disabled={notifyingDebtorId === d.leadId}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 ml-auto border border-blue-200 disabled:opacity-50"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>
                                    {notifyingDebtorId === d.leadId ? "Yuborilmoqda..." : "💬 Telegram Eslatma"}
                                  </span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal: Add New Teacher */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
                    {t.addTeacherModalTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t.addTeacherModalSubtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTeacherModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.teacherName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Sardor Boboyev"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.teacherPhone} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+998901234567"
                  value={newTeacherPhone}
                  onChange={(e) => setNewTeacherPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.teacherEmail} (ixtiyoriy)
                </label>
                <input
                  type="email"
                  placeholder="sardor.ielts@al-xorazmiy.uz"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.teacherPassword}
                </label>
                <input
                  type="text"
                  value={newTeacherPassword}
                  onChange={(e) => setNewTeacherPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t.actionCancel}
                </button>
                <button
                  type="submit"
                  disabled={isSavingTeacher || !newTeacherName || !newTeacherPhone}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSavingTeacher ? t.saving : t.actionSave}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Lead */}
      {showNewLeadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Yangi Lead Yaratish</h3>
            <p className="text-xs text-slate-500 mb-4">
              Telefon raqami bo'yicha de-duplikatsiya avtomatik tarzda tekshiriladi.
            </p>

            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ism Familiya</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Sardor Komilov"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Telefon raqami</label>
                <input
                  type="text"
                  required
                  placeholder="+998901234567"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Qiziqqan kursi</label>
                <select
                  value={newLeadCourse}
                  onChange={(e) => setNewLeadCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="General English (Beginner)">General English (Beginner)</option>
                  <option value="General English (Intermediate)">General English (Intermediate)</option>
                  <option value="IELTS Intensive">IELTS Intensive</option>
                  <option value="Rus tili (So'zlashuv)">Rus tili (So'zlashuv)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Murojaat manbasi</label>
                <select
                  value={newLeadSource}
                  onChange={(e) => setNewLeadSource(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="TELEGRAM">Telegram</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="WEBSITE">Website</option>
                  <option value="WALK_IN">Tashrif (Walk-in)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewLeadModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Creating New Knowledge Base (FAQ) Article */}
      {showNewKbModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Yangi Savol-Javob (FAQ) / Maqola qo'shish
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ushbu maqola nashr etilgach (PUBLISHED), Telegram bot undan avtomatik o'rganib o'quvchilarga javob bera boshlaydi.
            </p>

            <form onSubmit={handleCreateKbArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Savol / Maqola sarlavhasi</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: To'lovni bo'lib to'lash tartibi qanday?"
                  value={newKbTitle}
                  onChange={(e) => setNewKbTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategoriya</label>
                  <select
                    value={newKbCategory}
                    onChange={(e) => setNewKbCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Kurslar va narxlar">Kurslar va narxlar</option>
                    <option value="To'lovlar">To'lovlar</option>
                    <option value="Dars jadvali">Dars jadvali</option>
                    <option value="Filiallar">Filiallar</option>
                    <option value="O'qituvchilar">O'qituvchilar</option>
                    <option value="Qoidalar">Qoidalar</option>
                    <option value="Umumiy">Umumiy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Holati</label>
                  <select
                    value={newKbStatus}
                    onChange={(e) => setNewKbStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PUBLISHED">Nashr etish (PUBLISHED)</option>
                    <option value="DRAFT">Qoralama (DRAFT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kalit so'zlar / Teglar</label>
                <input
                  type="text"
                  placeholder="Masalan: bo'lib to'lash, to'lov, chegirma, qisman"
                  value={newKbTags}
                  onChange={(e) => setNewKbTags(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batafsil javob matni</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Mijozga taqdim etiladigan to'liq va aniq javobni yozing..."
                  value={newKbContent}
                  onChange={(e) => setNewKbContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewKbModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
                >
                  Saqlash va Nashr etish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enroll Lead to Group */}
      {showEnrollModal && enrollingLead && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
                🎓
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">Kursga Qabul Qilish</h3>
                <p className="text-xs text-slate-500">Talabani guruhga biriktirish va Telegram Mini App ochish</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs space-y-1">
              <p>
                <span className="text-slate-400">Talaba:</span>{" "}
                <strong className="text-slate-800">{enrollingLead.fullName}</strong>
              </p>
              <p>
                <span className="text-slate-400">Telefon:</span>{" "}
                <strong className="text-slate-800">{enrollingLead.phone}</strong>
              </p>
              {enrollingLead.telegramId ? (
                <p className="text-indigo-600 font-semibold flex items-center space-x-1 mt-1">
                  <span>📱</span>
                  <span>Telegram bot orqali Mini App bildirishnomasi yuboriladi</span>
                </p>
              ) : (
                <p className="text-amber-600 text-[11px] mt-1">
                  ℹ️ Talabaning Telegram ID si yo'q, kabinet havolasi telefon orqali taqdim etilishi mumkin.
                </p>
              )}
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">O'quv Guruhi</label>
                <select
                  value={selectedEnrollGroupId}
                  onChange={(e) => {
                    const gId = e.target.value;
                    setSelectedEnrollGroupId(gId);
                    const grp = groups.find((g) => g.id === gId);
                    if (grp?.course?.monthlyPrice) {
                      setEnrollMonthlyFee(grp.course.monthlyPrice);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Guruhni tanlang --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id} disabled={g.currentStudents >= g.maxStudents}>
                      {g.name} — {g.course?.name || "Kurs"} ({g.currentStudents}/{g.maxStudents} o'quvchi){" "}
                      {g.currentStudents >= g.maxStudents ? "[TO'LGAN]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Oylik To'lov Miqdori (UZS)</label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={enrollMonthlyFee}
                  onChange={(e) => setEnrollMonthlyFee(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollingLead(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isEnrolling || !selectedEnrollGroupId}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5"
                >
                  {isEnrolling ? <span>Biriktirilmoqda...</span> : <span>🎓 Qabul qilish va Telegramga yuborish</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Direct Payment */}
      {showDirectPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-none">To'lovni Qabul Qilish</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Kassa orqali tezkor to'lov kiritish va kvitansiya chiqarish</p>
                </div>
              </div>
              <button
                onClick={() => setShowDirectPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDirectPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Talaba / Lead</label>
                <select
                  value={selectedPayLeadId}
                  onChange={(e) => {
                    const lId = e.target.value;
                    setSelectedPayLeadId(lId);
                    const debtor = debtors.find((d) => d.leadId === lId);
                    if (debtor && debtor.remainingDebt > 0) {
                      setDirectPayAmount(debtor.remainingDebt);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Talabani tanlang --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} ({l.phone}) - {l.preferredCourse}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To'lov Summasi (UZS)</label>
                <input
                  type="number"
                  min={1000}
                  step={10000}
                  value={directPayAmount}
                  onChange={(e) => setDirectPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To'lov Usuli</label>
                <select
                  value={directPayMethod}
                  onChange={(e) => setDirectPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="CASH">💵 Naqd pul (CASH)</option>
                  <option value="CLICK">📱 CLICK</option>
                  <option value="PAYME">💳 Payme</option>
                  <option value="UZUM">🍇 Uzum Bank</option>
                  <option value="BANK_TRANSFER">🏦 Bank o'tkazmasi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Izoh (ixtiyoriy)</label>
                <input
                  type="text"
                  placeholder="Masalan: 1-oy uchun to'lov yoki chegirma bilan"
                  value={directPayNotes}
                  onChange={(e) => setDirectPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDirectPaymentModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment || !selectedPayLeadId || !directPayAmount}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5"
                >
                  {isProcessingPayment ? (
                    <span>Saqlanmoqda...</span>
                  ) : (
                    <>
                      <Receipt className="w-3.5 h-3.5" />
                      <span>To'lovni Tasdiqlash & Kvitansiya</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View & Print Official Receipt */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Rasmiy To'lov Kvitansiyasi
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 border border-indigo-200 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Chop etish (Print / PDF)</span>
                </button>
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    setSelectedReceipt(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 font-bold text-base"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="printable-receipt mt-4 p-6 bg-slate-50/50 rounded-xl border border-slate-200 font-mono text-slate-800 text-xs">
              {/* Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-300">
                <div className="font-black text-sm tracking-wider uppercase text-slate-900">
                  {selectedReceipt.centerInfo?.name || "AL-XORAZMIY O'QUV MARKAZI"}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {selectedReceipt.centerInfo?.tagline || "Zamonaviy IT & Til Ta'lim Maskani"}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Tel: {selectedReceipt.centerInfo?.phone || "+998 71 200-00-00"} | Manzil: Toshkent sh.
                </div>
              </div>

              {/* Receipt Number & Date */}
              <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kvitansiya №:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sana va vaqt:</span>
                  <span className="font-semibold text-slate-700">{selectedReceipt.paymentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kassir / Qabul qiluvchi:</span>
                  <span className="font-semibold text-slate-700">{selectedReceipt.cashier}</span>
                </div>
              </div>

              {/* Student & Course Details */}
              <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">O'quvchi:</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.student?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telefon:</span>
                  <span className="font-semibold text-slate-700">{selectedReceipt.student?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kurs / Guruh:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedReceipt.student?.groupName || selectedReceipt.student?.courseName || "General English"}
                  </span>
                </div>
                {selectedReceipt.notes && (
                  <div className="flex justify-between text-slate-500 text-[10px] pt-1 italic">
                    <span>Izoh:</span>
                    <span>{selectedReceipt.notes}</span>
                  </div>
                )}
              </div>

              {/* Amount & Method */}
              <div className="py-4 border-b-2 border-slate-800 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-bold text-slate-600">To'lov Usuli:</span>
                  <span className="font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-800 text-[11px]">
                    {selectedReceipt.method}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-black text-slate-900">JAMI TO'LANDI:</span>
                  <span className="text-lg font-black text-emerald-600 font-sans">
                    {selectedReceipt.amount?.toLocaleString()} {selectedReceipt.currency || "UZS"}
                  </span>
                </div>
              </div>

              {/* Footer Stamp / Verification */}
              <div className="pt-4 text-center space-y-2">
                <div className="text-[10px] text-slate-500">
                  Ushbu to'lov kvitansiyasi avtomatlashtirilgan CRM tizimi orqali yaratilgan va tasdiqlangan.
                </div>
                <div className="flex items-center justify-center space-x-2 text-[10px] text-emerald-700 font-bold bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200">
                  <span>✓ ELEKTRON TASDIQLANGAN</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Buttons */}
            <div className="mt-4 flex justify-end space-x-3 no-print">
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedReceipt(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Yopish
              </button>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Chekni Chop Etish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
