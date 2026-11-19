import type { Request, Response } from 'express';
import { listTestCronJobs, runTestCronJob } from '../../services/admin/testCronService';
import type { TestCronJobName } from '../../services/admin/testCronService';
import { sendSuccess, handleServiceError } from '../../utils/response';

export function getTestCronJobs(_req: Request, res: Response): void {
  sendSuccess(res, { jobs: listTestCronJobs() });
}

export async function postRunTestCronJob(req: Request, res: Response): Promise<void> {
  try {
    const { job, now } = req.body as { job: TestCronJobName; now?: Date };
    const result = await runTestCronJob(job, now ? new Date(now) : undefined);
    sendSuccess(res, result, `${job} ran — ${result.notificationsCreated} notification(s) created`);
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}
