"use client";

import React, { useState, useEffect } from "react";
import { crmApi, ensureAuthenticated } from "@/lib/api";
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
  Sparkles,
} from "lucide-react";

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "leads" | "trials" | "conversations" | "courses" | "kb" | "tasks" | "audit"
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

  // Load real data from backend (Supports silent auto-polling)
  const refreshData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      await ensureAuthenticated();
      const [kpiData, funnelData, leadsData, bookingsData, convsData, coursesData, kbData, tasksData, auditData] =
        await Promise.allSettled([
          crmApi.getKpis(),
          crmApi.getFunnel(),
          crmApi.getLeads(),
          crmApi.getBookings(),
          crmApi.getConversations(),
          crmApi.getCourses(),
          crmApi.getKnowledgeBase(),
          crmApi.getTasks(),
          crmApi.getAuditLogs(),
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

      setIsConnectedToBackend(anySuccess);
    } catch (err) {
      console.warn("Backend sync failed, using cache:", err);
    } finally {
      if (isManual) setIsRefreshing(false);
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
        alert(
          `[DE-DUPLICATION]: ${newLeadPhone} raqamli o'quvchi allaqachon mavjud! Dublikat yaratilmadi, uning bali oshirildi: ${res.lead?.score} (${res.lead?.scoreTier}).`
        );
      } else {
        alert(`[YANGI LEAD]: ${newLeadName} muvaffaqiyatli saqlandi!`);
      }
      await refreshData();
    } catch (err: any) {
      console.warn("API createLead failed, local fallback:", err.message);
      const existingIndex = leads.findIndex((l) => l.phone.includes(newLeadPhone.trim()));
      if (existingIndex !== -1) {
        alert(`[DE-DUPLICATION]: ${newLeadPhone} raqamli o'quvchi allaqachon mavjud! Dublikat yaratilmadi, uning bali oshirildi.`);
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
      alert("✅ Yangi savol-javob muvaffaqiyatli saqlandi va Telegram bot bilimlar bazasiga qo'shildi!");
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
      alert("✅ Yangi savol-javob qo'shildi!");
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

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-4 shadow-xl select-none">
        <div>
          {/* Brand header */}
          <div className="flex items-center space-x-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-wide text-white">Al-Xorazmiy</h1>
              <p className="text-xs text-indigo-400 font-medium tracking-wider uppercase">BUSINESS V1 CRM</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-5 h-5" />
                <span>Boshqaruv paneli</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("leads")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "leads"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5" />
                <span>Mijozlar (Leads)</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-semibold">
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("trials")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "trials"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <CalendarCheck className="w-5 h-5" />
                <span>Sinov darslari</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                {trials.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("conversations")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "conversations"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5" />
                <span>Jonli suhbatlar</span>
              </div>
              {conversations.some((c) => c.status === "NEEDS_HUMAN") && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("courses")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "courses"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5" />
                <span>Kurslar & Narxlar</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("kb")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "kb"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5" />
                <span>Bilimlar bazasi (KB)</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "tasks"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <CheckSquare className="w-5 h-5" />
                <span>Vazifalar & Eskalatsiya</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold">
                {tasks.filter((t) => t.status === "TODO").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "audit"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5" />
                <span>Audit jurnali</span>
              </div>
            </button>
          </nav>
        </div>

        {/* User Info footer */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
              BA
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">Bosh Administrator</p>
              <p className="text-xs text-emerald-400 font-mono">SUPER_ADMIN</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <span>CRM</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-slate-800 capitalize">
              {activeTab === "dashboard" && "Boshqaruv Paneli & Konversiya Funneli"}
              {activeTab === "leads" && "Mijozlar Boshqaruvi & Ball Tizimi"}
              {activeTab === "trials" && "Sinov Darslari Rejasi & Joy Cheklovlari"}
              {activeTab === "conversations" && "AI Jonli Suhbatlar & Operatorga Uzatish"}
              {activeTab === "courses" && "Kurslar Katalogi & Rasmiy Narxlar"}
              {activeTab === "kb" && "Bilimlar Bazasi (DRAFT / PUBLISHED)"}
              {activeTab === "tasks" && "Administrator Vazifalari & Eskalatsiya"}
              {activeTab === "audit" && "Xavfsizlik & Audit Jurnali"}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {isConnectedToBackend ? (
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>API Bog'langan (Live)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Lokal Rejim</span>
              </div>
            )}
            <button
              onClick={() => refreshData(true)}
              title="Baza bilan qayta yangilash"
              className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span>Yangilash</span>
            </button>
            <button
              onClick={() => setShowNewLeadModal(true)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Lead</span>
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
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500">Jami Leadlar</span>
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Users className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900">{kpis.totalLeads}</div>
                  <p className="text-xs text-slate-500 mt-2">
                    <span className="text-emerald-600 font-semibold">+18% </span> o'tgan haftaga nisbatan
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500">Issiq Mijozlar (HOT)</span>
                    <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                      <Flame className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-orange-600">{kpis.hotLeads}</div>
                  <p className="text-xs text-slate-500 mt-2">Ball &gt;= 70 ball bo'lgan o'quvchilar</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500">Sinovga Kelish Foizi</span>
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <UserCheck className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-600">{kpis.trialShowUpRate}%</div>
                  <p className="text-xs text-slate-500 mt-2">Attended / (Attended + Missed)</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-500">Qabul Qilingan (WON)</span>
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Sparkles className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold text-purple-600">{kpis.wonLeads}</div>
                  <p className="text-xs text-slate-500 mt-2">Konversiya darajasi: {kpis.conversionRate}%</p>
                </div>
              </div>

              {/* Visual Conversion Funnel */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Mijozlarni Qabul Qilish Funneli (Conversion Funnel)</h2>
                    <p className="text-sm text-slate-500">
                      Yangi murojaatdan rasmiy to'lov qabul qilib guruhga joylashgacha bo'lgan bosqichlar
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {funnel.map((item, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-700">{item.stage}</span>
                        <span className="text-slate-900 font-bold">
                          {item.count} ta ({item.pct}%)
                        </span>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
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
                        <td className="py-4 px-6 text-right space-x-2">
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
                                  await refreshData();
                                } catch (e: any) {
                                  alert(`Xatolik: ${e.message}`);
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
                                  await refreshData();
                                } catch (e: any) {
                                  alert(`Xatolik: ${e.message}`);
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
                                await refreshData();
                              } catch (e: any) {
                                alert(`Xatolik: ${e.message}`);
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
                                await refreshData();
                              } catch (e: any) {
                                alert(`Xatolik: ${e.message}`);
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
        </div>
      </main>

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
    </div>
  );
}
