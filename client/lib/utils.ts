// client/lib/utils.ts
// ✅ ENHANCED: Added IRT and formatting utilities

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// ✅ NEW: IRT UTILITIES
// ============================================

/**
 * Format theta value for display
 */
export function formatTheta(theta: number): string {
  return theta.toFixed(2);
}

/**
 * Format percentile for display
 */
export function formatPercentile(percentile: number): string {
  return `${percentile}th`;
}

/**
 * Get color for theta value
 */
export function getThetaColor(theta: number): string {
  if (theta >= 2.0) return '#10B981'; // green-500
  if (theta >= 1.0) return '#3B82F6'; // blue-500
  if (theta >= 0.0) return '#8B5CF6'; // purple-500
  if (theta >= -1.0) return '#F59E0B'; // amber-500
  if (theta >= -2.0) return '#EF4444'; // red-500
  return '#991B1B'; // red-900
}

/**
 * Get ability level label
 */
export function getAbilityLabel(theta: number): string {
  if (theta >= 2.0) return 'Sangat Tinggi';
  if (theta >= 1.0) return 'Tinggi';
  if (theta >= 0.0) return 'Sedang-Tinggi';
  if (theta >= -1.0) return 'Sedang';
  if (theta >= -2.0) return 'Rendah';
  return 'Sangat Rendah';
}

/**
 * Get kategori full name
 */
export function getKategoriName(kategoriId: string): string {
  const names: Record<string, string> = {
    'kpu': 'Kemampuan Penalaran Umum',
    'ppu': 'Pengetahuan dan Pemahaman Umum',
    'pk': 'Pemahaman Kuantitatif',
    'pm': 'Penalaran Matematika',
    'lit-id': 'Literasi Bahasa Indonesia',
    'lit-en': 'Literasi Bahasa Inggris',
    'kmbm': 'Kemampuan Memahami Bacaan dan Menulis'
  };
  return names[kategoriId] || kategoriId;
}

/**
 * Get tier badge style
 */
export function getTierBadgeStyle(tier: 'reach' | 'target' | 'safety'): {
  bg: string;
  text: string;
  label: string;
} {
  const styles = {
    reach: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      label: 'Reach (Menantang)'
    },
    target: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      label: 'Target (Seimbang)'
    },
    safety: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: 'Safety (Aman)'
    }
  };
  return styles[tier];
}

/**
 * Format currency (IDR)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu yang lalu`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan yang lalu`;
  return `${Math.floor(diffDays / 365)} tahun yang lalu`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100 * 10) / 10;
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
