import { useNavigate, type JSX } from 'react-router-dom';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { ROLE_BADGE_CLASSES } from '../../lib/constants';

interface RoleRow {
  role: 'manager' | 'operator';
  label: string;
  description: string;
}

const ROLES: RoleRow[] = [
  {
    role: 'manager',
    label: 'Manager',
    description: 'Can manage sellers, categories, and products based on assigned permissions.',
  },
  {
    role: 'operator',
    label: 'Operator',
    description: 'Limited access role for day-to-day operations within permitted modules.',
  },
];

export default function RoleList(): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Role Permissions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure what each role can access</p>
      </div>

      <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
        {ROLES.map(({ role, label, description }) => (
          <div
            key={role}
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_CLASSES[role] ?? ''}`}>
                    {label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/role-permissions/${role}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors shrink-0"
              title={`Manage ${label} permissions`}
            >
              <ShieldCheck className="w-4 h-4" />
              Manage
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
