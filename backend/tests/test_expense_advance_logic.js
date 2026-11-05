const assert = require('assert');

// Test the financial calculation rules specified in Phase 7 & Phase 12

console.log('--- Testing Financial Ledger & Settlement Calculation Logic ---');

// Scenario 1: Advance Issuance
let openingBalance = 0;
let totalAdvancesIssued = 0;
let totalExpensesAdjusted = 0;
let totalRefundsReceived = 0;
let totalReimbursementsPaid = 0;

const calculateCurrentAdvanceBalance = () => {
  return openingBalance + totalAdvancesIssued - totalExpensesAdjusted - totalRefundsReceived;
};

// 1. Issue an advance of ₹10,000 to an employee
const advanceTxn = {
  transactionId: 'ADV-20261103-TEST1',
  transactionType: 'ADVANCE_ISSUED',
  amount: 10000,
};
totalAdvancesIssued += advanceTxn.amount;
assert.strictEqual(calculateCurrentAdvanceBalance(), 10000, 'Step 1: Balance should be 10,000');
console.log('✓ Step 1: Advance issued ₹10,000 -> Balance = ₹10,000');

// 2. Submit an expense claim for ₹2,000
const claim1 = {
  claimId: 'CLM-001',
  amount: 2000,
  status: 'Pending',
  settlementStatus: 'UNSETTLED',
};
// Rule: Pending claims must NOT affect advance balance
assert.strictEqual(calculateCurrentAdvanceBalance(), 10000, 'Step 2: Pending claim must not affect advance balance');
console.log('✓ Step 2: Pending claim submitted ₹2,000 -> Balance remains ₹10,000');

// 3. Approve the claim
claim1.status = 'Approved';
claim1.approvedAmount = 2000;
claim1.settlementStatus = 'UNSETTLED';
// Rule: Approval ALONE must not deduct the advance
assert.strictEqual(calculateCurrentAdvanceBalance(), 10000, 'Step 3: Approval alone must not deduct advance');
console.log('✓ Step 3: Claim approved (Unsettled) -> Balance remains ₹10,000');

// 4. Select Adjust Against Advance for ₹2,000
claim1.settlementStatus = 'SETTLED_ADVANCE';
claim1.settlementType = 'ADVANCE_ADJUSTMENT';
claim1.settledAmount = 2000;
totalExpensesAdjusted += claim1.settledAmount;
assert.strictEqual(calculateCurrentAdvanceBalance(), 8000, 'Step 4: Balance must become 8,000');
console.log('✓ Step 4: Adjusted against advance ₹2,000 -> Balance = ₹8,000');

// 5. Submit another claim using personal funds for ₹1,500
const claim2 = {
  claimId: 'CLM-002',
  amount: 1500,
  status: 'Pending',
  settlementStatus: 'UNSETTLED',
};
assert.strictEqual(calculateCurrentAdvanceBalance(), 8000, 'Step 5: Pending claim must not affect advance');
console.log('✓ Step 5: Personal claim submitted ₹1,500 -> Balance remains ₹8,000');

// 6. Approve and reimburse it
claim2.status = 'Approved';
claim2.settlementStatus = 'REIMBURSED';
claim2.settlementType = 'REIMBURSEMENT';
claim2.settledAmount = 1500;
totalReimbursementsPaid += claim2.settledAmount;
// Rule: Reimbursements paid must NOT reduce the corporate advance balance
assert.strictEqual(calculateCurrentAdvanceBalance(), 8000, 'Step 6: Reimbursement must not reduce advance balance');
assert.strictEqual(totalReimbursementsPaid, 1500, 'Step 6: Reimbursement tracked separately');
console.log('✓ Step 6: Claim approved and reimbursed ₹1,500 -> Advance balance remains ₹8,000');

// 7. Employee refunds ₹3,000 unspent cash back to company
const refundTxn = {
  transactionId: 'REF-20261103-TEST1',
  transactionType: 'ADVANCE_REFUND',
  amount: 3000,
};
totalRefundsReceived += refundTxn.amount;
assert.strictEqual(calculateCurrentAdvanceBalance(), 5000, 'Step 7: Balance after ₹3,000 refund should be 5,000');
console.log('✓ Step 7: Advance refund returned ₹3,000 -> Balance = ₹5,000');

// 8. Test Chronological Running Balance Reconciliation
const ledgerHistory = [
  advanceTxn,
  { transactionType: 'EXPENSE_ADJUSTMENT', amount: 2000 },
  { transactionType: 'REIMBURSEMENT_PAID', amount: 1500 },
  refundTxn,
];

let running = 0;
const statementRows = ledgerHistory.map((t) => {
  if (t.transactionType === 'ADVANCE_ISSUED') running += t.amount;
  else if (t.transactionType === 'EXPENSE_ADJUSTMENT') running -= t.amount;
  else if (t.transactionType === 'ADVANCE_REFUND') running -= t.amount;
  // REIMBURSEMENT_PAID does not modify advance running balance
  return { ...t, runningBalance: running };
});

assert.strictEqual(statementRows[statementRows.length - 1].runningBalance, 5000, 'Reconciliation: Running balance must equal 5,000');
console.log('✓ Step 8: Chronological running balance reconciles perfectly with Current Advance Balance (₹5,000)');

console.log('--- ALL FINANCIAL LOGIC TESTS PASSED SUCCESSFULLY! ---');
