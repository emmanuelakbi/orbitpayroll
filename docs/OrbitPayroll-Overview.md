# OrbitPayroll

## What is OrbitPayroll?

OrbitPayroll is a global contractor payroll platform that lets organizations automate batched salary payouts in MNEE on Ethereum. It is designed for DAOs, crypto-native projects, and remote-first teams that pay contributors around the world and need transparent, programmable money flows instead of manual spreadsheets and ad-hoc transfers.

---

## Inspiration

Paying a global, distributed team is still painful. Founders and DAO treasurers juggle multiple wallets, track invoices in spreadsheets, and send dozens of manual transactions every month. Stablecoins like MNEE make cross-border payments easier, but most teams still lack a clean way to turn a token balance into predictable, recurring payroll.

OrbitPayroll was created to turn MNEE into a **"salary rail"** that handles recurring payouts the way modern tools handle subscriptions.

---

## What OrbitPayroll Does

OrbitPayroll lets an organization:

1. **Create an on-chain MNEE payroll treasury** controlled by the org owner.
2. **Onboard contractors** with names, wallet addresses, rates, and pay cycles.
3. **Generate a payroll preview** that shows exactly how much MNEE is needed for the next run.
4. **Execute a batched payroll transaction** that pays all eligible contractors in one on-chain operation using the official MNEE token contract: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
5. **View a transparent history** of all past payroll runs, including dates, amounts, and transaction hashes.

---

## How We Built It

### Smart Contracts

A `PayrollTreasury` contract holds MNEE for an organization, and a `PayrollManager` contract executes batched transfers to contractor wallets. Each payroll run emits events so the backend can reconcile on-chain activity with off-chain metadata.

### Backend

A Node.js/TypeScript API with a PostgreSQL database stores:

- Organizations
- Users
- Contractors
- Payroll runs
- Line items

It handles wallet-based authentication, role management (owner, finance operator), and links each payroll run to the corresponding on-chain tx hash.

### Frontend

A React/Next.js dashboard lets orgs:

- Create contractors
- Preview runs
- Check treasury balance in MNEE
- Trigger payroll

The frontend connects user wallets to the MNEE token and payroll contracts and guides them through signing transactions.

### Integrations

The app connects to an Ethereum RPC provider for:

- Reading balances
- Estimating gas
- Sending transactions with MNEE as the settlement asset

---

## Challenges We Ran Into

- **Contract architecture**: Designing a system that keeps custody with the organization's wallet while still supporting batched payouts in a single transaction.
- **Edge cases**: Handling insufficient treasury balance, failed transfers in a batch, and keeping off-chain records consistent with on-chain events.
- **UX balance**: Creating a Web3-native design that traditional finance or operations people can understand without deep blockchain knowledge.

---

## What We Learned

- Stablecoins like MNEE become much more powerful when combined with **programmable, batched flows** instead of single one-off transfers.
- Good coordination tools need both an **on-chain source of truth** for money movement and an **off-chain layer** for roles, context, and reporting.
- Clear previews, confirmations, and error handling are critical for giving non-technical users confidence when they send a multi-party on-chain transaction.

---

## What's Next for OrbitPayroll

| Feature | Description |
|---------|-------------|
| **Advanced Scheduling** | Fully automatic payroll runs with pre-authorization and guardrails |
| **Deeper Reporting** | Analytics on total spending per team, contributor, and time period |
| **Agentic Integrations** | Optional integrations with AI agents that can trigger or approve certain payouts under defined rules, extending MNEE's programmable money vision |
