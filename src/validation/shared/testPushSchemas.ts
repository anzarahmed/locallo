import * as Yup from 'yup';
import { TEMPLATES } from '../../services/notifications/templates';
import { TEST_EMAIL_TYPES } from '../../services/notifications/testPushService';

export const sendTestPushSchema = Yup.object({
  type: Yup.string().oneOf(Object.keys(TEMPLATES)).required('type is required'),
  params: Yup.object().unknown(true).optional(),
});

export const sendTestEmailSchema = Yup.object({
  type: Yup.string().oneOf(TEST_EMAIL_TYPES).required('type is required'),
  params: Yup.object().unknown(true).optional(),
});
