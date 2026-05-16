import { lazy, Suspense, type JSX } from 'react';
const LocationPicker = lazy(() => import('../../components/LocationPicker'));
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { useFormik, type FormikErrors, type FormikTouched, type FormikHelpers } from 'formik';
import AuthField from '../../components/ui/AuthField';
import SelectField from '../../components/ui/SelectField';
import { MOCK_SELLERS } from './sellerData';
import * as sellerService from '../../services/sellerService';
import { ApiError } from '../../lib/axios';
import {
  sellerSchema,
  type SellerFormValues,
  DAYS,
  type Day,
  SHOP_CATEGORIES,
  COUNTRY_CODES,
  DEFAULT_WORKING_HOURS,
} from './sellerSchemas';

type DayFieldErrors  = Partial<{ open: string; close: string }>;
type DayFieldTouched = Partial<{ open: boolean; close: boolean }>;

function getDayErrors(errors: FormikErrors<SellerFormValues>, day: Day): DayFieldErrors {
  const wh = errors.workingHours as Partial<Record<Day, DayFieldErrors>> | undefined;
  return wh?.[day] ?? {};
}

function getDayTouched(
  touched: FormikTouched<SellerFormValues>,
  day: Day,
  submitted: boolean,
): DayFieldTouched {
  if (submitted) return { open: true, close: true };
  const wh = touched.workingHours as Partial<Record<Day, DayFieldTouched>> | undefined;
  return wh?.[day] ?? {};
}

function parseMobile(raw: string): { countryCode: string; mobile: string } {
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const { code } of sorted) {
    if (raw.startsWith(code)) return { countryCode: code, mobile: raw.slice(code.length) };
  }
  return { countryCode: '+91', mobile: raw };
}

// ── WorkingHoursRow ────────────────────────────────────────────────────────────

interface WorkingHoursRowProps {
  day: Day;
  isClosed: boolean;
  open: string;
  close: string;
  errors: DayFieldErrors;
  touched: DayFieldTouched;
  onToggleClosed: (checked: boolean) => void;
  onOpenChange: (val: string) => void;
  onCloseChange: (val: string) => void;
  onOpenBlur: () => void;
  onCloseBlur: () => void;
}

function WorkingHoursRow({
  day, isClosed, open, close, errors, touched,
  onToggleClosed, onOpenChange, onCloseChange, onOpenBlur, onCloseBlur,
}: WorkingHoursRowProps): JSX.Element {
  const timeClass = (invalid: boolean): string =>
    `px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
      invalid ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <div className="grid grid-cols-[110px_80px_1fr] items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-700 capitalize pt-2">{day}</span>

      <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer select-none pt-2">
        <input
          type="checkbox"
          checked={isClosed}
          onChange={(e): void => onToggleClosed(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
        Closed
      </label>

      <div className="flex items-center gap-2">
        <div>
          <input
            type="time"
            value={open}
            disabled={isClosed}
            onChange={(e): void => onOpenChange(e.target.value)}
            onBlur={onOpenBlur}
            className={timeClass(touched.open === true && Boolean(errors.open))}
          />
          {touched.open === true && errors.open && (
            <p className="mt-1 text-xs text-red-600">{errors.open}</p>
          )}
        </div>
        <span className="text-gray-400 text-sm shrink-0">–</span>
        <div>
          <input
            type="time"
            value={close}
            disabled={isClosed}
            onChange={(e): void => onCloseChange(e.target.value)}
            onBlur={onCloseBlur}
            className={timeClass(touched.close === true && Boolean(errors.close))}
          />
          {touched.close === true && errors.close && (
            <p className="mt-1 text-xs text-red-600">{errors.close}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SellerForm ─────────────────────────────────────────────────────────────────

export default function SellerForm(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const existing = isEdit ? MOCK_SELLERS.find(s => s.id === Number(id)) : null;

  const parsedMobile = parseMobile(existing?.mobile ?? '');

  async function handleSubmit(
    values: SellerFormValues,
    { setSubmitting, setStatus }: FormikHelpers<SellerFormValues>,
  ): Promise<void> {
    try {
      await sellerService.createSeller(values);
      navigate('/sellers');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus('This mobile number is already registered.');
      } else {
        setStatus('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<SellerFormValues>({
    initialValues: {
      shopName:     existing?.shopName  ?? '',
      ownerName:    existing?.ownerName ?? '',
      email:        existing?.email     ?? '',
      countryCode:  parsedMobile.countryCode,
      mobile:       parsedMobile.mobile,
      category:     existing?.category  ?? '',
      bio:          existing?.bio       ?? '',
      workingHours: existing?.workingHours ?? DEFAULT_WORKING_HOURS,
      latitude:     existing?.latitude  ?? 28.6139,
      longitude:    existing?.longitude ?? 77.2090,
    },
    validationSchema: sellerSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  return (
    <div className="max-w-2xl">
      <button
        onClick={(): void => { navigate('/sellers'); }}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sellers
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-900">
          {isEdit ? 'Edit Seller' : 'Add New Seller'}
        </h2>

        {typeof f.status === 'string' && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
            {f.status}
          </div>
        )}

        <form onSubmit={f.handleSubmit} noValidate className="space-y-6">

          {/* Basic Information */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AuthField
                label="Shop Name" name="shopName" placeholder="Urban Eats" required
                value={f.values.shopName} onChange={f.handleChange} onBlur={f.handleBlur}
                touched={f.touched.shopName} error={f.errors.shopName}
              />
              <AuthField
                label="Owner Name" name="ownerName" placeholder="Ravi Kumar" required
                value={f.values.ownerName} onChange={f.handleChange} onBlur={f.handleBlur}
                touched={f.touched.ownerName} error={f.errors.ownerName}
              />
              <AuthField
                label="Email" name="email" type="email" placeholder="ravi@example.com" required
                value={f.values.email} onChange={f.handleChange} onBlur={f.handleBlur}
                touched={f.touched.email} error={f.errors.email}
              />
              <SelectField
                label="Category" name="category" required
                value={f.values.category} onChange={f.handleChange} onBlur={f.handleBlur}
                touched={f.touched.category} error={f.errors.category}
              >
                <option value="">Select category</option>
                {SHOP_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </SelectField>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Contact
            </h3>
            <div className="flex gap-3">
              <div className="w-48 shrink-0">
                <SelectField
                  label="Country Code" name="countryCode" required
                  value={f.values.countryCode} onChange={f.handleChange} onBlur={f.handleBlur}
                >
                  {COUNTRY_CODES.map(({ code, label }) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </SelectField>
              </div>
              <div className="flex-1">
                <AuthField
                  label="Mobile Number" name="mobile" placeholder="9876543210" required
                  value={f.values.mobile} onChange={f.handleChange} onBlur={f.handleBlur}
                  touched={f.touched.mobile} error={f.errors.mobile}
                />
              </div>
            </div>
          </section>

          {/* Shop Details */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Shop Details
            </h3>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
                Shop Bio
              </label>
              <textarea
                id="bio" name="bio" rows={3}
                placeholder="Brief description of the shop..."
                value={f.values.bio}
                onChange={f.handleChange} onBlur={f.handleBlur}
                maxLength={500}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
                  f.touched.bio && f.errors.bio
                    ? 'border-red-400 focus:ring-red-400 bg-red-50'
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
              />
              <div className="flex justify-between mt-1">
                {f.touched.bio && f.errors.bio
                  ? <p className="text-xs text-red-600" role="alert">{f.errors.bio}</p>
                  : <span />
                }
                <span className="text-xs text-gray-400">{f.values.bio.length}/500</span>
              </div>
            </div>
          </section>

          {/* Working Hours */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Working Hours
            </h3>
            <div className="border border-gray-200 rounded-lg px-4">
              {DAYS.map(day => (
                <WorkingHoursRow
                  key={day}
                  day={day}
                  isClosed={f.values.workingHours[day].isClosed}
                  open={f.values.workingHours[day].open ?? ''}
                  close={f.values.workingHours[day].close ?? ''}
                  errors={getDayErrors(f.errors, day)}
                  touched={getDayTouched(f.touched, day)}
                  onToggleClosed={(checked): void => { void f.setFieldValue(`workingHours.${day}.isClosed`, checked); }}
                  onOpenChange={(val): void => { void f.setFieldValue(`workingHours.${day}.open`, val); }}
                  onCloseChange={(val): void => { void f.setFieldValue(`workingHours.${day}.close`, val); }}
                  onOpenBlur={(): void => { void f.setFieldTouched(`workingHours.${day}.open`, true); }}
                  onCloseBlur={(): void => { void f.setFieldTouched(`workingHours.${day}.close`, true); }}
                />
              ))}
            </div>
          </section>

          {/* Location */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Shop Location <span className="text-red-500">*</span>
            </h3>
            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Search an address or click the map to pin the exact location.
            </p>
            <Suspense
              fallback={
                <div className="h-72 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              }
            >
              {/* <LocationPicker
                latitude={f.values.latitude}
                longitude={f.values.longitude}
                onChange={(lat: number, lng: number): void => {
                  void f.setFieldValue('latitude', lat);
                  void f.setFieldValue('longitude', lng);
                  void f.setFieldTouched('latitude', true, false);
                  void f.setFieldTouched('longitude', true, false);
                }}
              /> */}
            </Suspense>
            {f.touched.latitude === true && typeof f.errors.latitude === 'string' && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1" role="alert">
                <MapPin className="w-3.5 h-3.5" />
                {f.errors.latitude}
              </p>
            )}
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={(): void => { navigate('/sellers'); }}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={f.isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {f.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {f.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Seller'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
