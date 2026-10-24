import * as Yup from 'yup';
import { TEMPLATES } from '../../services/notifications/templates';

export const sendTestPushSchema = Yup.object({
  type: Yup.string().oneOf(Object.keys(TEMPLATES)).required('type is required'),
  params: Yup.object().unknown(true).optional(),
});
