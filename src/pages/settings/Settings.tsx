import { useEffect, useState, type JSX } from 'react';
import { Bell, Mail, MessageSquare, Tag, Heart, Store } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { getSettings, updateSettings, type NotificationSettings } from '../../services/sellerService';
import { ApiError } from '../../lib/axios';
import ToggleSwitch from '../../components/ui/ToggleSwitch';

const DEFAULT_SETTINGS: NotificationSettings = {
  pushNotifications:  true,
  emailUpdates:       true,
  smsAlerts:          false,
  offersAndPromotions: true,
  wishlistPriceDrops: true,
  sellerUpdates:      true,
};

interface NotifRow {
  key: keyof NotificationSettings;
  label: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NOTIF_ROWS: NotifRow[] = [
  { key: 'pushNotifications',  label: 'Push notifications',  description: 'Order alerts and app activity', Icon: Bell         },
  { key: 'emailUpdates',       label: 'Email updates',       description: 'Reports and account summaries',  Icon: Mail         },
  { key: 'smsAlerts',          label: 'SMS alerts',          description: 'Critical alerts via text',       Icon: MessageSquare },
  { key: 'offersAndPromotions',label: 'Offers & promotions', description: 'Deals and promotional campaigns', Icon: Tag          },
  { key: 'wishlistPriceDrops', label: 'Wishlist price drops',description: 'Notify buyers when prices drop', Icon: Heart        },
  { key: 'sellerUpdates',      label: 'Seller updates',      description: 'Platform news and policy changes',Icon: Store        },
];

function SkeletonRow(): JSX.Element {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-36 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-52 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="w-11 h-6 rounded-full bg-gray-100 animate-pulse shrink-0" />
    </div>
  );
}

export default function Settings(): JSX.Element {
  const toast = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof NotificationSettings | null>(null);

  useEffect(() => {
    getSettings()
      .then(({ notificationSettings }) => setSettings(notificationSettings ?? DEFAULT_SETTINGS))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(key: keyof NotificationSettings): Promise<void> {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(key);
    try {
      const { notificationSettings: saved } = await updateSettings(next);
      setSettings(saved ?? next);
      toast.success('Settings saved');
    } catch (err) {
      setSettings(settings);
      const msg = err instanceof ApiError ? err.message : 'Failed to save setting';
      toast.error(msg);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Teal header */}
      <div
        className="px-5 pt-10 pb-8"
        style={{ background: 'linear-gradient(135deg, #26B8B2 0%, #14817C 100%)' }}
      >
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-teal-100 text-sm mt-1">Manage your notification preferences</p>
      </div>

      <div className="px-4 -mt-4 pb-10 max-w-2xl mx-auto space-y-4">
        {/* Notifications card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
              Notifications
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {loading
              ? NOTIF_ROWS.map((r) => <SkeletonRow key={r.key} />)
              : NOTIF_ROWS.map(({ key, label, description, Icon }) => (
                  <div key={key} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                      <Icon size={17} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>
                    </div>
                    <ToggleSwitch
                      active={settings[key]}
                      onToggle={() => handleToggle(key)}
                      disabled={saving !== null}
                    />
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
