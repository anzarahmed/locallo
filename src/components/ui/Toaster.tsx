import { type JSX } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToast, type ToastItem } from '../../hooks/useToast';

type IconComponent = React.ComponentType<{ className?: string }>;

const STYLE: Record<ToastItem['type'], { Icon: IconComponent; icon: string; bar: string }> = {
  success: { Icon: CheckCircle, icon: 'text-emerald-500', bar: 'bg-emerald-500' },
  error:   { Icon: AlertCircle, icon: 'text-red-500',     bar: 'bg-red-500'     },
  info:    { Icon: Info,        icon: 'text-orange-500',  bar: 'bg-orange-500'  },
};

export default function Toaster(): JSX.Element {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(({ id, type, message }) => {
        const { Icon, icon, bar } = STYLE[type];
        return (
          <div
            key={id}
            className="pointer-events-auto bg-white rounded-xl shadow-lg border border-gray-200 w-80 flex overflow-hidden starting:opacity-0 starting:translate-y-2 transition-all duration-300"
          >
            <div className={`w-1 shrink-0 ${bar}`} />
            <div className="flex items-start gap-3 px-4 py-3 flex-1 min-w-0">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${icon}`} />
              <p className="text-sm text-gray-800 flex-1">{message}</p>
              <button
                onClick={() => dismiss(id)}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
