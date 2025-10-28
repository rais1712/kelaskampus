// src/main.tsx

import "./global.css";
import { Toaster as Toaster1 } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";

import Index from "./pages/Index";
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ IMPORT
import AuthCallback from "./pages/AuthCallback";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/adminDashboard";
import AdminUser from "./pages/admin/AdminUser";
import AdminTransaksi from "./pages/admin/adminPaketTransaksi";
import AdminTryout from "./pages/admin/adminTryout";
import AddTryoutPage from "./pages/admin/AddTryout";
import AddQuestionPage from "./pages/admin/AddQuestionPage";
import ViewTryout from "./pages/admin/ViewTryout";
import EditTryout from "./pages/admin/EditTryout";
import Profile from "./pages/Profile";
import AdminPengaturan from "./pages/admin/AdminPengaturan";
import TryoutList from "./pages/TryoutList";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const App = () => (
  <GoogleOAuthProvider clientId={googleClientId}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster1 />
        <Sonner />
        <Toaster position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* ✅ Student Dashboard (Protected - Siswa Only) */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="siswa">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* ✅ Siswa Routes */}
            <Route 
              path="/tryouts" 
              element={
                <ProtectedRoute requiredRole="siswa">
                  <TryoutList />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/profile" 
              element={
                <ProtectedRoute requiredRole="siswa">
                  <Profile />
                </ProtectedRoute>
              } 
            />

            {/* ✅ TAMBAH ROUTE INI - Tryout Session Routes */}
            <Route 
              path="/tryout/:id/start" 
              element={
                <ProtectedRoute requiredRole="siswa">
                  <div className="min-h-screen flex items-center justify-center bg-[#EFF6FB]">
                    <div className="text-center max-w-md mx-auto p-8">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#295782] to-[#1E3A5F] rounded-full flex items-center justify-center">
                        <span className="text-2xl text-white">📝</span>
                      </div>
                      <h2 className="text-2xl font-bold text-[#1D293D] mb-4">
                        Tryout Session
                      </h2>
                      <p className="text-[#64748B] mb-8">
                        Halaman soal tryout sedang dalam tahap pengembangan. 
                        Fitur ini akan segera tersedia!
                      </p>
                      <button
                        onClick={() => window.history.back()}
                        className="bg-[#295782] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#1E3A5F] transition-colors"
                      >
                        Kembali ke Daftar Tryout
                      </button>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/tryout/:id" 
              element={
                <ProtectedRoute requiredRole="siswa">
                  <div className="min-h-screen flex items-center justify-center bg-[#EFF6FB]">
                    <div className="text-center max-w-md mx-auto p-8">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#16A34A] to-[#15803D] rounded-full flex items-center justify-center">
                        <span className="text-2xl text-white">📊</span>
                      </div>
                      <h2 className="text-2xl font-bold text-[#1D293D] mb-4">
                        Detail Tryout
                      </h2>
                      <p className="text-[#64748B] mb-8">
                        Halaman detail tryout sedang dalam tahap pengembangan. 
                        Fitur ini akan segera tersedia!
                      </p>
                      <button
                        onClick={() => window.history.back()}
                        className="bg-[#16A34A] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#15803D] transition-colors"
                      >
                        Kembali ke Daftar Tryout
                      </button>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />

            {/* ✅ Admin Routes (Protected - Admin Only) */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-users" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUser />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-transaksi" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminTransaksi />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminTryout />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout/new" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AddTryoutPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout/:tryoutId/:kategoriId/questions/new" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AddQuestionPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout/view/:id" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ViewTryout />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-tryout/edit/:id" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <EditTryout />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-pengaturan" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPengaturan />
                </ProtectedRoute>
              } 
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>r
  
  </GoogleOAuthProvider>
);

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

export default App;
