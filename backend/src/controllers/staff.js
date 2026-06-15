const prisma = require('../config/db');
const timelockService = require('../services/timelock');

/**
 * POST /api/staff/verify-qr
 * Body: { studentId, messId, date }
 *
 * Staff scans a student's QR code. The frontend decodes the QR payload
 * and sends studentId, messId, date to this endpoint.
 * Backend recomputes txId on-chain and marks it as verified.
 */
async function verifyQR(req, res) {
  try {
    const { studentId, date } = req.body;

    if (!studentId || !date) {
      return res.status(400).json({ error: 'studentId and date are required' });
    }

    // Get staff's mess
    const staff = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!staff || !staff.messId) {
      return res.status(403).json({ error: 'Staff not assigned to a mess' });
    }
    const messId = staff.messId;

    // Look up the student's wallet address
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if a daily tx exists for this student
    const exists = await timelockService.hasTx(student.walletAddress, messId, date);
    if (!exists) {
      return res.status(404).json({
        error: 'No transaction found for this student today',
        verified: false,
      });
    }

    // Verify the transaction on-chain
    const txHash = await timelockService.verifyTx(student.walletAddress, messId, date);

    res.json({
      message: 'QR verified successfully',
      verified: true,
      txHash,
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
      },
    });
  } catch (err) {
    console.error('Verify QR error:', err);

    // Handle "already verified" gracefully
    if (err.message && err.message.includes('No tx found')) {
      return res.status(404).json({ error: 'No transaction found for today', verified: false });
    }

    res.status(500).json({ error: 'QR verification failed' });
  }
}

module.exports = { verifyQR };
