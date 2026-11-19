import * as Yup from 'yup';
import { TEST_CRON_JOB_NAMES } from '../../services/admin/testCronService';

export const runTestCronSchema = Yup.object({
  job: Yup.string().oneOf(TEST_CRON_JOB_NAMES, 'Unknown job').required('job is required'),
  now: Yup.date().typeError('now must be an ISO date-time').optional(),
});
