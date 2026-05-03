# Future Web3 Scope: Immutable Auditing and Decentralized Payroll Settlement

This document outlines the architectural blueprint for integrating a Solana Web3 layer into our existing Web2 payroll platform. The goal is to establish an immutable audit trail and enable decentralized payroll settlements utilizing the Anchor framework.

## 1. Architectural Vision

The core principle is to use Solana's high-throughput, low-cost blockchain to act as the ultimate source of truth for payroll execution. Rather than relying solely on a centralized PostgreSQL database, the system will utilize on-chain escrows and programmatic logic to disburse funds.

### Key Components:
1. **Web2 HR/Admin Dashboard**: Where payroll periods are created, attendance is tracked, and gross wages are calculated.
2. **Backend Integration Service**: A Node.js service utilizing `@solana/web3.js` that acts as an Oracle, feeding validated gross wages to the smart contract and signing authorization transactions.
3. **Solana Smart Contract (Anchor/Rust)**: The on-chain engine responsible for securing funds, calculating deductions natively, and splitting the token transfers.

## 2. Solana Smart Contract Design

### Program State (PDAs)

1. **Treasury Escrow PDA** (`[b"treasury", company_id.as_bytes()]`)
   - **Purpose**: A secure vault holding the employer's payroll funds (e.g., USDC or a custom SPL Token).
   - **Mechanism**: The employer deposits funds here at the beginning of the pay period. The PDA authority is the only entity that can transfer funds out, controlled entirely by the program's logic.

2. **Payroll State PDA** (`[b"payroll", employee_id_hash.as_bytes(), month.as_bytes()]`)
   - **Purpose**: Tracks individual employee payment states.
   - **Mechanism**: Ensures idempotency. By deriving the address using the employee's unique hash and the specific month, the program guarantees that an employee cannot be paid twice for the same period (preventing double-spending).

### Core Instructions

- `initialize_treasury(ctx, company_id)`: Initializes the vault.
- `deposit_to_treasury(ctx, amount)`: Allows employers to top-up the payroll escrow.
- `execute_payout(ctx, employee_id_hash, month, gross_wage)`:
  - **Inputs**: The backend passes the verified `gross_wage` (which is already prorated based on attendance in the Web2 system).
  - **Logic**: Natively calculates the 12% Provident Fund (PF) and flat Professional Tax.
  - **Execution**: Performs Cross-Program Invocations (CPI) to the SPL Token Program to execute split transfers:
    - **Net Wage** -> Employee's Public Key
    - **PF Deduction** -> Company PF Reserve Wallet
    - **Tax Deduction** -> Company Tax Reserve Wallet

## 3. Web2 to Web3 Integration Layer

### Cryptographic Hashing
To preserve privacy and map Web2 records to Web3 accounts without exposing sensitive employee PII on a public ledger, the backend will generate a SHA-256 hash of the `Employee ID` + `Company ID`. This hash is used as the seed for the `Payroll State PDA`.

### Transaction Building
When an Admin clicks "Process Payrun", the backend service will:
1. Fetch all finalized salary slips.
2. Construct a batch of Solana transactions calling the `execute_payout` instruction.
3. Append an immutable memo (using the SPL Memo program) containing the Payrun ID for auditing.

### Signatures & Security
- The backend will hold a secure Authority Keypair.
- Transactions are signed by the Authority, signaling to the smart contract that the `gross_wage` data is authentic and the payout is authorized.
- Employees do not need to pay gas fees; the transaction fees are subsidized by the backend.

## 4. Execution Workflow

1. **Setup**: The employer links their Solana wallet in the Web2 dashboard and funds the Treasury Escrow PDA.
2. **Calculation**: At the end of the month, the Web2 engine calculates the total working days and prorated gross wage.
3. **Trigger**: HR approves the payrun. The backend API begins processing.
4. **On-Chain Settlement**: For each employee, the backend builds and signs the `execute_payout` transaction.
5. **Smart Contract Processing**: The Solana program verifies the Authority signature, calculates the taxes on-chain, and executes the split transfers.
6. **Audit Recording**: The backend listens for the confirmed transaction and retrieves the `TxID`.
7. **Finalization**: The `TxID` is saved directly into the PostgreSQL `SalarySlip` table (`solanaTxId` column) as a permanent, immutable receipt.

## 5. Required Database Schema Changes

To support this integration, future migrations must include:
```prisma
model Employee {
  // ... existing fields
  walletAddress String? // The employee's Solana public key
}

model SalarySlip {
  // ... existing fields
  solanaTxId String? @unique // Permanent on-chain audit receipt
}
```

## 6. Future Considerations
- **Custom SPL Tokens**: Using a custom SPL token minted specifically for the company can introduce gamification, vesting schedules, or equity matching.
- **Smart Contract Upgradability**: Implementing a multisig upgrade authority for the Anchor program.
- **Automated Tax Forwarding**: Automatically swapping the tax deductions to SOL via an on-chain DEX (like Jupiter) and routing them to a government wallet address if applicable.
