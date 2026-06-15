const { tokenContract } = require('../config/besu');

/**
 * Get token balance for a wallet address.
 */
async function getBalance(walletAddress) {
  const balance = await tokenContract.getBalance(walletAddress);
  return Number(balance);
}

/**
 * Mint tokens to a student's wallet (admin-only operation).
 */
async function mintTokens(studentAddress, amount) {
  const tx = await tokenContract.mintTokens(studentAddress, amount);
  await tx.wait();
  return tx.hash;
}

/**
 * Deduct tokens from a student's wallet (system operation for daily deductions).
 */
async function deductTokens(studentAddress, amount) {
  const tx = await tokenContract.deductTokens(studentAddress, amount);
  await tx.wait();
  return tx.hash;
}

/**
 * Semester enrollment — mints 2000 or 3000 tokens based on current balance.
 */
async function semesterEnrollment(studentAddress) {
  const tx = await tokenContract.semesterEnrollment(studentAddress);
  await tx.wait();
  return tx.hash;
}

module.exports = { getBalance, mintTokens, deductTokens, semesterEnrollment };
