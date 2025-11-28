// client/pages/TryoutResult.tsx
// ✅ UPDATED: Includes university recommendations in the same page

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { ChevronRight } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { 
  Award, 
  TrendingUp, 
  Target, 
  BookOpen, 
  ArrowRight, 
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Sparkles,
  School,
  MapPin,
  Shield,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  getKategoriName, 
  getThetaColor, 
  getAbilityLabel,
  calculatePercentage,
  getTierBadgeStyle
} from '@/lib/utils';
import Header from '@/components/Header';

interface IRTResult {
  sessionId: string;
  categoryResults: Array<{
    kategoriId: string;
    kategoriName: string;
    ability: {
      theta: number;
      standardError: number;
      percentile: number;
      reliability: number;
      information: number;
    };
    rawScore: number;
    maxScore: number;
    percentage: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
  }>;
  overallAbility: {
    theta: number;
    standardError: number;
    percentile: number;
    reliability: number;
    information: number;
  };
  overallScore: number;
  testStatistics: {
    totalQuestions: number;
    totalCorrect: number;
    totalIncorrect: number;
    totalUnanswered: number;
    averageTheta: number;
    thetaRange: { min: number; max: number };
    testReliability: number;
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  performanceLevel: {
    level: string;
    description: string;
    color: string;
  };
}

interface Recommendation {
  rank: number;
  program: {
    id: string;
    name: string;
    university: string;
    faculty?: string;
    location: string;
    universityType: string;
    akreditasi: string;
  };
  scores: {
    overallMatch: number;
    academicFit: number;
    preferenceFit: number;
    admissionProbability: number;
  };
  tier: 'reach' | 'target' | 'safety';
  reasoning: {
    strengths: string[];
    concerns: string[];
  };
}

export default function TryoutResult() {
  const { tryoutId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  const [result, setResult] = useState<IRTResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [irtReport, setIrtReport] = useState<any>(null);
  const [loadingIRT, setLoadingIRT] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
    const [irtError, setIrtError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);  // ✅ NEW


  useEffect(() => {
    if (sessionId) {
      loadResult();
    } else {
      setError('Session ID tidak ditemukan');
      setLoading(false);
    }
  }, [sessionId]);

  // ✅ NEW: Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserData(user);
          setUserId(user.id);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, []);

  // ✅ FIXED: Calculate IRT & Generate Recommendations
  useEffect(() => {
    const calculateIRTAndRecommendations = async () => {
      // Only run if we have both sessionId and userId
      if (!sessionId || !userData?.id) {  // ✅ CHANGED
        console.log('⏭️ Skipping IRT: missing sessionId or userId');
        return;
      }

      console.log('🔄 Starting IRT calculation for session:', sessionId);
      console.log('👤 User ID:', userData.id);  // ✅ CHANGED

      // ========================================
      // PART 1: Calculate IRT Score
      // ========================================
      try {
        setLoadingIRT(true);
        setIrtError(null);

        // Try to get existing IRT report first
        try {
          console.log('📥 Checking for existing IRT report...');
          const reportData = await api.getIRTReport(sessionId);
          
          if (reportData?.success && reportData?.report) {
            console.log('✅ Found existing IRT report:', reportData.report);
            setIrtReport(reportData.report);
          } else {
            throw new Error('No existing report');
          }
        } catch (error) {
          // If no report exists, calculate new one
          console.log('📊 No existing report found, calculating new IRT score...');
          
          const irtResult = await api.calculateIRTScore(sessionId, userData.id);  // ✅ CHANGED
          
          if (irtResult?.success && irtResult?.report) {
            console.log('✅ IRT calculation complete:', irtResult.report);
            setIrtReport(irtResult.report);
          } else {
            throw new Error('IRT calculation failed - no report returned');
          }
        }

      } catch (error: any) {
        console.error('❌ IRT calculation failed:', error);
        setIrtError(error.message || 'Failed to calculate IRT score');
      } finally {
        setLoadingIRT(false);
      }

      // ========================================
      // PART 2: Generate Recommendations
      // ========================================
      try {
        console.log('🎯 Generating recommendations for user:', userData.id);  // ✅ CHANGED
        setLoadingRecs(true);

        // Generate recommendations
        await api.generateRecommendations(userData.id);  // ✅ CHANGED
        console.log('✅ Recommendation generation triggered');
        
        // Fetch the generated recommendations
        const recsData = await api.getRecommendations(userData.id);  // ✅ CHANGED
        
        if (recsData?.success && recsData?.recommendations) {
          console.log(`✅ Fetched ${recsData.recommendations.length} recommendations`);
          setRecommendations(recsData.recommendations);
        } else {
          console.log('ℹ️ No recommendations available yet');
        }
      } catch (recError: any) {
        console.warn('⚠️ Recommendation generation failed:', recError.message);
        // Don't show error to user - recommendations are optional
      } finally {
        setLoadingRecs(false);
      }
    };

    calculateIRTAndRecommendations();
  }, [sessionId, userData?.id]);  // ✅ CHANGED



  const loadResult = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading IRT result for session:', sessionId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      setUserId(user.id);

      // Try to load existing IRT report
      try {
        const { report } = await api.getIRTReport(sessionId!);
        console.log('✅ Loaded existing IRT report');
        setResult(report);
        
        // Load recommendations after result is loaded
        await loadRecommendations(user.id);
        
      } catch (err: any) {
        // Report doesn't exist, need to calculate
        if (err.message.includes('not found') || err.message.includes('404')) {
          console.log('ℹ️ No existing report, calculating IRT score...');
          await calculateIRTScore(user.id);
        } else {
          throw err;
        }
      }

    } catch (err: any) {
      console.error('❌ Failed to load result:', err);
      setError(err.message || 'Gagal memuat hasil');
    } finally {
      setLoading(false);
    }
  };

  const calculateIRTScore = async (userId: string) => {
    try {
      setCalculating(true);
      console.log('🧮 Calculating IRT score...');

      const { report } = await api.calculateIRTScore(sessionId!, userId);
      
      console.log('✅ IRT calculation complete:', report);
      setResult(report);

      // Load recommendations after calculation
      await loadRecommendations(userId);

    } catch (err: any) {
      console.error('❌ IRT calculation failed:', err);
      throw new Error('Gagal menghitung skor IRT: ' + err.message);
    } finally {
      setCalculating(false);
    }
  };

  const loadRecommendations = async (userId: string) => {
    try {
      setLoadingRecommendations(true);
      console.log('🔄 Loading recommendations...');

      // Try to get existing recommendations
      try {
        const { recommendations: recs } = await api.getRecommendations(userId);
        
        if (recs && recs.length > 0) {
          console.log('✅ Loaded existing recommendations:', recs.length);
          setRecommendations(recs.slice(0, 9)); // Show top 9
        } else {
          // No recommendations exist, generate new ones
          console.log('ℹ️ No recommendations found, generating...');
          await generateRecommendations(userId);
        }
      } catch (err: any) {
        if (err.message.includes('not found') || err.message.includes('404')) {
          await generateRecommendations(userId);
        } else {
          throw err;
        }
      }

    } catch (err: any) {
      console.error('❌ Failed to load recommendations:', err);
      // Don't show error, just hide recommendations section
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const generateRecommendations = async (userId: string) => {
    try {
      console.log('🔄 Generating fresh recommendations...');
      const { recommendations: recs } = await api.generateRecommendations(userId);
      
      if (recs && recs.length > 0) {
        console.log('✅ Generated recommendations:', recs.length);
        setRecommendations(recs.slice(0, 9)); // Show top 9
      }
    } catch (err: any) {
      console.error('❌ Failed to generate recommendations:', err);
      // Silent fail - recommendations are optional
    }
  };

  const handleRefreshRecommendations = async () => {
    if (!userId) return;
    
    setLoadingRecommendations(true);
    try {
      await generateRecommendations(userId);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">
            {calculating ? 'Menghitung skor IRT...' : 'Memuat hasil...'}
          </p>
          {calculating && (
            <p className="text-gray-500 text-sm mt-2">
              Ini mungkin memakan waktu beberapa detik
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Gagal Memuat Hasil
          </h2>
          <p className="text-gray-600 mb-6">{error || 'Data hasil tidak ditemukan'}</p>
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/tryout')}
            >
              Kembali ke Tryout
            </Button>
            <Button onClick={() => window.location.reload()}>
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const visibleCategories = showAllCategories 
    ? result.categoryResults 
    : result.categoryResults.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        userName="Student"
        userPhoto={null}
        activeMenu="tryout"
        variant="default"
      />

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-20">
        
        {/* Hero Score Card */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-12 h-12" />
                  <h1 className="text-5xl font-bold">
                    Persentil {result.overallAbility.percentile}
                  </h1>
                </div>
                <p className="text-blue-100 text-xl mb-2">
                  Kemampuan kamu lebih tinggi dari <span className="font-bold">{result.overallAbility.percentile}%</span> peserta
                </p>
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {result.performanceLevel.level}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-sm text-blue-100 mb-1">Theta Score</p>
                <p className="text-3xl font-bold">{result.overallAbility.theta.toFixed(2)}</p>
                <p className="text-xs text-blue-200 mt-1">
                  {getAbilityLabel(result.overallAbility.theta)}
                </p>
              </div>
              
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-sm text-blue-100 mb-1">Scaled Score</p>
                <p className="text-3xl font-bold">{result.overallScore}</p>
                <p className="text-xs text-blue-200 mt-1">dari 100</p>
              </div>
              
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-sm text-blue-100 mb-1">Jawaban Benar</p>
                <p className="text-3xl font-bold">
                  {result.testStatistics.totalCorrect}
                </p>
                <p className="text-xs text-blue-200 mt-1">
                  dari {result.testStatistics.totalQuestions} soal
                </p>
              </div>
              
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-sm text-blue-100 mb-1">Reliabilitas</p>
                <p className="text-3xl font-bold">
                  {(result.overallAbility.reliability * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-blue-200 mt-1">
                  {result.overallAbility.reliability > 0.8 ? 'Sangat Akurat' : 
                   result.overallAbility.reliability > 0.6 ? 'Cukup Akurat' : 'Perlu Lebih Banyak Data'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Breakdown per Kategori</h2>
            </div>
            
            {result.categoryResults.length > 3 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {showAllCategories ? (
                  <>
                    <ChevronUp className="w-5 h-5" />
                    Tampilkan Lebih Sedikit
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-5 h-5" />
                    Tampilkan Semua ({result.categoryResults.length})
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-5">
            {visibleCategories.map((cat) => (
              <div 
                key={cat.kategoriId}
                className="border-2 border-gray-100 rounded-xl p-5 hover:border-blue-200 transition-all hover:shadow-md"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{cat.kategoriName}</h3>
                    <p className="text-sm text-gray-500">{cat.kategoriId.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-1">
                      Persentil {cat.ability.percentile}
                    </div>
                    <p className="text-xs text-gray-500">
                      {getAbilityLabel(cat.ability.theta)}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Theta</p>
                    <p className="text-xl font-bold" style={{ color: getThetaColor(cat.ability.theta) }}>
                      {cat.ability.theta.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Benar</p>
                    <p className="text-xl font-bold text-green-600">
                      {cat.correctCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Salah</p>
                    <p className="text-xl font-bold text-red-600">
                      {cat.incorrectCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Akurasi</p>
                    <p className="text-xl font-bold text-gray-900">
                      {cat.percentage.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">SE</p>
                    <p className="text-xl font-bold text-gray-600">
                      {cat.ability.standardError.toFixed(3)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 transition-all duration-1000 ease-out"
                    style={{ width: `${cat.ability.percentile}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">0%</span>
                  <span className="text-xs font-medium text-blue-600">
                    {cat.ability.percentile}%
                  </span>
                  <span className="text-xs text-gray-500">100%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Strengths */}
          {result.insights.strengths.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-green-900">Kekuatan Kamu</h3>
              </div>
              <ul className="space-y-3">
                {result.insights.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-green-800">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {result.insights.weaknesses.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-xl text-orange-900">Area Peningkatan</h3>
              </div>
              <ul className="space-y-3">
                {result.insights.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-orange-800">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recommendations Section */}
        {result.insights.recommendations.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-blue-900">Rekomendasi Belajar</h3>
            </div>
            <ul className="space-y-4">
              {result.insights.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="text-blue-800 font-medium">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ✅ NEW: University Recommendations Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <School className="w-7 h-7 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Rekomendasi Kampus untuk Kamu</h2>
            </div>
            
            {recommendations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshRecommendations}
                disabled={loadingRecommendations}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRecommendations ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>

          {loadingRecommendations ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuat rekomendasi kampus...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <School className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Belum ada rekomendasi kampus. Lengkapi preferensi kamu terlebih dahulu.
              </p>
              <Button
                onClick={() => navigate('/preferences')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Atur Preferensi
              </Button>
            </div>
          ) : (
            <>
              {/* Info Banner */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-800">
                  <strong>Rekomendasi otomatis</strong> berdasarkan skor IRT kamu. Menampilkan <strong>Top 9</strong> pilihan terbaik dengan kombinasi Reach, Target, dan Safety schools.
                </p>
              </div>

              {/* Recommendations Grid */}
              <div className="grid gap-4">
                {recommendations.map((rec, index) => {
                  const tierStyle = getTierBadgeStyle(rec.tier);
                  const isTopPick = index === 0;

                  return (
                    <div 
                      key={rec.program.id}
                      className={`
                        rounded-xl p-5 transition-all cursor-pointer
                        ${isTopPick 
                          ? 'bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-400 shadow-md hover:shadow-lg' 
                          : 'bg-gray-50 border-2 border-gray-200 hover:border-purple-300 hover:shadow-md'
                        }
                      `}
                      onClick={() => {
                        // Navigate to program detail or open modal
                        console.log('Selected program:', rec.program.id);
                      }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Rank Badge */}
                        <div className={`
                          flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-md
                          ${isTopPick 
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white' 
                            : 'bg-white text-gray-700 border-2 border-gray-300'
                          }
                        `}>
                          {rec.rank}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Top Pick Badge */}
                          {isTopPick && (
                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold mb-2">
                              <Sparkles className="w-3 h-3" />
                              TOP PICK
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">
                                {rec.program.name}
                              </h3>
                              <p className="text-gray-700 font-medium mb-2">
                                {rec.program.university}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="flex items-center gap-1 text-gray-600">
                                  <MapPin className="w-4 h-4" />
                                  {rec.program.location}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-medium">
                                  {rec.program.universityType}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                  Akreditasi {rec.program.akreditasi}
                                </span>
                              </div>
                            </div>

                            {/* Tier Badge */}
                            <div className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${tierStyle.bg} ${tierStyle.text}`}>
                              {rec.tier.toUpperCase()}
                            </div>
                          </div>

                          {/* Scores Grid */}
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Match</p>
                              <p className="text-lg font-bold text-purple-700">
                                {(rec.scores.overallMatch * 100).toFixed(0)}%
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Academic</p>
                              <p className="text-lg font-bold text-blue-700">
                                {(rec.scores.academicFit * 100).toFixed(0)}%
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Peluang</p>
                              <p className="text-lg font-bold text-green-700">
                                {(rec.scores.admissionProbability * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>

                          {/* Strengths (compact) */}
                          {rec.reasoning.strengths.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {rec.reasoning.strengths.slice(0, 2).map((strength, idx) => (
                                <span 
                                  key={idx}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  {strength.length > 40 ? strength.substring(0, 40) + '...' : strength}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Arrow Icon */}
                        <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 mt-4" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View All Button */}
              {recommendations.length >= 9 && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/recommendations')}
                    className="px-6 py-3"
                  >
                    Lihat Semua Rekomendasi ({recommendations.length}+)
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Test Statistics */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <h3 className="font-bold text-xl text-gray-900 mb-6">Statistik Ujian</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {result.testStatistics.totalQuestions}
              </p>
              <p className="text-sm text-gray-600">Total Soal</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                {result.testStatistics.totalCorrect}
              </p>
              <p className="text-sm text-gray-600">Benar</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">
                {result.testStatistics.totalIncorrect}
              </p>
              <p className="text-sm text-gray-600">Salah</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {result.overallAbility.reliability > 0.8 ? 'A' :
                 result.overallAbility.reliability > 0.6 ? 'B' : 'C'}
              </p>
              <p className="text-sm text-gray-600">Reliabilitas</p>
            </div>
          </div>

          {/* Theta Range Visualization */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">Rentang Kemampuan (Theta Scale)</p>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 w-16">
                {result.testStatistics.thetaRange.min.toFixed(1)}
              </span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full relative">
                {/* Background scale markers */}
                <div className="absolute inset-0 flex justify-between px-1">
                  {[-3, -2, -1, 0, 1, 2, 3].map(val => (
                    <div key={val} className="w-px h-full bg-gray-300" />
                  ))}
                </div>
                {/* Actual range */}
                <div 
                  className="bg-gradient-to-r from-blue-400 via-green-400 to-blue-500"
                  style={{
                    left: `${((result.testStatistics.thetaRange.min + 3) / 6) * 100}%`,
                    width: `${((result.testStatistics.thetaRange.max - result.testStatistics.thetaRange.min) / 6) * 100}%`
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600 w-16 text-right">
                {result.testStatistics.thetaRange.max.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between mt-2 px-16">
              <span className="text-xs text-gray-500">-3 (Rendah)</span>
              <span className="text-xs text-gray-500">0 (Rata-rata)</span>
              <span className="text-xs text-gray-500">+3 (Tinggi)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate('/tryout')}
            className="px-8 py-3 text-base"
            size="lg"
          >
            Lihat Tryout Lainnya
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-base"
            size="lg"
          >
            Kembali ke Dashboard
          </Button>
        </div>

      </main>
    </div>
  );
}
