import { SellerProfile } from '../../models/SellerProfile';
import type { CustomDayOverride, CustomDayTime, DayOfWeek, WorkingHours } from '../../types';

const DAYS: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export interface TodayWorkingHours {
  day: DayOfWeek;
  date: string;
  isSpecialHours: boolean;
  time: CustomDayTime;
}

export async function getTodayWorkingHours(sellerId: string): Promise<TodayWorkingHours> {
  const profile = await SellerProfile.findOne({
    where: { userId: sellerId },
    attributes: ['workingHours', 'customDayOverride'],
  });

  if (!profile) {
    throw Object.assign(new Error('Seller not found'), { status: 404 });
  }

  const now = new Date();
  const day = DAYS[now.getDay()];
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const override = profile.customDayOverride as CustomDayOverride | null;
  if (override && override.date === date) {
    return { day, date, isSpecialHours: true, time: override.time };
  }

  const workingHours = profile.workingHours as WorkingHours;
  return { day, date, isSpecialHours: false, time: workingHours[day] };
}
