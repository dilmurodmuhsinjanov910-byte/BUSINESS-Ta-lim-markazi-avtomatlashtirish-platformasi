'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { crmApi } from '@/lib/api';

interface StudentPortalData {
  student: {
    id: string;
    fullName: string;
    phone: string;
    telegramId?: string;
    telegramUsername?: string;
    age?: number;
  };
  enrollments: Array<{
    id: string;
    status: string;
    monthlyFee: number;
    enrolledAt: string;
    group: {
      id: string;
      name: string;
      daysOfWeek: string;
      startTime: string;
      endTime: string;
      roomNumber?: string;
      course: {
        id: string;
        name: string;
        level: string;
        language: string;
        monthlyPrice: number;
      };
      branch: {
        id: string;
        name: string;
        address: string;
        phone: string;
      };
    };
    stats: {
      totalLessons: number;
      presentCount: number;
      lateCount: number;
      excusedCount: number;
      absentCount: number;
      attendancePercentage: number;
      averageGrade: number | null;
      totalGradesCount: number;
    };
    attendances: Array<{
      id: string;
      date: string;
      status: string;
      notes?: string;
    }>;
    grades: Array<{
      id: string;
      score: number;
      maxScore: number;
      gradeType: string;
      title: string;
      comment?: string;
      date: string;
    }>;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    method: string;
    createdAt: string;
  }>;
}

function StudentPortalContent() {
  const searchParams = useSearchParams();
  const telegramIdParam = searchParams.get('telegramId');
  const leadIdParam = searchParams.get('leadId') || searchParams.get('id');

  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEnrollmentIdx, setSelectedEnrollmentIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'grades'>('info');

  const identifier = telegramIdParam || leadIdParam;

  useEffect(() => {
    // Notify Telegram WebApp if present
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
    }

    if (!identifier) {
      // If no param, try fetching first available enrollment or show helpful search
      setError("Talaba identifikatori ko'rsatilmadi. Telegram bot orqali yoki shaxsiy ID bilan kiring.");
      setLoading(false);
      return;
    }

    loadPortalData();
  }, [identifier]);

  const loadPortalData = async () => {
    if (!identifier) return;
    try {
      setLoading(true);
      setError(null);
      const res = await crmApi.getStudentPortal(identifier);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded text-xs">Bor</span>;
      case 'LATE':
        return <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium px-2 py-0.5 rounded text-xs">Kechikkan</span>;
      case 'EXCUSED':
        return <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium px-2 py-0.5 rounded text-xs">Sababli</span>;
      case 'ABSENT':
        return <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium px-2 py-0.5 rounded text-xs">Yo'q</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-xs">{status}</span>;
    }
  };

  const getGradeTypeBadge = (type: string) => {
    switch (type) {
      case 'HOMEWORK':
        return <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded">Uyga vazifa</span>;
      case 'CLASSWORK':
        return <span className="text-xs bg-cyan-50 text-cyan-600 font-medium px-2 py-0.5 rounded">Darsdagi faollik</span>;
      case 'EXAM':
        return <span className="text-xs bg-purple-50 text-purple-600 font-medium px-2 py-0.5 rounded">Imtihon</span>;
      case 'QUIZ':
        return <span className="text-xs bg-amber-50 text-amber-600 font-medium px-2 py-0.5 rounded">Oraliq test</span>;
      default:
        return <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">{type}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 font-medium">
          Talaba ma'lumotlari yuklanmoqda...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center text-3xl mb-4 text-rose-600">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Kabinet topilmadi
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-sm">
          {error || "Sizning hisobingiz bo'yicha faol o'quv kursi topilmadi."}
        </p>
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
              (window as any).Telegram.WebApp.close();
            } else {
              window.location.reload();
            }
          }}
          className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl shadow-sm hover:bg-indigo-700 transition"
        >
          Yopish yoki Qaytadan urinish
        </button>
      </div>
    );
  }

  const currentEnrollment = data.enrollments[selectedEnrollmentIdx] || data.enrollments[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12">
      {/* Header Profile Bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center font-bold text-lg text-white">
              {data.student.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{data.student.fullName}</h1>
              <p className="text-xs text-indigo-100">
                {data.student.phone || 'O\'quvchi'} {data.student.age ? `• ${data.student.age} yosh` : ''}
              </p>
            </div>
          </div>
          <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-1 rounded-full text-xs font-semibold">
            Faol Talaba
          </span>
        </div>

        {/* Group Selector if multiple */}
        {data.enrollments.length > 1 && (
          <div className="mt-4 flex space-x-2 overflow-x-auto pb-1">
            {data.enrollments.map((enr, idx) => (
              <button
                key={enr.id}
                onClick={() => setSelectedEnrollmentIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedEnrollmentIdx === idx
                    ? 'bg-white text-indigo-700 shadow'
                    : 'bg-white/10 text-indigo-100 hover:bg-white/20'
                }`}
              >
                {enr.group.course.name} ({enr.group.name})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="px-4 -mt-8 space-y-4 max-w-md mx-auto">
        {/* KPI Quick Cards */}
        {currentEnrollment && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Davomat ko'rsatkichi</span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {currentEnrollment.stats.attendancePercentage}%
                </span>
                <span className="text-xs text-slate-500">
                  ({currentEnrollment.stats.presentCount}/{currentEnrollment.stats.totalLessons})
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(currentEnrollment.stats.attendancePercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">O'rtacha Ball</span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-black text-amber-500">
                  {currentEnrollment.stats.averageGrade !== null ? currentEnrollment.stats.averageGrade : '—'}
                </span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {currentEnrollment.stats.totalGradesCount} ta baholash
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-slate-200/70 dark:bg-slate-800/70 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'info'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            📋 Kurs & Jadval
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'attendance'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            📅 Davomat ({currentEnrollment?.attendances?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'grades'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            ⭐ Baholar ({currentEnrollment?.grades?.length || 0})
          </button>
        </div>

        {/* TAB 1: Course Info */}
        {activeTab === 'info' && currentEnrollment && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {currentEnrollment.group.course.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Guruh: <span className="font-semibold text-indigo-600">{currentEnrollment.group.name}</span>
                  </p>
                </div>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 font-semibold px-2.5 py-1 rounded-lg">
                  {currentEnrollment.group.course.level}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Dars kunlari:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{currentEnrollment.group.daysOfWeek}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Dars vaqti:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentEnrollment.group.startTime} - {currentEnrollment.group.endTime}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Xona raqami:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentEnrollment.group.roomNumber || 'Asosiy xona'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Oylik to'lov:</span>
                  <span className="font-semibold text-emerald-600">
                    {currentEnrollment.monthlyFee.toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 block">Filial:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {currentEnrollment.group.branch.name} — {currentEnrollment.group.branch.address}
                </span>
                <span className="block text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                  Tel: {currentEnrollment.group.branch.phone}
                </span>
              </div>
            </div>

            {/* Payments History */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
              <h4 className="font-bold text-sm mb-2 text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>💳 To'lov holati</span>
                <span className="text-xs font-normal text-slate-500">
                  {data.payments.length} ta kvitantsiya
                </span>
              </h4>
              {data.payments.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Hozircha to'lov yozuvlari mavjud emas.</p>
              ) : (
                <div className="space-y-2">
                  {data.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {p.amount.toLocaleString('uz-UZ')} so'm
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {p.method} • {new Date(p.createdAt).toLocaleDateString('uz-UZ')}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Attendance */}
        {activeTab === 'attendance' && currentEnrollment && (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
            <h4 className="font-bold text-sm mb-3 text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>📅 Darslardagi davomat</span>
              <span className="text-xs font-medium text-indigo-600">
                Jami: {currentEnrollment.attendances.length} dars
              </span>
            </h4>

            {currentEnrollment.attendances.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Ustoz tomonidan hali davomat kiritilmagan.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentEnrollment.attendances.map((att) => (
                  <div key={att.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        {new Date(att.date).toLocaleDateString('uz-UZ', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {att.notes && (
                        <span className="text-[11px] text-slate-500 italic block mt-0.5">
                          "{att.notes}"
                        </span>
                      )}
                    </div>
                    <div>{getAttendanceBadge(att.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Grades */}
        {activeTab === 'grades' && currentEnrollment && (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
            <h4 className="font-bold text-sm mb-3 text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>⭐ Qo'yilgan baholar</span>
              <span className="text-xs font-medium text-amber-600">
                O'rtacha: {currentEnrollment.stats.averageGrade ?? '—'}
              </span>
            </h4>

            {currentEnrollment.grades.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Hozircha baho yoki uyga vazifa ballari kiritilmagan.
              </p>
            ) : (
              <div className="space-y-3">
                {currentEnrollment.grades.map((grd) => (
                  <div
                    key={grd.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          {getGradeTypeBadge(grd.gradeType)}
                          <span className="text-[11px] text-slate-400">
                            {new Date(grd.date).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                        <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-1">
                          {grd.title}
                        </h5>
                        {grd.comment && (
                          <p className="text-[11px] text-slate-500 mt-1 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                            Izoh: {grd.comment}
                          </p>
                        )}
                      </div>
                      <div className="text-right pl-2">
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                          {grd.score}
                        </span>
                        <span className="text-xs text-slate-400">/{grd.maxScore}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Admin Sync Info Banner */}
        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center space-x-2.5 text-xs text-indigo-700 dark:text-indigo-300">
          <span className="text-base">🔄</span>
          <span>Barcha davomat va baholar o'quv markazi ma'muriyati bilan to'liq sinxronlangan.</span>
        </div>
      </div>
    </div>
  );
}

export default function StudentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <StudentPortalContent />
    </Suspense>
  );
}
