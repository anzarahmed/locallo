import { lazy, Suspense, useState, useEffect, useMemo, useRef, type JSX, type ChangeEvent } from 'react';
const LocationPicker = lazy(() => import('../../components/LocationPicker'));
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, MapPin, Building2, Phone, FileText, Clock,
  UserPlus, Store, AlertCircle, Copy, Clipboard, CheckCircle,
  ShieldCheck, Upload, Camera, ExternalLink, X, UserCircle,
} from 'lucide-react';
import { useFormik, type FormikErrors, type FormikTouched, type FormikHelpers } from 'formik';
import AuthField from '../../components/ui/AuthField';
import SelectField from '../../components/ui/SelectField';
import MultiComboboxField from '../../components/ui/MultiComboboxField';
import OtpVerificationModal from '../../components/ui/OtpVerificationModal';
import CameraCaptureModal from '../../components/ui/CameraCaptureModal';
import * as sellerService from '../../services/sellerService';
import type { Seller } from '../../services/sellerService';
import { getCategories } from '../../services/categoryService';
import { requestMobileOtp } from '../../services/mobileVerificationService';
import type { Category, KycDocumentType } from '../../types';
import { KYC_DOCS } from '../../lib/constants';
import { ApiError } from '../../lib/axios';
import { useToast } from '../../hooks/useToast';
import {
  sellerSchema,
  type SellerFormValues,
  DAYS,
  type Day,
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

// ── WorkingHoursRow ────────────────────────────────────────────────────────────

interface WorkingHoursRowProps {
  day: Day;
  isClosed: boolean;
  open: string;
  close: string;
  errors: DayFieldErrors;
  touched: DayFieldTouched;
  isCopied: boolean;
  canPaste: boolean;
  onToggleClosed: (checked: boolean) => void;
  onOpenChange: (val: string) => void;
  onCloseChange: (val: string) => void;
  onOpenBlur: () => void;
  onCloseBlur: () => void;
  onCopy: () => void;
  onPaste: () => void;
}

function WorkingHoursRow({
  day, isClosed, open, close, errors, touched, isCopied, canPaste,
  onToggleClosed, onOpenChange, onCloseChange, onOpenBlur, onCloseBlur,
  onCopy, onPaste,
}: WorkingHoursRowProps): JSX.Element {
  const timeClass = (invalid: boolean): string =>
    `px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
      invalid ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <div className={`flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0 transition-colors ${isClosed ? 'bg-gray-50/50' : ''}`}>
      <span className={`w-24 shrink-0 text-sm font-medium capitalize ${isClosed ? 'text-gray-400' : 'text-gray-700'}`}>
        {day}
      </span>

      <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0 w-12">
        <input
          type="checkbox"
          checked={isClosed}
          onChange={(e): void => onToggleClosed(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
        <span className="text-xs text-gray-500">Off</span>
      </label>

      {isClosed ? (
        <span className="text-xs text-gray-400 italic">Closed all day</span>
      ) : (
        <div className="flex items-center gap-2">
          <div>
            <input
              type="time"
              value={open}
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
              onChange={(e): void => onCloseChange(e.target.value)}
              onBlur={onCloseBlur}
              className={timeClass(touched.close === true && Boolean(errors.close))}
            />
            {touched.close === true && errors.close && (
              <p className="mt-1 text-xs text-red-600">{errors.close}</p>
            )}
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onCopy}
          title={isCopied ? 'Copied — click to deselect' : 'Copy hours'}
          className={`p-1.5 rounded-lg transition-colors ${
            isCopied
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onPaste}
          title="Paste copied hours"
          className={`p-1.5 rounded-lg transition-colors ${
            canPaste
              ? 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
              : 'invisible'
          }`}
        >
          <Clipboard className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────────

interface SectionCardProps {
  icon: JSX.Element;
  title: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, required, hint, children }: SectionCardProps): JSX.Element {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            {title}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </h3>
          {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

// ── SellerPhotoField ───────────────────────────────────────────────────────────

interface SellerPhotoFieldProps {
  value: string;
  touched: boolean;
  error?: string;
  disabled: boolean;
  onChange: (url: string) => void;
  onBlur: () => void;
}

function SellerPhotoField({ value, touched, error, disabled, onChange, onBlur }: SellerPhotoFieldProps): JSX.Element {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function upload(file: File): Promise<void> {
    setUploading(true);
    try {
      const { url } = await sellerService.uploadSellerPhoto(file);
      onChange(url);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
      onBlur();
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void upload(file);
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
          {value ? (
            <img src={value} alt="Seller photo" className="w-full h-full object-cover" />
          ) : (
            <UserCircle className="w-10 h-10 text-gray-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-2">
            <button
              type="button" disabled={disabled || uploading} onClick={(): void => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {value ? 'Replace' : 'Upload'}
            </button>
            <button
              type="button" disabled={disabled || uploading} onClick={(): void => setCaptureOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Capture
            </button>
            {value && (
              <button
                type="button" disabled={disabled || uploading}
                onClick={(): void => { onChange(''); onBlur(); }}
                title="Remove photo"
                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">JPEG, PNG or WebP</p>
        </div>
      </div>
      {touched && error && (
        <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>
      )}

      <CameraCaptureModal
        isOpen={captureOpen}
        title="Capture Seller Photo"
        onCapture={(file): void => { setCaptureOpen(false); void upload(file); }}
        onClose={(): void => setCaptureOpen(false)}
      />
    </div>
  );
}

// ── KycDocRow ──────────────────────────────────────────────────────────────────

interface KycDocRowProps {
  label: string;
  existingUrl: string | null;
  stagedFile: File | undefined;
  disabled: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onPick: () => void;
  onSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onCapture: () => void;
}

function KycDocRow({
  label, existingUrl, stagedFile, disabled, inputRef, onPick, onSelect, onClear, onCapture,
}: KycDocRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        {stagedFile ? (
          <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
        ) : existingUrl ? (
          <img src={existingUrl} alt={label} className="w-9 h-9 rounded-md object-cover border border-gray-200 shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-md bg-gray-100 border border-gray-200 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-700 truncate">{label}</p>
          {stagedFile ? (
            <p className="text-xs text-indigo-600 truncate">{stagedFile.name} · pending save</p>
          ) : existingUrl ? (
            <a href={existingUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
              View <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-xs text-gray-400">Not uploaded</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onSelect}
        />
        {stagedFile && (
          <button
            type="button" onClick={onClear} disabled={disabled} title="Remove selected file"
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button" disabled={disabled} onClick={onCapture} title="Capture with camera"
          className="p-1.5 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        <button
          type="button" disabled={disabled} onClick={onPick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {stagedFile || existingUrl ? 'Replace' : 'Upload'}
        </button>
      </div>
    </div>
  );
}

// ── SellerForm ─────────────────────────────────────────────────────────────────

export default function SellerForm(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const toast = useToast();

  const [seller, setSeller] = useState<Seller | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedDay, setCopiedDay] = useState<Day | null>(null);
  const [mobileVerified, setMobileVerified] = useState<boolean>(false);
  const [otpModalOpen, setOtpModalOpen] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [kycFiles, setKycFiles] = useState<Partial<Record<KycDocumentType, File>>>({});
  const [captureFor, setCaptureFor] = useState<KycDocumentType | null>(null);
  const kycFileInputRefs = useRef<Record<KycDocumentType, HTMLInputElement | null>>({
    aadhar: null, pan: null, registrationCertificate: null, other: null,
  });

  useEffect((): void => {
    getCategories().then(setCategories).catch((): void => {});
  }, []);

  useEffect((): void => {
    if (!isEdit || !id) return;
    setLoading(true);
    sellerService.getSellerById(id)
      .then((data): void => { setSeller(data); setMobileVerified(true); })
      .catch((): void => { setLoadError('Failed to load seller details. Please try again.'); })
      .finally((): void => { setLoading(false); });
  }, [id, isEdit]);

  const initialValues = useMemo((): SellerFormValues => {
    if (!seller) {
      return {
        photo: '', shopName: '', ownerName: '', email: '', countryCode: '+91', mobile: '',
        categoryIds: [], bio: '', workingHours: DEFAULT_WORKING_HOURS,
        latitude: 28.6139, longitude: 77.2090, address: '',
      };
    }
    const p = seller.profile;
    return {
      photo:        seller.photo ?? '',
      shopName:     p?.businessName ?? '',
      ownerName:    seller.fullName ?? '',
      email:        p?.email ?? '',
      countryCode:  seller.countryCode ?? '+91',
      mobile:       seller.mobile,
      categoryIds:  p?.categoryIds ?? [],
      bio:          p?.bio ?? '',
      workingHours: p?.workingHours ?? DEFAULT_WORKING_HOURS,
      latitude:     Number(p?.lat ?? 28.6139),
      longitude:    Number(p?.long ?? 77.2090),
      address:      p?.address ?? '',
    };
  }, [seller]);

  function stageKycFile(documentType: KycDocumentType, file: File): void {
    setKycFiles(prev => ({ ...prev, [documentType]: file }));
  }

  function handleKycFileSelect(documentType: KycDocumentType, e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    stageKycFile(documentType, file);
  }

  function handleKycFileClear(documentType: KycDocumentType): void {
    setKycFiles(prev => {
      const next = { ...prev };
      delete next[documentType];
      return next;
    });
  }

  async function handleSubmit(
    values: SellerFormValues,
    { setSubmitting, setStatus }: FormikHelpers<SellerFormValues>,
  ): Promise<void> {
    if (!mobileVerified) {
      setStatus('Please verify the mobile number before saving.');
      setSubmitting(false);
      return;
    }
    try {
      let sellerId: string;
      if (isEdit && id) {
        await sellerService.updateSeller(id, values);
        sellerId = id;
      } else {
        const created = await sellerService.createSeller(values);
        sellerId = created.id;
      }

      const pending = Object.entries(kycFiles) as [KycDocumentType, File][];
      if (pending.length > 0) {
        const results = await Promise.allSettled(
          pending.map(([type, file]) => sellerService.uploadKycDocument(sellerId, type, file)),
        );
        const failedCount = results.filter(r => r.status === 'rejected').length;
        if (failedCount > 0) {
          toast.error(`Seller saved, but ${failedCount} document${failedCount > 1 ? 's' : ''} failed to upload. Retry from Edit Seller.`);
        }
      }

      toast.success(isEdit ? 'Seller updated' : 'Seller added');
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

  async function handleSendOtp(): Promise<void> {
    const { countryCode, mobile } = f.values;
    void f.setFieldTouched('mobile', true);
    if (!mobile || !/^[0-9]{7,15}$/.test(mobile)) return;
    setIsSendingOtp(true);
    try {
      await requestMobileOtp(countryCode, mobile);
      setOtpModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send OTP. Please try again.';
      f.setStatus(msg);
    } finally {
      setIsSendingOtp(false);
    }
  }

  function handleCopyDay(day: Day): void {
    setCopiedDay(prev => (prev === day ? null : day));
  }

  function handlePasteDay(targetDay: Day): void {
    if (!copiedDay) return;
    const src = f.values.workingHours[copiedDay];
    void f.setFieldValue(`workingHours.${targetDay}`, { ...src });
  }

  const f = useFormik<SellerFormValues>({
    initialValues,
    enableReinitialize: true,
    validationSchema: sellerSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  const backButton = (
    <button
      onClick={(): void => { navigate('/sellers'); }}
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to sellers
    </button>
  );

  function PageHeader(): JSX.Element {
    return (
      <div className="flex items-start justify-between gap-4 mt-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            {isEdit
              ? <Store className="w-5 h-5 text-indigo-600" />
              : <UserPlus className="w-5 h-5 text-indigo-600" />}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {isEdit ? 'Edit Seller' : 'Add New Seller'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit
                ? 'Update seller account details'
                : 'Set up a new seller account on the platform'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(): void => { navigate('/sellers'); }}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="seller-form"
            disabled={f.isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {f.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {f.isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Seller'}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        {backButton}
        <div className="flex items-start justify-between gap-4 mt-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gray-200 rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-3.5 w-60 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-gray-100 rounded-lg" />
            <div className="h-9 w-28 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 h-52" />
            <div className="bg-white rounded-xl border border-gray-200 h-24" />
            <div className="bg-white rounded-xl border border-gray-200 h-32" />
            <div className="bg-white rounded-xl border border-gray-200 h-72" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 h-[560px]" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        {backButton}
        <div className="mt-5 bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {backButton}
      <PageHeader />

      {typeof f.status === 'string' && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {f.status}
        </div>
      )}

      <form id="seller-form" onSubmit={f.handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">

          {/* ── Left column ── */}
          <div className="space-y-4">

            <SectionCard
              icon={<UserCircle className="w-3.5 h-3.5 text-indigo-600" />}
              title="Seller Photo"
              required
              hint="Upload a clear photo, or capture one with the camera"
            >
              <SellerPhotoField
                value={f.values.photo}
                touched={Boolean(f.touched.photo)}
                error={typeof f.errors.photo === 'string' ? f.errors.photo : undefined}
                disabled={f.isSubmitting}
                onChange={(url): void => { void f.setFieldValue('photo', url); }}
                onBlur={(): void => { void f.setFieldTouched('photo', true); }}
              />
            </SectionCard>

            <SectionCard
              icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
              title="Basic Information"
            >
              <div className="grid grid-cols-2 gap-4">
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
                <MultiComboboxField
                  label="Categories" name="categoryIds" required
                  value={f.values.categoryIds as number[]}
                  options={categories.map(c => ({ label: c.name, value: c.id }))}
                  onChange={(vals): void => { void f.setFieldValue('categoryIds', vals); }}
                  onBlur={(): void => { void f.setFieldTouched('categoryIds', true); }}
                  touched={Boolean(f.touched.categoryIds)}
                  error={typeof f.errors.categoryIds === 'string' ? f.errors.categoryIds : undefined}
                  placeholder="Select categories…"
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={<Phone className="w-3.5 h-3.5 text-indigo-600" />}
              title="Contact"
            >
              <div className="flex gap-3">
                <div className="w-48 shrink-0">
                  <SelectField
                    label="Country Code" name="countryCode" required
                    value={f.values.countryCode}
                    onChange={(e): void => {
                      f.handleChange(e);
                      setMobileVerified(false);
                    }}
                    onBlur={f.handleBlur}
                  >
                    {COUNTRY_CODES.map(({ code, label }) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </SelectField>
                </div>
                <div className="flex-1">
                  <AuthField
                    label="Mobile Number" name="mobile" placeholder="9876543210" required
                    value={f.values.mobile}
                    onChange={(e): void => {
                      f.handleChange(e);
                      const newMobile = e.target.value;
                      setMobileVerified(isEdit && newMobile === (seller?.mobile ?? ''));
                    }}
                    onBlur={f.handleBlur}
                    touched={f.touched.mobile} error={f.errors.mobile}
                  />
                  <div className="mt-1.5 flex items-center gap-2">
                    {mobileVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || !f.values.mobile}
                        className="text-xs text-indigo-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                      >
                        {isSendingOtp && <Loader2 className="w-3 h-3 animate-spin" />}
                        {isSendingOtp ? 'Sending OTP…' : 'Verify mobile number'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <OtpVerificationModal
              isOpen={otpModalOpen}
              countryCode={f.values.countryCode}
              mobile={f.values.mobile}
              onVerified={(): void => { setMobileVerified(true); }}
              onClose={(): void => { setOtpModalOpen(false); }}
            />

            <SectionCard
              icon={<ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}
              title="Verification Documents"
              hint="Optional — upload now, or later from Edit Seller"
            >
              <div className="space-y-2">
                {KYC_DOCS.map(({ type, label }) => (
                  <KycDocRow
                    key={type}
                    label={label}
                    existingUrl={seller?.profile?.kycDocuments?.[type] ?? null}
                    stagedFile={kycFiles[type]}
                    disabled={f.isSubmitting}
                    inputRef={(el): void => { kycFileInputRefs.current[type] = el; }}
                    onPick={(): void => kycFileInputRefs.current[type]?.click()}
                    onSelect={(e): void => { handleKycFileSelect(type, e); }}
                    onClear={(): void => { handleKycFileClear(type); }}
                    onCapture={(): void => { setCaptureFor(type); }}
                  />
                ))}
              </div>
            </SectionCard>

            <CameraCaptureModal
              isOpen={captureFor !== null}
              title={`Capture ${KYC_DOCS.find(d => d.type === captureFor)?.label ?? 'Document'}`}
              onCapture={(file): void => {
                if (captureFor) stageKycFile(captureFor, file);
                setCaptureFor(null);
              }}
              onClose={(): void => { setCaptureFor(null); }}
            />

            <SectionCard
              icon={<FileText className="w-3.5 h-3.5 text-indigo-600" />}
              title="Shop Details"
            >
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Shop Bio
                </label>
                <textarea
                  id="bio" name="bio" rows={4}
                  placeholder="Brief description of the shop…"
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
            </SectionCard>

            <SectionCard
              icon={<Clock className="w-3.5 h-3.5 text-indigo-600" />}
              title="Working Hours"
            >
              {DAYS.map(day => (
                <WorkingHoursRow
                  key={day}
                  day={day}
                  isClosed={f.values.workingHours[day].isClosed}
                  open={f.values.workingHours[day].open ?? ''}
                  close={f.values.workingHours[day].close ?? ''}
                  errors={getDayErrors(f.errors, day)}
                  touched={getDayTouched(f.touched, day, f.submitCount > 0)}
                  isCopied={copiedDay === day}
                  canPaste={copiedDay !== null && copiedDay !== day}
                  onToggleClosed={(checked): void => { void f.setFieldValue(`workingHours.${day}.isClosed`, checked); }}
                  onOpenChange={(val): void => { void f.setFieldValue(`workingHours.${day}.open`, val); }}
                  onCloseChange={(val): void => { void f.setFieldValue(`workingHours.${day}.close`, val); }}
                  onOpenBlur={(): void => { void f.setFieldTouched(`workingHours.${day}.open`, true); }}
                  onCloseBlur={(): void => { void f.setFieldTouched(`workingHours.${day}.close`, true); }}
                  onCopy={(): void => { handleCopyDay(day); }}
                  onPaste={(): void => { handlePasteDay(day); }}
                />
              ))}
            </SectionCard>

            <div className="flex justify-end gap-3 pb-2">
              <button
                type="button"
                onClick={(): void => { navigate('/sellers'); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={f.isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {f.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {f.isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Seller'}
              </button>
            </div>
          </div>

          {/* ── Right column — sticky location ── */}
          <div className="sticky top-6">
            <SectionCard
              icon={<MapPin className="w-3.5 h-3.5 text-indigo-600" />}
              title="Shop Location"
              required
              hint="Search or click the map to pin the exact location"
            >
              <Suspense
                fallback={
                  <div className="h-[420px] flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                }
              >
                <LocationPicker
                  latitude={f.values.latitude}
                  longitude={f.values.longitude}
                  mapHeight="h-[420px]"
                  enableGeolocation={!isEdit}
                  onChange={(lat: number, lng: number): void => {
                    void f.setFieldValue('latitude', lat);
                    void f.setFieldValue('longitude', lng);
                    void f.setFieldTouched('latitude', true, false);
                    void f.setFieldTouched('longitude', true, false);
                  }}
                  onAddress={(addr: string): void => {
                    void f.setFieldValue('address', addr);
                  }}
                />
              </Suspense>
              {f.touched.latitude === true && typeof f.errors.latitude === 'string' && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1" role="alert">
                  <MapPin className="w-3.5 h-3.5" />
                  {f.errors.latitude}
                </p>
              )}
              <div className="mt-4">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address
                </label>
                <textarea
                  id="address" name="address" rows={3}
                  placeholder="Auto-filled when you pin a location…"
                  value={f.values.address}
                  onChange={f.handleChange} onBlur={f.handleBlur}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>
            </SectionCard>
          </div>

        </div>
      </form>
    </div>
  );
}
