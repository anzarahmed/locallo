import { useEffect, useState, type JSX } from 'react';
import { useFormik, type FormikErrors, type FormikTouched } from 'formik';
import { Clock, MapPin, Navigation, BarChart2, Save, Copy, Clipboard, Tag } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useModulePrefs } from '../../hooks/useModulePrefs';
import { getProfile, updateProfile } from '../../services/sellerService';
import {
  profileSchema,
  DAYS, DEFAULT_WORKING_HOURS,
  type ProfileFormValues, type Day,
} from '../../validation/profileSchemas';
import { ApiError } from '../../lib/axios';
import type { SellerCategory } from '../../types';
import LocationDisplay from '../../components/LocationDisplay';

type DayFieldErrors  = Partial<{ open: string; close: string }>;
type DayFieldTouched = Partial<{ open: boolean; close: boolean }>;

function getDayErrors(errors: FormikErrors<ProfileFormValues>, day: Day): DayFieldErrors {
  const wh = errors.workingHours as Partial<Record<Day, DayFieldErrors>> | undefined;
  return wh?.[day] ?? {};
}
function getDayTouched(touched: FormikTouched<ProfileFormValues>, day: Day): DayFieldTouched {
  const wh = touched.workingHours as Partial<Record<Day, DayFieldTouched>> | undefined;
  return wh?.[day] ?? {};
}

const DEFAULT_LAT = 19.076;
const DEFAULT_LNG = 72.8777;

export default function Profile(): JSX.Element {
  const { seller, updateSeller } = useAuth();
  const toast = useToast();
  const { showPnl, setShowPnl } = useModulePrefs();

  const [categories, setCategories] = useState<SellerCategory[]>([]);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [copiedDay, setCopiedDay] = useState<Day | null>(null);

  const profileForm = useFormik<ProfileFormValues>({
    initialValues: {
      businessName: '',
      fullName: '',
      email: '',
      bio: '',
      workingHours: DEFAULT_WORKING_HOURS,
    },
    validationSchema: profileSchema,
    validateOnBlur: true,
    validateOnChange: false,
    enableReinitialize: true,
    onSubmit: handleProfileSave,
  });

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const profileData = await getProfile();
        const p = profileData.profile;

        setCategories(p.categories ?? []);
        setCategoryIds(p.categoryIds ?? []);
        updateSeller({ businessName: p.businessName });

        void profileForm.setValues({
          businessName: p.businessName ?? '',
          fullName:     profileData.fullName ?? '',
          email:        p.email ?? '',
          bio:          p.bio ?? '',
          workingHours: (p.workingHours as ProfileFormValues['workingHours']) ?? DEFAULT_WORKING_HOURS,
        });

        setAddress(p.address ?? '');
        setLat(p.lat ?? DEFAULT_LAT);
        setLng(p.long ?? DEFAULT_LNG);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load profile');
      } finally {
        setLoadingProfile(false);
      }
    }
    void load();
  }, []);

  async function handleProfileSave(
    values: ProfileFormValues,
    helpers: { setSubmitting: (v: boolean) => void },
  ): Promise<void> {
    try {
      await updateProfile({
        businessName: values.businessName,
        fullName:     values.fullName,
        email:        values.email,
        categoryIds,
        bio:          values.bio,
        workingHours: values.workingHours,
      });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      helpers.setSubmitting(false);
    }
  }

  function handleCopy(day: Day): void {
    setCopiedDay((prev) => (prev === day ? null : day));
  }

  function handlePaste(targetDay: Day): void {
    if (!copiedDay) return;
    const src = profileForm.values.workingHours[copiedDay];
    void profileForm.setFieldValue(`workingHours.${targetDay}`, { ...src });
  }

  const mapLat = lat || DEFAULT_LAT;
  const mapLng = lng || DEFAULT_LNG;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Teal header */}
      <div
        className="px-5 pt-8 pb-16"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <h1 className="text-white text-xl font-bold">My Profile</h1>
        <p className="text-white/60 text-sm mt-0.5">{seller?.mobile}</p>
      </div>

      <div className="px-4 -mt-10 relative z-10 pb-10">
        {/* ── Shop Info card ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <form noValidate onSubmit={profileForm.handleSubmit} className="flex flex-col gap-4">
            {/* Shop name */}
            <Field
              label="Shop name"
              error={profileForm.touched.businessName ? profileForm.errors.businessName : undefined}
            >
              <input
                name="businessName"
                value={profileForm.values.businessName}
                onChange={profileForm.handleChange}
                onBlur={profileForm.handleBlur}
                placeholder="Artisan Leather Co."
                className={inputCls(!!profileForm.touched.businessName && !!profileForm.errors.businessName)}
              />
            </Field>

            {/* Owner name */}
            <Field label="Owner name">
              <input
                name="fullName"
                value={profileForm.values.fullName}
                onChange={profileForm.handleChange}
                onBlur={profileForm.handleBlur}
                placeholder="Your name"
                className={inputCls(false)}
              />
            </Field>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" error={profileForm.touched.email ? profileForm.errors.email : undefined}>
                <input
                  name="email"
                  type="email"
                  value={profileForm.values.email}
                  onChange={profileForm.handleChange}
                  onBlur={profileForm.handleBlur}
                  placeholder="hello@shop.in"
                  className={inputCls(!!profileForm.touched.email && !!profileForm.errors.email)}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={`${seller?.countryCode ?? ''} ${seller?.mobile ?? ''}`}
                  readOnly
                  className="w-full px-3 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-400 outline-none"
                />
              </Field>
            </div>

            {/* Category — read-only pills */}
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Tag size={13} className="text-gray-400" />
                <label className="text-xs font-medium text-gray-500">Category</label>
              </div>
              {categories.length === 0 ? (
                <p className="text-sm text-gray-400 italic px-1">No categories assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <span
                      key={c.id}
                      className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm rounded-xl font-medium border border-teal-100"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Shop bio */}
            <Field label="Shop bio">
              <textarea
                name="bio"
                rows={3}
                value={profileForm.values.bio}
                onChange={profileForm.handleChange}
                onBlur={profileForm.handleBlur}
                placeholder="Tell customers about your shop…"
                className={`${inputCls(false)} resize-none`}
              />
            </Field>

            {/* Working hours — per-day */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={14} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Working hours</span>
              </div>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {DAYS.map((day) => (
                  <WorkingHoursRow
                    key={day}
                    day={day}
                    isClosed={profileForm.values.workingHours[day].isClosed}
                    open={profileForm.values.workingHours[day].open ?? ''}
                    close={profileForm.values.workingHours[day].close ?? ''}
                    errors={getDayErrors(profileForm.errors, day)}
                    touched={getDayTouched(profileForm.touched, day)}
                    isCopied={copiedDay === day}
                    canPaste={copiedDay !== null && copiedDay !== day}
                    onToggleClosed={(v) => void profileForm.setFieldValue(`workingHours.${day}.isClosed`, v)}
                    onOpenChange={(v) => void profileForm.setFieldValue(`workingHours.${day}.open`, v)}
                    onCloseChange={(v) => void profileForm.setFieldValue(`workingHours.${day}.close`, v)}
                    onOpenBlur={() => void profileForm.setFieldTouched(`workingHours.${day}.open`, true)}
                    onCloseBlur={() => void profileForm.setFieldTouched(`workingHours.${day}.close`, true)}
                    onCopy={() => handleCopy(day)}
                    onPaste={() => handlePaste(day)}
                  />
                ))}
              </div>
            </div>

            {/* MODULES */}
            <div>
              <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3">
                Modules
              </p>
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                    <BarChart2 size={18} className="text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Profit &amp; Loss</p>
                    <p className="text-xs text-gray-400">Show P&amp;L tab in bottom navigation</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPnl(!showPnl)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${showPnl ? 'bg-teal-500' : 'bg-gray-200'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showPnl ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>

            {/* Save profile button */}
            <button
              type="submit"
              disabled={profileForm.isSubmitting || loadingProfile}
              className="w-full py-4 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #26B8B2 0%, #14817C 100%)' }}
            >
              {profileForm.isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save size={15} /> Save Changes</>
              )}
            </button>
          </form>
        </div>

        {/* ── Address card — read-only ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          {/* Card header */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Shop Location</h3>
              <p className="text-xs text-gray-400 mt-0.5">Your registered business address</p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <LocationDisplay latitude={mapLat} longitude={mapLng} mapHeight="h-[260px]" />

            <button
              type="button"
              onClick={() =>
                window.open(`https://www.google.com/maps?q=${mapLat},${mapLng}`, '_blank')
              }
              className="w-full py-3 rounded-xl border-2 border-teal-500 text-teal-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-teal-50 transition-colors"
            >
              <Navigation size={15} />
              Open in maps
            </button>

            <div>
              <span className="text-xs font-medium text-gray-500">Full business address</span>
              {address ? (
                <p className="mt-1.5 text-sm text-gray-700 px-3 py-3 rounded-xl border border-gray-100 bg-gray-50 leading-relaxed">
                  {address}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-gray-400 italic px-1">No address set</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Working hours row ── */
interface WorkingHoursRowProps {
  day: Day;
  isClosed: boolean;
  open: string;
  close: string;
  errors: DayFieldErrors;
  touched: DayFieldTouched;
  isCopied: boolean;
  canPaste: boolean;
  onToggleClosed: (v: boolean) => void;
  onOpenChange: (v: string) => void;
  onCloseChange: (v: string) => void;
  onOpenBlur: () => void;
  onCloseBlur: () => void;
  onCopy: () => void;
  onPaste: () => void;
}

function WorkingHoursRow({
  day, isClosed, open, close, errors, touched,
  isCopied, canPaste,
  onToggleClosed, onOpenChange, onCloseChange,
  onOpenBlur, onCloseBlur, onCopy, onPaste,
}: WorkingHoursRowProps): JSX.Element {
  const timeCls = (invalid: boolean): string =>
    `px-2.5 py-2 border rounded-xl text-xs transition-colors outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent w-full ${
      invalid ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
    }`;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-3 border-b border-gray-50 last:border-0 ${
        isClosed ? 'bg-gray-50/60' : ''
      }`}
    >
      {/* Day name */}
      <span
        className={`w-20 shrink-0 text-xs font-semibold capitalize ${
          isClosed ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        {day}
      </span>

      {/* Off toggle */}
      <label className="flex items-center gap-1 cursor-pointer select-none shrink-0">
        <input
          type="checkbox"
          checked={isClosed}
          onChange={(e) => onToggleClosed(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 accent-teal-600 cursor-pointer"
        />
        <span className="text-xs text-gray-500">Off</span>
      </label>

      {/* Time inputs or closed label */}
      <div className="flex-1">
        {isClosed ? (
          <span className="text-xs text-gray-400 italic">Closed all day</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex-1">
              <input
                type="time"
                value={open}
                onChange={(e) => onOpenChange(e.target.value)}
                onBlur={onOpenBlur}
                className={timeCls(touched.open === true && Boolean(errors.open))}
              />
              {touched.open === true && errors.open && (
                <p className="text-[10px] text-red-500 mt-0.5">{errors.open}</p>
              )}
            </div>
            <span className="text-gray-300 text-xs shrink-0">–</span>
            <div className="flex-1">
              <input
                type="time"
                value={close}
                onChange={(e) => onCloseChange(e.target.value)}
                onBlur={onCloseBlur}
                className={timeCls(touched.close === true && Boolean(errors.close))}
              />
              {touched.close === true && errors.close && (
                <p className="text-[10px] text-red-500 mt-0.5">{errors.close}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Copy / Paste */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onCopy}
          title={isCopied ? 'Deselect' : 'Copy hours'}
          className={`p-1.5 rounded-lg transition-colors ${
            isCopied
              ? 'text-teal-600 bg-teal-50'
              : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          onClick={onPaste}
          title="Paste copied hours"
          className={`p-1.5 rounded-lg transition-colors ${
            canPaste
              ? 'text-teal-400 hover:text-teal-600 hover:bg-teal-50'
              : 'invisible'
          }`}
        >
          <Clipboard size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Shared helpers ── */
function inputCls(hasError: boolean): string {
  return `w-full px-3 py-3 text-sm rounded-xl border outline-none transition-colors ${
    hasError
      ? 'border-red-400 bg-red-50'
      : 'border-gray-200 bg-white focus:border-teal-400'
  }`;
}

interface FieldProps {
  label: string;
  labelIcon?: JSX.Element;
  error?: string;
  children: JSX.Element | false;
}

function Field({ label, labelIcon, error, children }: FieldProps): JSX.Element {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        {labelIcon}
        <label className="text-xs font-medium text-gray-500">{label}</label>
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
