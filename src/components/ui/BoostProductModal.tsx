import { useEffect, useState, type JSX } from 'react';
import { useFormik } from 'formik';
import {
  X, Globe, Map, Building2, Users, IndianRupee, ClipboardCheck,
  Eye, Info, Loader2, ChevronDown, Rocket, type LucideIcon,
} from 'lucide-react';
import { createBoost, getActiveBoost } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { estimateImpressions, formatAudienceLabel, AUDIENCE_TYPE_CODE } from '../../lib/boostUtils';
import { STATES, STATE_CITY_MAP } from '../../lib/statesCities';
import { boostSchema, type BoostFormValues } from '../../validation/boostSchemas';
import { MIN_DAILY_BUDGET, MAX_DAILY_BUDGET, DEFAULT_DAILY_BUDGET, DAILY_BUDGET_STEP } from '../../constants';
import type { Product, ProductBoost, BoostAudienceType } from '../../types';

interface BoostProductModalProps {
  product: Product;
  onClose: () => void;
  onBoosted: (boost: ProductBoost) => void;
}

const STEPS: { key: 1 | 2 | 3; label: string; icon: LucideIcon }[] = [
  { key: 1, label: 'Audience', icon: Users },
  { key: 2, label: 'Budget', icon: IndianRupee },
  { key: 3, label: 'Review', icon: ClipboardCheck },
];

export default function BoostProductModal({ product, onClose, onBoosted }: BoostProductModalProps): JSX.Element {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingBoost, setExistingBoost] = useState<ProductBoost | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check(): Promise<void> {
      try {
        const { boost } = await getActiveBoost(product.id);
        if (!cancelled) setExistingBoost(boost);
      } catch {
        // if the check fails, fall through to letting the seller attempt the wizard
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void check();
    return () => { cancelled = true; };
  }, [product.id]);

  const formik = useFormik<BoostFormValues>({
    initialValues: {
      audienceType: '',
      state: '',
      city: '',
      dailyBudget: String(DEFAULT_DAILY_BUDGET),
    },
    validationSchema: boostSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  async function handleSubmit(values: BoostFormValues): Promise<void> {
    setSubmitting(true);
    try {
      const { boost } = await createBoost(product.id, {
        type: AUDIENCE_TYPE_CODE[values.audienceType as BoostAudienceType],
        state: values.audienceType !== 'pan_india' ? values.state : undefined,
        city: values.audienceType === 'city' ? values.city : undefined,
        budget: Number(values.dailyBudget),
      });
      toast.success('Your product boost is now live!');
      onBoosted(boost);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to boost product');
    } finally {
      setSubmitting(false);
    }
  }

  const canProceedStep1 =
    formik.values.audienceType === 'pan_india' ||
    (formik.values.audienceType === 'state' && formik.values.state !== '') ||
    (formik.values.audienceType === 'city' && formik.values.state !== '' && formik.values.city !== '');

  const canProceedStep2 = Number(formik.values.dailyBudget) >= MIN_DAILY_BUDGET;

  function handleNext(): void {
    if (step === 1) {
      if (!canProceedStep1) return;
      setStep(2);
    } else if (step === 2) {
      if (!canProceedStep2) return;
      setStep(3);
    } else {
      void formik.submitForm();
    }
  }

  function handleBack(): void {
    if (step === 1) {
      onClose();
      return;
    }
    setStep((s) => (s - 1) as 1 | 2);
  }

  const nextDisabled =
    submitting || (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800">Boost Your Product</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {checking ? (
          <div className="px-5 pb-8 pt-4 flex flex-col items-center gap-2">
            <Loader2 size={22} className="animate-spin text-teal-600" />
            <p className="text-sm text-gray-400">Checking boost status…</p>
          </div>
        ) : existingBoost ? (
          <ExistingBoostView boost={existingBoost} onClose={onClose} />
        ) : (
          <>
            <div className="px-5 pb-4 shrink-0">
              <StepIndicator step={step} />
            </div>

            <div className="px-5 pb-4 overflow-y-auto flex-1">
              {step === 1 && (
                <AudienceStep
                  values={formik.values}
                  setFieldValue={(field, value) => { void formik.setFieldValue(field, value); }}
                />
              )}
              {step === 2 && (
                <BudgetStep
                  dailyBudget={formik.values.dailyBudget}
                  onChange={(v) => { void formik.setFieldValue('dailyBudget', v); }}
                />
              )}
              {step === 3 && <ReviewStep values={formik.values} />}
            </div>

            <div className="px-5 py-4 border-t border-gray-50 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={nextDisabled}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                {step === 3 ? (submitting ? 'Confirming…' : 'Confirm Boost') : 'Next'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Step indicator ── */
function StepIndicator({ step }: { step: 1 | 2 | 3 }): JSX.Element {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                step >= s.key ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-300'
              }`}
            >
              <s.icon size={16} />
            </div>
            <span className={`text-[11px] font-semibold mt-1.5 ${step >= s.key ? 'text-gray-700' : 'text-gray-300'}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > s.key ? 'bg-teal-700' : 'bg-gray-100'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Step 1: Audience ── */
interface AudienceStepProps {
  values: BoostFormValues;
  setFieldValue: (field: string, value: string) => void;
}

const AUDIENCE_OPTIONS: { value: BoostAudienceType; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'pan_india', label: 'Pan India', description: 'Visible to buyers across the country', icon: Globe },
  { value: 'state', label: 'Only State', description: 'Visible to buyers within a state', icon: Map },
  { value: 'city', label: 'City', description: 'Visible to buyers within a city', icon: Building2 },
];

function AudienceStep({ values, setFieldValue }: AudienceStepProps): JSX.Element {
  return (
    <div>
      <p className="text-sm font-bold text-gray-800 mb-3">Choose who can see this product</p>
      <div className="space-y-3">
        {AUDIENCE_OPTIONS.map((opt) => {
          const selected = values.audienceType === opt.value;
          return (
            <div
              key={opt.value}
              onClick={() => setFieldValue('audienceType', opt.value)}
              className={`rounded-2xl border p-3.5 cursor-pointer transition-colors ${
                selected ? 'border-teal-600 bg-teal-50/60' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                  <opt.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.description}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected ? 'border-teal-600' : 'border-gray-300'
                  }`}
                >
                  {selected && <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />}
                </div>
              </div>

              {opt.value === 'state' && selected && (
                <div className="mt-3 pt-3 border-t border-teal-100">
                  <StateSelect value={values.state} onChange={(v) => setFieldValue('state', v)} />
                </div>
              )}
              {opt.value === 'city' && selected && (
                <div className="mt-3 pt-3 border-t border-teal-100 space-y-3">
                  <StateSelect
                    value={values.state}
                    onChange={(v) => { setFieldValue('state', v); setFieldValue('city', ''); }}
                  />
                  <CitySelect state={values.state} value={values.city} onChange={(v) => setFieldValue('city', v)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StateSelect({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <label className="block text-[11px] font-semibold text-gray-400 mb-1">Select State</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2.5 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          <option value="">Choose a state</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function CitySelect({ state, value, onChange }: { state: string; value: string; onChange: (v: string) => void }): JSX.Element {
  const cities = state ? STATE_CITY_MAP[state] ?? [] : [];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <label className="block text-[11px] font-semibold text-gray-400 mb-1">Select City</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!state}
          className="w-full appearance-none border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2.5 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-gray-50 disabled:text-gray-300"
        >
          <option value="">{state ? 'Choose a city' : 'Select a state first'}</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

/* ── Step 2: Budget ── */
interface BudgetStepProps {
  dailyBudget: string;
  onChange: (v: string) => void;
}

function BudgetStep({ dailyBudget, onChange }: BudgetStepProps): JSX.Element {
  const budgetNum = Number(dailyBudget) || 0;
  const { min, max } = estimateImpressions(budgetNum);

  return (
    <div>
      <p className="text-sm font-bold text-gray-800 text-center mb-5">What's your boost budget?</p>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Daily Budget</p>
          <p className="text-xs text-gray-400 mt-0.5">Select how much you want to spend per day.</p>
        </div>
        <div className="flex items-center gap-1 border border-teal-600 rounded-xl px-3 py-2 shrink-0">
          <span className="text-teal-700 text-sm font-semibold">₹</span>
          <input
            type="number"
            min={MIN_DAILY_BUDGET}
            max={MAX_DAILY_BUDGET}
            step={DAILY_BUDGET_STEP}
            value={dailyBudget}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 text-sm font-semibold text-gray-800 text-right focus:outline-none"
          />
        </div>
      </div>

      <input
        type="range"
        min={MIN_DAILY_BUDGET}
        max={MAX_DAILY_BUDGET}
        step={DAILY_BUDGET_STEP}
        value={budgetNum}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-teal-600"
      />
      <div className="flex justify-between mt-1">
        <span className="text-[11px] text-gray-300">₹{MIN_DAILY_BUDGET}</span>
        <span className="text-[11px] text-gray-300">₹{MAX_DAILY_BUDGET}</span>
      </div>

      <div className="mt-8 pt-4 border-t border-gray-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Boost budget</span>
          <span className="text-sm font-bold text-gray-800">₹{budgetNum.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            Estimated impressions
            <span title="Approximate number of times your boosted product may be shown to users based on your budget and targeting.">
              <Info size={12} className="text-gray-300" />
            </span>
          </span>
          <span className="text-sm font-bold text-gray-800">
            {min.toLocaleString('en-IN')} – {max.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Review ── */
function ReviewStep({ values }: { values: BoostFormValues }): JSX.Element {
  const budgetNum = Number(values.dailyBudget) || 0;
  const { min, max } = estimateImpressions(budgetNum);
  const audienceLabel = formatAudienceLabel(values.audienceType, values.state, values.city);

  const rows: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Users, label: 'Audience', value: audienceLabel },
    { icon: IndianRupee, label: 'Boost budget', value: `₹${budgetNum.toLocaleString('en-IN')}` },
    { icon: Eye, label: 'Estimated impressions', value: `${min.toLocaleString('en-IN')} – ${max.toLocaleString('en-IN')}` },
  ];

  return (
    <div>
      <p className="text-sm font-bold text-gray-800 mb-1">Review your boost</p>
      <p className="text-xs text-gray-400 mb-4">Confirm the audience and budget below before you continue.</p>

      <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-teal-700 shrink-0">
              <row.icon size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{row.label}</p>
              <p className="text-sm font-bold text-gray-800 truncate">{row.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Already-boosted view ── */
function ExistingBoostView({ boost, onClose }: { boost: ProductBoost; onClose: () => void }): JSX.Element {
  const audienceLabel = formatAudienceLabel(boost.audienceType, boost.state, boost.city);
  return (
    <div className="px-5 pb-5">
      <div className="flex flex-col items-center text-center mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'linear-gradient(135deg, #26B8B2 0%, #14817C 100%)' }}
        >
          <Rocket size={20} className="text-white" />
        </div>
        <p className="text-sm font-bold text-gray-800">This product is already boosted</p>
        <p className="text-xs text-gray-400 mt-1">You can start a new boost once this one ends.</p>
      </div>

      <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-teal-700 shrink-0">
            <Users size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">Audience</p>
            <p className="text-sm font-bold text-gray-800 truncate">{audienceLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-teal-700 shrink-0">
            <IndianRupee size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">Boost budget</p>
            <p className="text-sm font-bold text-gray-800 truncate">₹{boost.dailyBudget.toLocaleString('en-IN')} / day</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-teal-700 shrink-0">
            <Eye size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">Estimated impressions</p>
            <p className="text-sm font-bold text-gray-800 truncate">
              {boost.estimatedImpressionsMin.toLocaleString('en-IN')} – {boost.estimatedImpressionsMax.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
      >
        Close
      </button>
    </div>
  );
}
