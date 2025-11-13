# 📝 Perubahan Kode - Before & After

## File 1: TryoutExam.tsx

### Change 1: Remove showSubmitModal State
```typescript
// BEFORE (Line 20-23)
const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
const [showSubmitModal, setShowSubmitModal] = useState(false);  // ← REMOVED
const [showSidebar, setShowSidebar] = useState(false);
const [currentUser, setCurrentUser] = useState<any>(null);

// AFTER (Line 20-22)
const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
const [showSidebar, setShowSidebar] = useState(false);
const [currentUser, setCurrentUser] = useState<any>(null);
```

### Change 2: Update handleAutoSubmit
```typescript
// BEFORE (Line 76-83)
const handleAutoSubmit = async () => {
  toast.error('Waktu habis! Subtest akan disubmit otomatis.');
  try {
    await submitExam();
    setShowSubmitModal(true); // Show modal instead of auto-navigate
  } catch (err) {
    console.error('Auto submit error:', err);
  }
};

// AFTER (Line 76-90)
const handleAutoSubmit = async () => {
  toast.error('Waktu habis! Subtest akan disubmit otomatis.');
  try {
    await submitExam();
    // Langsung kembali ke TryoutStart, tanpa modal
    setTimeout(() => {
      navigate(`/tryout/${tryoutId}/start`);
    }, 1000);
  } catch (err) {
    console.error('Auto submit error:', err);
  }
};
```

### Change 3: Update handleManualSubmit
```typescript
// BEFORE (Line 85-93)
const handleManualSubmit = async () => {
  try {
    await submitExam();
    toast.success('Subtest berhasil disubmit!');
    setShowSubmitModal(true); // Show modal with options
  } catch (err) {
    toast.error('Gagal submit subtest');
  }
};

// AFTER (Line 92-103)
const handleManualSubmit = async () => {
  try {
    await submitExam();
    toast.success('Subtest berhasil disubmit!');
    // Langsung kembali ke TryoutStart, tanpa modal
    setTimeout(() => {
      navigate(`/tryout/${tryoutId}/start`);
    }, 500);
  } catch (err) {
    toast.error('Gagal submit subtest');
  }
};
```

### Change 4: Remove Submit Modal JSX
```typescript
// BEFORE (Line 467-512)
{showSubmitModal && (
  <>
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40"
      onClick={() => setShowSubmitModal(false)}
    />
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">Subtest Selesai!</h3>
        <p className="text-gray-600 mb-6">
          Apa yang ingin Anda lakukan selanjutnya?
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setShowSubmitModal(false);
              navigate(`/tryout/${tryoutId}/start`);
            }}
            className="px-4 py-2.5 border-2 border-[#295782] text-[#295782] rounded-xl hover:bg-blue-50 font-medium transition-colors"
          >
            ← Kembali ke Daftar Subtest
          </button>
          <button
            onClick={() => {
              setShowSubmitModal(false);
              navigate(`/tryout/${tryoutId}/result?session=${sessionId}`);
            }}
            className="px-4 py-2.5 bg-[#295782] text-white rounded-xl hover:bg-[#1e3f5f] font-medium transition-colors"
          >
            👁️ Lihat Hasil
          </button>
        </div>
      </div>
    </div>
  </>
)}

// AFTER (Line 467-468)
{/* ✅ REMOVED: Submit Result Modal - User now goes directly back to TryoutStart */}
```

---

## File 2: TryoutStart.tsx

### Change 1: Add New States
```typescript
// BEFORE (Line 23-26)
const [showTargetModal, setShowTargetModal] = useState(false);
const [isStarting, setIsStarting] = useState(false);
const [lastSessionId, setLastSessionId] = useState<string | null>(null);
const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
const [kategorisWithDetails, setKategorisWithDetails] = useState<any[]>([]);

// AFTER (Line 23-29)
const [showTargetModal, setShowTargetModal] = useState(false);
const [isStarting, setIsStarting] = useState(false);
const [lastSessionId, setLastSessionId] = useState<string | null>(null);
const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
const [kategorisWithDetails, setKategorisWithDetails] = useState<any[]>([]);
const [completedSubtests, setCompletedSubtests] = useState<Set<string>>(new Set());
const [isSubmittingAll, setIsSubmittingAll] = useState(false);
```

### Change 2: Add Fetch Completed Subtests Logic
```typescript
// AFTER (NEW - Line 118-143)
// ✅ NEW: Fetch completed subtests in current session
useEffect(() => {
  const fetchCompletedSubtests = async () => {
    if (!currentUser || !tryoutId || !activeSessionId) return;

    try {
      const { data: answers } = await supabase
        .from('answers')
        .select('kategori_id')
        .eq('session_id', activeSessionId);

      if (answers && answers.length > 0) {
        const uniqueKategoris = new Set<string>();
        answers.forEach(a => {
          if (a.kategori_id) {
            uniqueKategoris.add(a.kategori_id);
          }
        });
        setCompletedSubtests(uniqueKategoris);
        console.log('✅ Completed subtests in session:', Array.from(uniqueKategoris));
      }
    } catch (error) {
      console.error('Error fetching completed subtests:', error);
    }
  };

  fetchCompletedSubtests();
}, [currentUser, tryoutId, activeSessionId]);
```

### Change 3: Add handleSubmitAll Function
```typescript
// AFTER (NEW - Line 227-272)
// ✅ NEW: Handle Submit All Tryout
const handleSubmitAll = async () => {
  if (!activeSessionId) {
    toast.error('Session tidak valid');
    return;
  }

  try {
    setIsSubmittingAll(true);

    // Mark session as 'completed'
    const { error } = await supabase
      .from('tryout_sessions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', activeSessionId);

    if (error) {
      throw error;
    }

    toast.success('Semua subtest berhasil disubmit!');
    setLastSessionId(activeSessionId);

    // Navigate to result
    setTimeout(() => {
      navigate(`/tryout/${tryoutId}/result?session=${activeSessionId}`);
    }, 500);

  } catch (err) {
    console.error('Error submitting all:', err);
    toast.error('Gagal submit semua subtest');
  } finally {
    setIsSubmittingAll(false);
  }
};
```

### Change 4: Add Submit All Button UI
```typescript
// AFTER (NEW - Line 391-417)
{/* Submit All Button - Tampil jika ada subtests yang sudah dikerjakan */}
{completedSubtests.size > 0 && !lastSessionId && (
  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-2xl shadow-sm p-6">
    <div className="mb-4">
      <h2 className="text-base font-bold text-green-900 mb-1">Siap Submit?</h2>
      <p className="text-sm text-green-700">
        Anda telah mengerjakan {completedSubtests.size} subtest
      </p>
    </div>
    <button
      onClick={handleSubmitAll}
      disabled={isSubmittingAll}
      className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
    >
      {isSubmittingAll ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Submitting...
        </>
      ) : (
        <>
          ✅ Submit Semua Subtest
        </>
      )}
    </button>
  </div>
)}
```

---

## Summary of Changes

| Component | Change | Line(s) | Type |
|-----------|--------|---------|------|
| TryoutExam.tsx | Remove showSubmitModal state | 23 | Delete |
| TryoutExam.tsx | Update handleAutoSubmit | 76-90 | Modify |
| TryoutExam.tsx | Update handleManualSubmit | 92-103 | Modify |
| TryoutExam.tsx | Remove modal JSX | 467-512 | Delete |
| TryoutStart.tsx | Add completedSubtests state | 25 | Add |
| TryoutStart.tsx | Add isSubmittingAll state | 26 | Add |
| TryoutStart.tsx | Add fetchCompletedSubtests useEffect | 118-143 | Add |
| TryoutStart.tsx | Add handleSubmitAll function | 227-272 | Add |
| TryoutStart.tsx | Add Submit All button UI | 391-417 | Add |

---

## Lines of Code

- **Deleted:** ~45 lines (modal + state)
- **Added:** ~130 lines (tracking + submit logic + UI)
- **Modified:** ~35 lines (submit handlers)
- **Total Net Change:** +120 lines

---

## Files Not Changed

- ✅ `TryoutResult.tsx` - Already works with aggregate data
- ✅ `useExamSession.tsx` - No changes needed
- ✅ `useTryoutData.tsx` - No changes needed
- ✅ `SubtestList.tsx` - No changes needed

---

## Testing these changes

1. Open TryoutStart
2. Click "Mulai" on Subtest 1
3. Verify: No modal after submit, direct back to TryoutStart
4. Verify: "Submit All" button appears with count
5. Repeat for Subtest 2 & 3
6. Verify: Counter updates (1 → 2 → 3)
7. Click "Submit All"
8. Verify: Navigate to TryoutResult
9. Verify: Aggregated score shown (75/100, 50 soal)
10. Go back to TryoutStart
11. Verify: "View Results" button appears

---

**Implementation Date:** November 12, 2025
**Status:** ✅ READY FOR TESTING
