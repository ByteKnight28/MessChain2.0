const cron = require('node-cron');
const prisma = require('../config/db');
const tokenService = require('../services/token');
const timelockService = require('../services/timelock');
const rebateService = require('../services/rebate');
const { tenderRateContract } = require('../config/besu');

/**
 * Get today's date as a Unix timestamp at midnight (start of day, UTC).
 */
function getTodayTimestamp() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.floor(today.getTime() / 1000);
}

/**
 * Midnight cron job — runs at 00:00 every day.
 *
 * For each student:
 * 1. Check if rebate is active (on-chain) → skip if yes
 * 2. Get current daily rate from TenderRate contract
 * 3. Check token balance → skip if insufficient
 * 4. Create daily time-locked tx + deduct tokens
 */
async function runMidnightJob() {
  console.log('[CRON] Midnight job started at', new Date().toISOString());

  try {
    const today = getTodayTimestamp();
    const dailyRate = Number(await tenderRateContract.getCurrentRate());

    console.log(`[CRON] Today timestamp: ${today}, Daily rate: ${dailyRate} tokens`);

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        walletAddress: true,
        messId: true,
      },
    });

    console.log(`[CRON] Processing ${students.length} students`);

    let processed = 0;
    let skippedRebate = 0;
    let skippedBalance = 0;
    let skippedNoMess = 0;
    let errors = 0;

    for (const student of students) {
      try {
        // Skip if student has no mess assigned
        if (!student.messId) {
          console.log(`[CRON] Skipped ${student.name}: no mess assigned`);
          skippedNoMess++;
          continue;
        }

        // Check rebate on-chain (tamper-proof)
        const rebateActive = await rebateService.isRebateActive(
          student.walletAddress,
          today
        );
        if (rebateActive) {
          console.log(`[CRON] Skipped ${student.name}: rebate active`);
          skippedRebate++;
          continue;
        }

        // Check balance
        const balance = await tokenService.getBalance(student.walletAddress);
        if (balance < dailyRate) {
          console.log(`[CRON] Skipped ${student.name}: insufficient balance (${balance} < ${dailyRate})`);
          skippedBalance++;
          continue;
        }

        // Check if tx already exists (prevents duplicate runs)
        const exists = await timelockService.hasTx(student.walletAddress, student.messId, today);
        if (exists) {
           console.log(`[CRON] Skipped ${student.name}: tx already exists`);
           continue;
        }

        // Create daily tx and deduct tokens
        await timelockService.createDailyTx(
          student.walletAddress,
          student.messId,
          today
        );
        await tokenService.deductTokens(student.walletAddress, dailyRate);

        console.log(`[CRON] Processed ${student.name}: deducted ${dailyRate} tokens`);
        processed++;
      } catch (studentErr) {
        console.error(`[CRON] Error processing ${student.name}:`, studentErr.message);
        errors++;
      }
    }

    console.log(`[CRON] Midnight job complete: processed=${processed}, skippedRebate=${skippedRebate}, skippedBalance=${skippedBalance}, skippedNoMess=${skippedNoMess}, errors=${errors}`);
    return { processed, skippedRebate, skippedBalance, skippedNoMess, errors };
  } catch (err) {
    console.error('[CRON] Midnight job failed:', err);
    throw err;
  }
}

function startMidnightJob() {
  cron.schedule('0 0 * * *', async () => {
    await runMidnightJob();
  });

  console.log('[CRON] Midnight job scheduled (0 0 * * *)');
}

module.exports = { startMidnightJob, runMidnightJob, getTodayTimestamp };
