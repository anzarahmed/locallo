import { useState, useEffect, type JSX } from 'react';
import { useFormik, type FormikHelpers, type FormikProps } from 'formik';
import { Loader2, Smartphone, Apple } from 'lucide-react';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { getAppConfigs, updateAppConfig } from '../../services/appConfigService';
import type { AppConfig, AppPlatform, AppType } from '../../types';
import { appConfigSchema, type AppConfigFormValues } from './appConfigSchemas';

interface AppOption {
  value: AppType;
  label: string;
}

const APP_OPTIONS: AppOption[] = [
  { value: 'customer', label: 'Customer App' },
  { value: 'seller',   label: 'Seller App'   },
];

interface PlatformOption {
  value: AppPlatform;
  label: string;
  icon: typeof Smartphone;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  { value: 'android', label: 'Android', icon: Smartphone },
  { value: 'ios',     label: 'iOS',     icon: Apple      },
];

interface ToggleRowProps {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, description, active, onToggle }: ToggleRowProps): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <ToggleSwitch active={active} onToggle={onToggle} title={label} />
    </div>
  );
}

interface PlatformCardProps {
  platform: PlatformOption;
  f: FormikProps<AppConfigFormValues>;
}

function PlatformCard({ platform, f }: PlatformCardProps): JSX.Element {
  const key    = platform.value;
  const values = f.values[key];
  const error  = f.touched[key]?.version_code ? f.errors[key]?.version_code : undefined;
  const Icon   = platform.icon;
  const inputId = `${key}-version-code`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <Icon className="w-4 h-4 text-indigo-600" />
        <h2 className="text-sm font-semibold text-gray-900">{platform.label}</h2>
      </div>
      <div className="px-5 py-4 space-y-5">
        <div>
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
            Version code <span className="text-red-500">*</span>
          </label>
          <input
            id={inputId}
            name={`${key}.version_code`}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={values.version_code}
            onChange={f.handleChange}
            onBlur={f.handleBlur}
            className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
              error ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-indigo-500'
            }`}
          />
          {error
            ? <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
            : <p className="mt-1 text-xs text-gray-500">Latest released build number on {platform.label}.</p>}
        </div>

        <ToggleRow
          label="Force update"
          description="Users on an older version must update before using the app."
          active={values.is_force_update}
          onToggle={() => void f.setFieldValue(`${key}.is_force_update`, !values.is_force_update)}
        />

        <ToggleRow
          label="App maintenance"
          description="Shows the maintenance screen and blocks app usage."
          active={values.is_app_maintanance}
          onToggle={() => void f.setFieldValue(`${key}.is_app_maintanance`, !values.is_app_maintanance)}
        />
      </div>
    </div>
  );
}

interface AppConfigFormProps {
  app: AppOption;
  config: AppConfig;
  onSaved: (config: AppConfig) => void;
}

function AppConfigForm({ app, config, onSaved }: AppConfigFormProps): JSX.Element {
  const toast = useToast();

  async function handleSubmit(
    values: AppConfigFormValues,
    { setSubmitting, setStatus }: FormikHelpers<AppConfigFormValues>,
  ): Promise<void> {
    setStatus(undefined);
    try {
      const saved = await updateAppConfig(app.value, appConfigSchema.cast(values) as AppConfig);
      onSaved(saved);
      toast.success(`${app.label} config saved`);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      setStatus(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<AppConfigFormValues>({
    initialValues: config,
    validationSchema: appConfigSchema,
    enableReinitialize: true,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  return (
    <form onSubmit={f.handleSubmit} noValidate className="space-y-4">
      {typeof f.status === 'string' && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
          {f.status}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {PLATFORM_OPTIONS.map(p => <PlatformCard key={p.value} platform={p} f={f} />)}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={f.isSubmitting || !f.dirty}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {f.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {f.isSubmitting ? 'Saving…' : `Save ${app.label}`}
        </button>
      </div>
    </form>
  );
}

export default function AppConfigPage(): JSX.Element {
  const toast = useToast();
  const [configs, setConfigs] = useState<Record<AppType, AppConfig> | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [app, setApp]         = useState<AppType>('customer');

  useEffect(() => {
    let cancelled = false;
    getAppConfigs()
      .then(data => { if (!cancelled) setConfigs(data); })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load app configs');
        toast.error('Failed to load app configs');
      });
    return () => { cancelled = true; };
  }, []);

  const selected = APP_OPTIONS.find(o => o.value === app) ?? APP_OPTIONS[0];

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">App Config</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Version code, force update and maintenance mode for each mobile app
        </p>
      </div>

      <div className="inline-flex p-1 mb-4 bg-gray-100 rounded-lg" role="tablist">
        {APP_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={app === o.value}
            onClick={() => setApp(o.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              app === o.value ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : !configs ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <AppConfigForm
          key={app}
          app={selected}
          config={configs[app]}
          onSaved={saved => setConfigs(prev => (prev ? { ...prev, [app]: saved } : prev))}
        />
      )}
    </>
  );
}
