import { useState, useEffect, type JSX } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { getRolePermissions, saveRolePermissions } from '../../services/rolePermissionService';
import type { PermissionModule, PermissionAction, PermissionMap } from '../../types';

const MODULES: { key: PermissionModule; label: string }[] = [
  { key: 'sellers',    label: 'Sellers'    },
  { key: 'categories', label: 'Categories' },
  { key: 'brands',     label: 'Brands'     },
  { key: 'banners',    label: 'Banners'    },
  { key: 'products',   label: 'Products'   },
  { key: 'customers',  label: 'Customers'  },
];

const ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'list',   label: 'List'   },
  { key: 'view',   label: 'View'   },
  { key: 'add',    label: 'Add'    },
  { key: 'edit',   label: 'Edit'   },
  { key: 'delete', label: 'Delete' },
];

// Products can't be created by admin — disable that cell
// Customers self-register via OTP and are never created/deleted by admin
const NOT_APPLICABLE: Partial<Record<PermissionModule, PermissionAction[]>> = {
  products: ['add'],
  customers: ['add', 'delete'],
};

function isNA(module: PermissionModule, action: PermissionAction): boolean {
  return NOT_APPLICABLE[module]?.includes(action) ?? false;
}

const ROLE_LABEL: Record<'manager' | 'operator', string> = {
  manager:  'Manager',
  operator: 'Operator',
};

// ── Permission Matrix ──────────────────────────────────────────────────────────

interface MatrixProps {
  role: 'manager' | 'operator';
}

function PermissionMatrix({ role }: MatrixProps): JSX.Element {
  const toast = useToast();
  const [map, setMap]         = useState<PermissionMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRolePermissions(role)
      .then(data => { if (!cancelled) setMap(data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load permissions'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role]);

  function isChecked(module: PermissionModule, action: PermissionAction): boolean {
    return map[module]?.includes(action) ?? false;
  }

  function toggle(module: PermissionModule, action: PermissionAction): void {
    if (isNA(module, action)) return;
    setMap(prev => {
      const current = prev[module] ?? [];
      const next = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action];
      return { ...prev, [module]: next };
    });
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    const entries: { module: PermissionModule; action: PermissionAction }[] = [];
    for (const m of MODULES) {
      for (const a of ACTIONS) {
        if (!isNA(m.key, a.key) && isChecked(m.key, a.key)) {
          entries.push({ module: m.key, action: a.key });
        }
      }
    }
    try {
      const updated = await saveRolePermissions(role, entries);
      setMap(updated);
      toast.success('Permissions saved');
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-36">Module</th>
              {ACTIONS.map(a => (
                <th key={a.key} className="px-4 py-3 text-center font-medium text-gray-600 w-20">
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MODULES.map(m => (
              <tr key={m.key} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800">{m.label}</td>
                {ACTIONS.map(a => {
                  const na = isNA(m.key, a.key);
                  const checked = isChecked(m.key, a.key);
                  return (
                    <td key={a.key} className="px-4 py-3 text-center">
                      {na ? (
                        <span className="text-gray-300 text-lg select-none">—</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(m.key, a.key)}
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}

// ── RolePermissions page ───────────────────────────────────────────────────────

export default function RolePermissions(): JSX.Element {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();

  if (role !== 'manager' && role !== 'operator') {
    return <Navigate to="/role-permissions" replace />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/role-permissions')}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          title="Back to roles"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {ROLE_LABEL[role]} Permissions
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure what the {ROLE_LABEL[role].toLowerCase()} role can access</p>
        </div>
      </div>

      <PermissionMatrix role={role} />
    </div>
  );
}
