import crypto from 'node:crypto';
import cron from 'node-cron';

const DEFAULT_CRON_SCHEDULE = '0 0 */3 * *';
const schedulerState = (globalThis.__ariLotterySchedulerState ??= {
  task: null,
  drawInProgress: false,
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry(operation, { label, retries = 3, baseDelayMs = 250 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        break;
      }

      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(`${label || 'Operation'} failed on attempt ${attempt}; retrying in ${delay}ms.`);
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function runLotteryDraw(supabaseAdmin) {
  if (!supabaseAdmin) {
    return {
      processed: false,
      reason: 'supabase_not_configured',
    };
  }

  if (schedulerState.drawInProgress) {
    return {
      processed: false,
      reason: 'draw_already_in_progress',
    };
  }

  schedulerState.drawInProgress = true;

  try {
    const activeTokens = await withRetry(
      async () => {
        const { data, error } = await supabaseAdmin
          .from('lottery_tokens')
          .select('id, user_id, token_number')
          .eq('status', 'active')
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        return data ?? [];
      },
      { label: 'Fetch active lottery tokens' },
    );

    if (activeTokens.length === 0) {
      return {
        processed: false,
        reason: 'no_active_tokens',
        active_token_count: 0,
      };
    }

    const winningIndex = crypto.randomInt(activeTokens.length);
    const winningToken = activeTokens[winningIndex];

    const data = await withRetry(
      async () => {
        const { data: rpcData, error } = await supabaseAdmin.rpc('finalize_lottery_draw', {
          p_winner_token_id: winningToken.id,
        });

        if (error) {
          throw error;
        }

        return rpcData;
      },
      { label: 'Finalize lottery draw' },
    );

    return {
      ...data,
      selected_token_id: winningToken.id,
      selected_token_number: winningToken.token_number,
    };
  } finally {
    schedulerState.drawInProgress = false;
  }
}

export function startLotteryScheduler({ supabaseAdmin, schedule = process.env.CRON_SCHEDULE } = {}) {
  const cronSchedule = schedule || DEFAULT_CRON_SCHEDULE;

  if (schedulerState.task) {
    console.warn('ARI Lottery scheduler already running; existing scheduler reused.');
    return schedulerState.task;
  }

  if (!cron.validate(cronSchedule)) {
    throw new Error(`Invalid CRON_SCHEDULE: ${cronSchedule}`);
  }

  schedulerState.task = cron.schedule(cronSchedule, async () => {
    try {
      const result = await runLotteryDraw(supabaseAdmin);
      console.log('Lottery draw completed:', result);
    } catch (error) {
      console.error('Lottery draw failed:', error);
    }
  });

  console.log(`ARI Lottery scheduler active with CRON_SCHEDULE="${cronSchedule}"`);

  return schedulerState.task;
}

export function stopLotteryScheduler() {
  if (!schedulerState.task) {
    return;
  }

  schedulerState.task.stop();
  schedulerState.task = null;
}
