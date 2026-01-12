import { PrismaClient, Role, PayCycle } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in reverse order of dependencies)
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.orgMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Cleaned existing data');

  // Create test users
  const alice = await prisma.user.create({
    data: {
      walletAddress: '0x1234567890123456789012345678901234567890',
      email: 'alice@orbitpayroll.test',
    },
  });

  const bob = await prisma.user.create({
    data: {
      walletAddress: '0x2345678901234567890123456789012345678901',
      email: 'bob@orbitpayroll.test',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      walletAddress: '0x3456789012345678901234567890123456789012',
      email: null, // User without email
    },
  });

  console.log(`✓ Created test users: Alice, Bob, Charlie (${charlie.id.slice(0, 8)}...)`);

  // Create test organization with Alice as owner
  const acmeCorp = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      treasuryAddress: '0xaaaa567890123456789012345678901234567890',
      ownerId: alice.id,
      members: {
        create: [
          {
            userId: alice.id,
            role: Role.OWNER_ADMIN,
          },
          {
            userId: bob.id,
            role: Role.FINANCE_OPERATOR,
          },
        ],
      },
    },
  });

  console.log('✓ Created organization: Acme Corporation');


  // Create test contractors
  const contractorDev = await prisma.contractor.create({
    data: {
      orgId: acmeCorp.id,
      name: 'Dev Contractor',
      walletAddress: '0xcccc567890123456789012345678901234567890',
      rateAmount: new Decimal('5000.00000000'),
      rateCurrency: 'MNEE',
      payCycle: PayCycle.MONTHLY,
      active: true,
    },
  });

  const contractorDesigner = await prisma.contractor.create({
    data: {
      orgId: acmeCorp.id,
      name: 'Designer Contractor',
      walletAddress: '0xdddd567890123456789012345678901234567890',
      rateAmount: new Decimal('4000.00000000'),
      rateCurrency: 'MNEE',
      payCycle: PayCycle.MONTHLY,
      active: true,
    },
  });

  const contractorMarketing = await prisma.contractor.create({
    data: {
      orgId: acmeCorp.id,
      name: 'Marketing Contractor',
      walletAddress: '0xeeee567890123456789012345678901234567890',
      rateAmount: new Decimal('2500.00000000'),
      rateCurrency: 'MNEE',
      payCycle: PayCycle.BI_WEEKLY,
      active: true,
    },
  });

  // Create an inactive (soft-deleted) contractor
  await prisma.contractor.create({
    data: {
      orgId: acmeCorp.id,
      name: 'Former Contractor',
      walletAddress: '0xffff567890123456789012345678901234567890',
      rateAmount: new Decimal('3000.00000000'),
      rateCurrency: 'MNEE',
      payCycle: PayCycle.WEEKLY,
      active: false,
    },
  });

  console.log('✓ Created test contractors');

  // Create a completed payroll run
  const payrollRun1 = await prisma.payrollRun.create({
    data: {
      orgId: acmeCorp.id,
      runLabel: 'January 2026 Payroll',
      scheduledDate: new Date('2026-01-01T00:00:00Z'),
      executedAt: new Date('2026-01-01T10:30:00Z'),
      txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      totalMnee: new Decimal('11500.00000000'),
      status: 'EXECUTED',
      items: {
        create: [
          {
            contractorId: contractorDev.id,
            amountMnee: new Decimal('5000.00000000'),
            status: 'PAID',
          },
          {
            contractorId: contractorDesigner.id,
            amountMnee: new Decimal('4000.00000000'),
            status: 'PAID',
          },
          {
            contractorId: contractorMarketing.id,
            amountMnee: new Decimal('2500.00000000'),
            status: 'PAID',
          },
        ],
      },
    },
  });

  console.log('✓ Created completed payroll run');


  // Create a pending payroll run
  await prisma.payrollRun.create({
    data: {
      orgId: acmeCorp.id,
      runLabel: 'February 2026 Payroll',
      scheduledDate: new Date('2026-02-01T00:00:00Z'),
      executedAt: null,
      txHash: null,
      totalMnee: new Decimal('11500.00000000'),
      status: 'PENDING',
      items: {
        create: [
          {
            contractorId: contractorDev.id,
            amountMnee: new Decimal('5000.00000000'),
            status: 'PENDING',
          },
          {
            contractorId: contractorDesigner.id,
            amountMnee: new Decimal('4000.00000000'),
            status: 'PENDING',
          },
          {
            contractorId: contractorMarketing.id,
            amountMnee: new Decimal('2500.00000000'),
            status: 'PENDING',
          },
        ],
      },
    },
  });

  console.log('✓ Created pending payroll run');

  // Create audit events
  await prisma.event.createMany({
    data: [
      {
        orgId: acmeCorp.id,
        userId: alice.id,
        eventType: 'ORG_CREATED',
        payload: { orgName: 'Acme Corporation' },
      },
      {
        orgId: acmeCorp.id,
        userId: alice.id,
        eventType: 'CONTRACTOR_ADDED',
        payload: { contractorName: 'Dev Contractor' },
      },
      {
        orgId: acmeCorp.id,
        userId: alice.id,
        eventType: 'PAYROLL_EXECUTED',
        payload: { runId: payrollRun1.id, totalMnee: '11500.00000000' },
      },
    ],
  });

  console.log('✓ Created audit events');

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        orgId: acmeCorp.id,
        type: 'PAYROLL_COMPLETE',
        title: 'Payroll Executed Successfully',
        message: 'January 2026 payroll has been executed. Total: 11,500 MNEE',
        read: true,
      },
      {
        userId: alice.id,
        orgId: acmeCorp.id,
        type: 'PAYROLL_SCHEDULED',
        title: 'Payroll Scheduled',
        message: 'February 2026 payroll is scheduled for Feb 1, 2026',
        read: false,
      },
      {
        userId: bob.id,
        orgId: acmeCorp.id,
        type: 'MEMBER_ADDED',
        title: 'Welcome to Acme Corporation',
        message: 'You have been added as a Finance Operator',
        read: false,
      },
    ],
  });

  console.log('✓ Created notifications');

  // Create a session for Alice
  await prisma.session.create({
    data: {
      userId: alice.id,
      tokenHash: 'a'.repeat(64), // Dummy hash for testing
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  console.log('✓ Created test session');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nSummary:');
  console.log('  - 3 users (Alice, Bob, Charlie)');
  console.log('  - 1 organization (Acme Corporation)');
  console.log('  - 4 contractors (3 active, 1 inactive)');
  console.log('  - 2 payroll runs (1 executed, 1 pending)');
  console.log('  - 3 audit events');
  console.log('  - 3 notifications');
  console.log('  - 1 session');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
