import { useState, useMemo, type JSX } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { type ColumnDef, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import AuthField from '../../components/ui/AuthField';
import SelectField from '../../components/ui/SelectField';
import RoleBadge from '../../components/ui/RoleBadge';
import { ApiError } from '../../lib/axios';
import { DEFAULT_PAGE_SIZE, SUB_ADMIN_ROLE_OPTIONS } from '../../lib/constants';
import { useToast } from '../../hooks/useToast';
import {
  listSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  toggleSubAdminStatus,
  type SubAdmin,
} from '../../services/subAdminService';
import {
  createSubAdminSchema,
  editSubAdminSchema,
  type CreateSubAdminValues,
  type EditSubAdminValues,
} from './subAdminSchemas';

// ── Add Modal ──────────────────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void;
  onAdded: (a: SubAdmin) => void;
}

function AddModal({ onClose, onAdded }: AddModalProps): JSX.Element {
  const toast = useToast();

  const formik = useFormik<CreateSubAdminValues>({
    initialValues: { email: '', password: '', fullName: '', role: '' as 'manager' },
    validationSchema: createSubAdminSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  async function handleSubmit(
    values: CreateSubAdminValues,
    { setSubmitting, setStatus }: FormikHelpers<CreateSubAdminValues>,
  ): Promise<void> {
    try {
      const admin = await createSubAdmin({
        email: values.email,
        password: values.password,
        fullName: values.fullName || null,
        role: values.role as 'manager' | 'operator',
      });
      toast.success('Sub-admin created');
      onAdded(admin);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus('An admin with that email already exists.');
      } else {
        setStatus('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Sub-Admin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={formik.handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {formik.status && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formik.status as string}
            </p>
          )}
          <AuthField
            label="Full Name"
            name="fullName"
            type="text"
            placeholder="Optional"
            value={formik.values.fullName ?? ''}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            touched={formik.touched.fullName}
            error={formik.errors.fullName}
          />
          <AuthField
            label="Email"
            name="email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            touched={formik.touched.email}
            error={formik.errors.email}
            required
          />
          <AuthField
            label="Password"
            name="password"
            type="password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            touched={formik.touched.password}
            error={formik.errors.password}
            required
          />
          <SelectField
            label="Role"
            name="role"
            value={formik.values.role}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            touched={formik.touched.role}
            error={formik.errors.role}
            required
          >
            <option value="">Select role</option>
            {SUB_ADMIN_ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </SelectField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {formik.isSubmitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────

interface EditModalProps {
  admin: SubAdmin;
  onClose: () => void;
  onSaved: (a: SubAdmin) => void;
}

function EditModal({ admin, onClose, onSaved }: EditModalProps): JSX.Element {
  const toast = useToast();

  const formik = useFormik<EditSubAdminValues>({
    initialValues: {
      email: admin.email,
      password: '',
      fullName: admin.fullName ?? '',
      role: admin.role as 'manager' | 'operator',
    },
    validationSchema: editSubAdminSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  async function handleSubmit(
    values: EditSubAdminValues,
    { setSubmitting, setStatus }: FormikHelpers<EditSubAdminValues>,
  ): Promise<void> {
    try {
      const saved = await updateSubAdmin(admin.id, {
        email: values.email,
        password: values.password || null,
        fullName: values.fullName || null,
        role: values.role as 'manager' | 'operator',
      });
      toast.success('Sub-admin updated');
      onSaved(saved);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus('An admin with that email already exists.');
      } else if (err instanceof ApiError && err.status === 404) {
        setStatus('Sub-admin not found.');
      } else {
        setStatus('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit Sub-Admin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={formik.handleSubmit} noValidate className="px-6 py-5 space-y-4">
          {formik.status && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formik.status as string}
            </p>
          )}
          <AuthField
            label="Full Name"
            name="fullName"
            type="text"
            placeholder="Optional"
            value={formik.values.fullName ?? ''}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            touched={formik.touched.fullName}
            error={formik.errors.fullName}
          />
          <AuthField
            label="Email"
            name="email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            touched={formik.touched.email}
            error={formik.errors.email}
            required
          />
          <AuthField
            label="New Password"
            name="password"
            type="password"
            placeholder="Leave blank to keep current"
            value={formik.values.password ?? ''}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            touched={formik.touched.password}
            error={formik.errors.password}
          />
          <SelectField
            label="Role"
            name="role"
            value={formik.values.role}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            touched={formik.touched.role}
            error={formik.errors.role}
            required
          >
            {SUB_ADMIN_ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </SelectField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {formik.isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Modal ───────────────────────────────────────────────────────────────

interface DeleteModalProps {
  admin: SubAdmin;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteModal({ admin, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setLoading(true);
    try {
      await deleteSubAdmin(admin.id);
      toast.success('Sub-admin deleted');
      onDeleted();
    } catch {
      toast.error('Failed to delete sub-admin');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Delete Sub-Admin</h2>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-medium">{admin.email}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SubAdminList ───────────────────────────────────────────────────────────────

export default function SubAdminList(): JSX.Element {
  const toast = useToast();

  const [rows, setRows]       = useState<SubAdmin[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  const [page, setPage]     = useState(1);
  const [sorting, setSorting]               = useState<SortingState>([]);
  const [columnFilters, setColumnFilters]   = useState<ColumnFiltersState>([]);

  const [showAdd, setShowAdd]           = useState(false);
  const [editTarget, setEditTarget]     = useState<SubAdmin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubAdmin | null>(null);

  const limit = DEFAULT_PAGE_SIZE;

  // fetch
  useState(() => {
    let cancelled = false;
    setLoading(true);
    listSubAdmins(page, limit)
      .then(data => {
        if (!cancelled) { setRows(data.rows); setTotal(data.total); }
      })
      .catch(() => { if (!cancelled) toast.error('Failed to load sub-admins'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  });

  // re-fetch when fetchKey / page changes
  useMemo(() => {
    let cancelled = false;
    setLoading(true);
    listSubAdmins(page, limit)
      .then(data => {
        if (!cancelled) { setRows(data.rows); setTotal(data.total); }
      })
      .catch(() => { if (!cancelled) toast.error('Failed to load sub-admins'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fetchKey]);

  async function handleToggle(id: string): Promise<void> {
    try {
      const updated = await toggleSubAdminStatus(id);
      setRows(prev => prev.map(r => r.id === id ? updated : r));
      toast.success(updated.isActive ? 'Activated' : 'Deactivated');
    } catch {
      toast.error('Failed to update status');
    }
  }

  const columns = useMemo<ColumnDef<SubAdmin>[]>(() => [
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.fullName || '—'}</p>
          <p className="text-xs text-gray-500">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      meta: { align: 'center' },
      cell: ({ getValue }) => <RoleBadge role={getValue<string>()} />,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      meta: { align: 'center', className: 'w-24' },
      cell: ({ row }) => (
        <ToggleSwitch
          active={row.original.isActive}
          onToggle={() => handleToggle(row.original.id)}
          title={row.original.isActive ? 'Deactivate' : 'Activate'}
        />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      meta: { align: 'right' },
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-500">
          {new Date(getValue<string>()).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { align: 'right', className: 'w-20' },
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setEditTarget(row.original)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(row.original)}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sub-Admins</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage managers and operators</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Add Sub-Admin
        </button>
      </div>

      <DataGrid
        data={rows}
        columns={columns}
        total={total}
        page={page}
        pageSize={limit}
        loading={loading}
        sorting={sorting}
        columnFilters={columnFilters}
        onPageChange={setPage}
        onSortingChange={setSorting}
        onColumnFiltersChange={setColumnFilters}
        manualSorting={false}
        manualFiltering={false}
      />

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdded={admin => {
            setShowAdd(false);
            setFetchKey(k => k + 1);
          }}
        />
      )}
      {editTarget && (
        <EditModal
          admin={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={updated => {
            setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
            setEditTarget(null);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          admin={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
            setTotal(t => t - 1);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
