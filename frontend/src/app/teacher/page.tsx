'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { crmApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

interface TeacherGroup {
  id: string;
  name: string;
  courseName: string;
  branchName: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  maxStudents: number;
  currentStudents: number;
  students: Array<{
    enrollmentId: string;
    leadId: string;
    fullName: string;
    phone: string;
    telegramId?: string;
    averageGrade: number | null;
    recentAttendances: any[];
    recentGrades: any[];
  }>;
}

function TeacherPortalContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const teacherIdParam = searchParams.get('teacherId');

  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view: 'attendance' | 'grades'
  const [activeView, setActiveView] = useState<'attendance' | 'grades'>('attendance');

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; notes: string }>
  >({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);

  // Grade state
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState<string>('');
  const [gradeScore, setGradeScore] = useState<number>(85);
  const [gradeMaxScore, setGradeMaxScore] = useState<number>(100);
  const [gradeType, setGradeType] = useState<string>('HOMEWORK');
  const [gradeTitle, setGradeTitle] = useState<string>('');
  const [gradeComment, setGradeComment] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeSuccess, setGradeSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Notify Telegram WebApp if present
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
    }

    loadTeacherData();
  }, [teacherIdParam]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await crmApi.getTeacherPortal(teacherIdParam || undefined);
      setGroups(res.groups || []);
      if (res.groups && res.groups.length > 0) {
        const firstGroup = res.groups[0];
        setSelectedGroupId(firstGroup.id);
        initAttendanceMap(firstGroup.students);
      }
    } catch (err: any) {
      setError(err.message || 'Guruhlar ma\'lumotini yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  const initAttendanceMap = (students: any[]) => {
    const initialMap: Record<string, { status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'; notes: string }> = {};
    students.forEach((st) => {
      initialMap[st.enrollmentId] = {
        status: 'PRESENT',
        notes: '',
      };
    });
    setAttendanceMap(initialMap);
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    const grp = groups.find((g) => g.id === groupId);
    if (grp) {
      initAttendanceMap(grp.students);
    }
    setAttendanceSuccess(null);
    setGradeSuccess(null);
  };

  const setStudentStatus = (
    enrollmentId: string,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
  ) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        status,
      },
    }));
  };

  const setStudentNotes = (enrollmentId: string, notes: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        notes,
      },
    }));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status };
      });
      return updated;
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedGroupId) return;
    try {
      setIsSavingAttendance(true);
      setAttendanceSuccess(null);

      const records = Object.entries(attendanceMap).map(([enrollmentId, data]) => ({
        enrollmentId,
        status: data.status,
        notes: data.notes || undefined,
      }));

      await crmApi.recordAttendance({
        groupId: selectedGroupId,
        date: attendanceDate,
        records,
      });

      setAttendanceSuccess("✅ Davomat muvaffaqiyatli saqlandi va Admin Panelga sinxronlashtirildi!");
      toast.success("Davomat muvaffaqiyatli saqlandi va Admin Panelga sinxronlashtirildi!");
      setTimeout(() => setAttendanceSuccess(null), 5000);
    } catch (err: any) {
      toast.error(err.message || 'Davomatni saqlashda xato yuz berdi');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForGrade || !gradeTitle) {
      toast.warning("Iltimos, o'quvchi va topshiriq mavzusini tanlang");
      return;
    }

    try {
      setIsSavingGrade(true);
      setGradeSuccess(null);

      await crmApi.recordGrade({
        enrollmentId: selectedStudentForGrade,
        score: Number(gradeScore),
        maxScore: Number(gradeMaxScore) || 100,
        gradeType,
        title: gradeTitle,
        comment: gradeComment || undefined,
      });

      setGradeSuccess("✅ Baho muvaffaqiyatli saqlandi va talaba kabinetiga yuborildi!");
      toast.success("Baho muvaffaqiyatli saqlandi va talaba kabinetiga yuborildi!");
      setGradeTitle('');
      setGradeComment('');
      setTimeout(() => setGradeSuccess(null), 5000);

      // Refresh teacher data to show latest average grade
      loadTeacherData();
    } catch (err: any) {
      toast.error(err.message || 'Bahoni saqlashda xato yuz berdi');
    } finally {
      setIsSavingGrade(false);
    }
  };

  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 font-medium">
          O'qituvchi jurnali yuklanmoqda...
        </p>
      </div>
    );
  }

  if (error || groups.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center text-3xl mb-4 text-amber-600">
          👨‍🏫
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Guruhlar topilmadi
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-sm">
          {error || "Hozirda sizga biriktirilgan faol guruhlar mavjud emas yoki o'quvchilar hali qabul qilinmagan."}
        </p>
        <button
          onClick={loadTeacherData}
          className="mt-6 px-6 py-2.5 bg-emerald-600 text-white font-medium text-sm rounded-xl shadow-sm hover:bg-emerald-700 transition"
        >
          Qaytadan yuklash
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white pt-6 pb-8 px-5 rounded-b-[2rem] shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-2xl">
              👨‍🏫
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">O'qituvchi Jurnali</h1>
              <p className="text-xs text-emerald-100">Davomat va Baholash tizimi</p>
            </div>
          </div>
          <span className="bg-white/20 border border-white/30 text-white px-2.5 py-1 rounded-full text-xs font-semibold">
            {groups.length} ta guruh
          </span>
        </div>

        {/* Group Picker Chips */}
        <div className="mt-4 flex space-x-2 overflow-x-auto pb-1">
          {groups.map((grp) => (
            <button
              key={grp.id}
              onClick={() => handleGroupChange(grp.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedGroupId === grp.id
                  ? 'bg-white text-emerald-800 shadow'
                  : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              {grp.name} • {grp.courseName} ({grp.students.length} o'quvchi)
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 max-w-md mx-auto">
        {/* Active Group Info Card */}
        {currentGroup && (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {currentGroup.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {currentGroup.courseName} • {currentGroup.branchName}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-emerald-600 block">
                  {currentGroup.daysOfWeek}
                </span>
                <span className="text-[11px] text-slate-400">
                  {currentGroup.startTime} - {currentGroup.endTime}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/70 dark:bg-slate-800/70 p-1 rounded-xl">
          <button
            onClick={() => setActiveView('attendance')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeView === 'attendance'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            📋 Kunlik Davomat
          </button>
          <button
            onClick={() => setActiveView('grades')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeView === 'grades'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            ⭐ Baho Qo'yish
          </button>
        </div>

        {/* VIEW 1: Attendance Mode */}
        {activeView === 'attendance' && currentGroup && (
          <div className="space-y-3">
            {/* Date Picker & Quick Actions */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="teacher-attendance-date" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Dars sanasi:
                </label>
                <input
                  id="teacher-attendance-date"
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400">Tezkor tugmalar:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => markAll('PRESENT')}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold rounded-lg hover:bg-emerald-100"
                  >
                    Barchasi Bor
                  </button>
                  <button
                    onClick={() => markAll('ABSENT')}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold rounded-lg hover:bg-rose-100"
                  >
                    Barchasi Yo'q
                  </button>
                </div>
              </div>
            </div>

            {/* Students List with Attendance Toggles */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                Guruh Talabalari ({currentGroup.students.length})
              </h4>

              {currentGroup.students.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Guruhga hali o'quvchilar biriktirilmagan.
                </p>
              ) : (
                <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {currentGroup.students.map((st, index) => {
                    const currentStatus = attendanceMap[st.enrollmentId]?.status || 'PRESENT';

                    return (
                      <div key={st.enrollmentId} className={index > 0 ? 'pt-3' : ''}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                              {st.fullName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {st.phone} {st.averageGrade !== null ? `• O'rtacha: ${st.averageGrade}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* 4 Attendance Status Buttons (44px touch ergonomics) */}
                        <div className="grid grid-cols-4 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setStudentStatus(st.enrollmentId, 'PRESENT')}
                            className={`min-h-[44px] py-2 text-xs font-bold rounded-xl border flex items-center justify-center transition ${
                              currentStatus === 'PRESENT'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            Bor
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentStatus(st.enrollmentId, 'LATE')}
                            className={`min-h-[44px] py-2 text-xs font-bold rounded-xl border flex items-center justify-center transition ${
                              currentStatus === 'LATE'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            Kech
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentStatus(st.enrollmentId, 'EXCUSED')}
                            className={`min-h-[44px] py-2 text-xs font-bold rounded-xl border flex items-center justify-center transition ${
                              currentStatus === 'EXCUSED'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            Sababli
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudentStatus(st.enrollmentId, 'ABSENT')}
                            className={`min-h-[44px] py-2 text-xs font-bold rounded-xl border flex items-center justify-center transition ${
                              currentStatus === 'ABSENT'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            Yo'q
                          </button>
                        </div>

                        {/* Optional small note input if late or excused */}
                        {(currentStatus === 'LATE' || currentStatus === 'EXCUSED') && (
                          <input
                            type="text"
                            aria-label={`${st.fullName} uchun kechikish yoki sabab izohi`}
                            placeholder="Sabab yoki kechikish daqiqasi..."
                            value={attendanceMap[st.enrollmentId]?.notes || ''}
                            onChange={(e) => setStudentNotes(st.enrollmentId, e.target.value)}
                            className="mt-2 w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notification alert */}
            {attendanceSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-xl">
                {attendanceSuccess}
              </div>
            )}

            {/* Save Attendance Button */}
            {currentGroup.students.length > 0 && (
              <button
                disabled={isSavingAttendance}
                onClick={handleSaveAttendance}
                className="w-full py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-emerald-700 active:scale-[0.98] transition flex items-center justify-center space-x-2"
              >
                {isSavingAttendance ? (
                  <span>Saqlanmoqda...</span>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Davomatni Saqlash & Admin Panelga Yuborish</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* VIEW 2: Grades Mode */}
        {activeView === 'grades' && currentGroup && (
          <form onSubmit={handleSaveGrade} className="space-y-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                O'quvchini Baholash
              </h4>

              <div>
                <label htmlFor="grade-student-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Talaba:
                </label>
                <select
                  id="grade-student-select"
                  value={selectedStudentForGrade}
                  onChange={(e) => setSelectedStudentForGrade(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium"
                  required
                >
                  <option value="">-- Talabani tanlang --</option>
                  {currentGroup.students.map((st) => (
                    <option key={st.enrollmentId} value={st.enrollmentId}>
                      {st.fullName} ({st.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="grade-type-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Baho turi:
                  </label>
                  <select
                    id="grade-type-select"
                    value={gradeType}
                    onChange={(e) => setGradeType(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="HOMEWORK">Uyga vazifa</option>
                    <option value="CLASSWORK">Darsdagi faollik</option>
                    <option value="EXAM">Imtihon</option>
                    <option value="QUIZ">Oraliq test</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="grade-score-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    To'plangan Ball:
                  </label>
                  <div className="flex items-center space-x-1">
                    <input
                      id="grade-score-input"
                      type="number"
                      min={0}
                      max={100}
                      value={gradeScore}
                      onChange={(e) => setGradeScore(Number(e.target.value))}
                      className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-indigo-600"
                      required
                    />
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="grade-title-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mavzu / Vazifa nomi:
                </label>
                <input
                  id="grade-title-input"
                  type="text"
                  placeholder="Masalan: Unit 4 Present Perfect Test"
                  value={gradeTitle}
                  onChange={(e) => setGradeTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium"
                  required
                />
              </div>

              <div>
                <label htmlFor="grade-comment-textarea" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Ustoz izohi (ixtiyoriy):
                </label>
                <textarea
                  id="grade-comment-textarea"
                  placeholder="Talabaga tavsiya yoki xatolari haqida izoh..."
                  value={gradeComment}
                  onChange={(e) => setGradeComment(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Notification alert */}
            {gradeSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-xl">
                {gradeSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingGrade}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-md hover:bg-indigo-700 active:scale-[0.98] transition flex items-center justify-center space-x-2"
            >
              {isSavingGrade ? (
                <span>Saqlanmoqda...</span>
              ) : (
                <>
                  <span>⭐</span>
                  <span>Bahoni Saqlash & Talaba Kabinetiga Chiqarish</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TeacherPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <TeacherPortalContent />
    </Suspense>
  );
}
