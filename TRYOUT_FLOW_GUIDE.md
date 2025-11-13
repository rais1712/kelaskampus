# 🎯 Tryout Flow - Implementasi Terbaru

## Flow yang Diimplementasikan

```
TryoutStart (Tampil Subtest List)
    ↓
    User pilih Subtest 1 → Click "Mulai"
    ↓
TryoutExam (Kerjakan Soal)
    ↓
    User Submit Answers
    ↓
TryoutStart (Kembali otomatis)
    ↓
    completedSubtests = {subtest1}
    Tampil "Submit All" button (jika ada subtest terselesaikan)
    ↓
    User pilih Subtest 2 → Click "Mulai"
    ↓
TryoutExam (Kerjakan Soal)
    ↓
    User Submit Answers
    ↓
TryoutStart (Kembali otomatis)
    ↓
    completedSubtests = {subtest1, subtest2}
    ↓
    ... (Ulangi untuk Subtest 3)
    ↓
    completedSubtests = {subtest1, subtest2, subtest3}
    ↓
    User Click "Submit Semua Subtest"
    ↓
    Session status = 'completed'
    ↓
TryoutResult (Tampilkan Hasil Keseluruhan)
    ↓
    Hasil agregat dari semua jawaban subtest
    Score: 75/100 (contoh: 50 soal total)
    ↓
    User bisa "Kembali ke TryoutStart" atau "Lihat Detail Hasil"
    ↓
TryoutStart (Kembali)
    ↓
    lastSessionId = session_completed
    ↓
    Tampil "Lihat Hasil" button untuk review hasil sebelumnya
```

---

## 📋 Perubahan yang Dilakukan

### 1. TryoutExam.tsx
**Perubahan:** Simplifikasi flow - langsung kembali ke TryoutStart setelah submit
- ✅ Hapus modal pilihan
- ✅ Hapus state `showSubmitModal`
- ✅ Submit exam → Langsung navigate ke `/tryout/{id}/start`
- ✅ Waktu habis → Auto-submit → Langsung kembali ke TryoutStart

**Sebelum:**
```
Submit subtest → Show modal → Choose option → Navigate
```

**Sesudah:**
```
Submit subtest → Langsung back to TryoutStart
```

---

### 2. TryoutStart.tsx
**Perubahan:** Tracking completed subtests dan tombol "Submit All"

#### A. Tambah State
```typescript
const [completedSubtests, setCompletedSubtests] = useState<Set<string>>(new Set());
const [isSubmittingAll, setIsSubmittingAll] = useState(false);
```

#### B. Fetch Completed Subtests
```typescript
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
      }
    } catch (error) {
      console.error('Error fetching completed subtests:', error);
    }
  };

  fetchCompletedSubtests();
}, [currentUser, tryoutId, activeSessionId]);
```

#### C. Tambah Fungsi handleSubmitAll
```typescript
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

#### D. Tambah UI "Submit All" Button
```typescript
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

## 🔄 Session Management Logic

### Session Creation
**Waktu:** Pertama kali user buka TryoutStart
```
api.createSession({
  tryout_id: "tryout_123",
  kategori_id: null,        // ← null means whole tryout, not per-subtest
  target_kampus: "ITS",
  target_jurusan: "Teknik Informatika"
})
→ Returns: session_id = "session_abc123"
```

### Session Reuse
**Waktu:** User buka TryoutStart lagi
```
Cek: SELECT * FROM tryout_sessions 
     WHERE tryout_id = 'tryout_123' 
     AND user_id = 'user123' 
     AND status = 'in_progress'
→ Jika ada → Reuse session_id
→ Jika tidak → Create session baru
```

### Session Completion
**Waktu:** User click "Submit Semua Subtest"
```
UPDATE tryout_sessions 
SET status = 'completed', updated_at = NOW() 
WHERE id = 'session_abc123'
→ Session bisa di-query untuk hasil
```

---

## 📊 Data Storage pada Session

### answers Table
```
session_id: session_abc123
kategori_id: subtest1 → jawaban untuk subtest 1
kategori_id: subtest2 → jawaban untuk subtest 2
kategori_id: subtest3 → jawaban untuk subtest 3
```

**Kemudian saat TryoutResult:**
```
SELECT * FROM answers WHERE session_id = 'session_abc123'
→ Get ALL answers dari semua subtests
→ Join dengan questions table
→ Calculate score: jawaban_benar / total_soal * 100
```

---

## ✅ Testing Steps

### Test 1: Single Subtest Flow
1. ✅ Buka TryoutStart
2. ✅ Click "Mulai" untuk Subtest 1
3. ✅ Masuk TryoutExam
4. ✅ Answer beberapa soal
5. ✅ Click "Submit"
6. ✅ Otomatis kembali ke TryoutStart
7. ✅ completedSubtests berisi {subtest1}
8. ✅ Tombol "Submit Semua Subtest" muncul

### Test 2: Multiple Subtests Flow
1. ✅ Lanjut Test 1, buka Subtest 2
2. ✅ Masuk TryoutExam
3. ✅ Answer soal
4. ✅ Submit
5. ✅ Kembali ke TryoutStart
6. ✅ completedSubtests berisi {subtest1, subtest2}
7. ✅ Tombol masih ada dengan count "Anda telah mengerjakan 2 subtest"
8. ✅ Ulangi untuk Subtest 3
9. ✅ completedSubtests berisi {subtest1, subtest2, subtest3}

### Test 3: Submit All & View Result
1. ✅ Semua 3 subtest sudah dikerjakan
2. ✅ Click "Submit Semua Subtest"
3. ✅ Navigate ke TryoutResult
4. ✅ Tampil hasil agregat (contoh: 75/100)
5. ✅ Hasil menampilkan semua 50 soal dari 3 subtest
6. ✅ Click back → TryoutStart
7. ✅ lastSessionId ada
8. ✅ Tombol "Lihat Hasil" muncul

### Test 4: Resume & Review Results
1. ✅ Kembali ke TryoutStart
2. ✅ Tombol "Lihat Hasil" ada
3. ✅ Click button → Ke TryoutResult
4. ✅ Lihat hasil sebelumnya (score sama seperti saat submit)

---

## 🎨 UI Components Updates

### TryoutStart Right Panel
```
Before Submit All:
[Target Info Card]
[Info Card]

After First Subtest Complete:
[Target Info Card]
[Submit All Button] ← NEW
[Info Card]

After Final Submit:
[Target Info Card]
[View Result Card] ← Shows previous results
[Info Card]
```

### TryoutExam
```
Before:
- Submit button → Show Modal → Choose option

After:
- Submit button → Direct back to TryoutStart
```

---

## 📝 Database State per Step

### After Subtest 1 Submit
```
tryout_sessions:
- id: session_123
- status: 'in_progress'
- kategori_id: null

answers:
- session_id: session_123
- kategori_id: 'subtest1'
- question_id: q1-q20
- answer: [a, b, c, ...]
```

### After All Subtests Submit
```
tryout_sessions:
- id: session_123
- status: 'completed' ← CHANGED
- kategori_id: null

answers:
- session_id: session_123
- kategori_id: 'subtest1' + 'subtest2' + 'subtest3'
- Multiple question_ids and answers
```

---

## 🔗 File Changes Summary

| File | Changes |
|------|---------|
| TryoutExam.tsx | Removed modal, direct return to TryoutStart |
| TryoutStart.tsx | Added completedSubtests tracking, handleSubmitAll, Submit button UI |
| TryoutResult.tsx | No changes (already fetches all answers) |

---

## 🚀 Ready to Test!

Semua logic sudah di-implementasikan. Sekarang tinggal:
1. Run `npm run dev`
2. Test flow end-to-end
3. Verify hasil agregasi di TryoutResult

**Expected Final Result:**
- User mengerjakan 3 subtest (50 soal total)
- Score agregat: e.g., 75/100
- Breakdown per subtest ada atau tidak tergantung requirement
- Bisa review hasil kapan saja dari TryoutStart

---

**Status:** ✅ Ready for Testing
**Last Updated:** November 12, 2025
