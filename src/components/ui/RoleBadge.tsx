import type { JSX } from 'react';
import { ROLE_BADGE_CLASSES } from '../../lib/constants';

interface RoleBadgeProps {
  role: string;
}

export default function RoleBadge({ role }: RoleBadgeProps): JSX.Element {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE_CLASSES[role] ?? ''}`}>
      {role}
    </span>
  );
}
