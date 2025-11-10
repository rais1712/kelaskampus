import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Check, CheckCircle2, Wallet, Building2, CreditCard, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Header from '@/components/Header';
import { Package } from '@/lib/mockPackageData';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase'; // Uncomment untuk real API

export default function PackageCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const packageData = location.state?.package as Package;

  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Payment Methods Configuration
  const paymentMethods = [
    {
      id: 'e_wallet',
      name: 'E-Wallet (OVO, GoPay, DANA, ShopeePay)',
      icon: <Wallet className="w-5 h-5 text-[#295782]" />,
      bgColor: 'bg-[#295782]/10'
    },
    {
      id: 'bank_transfer',
      name: 'Transfer Bank (BCA, Mandiri, BNI, BRI)',
      icon: <Building2 className="w-5 h-5 text-[#295782]" />,
      bgColor: 'bg-[#295782]/10'
    },
    {
      id: 'virtual_account',
      name: 'Virtual Account',
      icon: <CreditCard className="w-5 h-5 text-[#295782]" />,
      bgColor: 'bg-[#295782]/10'
    },
    {
      id: 'saldo_kampus',
      name: 'Saldo Kelas Kampus',
      icon: <Coins className="w-5 h-5 text-[#295782]" />,
      bgColor: 'bg-[#295782]/10'
    }
  ];

  useEffect(() => {
    if (!packageData) {
      toast.error('Data paket tidak ditemukan');
      navigate('/packages');
      return;
    }
    loadUserData();
  }, [packageData, navigate]);

  const loadUserData = async () => {
  try {
    // ✅ REAL USER DATA dari Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // OAuth user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("user_id, nama_lengkap, email, photo_profile")
          .eq("auth_id", authUser.id)
          .single();

        if (userData) {
          setCurrentUser({
            user_id: userData.user_id,
            nama: userData.nama_lengkap || authUser.user_metadata?.nama_lengkap || authUser.email?.split("@")[0] || "User",
            email: userData.email || authUser.email,
            photo: userData.photo_profile
          });
          return;
        }
      }
    } else {
      // Token-based user
      const token = localStorage.getItem("auth_token");
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        const { data: userData } = await supabase
          .from("users")
          .select("user_id, nama_lengkap, email, photo_profile")
          .eq("user_id", payload.user_id)
          .single();

        if (userData) {
          setCurrentUser({
            user_id: userData.user_id,
            nama: userData.nama_lengkap || payload.nama_lengkap || payload.email?.split("@")[0] || "User",
            email: userData.email || payload.email,
            photo: userData.photo_profile
          });
          return;
        }
      }
    }

    // Fallback
    setCurrentUser({
      user_id: "temp-id",
      nama: "User",
      email: "user@example.com",
      photo: null
    });

  } catch (error) {
    console.error('Error loading user data:', error);
    setCurrentUser({
      user_id: "temp-id",
      nama: "User",
      email: "user@example.com",
      photo: null
    });
  }
};


  const calculateDiscount = () => {
    return packageData.original_price - packageData.price;
  };

  const calculateDiscountPercentage = () => {
    return Math.round((calculateDiscount() / packageData.original_price) * 100);
  };

  const handleSubmit = async () => {
  if (!paymentMethod) {
    toast.error('Pilih metode pembayaran terlebih dahulu');
    return;
  }

  if (!agreeTerms) {
    toast.error('Anda harus menyetujui Syarat & Ketentuan');
    return;
  }

  try {
    setIsSubmitting(true);

    const transactionData = {
      id: `trx-${Date.now()}`,
      user_id: currentUser.user_id,
      user_name: currentUser.nama,
      user_email: currentUser.email,
      package_id: packageData.id,
      package_name: packageData.name,
      package_price: packageData.price,
      original_price: packageData.original_price,
      discount: calculateDiscount(),
      payment_method: paymentMethod,
      amount: packageData.price,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // ✅ Save transaction to localStorage
    const existingTransactions = JSON.parse(localStorage.getItem('package_transactions') || '[]');
    existingTransactions.push(transactionData);
    localStorage.setItem('package_transactions', JSON.stringify(existingTransactions));

    // ✅ IMPORTANT: Save current transaction ID untuk Payment Instruction page
    localStorage.setItem('current_transaction', JSON.stringify({
      transaction: transactionData,
      paymentMethod,
      packageData
    }));

    toast.success('Transaksi berhasil dibuat! Silakan lakukan pembayaran.');
    
    // ✅ Navigate dengan state DAN localStorage backup
    setTimeout(() => {
      navigate('/packages/payment-instruction', { 
        state: { 
          transaction: transactionData,
          paymentMethod,
          packageData
        } 
      });
    }, 1500);

  } catch (error) {
    console.error('Checkout error:', error);
    toast.error('Gagal memproses transaksi');
  } finally {
    setIsSubmitting(false);
  }
};




  const handleCancel = () => {
    if (confirm('Batalkan transaksi ini?')) {
      navigate('/packages');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!packageData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#EFF6FB]">
      <Header 
        userName={currentUser?.nama || "User"}
        activeMenu="package"
        variant="default"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2">
            Transaksi Paket
          </h1>
          <p className="text-sm text-[#64748B]">
            Selesaikan pembayaran untuk mengaktifkan paket tryout Anda
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Payment Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Package Selected Card */}
            <Card className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-[#1E293B] mb-4">
                Paket yang Dipilih
              </h2>

              <div className="flex items-start gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-gray-200">
                <div className="w-12 h-12 rounded-lg bg-[#295782] flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-[#1E293B] mb-1">
                    {packageData.name}
                  </h3>
                  <p className="text-sm text-[#64748B] mb-3">
                    Akses {packageData.tryout_count} tryout premium + analisis mendalam
                  </p>

                  {/* Price Info */}
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm text-[#94A3B8] line-through">
                      {formatPrice(packageData.original_price)}
                    </span>
                    <span className="text-xl font-bold text-[#295782]">
                      {formatPrice(packageData.price)}
                    </span>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                      -{calculateDiscountPercentage()}% OFF
                    </span>
                  </div>

                  {/* Quick Benefits */}
                  <div className="mt-3 space-y-1">
                    {packageData.benefits.slice(0, 3).map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#475569]">
                        <Check className="w-3 h-3 text-[#16A34A] mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Method Card */}
            <Card className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-[#1E293B] mb-4">
                Pilih Metode Pembayaran
              </h2>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="relative">
                      <RadioGroupItem 
                        value={method.id} 
                        id={method.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={method.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          paymentMethod === method.id
                            ? 'border-[#295782] bg-[#F0F7FF] shadow-sm'
                            : 'border-gray-200 hover:border-[#89B0C7] hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${method.bgColor} flex items-center justify-center flex-shrink-0`}>
                          {method.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#1E293B] leading-tight">
                            {method.name}
                          </p>
                        </div>
                        {paymentMethod === method.id && (
                          <div className="w-5 h-5 rounded-full bg-[#295782] flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </Card>
          </div>

          {/* Right: Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
              <h3 className="text-lg font-bold text-[#1E293B] mb-4">
                Detail Transaksi
              </h3>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">Harga Paket</span>
                  <span className="text-sm font-medium text-[#1E293B]">
                    {formatPrice(packageData.original_price)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#16A34A] font-medium">
                    Diskon ({calculateDiscountPercentage()}%)
                  </span>
                  <span className="text-sm font-medium text-[#16A34A]">
                    -{formatPrice(calculateDiscount())}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">Biaya Lainnya</span>
                  <span className="text-sm font-medium text-[#1E293B]">
                    Rp 0
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-[#1E293B]">
                      Total Pembayaran
                    </span>
                    <span className="text-2xl font-bold text-[#295782]">
                      {formatPrice(packageData.price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="mb-6">
                <div className="flex items-start gap-2 p-3 bg-[#F8FAFC] rounded-lg">
                  <Checkbox
                    id="terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-xs text-[#475569] leading-relaxed cursor-pointer">
                    Saya setuju dengan{' '}
                    <a href="#" className="text-[#295782] hover:underline font-medium">
                      Syarat & Ketentuan
                    </a>
                    {' '}yang berlaku
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!paymentMethod || !agreeTerms || isSubmitting}
                  className="w-full py-6 bg-[#295782] hover:bg-[#1e4060] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Memproses...' : 'Bayar Sekarang'}
                </Button>

                <Button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  variant="outline"
                  className="w-full py-6 border-gray-300 text-[#64748B] hover:bg-gray-50 font-medium rounded-xl transition-all"
                >
                  Batal / Kembali
                </Button>
              </div>

              {/* Security Note */}
              <div className="mt-6 text-center">
                <p className="text-xs text-[#64748B] flex items-center justify-center gap-1">
                  🔒 Transaksi Anda dijamin aman & terenkripsi.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#64748B]">
            <p>© 2025 Kelas Kampus. Semua hak cipta dilindungi.</p>
            <div className="flex items-center gap-6">
              <button className="hover:text-[#295782] transition-colors">Bantuan</button>
              <button className="hover:text-[#295782] transition-colors">Kebijakan Privasi</button>
              <button className="hover:text-[#295782] transition-colors">Syarat Layanan</button>
              <button className="hover:text-[#295782] transition-colors">Kontak</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
