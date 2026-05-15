import { type JSX } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  readonly title: string;
}

export default function Header({ title }: HeaderProps): JSX.Element {
  const { admin } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div
          className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white"
          aria-label={admin?.name}
        >
          {admin?.name.charAt(0)}
        </div>
      </div>
    </header>
  );
}
