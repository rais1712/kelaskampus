import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import { mockPackages, Package } from '@/lib/mockPackageData';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase'; // Uncomment untuk real API

export default function PackageList() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
  loadPackages();
  loadUserData(); 
}, []);

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


  const loadPackages = async () => {
    try {
      setIsLoading(true);

      // ✅ MOCK DATA - Development Only
      // Uncomment untuk real API:
      // const { data, error } = await supabase
      //   .from('packages')
      //   .select('*')
      //   .order('price', { ascending: true });
      // if (error) throw error;
      // setPackages(data || []);

      // Mock delay untuk simulate loading
      await new Promise(resolve => setTimeout(resolve, 500));
      setPackages(mockPackages);

    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Gagal memuat paket');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyPackage = (pkg: Package) => {
    navigate(`/packages/${pkg.id}/checkout`, { state: { package: pkg } });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EFF6FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Memuat paket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFF6FB]">
      {/* Header */}
      <Header 
        userName={currentUser?.nama || "User"}
        activeMenu="package"
        variant="default"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1E293B] mb-3">
            Pilih Paket Belajarmu
          </h1>
          <p className="text-base text-[#64748B] max-w-2xl mx-auto">
            Tingkatkan persiapan UTBK-mu dengan paket tryout premium. Pilih paket yang sesuai dengan kebutuhanmu!
          </p>
        </div>

        {/* Package Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id}
              className={`relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 flex flex-col ${
                pkg.is_popular ? 'ring-2 ring-[#295782] scale-105' : ''
              }`}
            >
              {/* Popular Badge */}
              {pkg.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-[#295782] to-[#1e4060] text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Paling Populer
                  </div>
                </div>
              )}

              {/* Package Header */}
              <div className="text-center mb-6 pt-2">
                <h3 className="text-xl font-bold text-[#1E293B] mb-2">
                  {pkg.name}
                </h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm text-[#89B0C7] font-medium">
                    {pkg.tryout_count}x TryOut Premium
                  </span>
                </div>
                
                {/* Price */}
                <div className="mb-1">
                  <div className="text-sm text-[#94A3B8] line-through">
                    {formatPrice(pkg.original_price)}
                  </div>
                  <div className="text-3xl font-bold text-[#1E293B]">
                    {formatPrice(pkg.price)}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 mb-6"></div>

              {/* Benefits List */}
              <div className="flex-grow mb-6">
                <ul className="space-y-3">
                  {pkg.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#475569]">
                      <div className="mt-0.5 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                          <Check className="w-3 h-3 text-[#16A34A]" />
                        </div>
                      </div>
                      <span className="leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Buy Button */}
              <Button
                onClick={() => handleBuyPackage(pkg)}
                className={`w-full py-6 text-base font-semibold rounded-xl transition-all shadow-md hover:shadow-lg ${
                  pkg.is_popular 
                    ? 'bg-gradient-to-r from-[#295782] to-[#1e4060] hover:from-[#1e4060] hover:to-[#295782]' 
                    : 'bg-[#295782] hover:bg-[#1e4060]'
                }`}
              >
                Beli
              </Button>
            </Card>
          ))}
        </div>

        {/* FAQ atau Info Tambahan */}
        <div className="mt-16 text-center">
          <p className="text-sm text-[#64748B]">
            Butuh bantuan memilih paket? 
            <button className="ml-1 text-[#295782] hover:underline font-medium">
              Hubungi kami
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-[#64748B]">
          © 2025 Kelas Kampus - Tryout Indonesia. Semua hak cipta dilindungi.
        </div>
      </footer>
    </div>
  );
}
