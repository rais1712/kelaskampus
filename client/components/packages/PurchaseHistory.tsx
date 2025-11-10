import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Package, Calendar, CreditCard } from 'lucide-react';

interface Transaction {
  id: string;
  package_name: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}

export default function PurchaseHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);

      // ✅ MOCK - Load from localStorage
      const savedTransactions = JSON.parse(localStorage.getItem('package_transactions') || '[]');
      setTransactions(savedTransactions);

      /* 
      // ✅ REAL API - Uncomment untuk production:
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      */

    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      success: { label: 'Berhasil', className: 'bg-green-100 text-green-700' },
      failed: { label: 'Gagal', className: 'bg-red-100 text-red-700' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge className={`${config.className} text-xs font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#295782]"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="bg-white rounded-2xl shadow-sm p-12 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#1E293B] mb-2">
          Belum Ada Transaksi
        </h3>
        <p className="text-sm text-[#64748B]">
          Anda belum melakukan pembelian paket. Mulai belajar sekarang!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <Card key={transaction.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#295782]/10 flex items-center justify-center mt-1">
                <Package className="w-5 h-5 text-[#295782]" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#1E293B] mb-1">
                  {transaction.package_name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(transaction.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    {transaction.payment_method.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            {getStatusBadge(transaction.status)}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-sm text-[#64748B]">Total Pembayaran</span>
            <span className="text-lg font-bold text-[#295782]">
              {formatPrice(transaction.amount)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
