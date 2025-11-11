// components/tryout/ConfirmDialog.tsx

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'default' | 'warning' | 'danger';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  isLoading = false,
  variant = 'default'
}: ConfirmDialogProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />,
          buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      case 'danger':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />,
          buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
        };
      default:
        return {
          icon: null,
          buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          {styles.icon}
          <AlertDialogTitle className="text-xl font-bold text-center">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-gray-600 mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto border-2 border-gray-300 hover:bg-gray-50"
          >
            {cancelText}
          </AlertDialogCancel>
          
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={`w-full sm:w-auto ${styles.buttonClass} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
