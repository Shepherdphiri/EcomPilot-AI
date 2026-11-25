import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/clients.js';
import { syncWorkspaceCatalogAndPriorities } from '../services/syncPipelineService.js';
import { generateAndDispatchDailyReport } from '../services/dailyReportService.js';

const connection = { url: env.redisUrl };

export const operationsQueue = new Queue('ecompilot-ops', { connection });

export async function scheduleRecurringJobs() {
  await operationsQueue.add(
    'sync-marketplaces',
    {},
    {
      jobId: 'recurring-sync-marketplaces',
      repeat: { pattern: '*/15 * * * *' },
      removeOnComplete: 50,
    }
  );

  await operationsQueue.add(
    'generate-daily-report',
    {},
    {
      jobId: 'recurring-daily-report-0600-sast',
      repeat: { pattern: '0 6 * * *', tz: 'Africa/Johannesburg' },
      removeOnComplete: 30,
    }
  );
}

const worker = new Worker(
  'ecompilot-ops',
  async (job) => {
    const { data: workspaces } = await supabaseAdmin.from('workspaces').select('id');
    for (const ws of workspaces || []) {
      if (job.name === 'sync-marketplaces') {
        const res = await syncWorkspaceCatalogAndPriorities(ws.id);
        console.log(`[Worker] Synced workspace ${ws.id}:`, res);
      } else if (job.name === 'generate-daily-report') {
        const report = await generateAndDispatchDailyReport(ws.id);
        console.log(`[Worker] Sent 06:00 SAST report for ${ws.id}:`, report.reportDate);
      }
    }
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.name} failed:`, err);
});

scheduleRecurringJobs()
  .then(() => console.log('[Worker] Scheduled 15m sync & 06:00 SAST daily report jobs'))
  .catch((err) => console.error('[Worker] Failed scheduling jobs:', err));
