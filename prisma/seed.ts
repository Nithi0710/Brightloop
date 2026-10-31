import { PrismaClient, UserRole, CustomerStatus, ProductType, ProductStatus, VariantStatus, TaxType, TaxStatus, DiscountType, DiscountStatus, BillingFrequency, PlanStatus, QuotationStatus, SubscriptionStatus, InvoiceStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, subMonths, addMonths, addYears } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Brightloop idempotent database seeding...");

  // 1. Password hash for all demo accounts
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 2. ADMIN USER
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@brightloop.io" },
    update: {},
    create: {
      email: "admin@brightloop.io",
      name: "Marcus Vance (Admin)",
      password: passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log("✔ Admin account created: admin@brightloop.io");

  // 3. STAFF USERS
  const staff1 = await prisma.user.upsert({
    where: { email: "sarah.staff@brightloop.io" },
    update: {},
    create: {
      email: "sarah.staff@brightloop.io",
      name: "Sarah Jenkins (Operations Lead)",
      password: passwordHash,
      role: UserRole.STAFF,
      isActive: true,
      managedById: adminUser.id,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "alex.staff@brightloop.io" },
    update: {},
    create: {
      email: "alex.staff@brightloop.io",
      name: "Alex Rivera (Billing Specialist)",
      password: passwordHash,
      role: UserRole.STAFF,
      isActive: true,
      managedById: adminUser.id,
    },
  });
  console.log("✔ Staff accounts created: sarah.staff@brightloop.io, alex.staff@brightloop.io");

  // 4. CUSTOMER USERS & PROFILES
  const customerUsersData = [
    {
      email: "customer@techflow.io",
      name: "Jordan Lee",
      businessName: "TechFlow Systems Inc.",
      customerId: "CUST-00001",
      phone: "+1 (415) 890-1234",
      billingAddress: "500 Howard Street, Suite 200",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      postalCode: "94105",
      taxId: "US-94-1234567",
    },
    {
      email: "billing@acmecloud.com",
      name: "Elena Rostova",
      businessName: "Acme Cloud Infrastructure",
      customerId: "CUST-00002",
      phone: "+1 (212) 555-7890",
      billingAddress: "350 5th Avenue, Floor 45",
      city: "New York",
      state: "NY",
      country: "USA",
      postalCode: "10118",
      taxId: "US-13-9876543",
    },
    {
      email: "finance@apexglobal.co",
      name: "David Kim",
      businessName: "Apex Global Logistics",
      customerId: "CUST-00003",
      phone: "+1 (312) 444-9021",
      billingAddress: "233 S Wacker Dr",
      city: "Chicago",
      state: "IL",
      country: "USA",
      postalCode: "60606",
      taxId: "US-36-5432198",
    },
    {
      email: "ops@quantumnext.io",
      name: "Sophia Martinez",
      businessName: "Quantum Digital Labs",
      customerId: "CUST-00004",
      phone: "+1 (206) 777-3322",
      billingAddress: "400 Pine Street",
      city: "Seattle",
      state: "WA",
      country: "USA",
      postalCode: "98101",
      taxId: "US-91-8765432",
    },
  ];

  const customers = [];
  for (const cData of customerUsersData) {
    const user = await prisma.user.upsert({
      where: { email: cData.email },
      update: {},
      create: {
        email: cData.email,
        name: cData.name,
        password: passwordHash,
        role: UserRole.CUSTOMER,
        isActive: true,
      },
    });

    const cust = await prisma.customer.upsert({
      where: { email: cData.email },
      update: {},
      create: {
        customerId: cData.customerId,
        userId: user.id,
        name: cData.name,
        email: cData.email,
        businessName: cData.businessName,
        phone: cData.phone,
        billingAddress: cData.billingAddress,
        city: cData.city,
        state: cData.state,
        country: cData.country,
        postalCode: cData.postalCode,
        taxId: cData.taxId,
        status: CustomerStatus.ACTIVE,
      },
    });
    customers.push(cust);
  }
  console.log(`✔ ${customers.length} Customers created with dedicated portal logins`);

  // 5. TAXES
  const taxGST = await prisma.tax.upsert({
    where: { id: "tax-gst-18" },
    update: {},
    create: {
      id: "tax-gst-18",
      name: "GST 18%",
      rate: 0.18,
      type: TaxType.PERCENTAGE,
      description: "Standard Goods & Services Tax",
      isDefault: true,
      status: TaxStatus.ACTIVE,
    },
  });

  const taxVAT = await prisma.tax.upsert({
    where: { id: "tax-vat-20" },
    update: {},
    create: {
      id: "tax-vat-20",
      name: "VAT 20%",
      rate: 0.20,
      type: TaxType.PERCENTAGE,
      description: "European Value Added Tax",
      isDefault: false,
      status: TaxStatus.ACTIVE,
    },
  });

  const taxSales = await prisma.tax.upsert({
    where: { id: "tax-sales-8" },
    update: {},
    create: {
      id: "tax-sales-8",
      name: "State Sales Tax 8.25%",
      rate: 0.0825,
      type: TaxType.PERCENTAGE,
      description: "US Municipal & State Sales Tax",
      isDefault: false,
      status: TaxStatus.ACTIVE,
    },
  });
  console.log("✔ Tax configurations created");

  // 6. DISCOUNTS
  const discountWelcome = await prisma.discount.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      name: "Welcome Onboarding Discount",
      code: "WELCOME10",
      type: DiscountType.PERCENTAGE,
      value: 10, // 10%
      maxUsageCount: 50,
      currentUsage: 8,
      status: DiscountStatus.ACTIVE,
      description: "10% off initial subscription billing",
    },
  });

  const discountEnterprise = await prisma.discount.upsert({
    where: { code: "ENTERPRISE200" },
    update: {},
    create: {
      name: "Enterprise Annual Credit",
      code: "ENTERPRISE200",
      type: DiscountType.FIXED,
      value: 200, // $200 off
      minPurchase: 1000,
      maxUsageCount: 20,
      currentUsage: 3,
      status: DiscountStatus.ACTIVE,
      description: "$200 fixed credit on annual purchases above $1,000",
    },
  });

  const discountExpired = await prisma.discount.upsert({
    where: { code: "SUMMER2023" },
    update: {},
    create: {
      name: "Summer 2023 Flash Sale",
      code: "SUMMER2023",
      type: DiscountType.PERCENTAGE,
      value: 25,
      startDate: subMonths(new Date(), 14),
      endDate: subMonths(new Date(), 12),
      status: DiscountStatus.EXPIRED,
      description: "Expired flash campaign",
    },
  });
  console.log("✔ Discounts created (Active & Expired)");

  // 7. PRODUCTS & VARIANTS
  const prodPlatform = await prisma.product.upsert({
    where: { id: "prod-platform-saas" },
    update: {},
    create: {
      id: "prod-platform-saas",
      name: "Brightloop Core Subscription Engine",
      type: ProductType.SOFTWARE,
      salesPrice: 499.00,
      costPrice: 85.00,
      description: "Automated recurring billing, invoicing, and subscription lifecycle orchestration engine.",
      status: ProductStatus.ACTIVE,
      variants: {
        create: [
          { name: "Standard Cluster", priceAdjustment: 0, status: VariantStatus.ACTIVE },
          { name: "Dedicated VPC (Odoo / ERP Connector)", priceAdjustment: 250.00, status: VariantStatus.ACTIVE },
          { name: "High-Availability Multi-Region Enterprise", priceAdjustment: 600.00, status: VariantStatus.ACTIVE },
        ],
      },
    },
    include: { variants: true },
  });

  const prodAnalytics = await prisma.product.upsert({
    where: { id: "prod-analytics-pro" },
    update: {},
    create: {
      id: "prod-analytics-pro",
      name: "Revenue Intelligence & Churn Analytics",
      type: ProductType.SOFTWARE,
      salesPrice: 199.00,
      costPrice: 30.00,
      description: "Real-time MRR, ARR, cohort analysis, and predictive churn indicators.",
      status: ProductStatus.ACTIVE,
      variants: {
        create: [
          { name: "Base Analytics", priceAdjustment: 0, status: VariantStatus.ACTIVE },
          { name: "Custom Data Warehouse Connector", priceAdjustment: 120.00, status: VariantStatus.ACTIVE },
        ],
      },
    },
    include: { variants: true },
  });

  const prodSLA = await prisma.product.upsert({
    where: { id: "prod-sla-addon" },
    update: {},
    create: {
      id: "prod-sla-addon",
      name: "24/7 Enterprise Mission-Critical SLA",
      type: ProductType.SERVICE,
      salesPrice: 350.00,
      costPrice: 90.00,
      description: "15-minute response time SLA with dedicated technical account manager.",
      status: ProductStatus.ACTIVE,
    },
  });
  console.log("✔ Products and Variants created");

  // 8. PLANS (DAILY, WEEKLY, MONTHLY, YEARLY, and CUSTOM PLANS)
  const planDaily = await prisma.plan.upsert({
    where: { id: "plan-daily-trial" },
    update: {},
    create: {
      id: "plan-daily-trial",
      name: "Daily High-Frequency Testing Plan",
      productId: prodPlatform.id,
      billingFrequency: BillingFrequency.DAILY,
      billingPrice: 25.00,
      minQuantity: 1,
      allowPause: true,
      allowRenewal: true,
      description: "Daily automated billing cycle for load testing and short-term sandboxing.",
      status: PlanStatus.ACTIVE,
    },
  });

  const planWeekly = await prisma.plan.upsert({
    where: { id: "plan-weekly-starter" },
    update: {},
    create: {
      id: "plan-weekly-starter",
      name: "Weekly Agile Sprint Plan",
      productId: prodPlatform.id,
      billingFrequency: BillingFrequency.WEEKLY,
      billingPrice: 125.00,
      minQuantity: 1,
      allowPause: true,
      allowRenewal: true,
      description: "Sprint-based billing cycle invoiced every 7 days.",
      status: PlanStatus.ACTIVE,
    },
  });

  const planMonthly = await prisma.plan.upsert({
    where: { id: "plan-monthly-pro" },
    update: {},
    create: {
      id: "plan-monthly-pro",
      name: "Professional Growth Plan",
      productId: prodPlatform.id,
      billingFrequency: BillingFrequency.MONTHLY,
      billingPrice: 499.00,
      minQuantity: 1,
      allowPause: true,
      allowRenewal: true,
      allowEarlyClosure: true,
      description: "Standard monthly recurring subscription for scaling teams.",
      status: PlanStatus.ACTIVE,
    },
  });

  const planYearly = await prisma.plan.upsert({
    where: { id: "plan-yearly-enterprise" },
    update: {},
    create: {
      id: "plan-yearly-enterprise",
      name: "Enterprise Annual Contract",
      productId: prodPlatform.id,
      billingFrequency: BillingFrequency.YEARLY,
      billingPrice: 4990.00, // 2 months free equivalent
      minQuantity: 1,
      allowPause: false,
      allowRenewal: true,
      description: "Annual multi-seat contract with guaranteed uptime commitment.",
      status: PlanStatus.ACTIVE,
    },
  });

  // Custom Plans (User requested: "also add some custom plans to see")
  const planCustomUsage = await prisma.plan.upsert({
    where: { id: "plan-custom-fintech" },
    update: {},
    create: {
      id: "plan-custom-fintech",
      name: "Custom FinTech High-Volume Tier",
      productId: prodPlatform.id,
      billingFrequency: BillingFrequency.MONTHLY,
      billingPrice: 1250.00,
      minQuantity: 5,
      allowPause: true,
      allowRenewal: true,
      allowEarlyClosure: false,
      autoClose: false,
      description: "Custom negotiated enterprise subscription for automated banking reconciliation pipelines.",
      status: PlanStatus.ACTIVE,
    },
  });

  const planCustomGov = await prisma.plan.upsert({
    where: { id: "plan-custom-gov-cloud" },
    update: {},
    create: {
      id: "plan-custom-gov-cloud",
      name: "Custom GovCloud Compliance Suite",
      productId: prodPlatform.id,
      billingFrequency: BillingFrequency.YEARLY,
      billingPrice: 8500.00,
      minQuantity: 1,
      allowPause: false,
      allowRenewal: true,
      autoClose: true,
      availableFrom: subMonths(new Date(), 3),
      availableUntil: addYears(new Date(), 2),
      description: "FedRAMP & SOC2 compliant dedicated instance with isolated cryptographic keys.",
      status: PlanStatus.ACTIVE,
    },
  });
  console.log("✔ Plans created: Daily, Weekly, Monthly, Yearly + Custom Enterprise Tiers");

  // 9. QUOTATION TEMPLATES
  const templateStandard = await prisma.quotationTemplate.upsert({
    where: { id: "tmpl-saas-standard" },
    update: {},
    create: {
      id: "tmpl-saas-standard",
      name: "Standard SaaS Onboarding Template",
      description: "Pre-configured quotation bundle for standard growth customers.",
      defaultPlanId: planMonthly.id,
      validityDays: 30,
      termsAndConditions: "Net 30 days payment terms. Annual pricing locked for 12 months. Uptime SLA 99.9%.",
      isActive: true,
      lines: {
        create: [
          { productId: prodPlatform.id, description: "Brightloop Core Engine (Monthly)", quantity: 1, unitPrice: 499.00, sortOrder: 0 },
          { productId: prodAnalytics.id, description: "Revenue Intelligence Addon", quantity: 1, unitPrice: 199.00, sortOrder: 1 },
        ],
      },
    },
  });
  console.log("✔ Quotation templates created");

  // 10. SAMPLE QUOTATIONS
  const quote1 = await prisma.quotation.upsert({
    where: { quotationNumber: "QUO-2024-001" },
    update: {},
    create: {
      quotationNumber: "QUO-2024-001",
      customerId: customers[0].id,
      planId: planMonthly.id,
      templateId: templateStandard.id,
      title: "TechFlow Enterprise Rollout Proposal",
      status: QuotationStatus.CONFIRMED,
      validUntil: addDays(new Date(), 15),
      subtotal: 698.00,
      discountAmount: 69.80,
      taxAmount: 113.08,
      total: 741.28,
      termsAndConditions: "Standard Net 30 terms.",
      lines: {
        create: [
          {
            productId: prodPlatform.id,
            description: "Brightloop Core Subscription Engine",
            quantity: 1,
            unitPrice: 499.00,
            discountType: DiscountType.PERCENTAGE,
            discountValue: 10,
            discountAmount: 49.90,
            taxRate: 0.18,
            taxAmount: 80.84,
            subtotal: 449.10,
            total: 529.94,
          },
          {
            productId: prodAnalytics.id,
            description: "Revenue Intelligence & Churn Analytics",
            quantity: 1,
            unitPrice: 199.00,
            discountType: DiscountType.PERCENTAGE,
            discountValue: 10,
            discountAmount: 19.90,
            taxRate: 0.18,
            taxAmount: 32.24,
            subtotal: 179.10,
            total: 211.34,
          },
        ],
      },
    },
  });
  console.log("✔ Quotations created");

  // 11. ACTIVE, PAUSED, AND CLOSED SUBSCRIPTIONS
  // Active Monthly Subscription (due today for billing engine showcase!)
  const subActive = await prisma.subscription.upsert({
    where: { subscriptionNumber: "SUB-2024-001" },
    update: {},
    create: {
      subscriptionNumber: "SUB-2024-001",
      customerId: customers[0].id,
      planId: planMonthly.id,
      quotationId: quote1.id,
      status: SubscriptionStatus.ACTIVE,
      startDate: subMonths(new Date(), 2),
      nextBillingDate: new Date(), // Due right now for scheduler demonstration
      billingFrequency: BillingFrequency.MONTHLY,
      paymentTerms: 30,
      subtotal: 698.00,
      taxAmount: 125.64,
      total: 823.64,
      activatedAt: subMonths(new Date(), 2),
      lines: {
        create: [
          {
            productId: prodPlatform.id,
            description: "Brightloop Core Subscription Engine",
            quantity: 1,
            unitPrice: 499.00,
            taxRate: 0.18,
            taxAmount: 89.82,
            subtotal: 499.00,
            total: 588.82,
          },
          {
            productId: prodAnalytics.id,
            description: "Revenue Intelligence & Churn Analytics",
            quantity: 1,
            unitPrice: 199.00,
            taxRate: 0.18,
            taxAmount: 35.82,
            subtotal: 199.00,
            total: 234.82,
          },
        ],
      },
      events: {
        create: [
          { eventType: "CREATED", description: "Subscription created from quotation QUO-2024-001" },
          { eventType: "ACTIVATED", description: "Subscription activated by staff" },
        ],
      },
    },
  });

  // Paused Subscription
  const subPaused = await prisma.subscription.upsert({
    where: { subscriptionNumber: "SUB-2024-002" },
    update: {},
    create: {
      subscriptionNumber: "SUB-2024-002",
      customerId: customers[1].id,
      planId: planWeekly.id,
      status: SubscriptionStatus.PAUSED,
      startDate: subMonths(new Date(), 1),
      nextBillingDate: addDays(new Date(), 14),
      billingFrequency: BillingFrequency.WEEKLY,
      paymentTerms: 14,
      subtotal: 125.00,
      taxAmount: 22.50,
      total: 147.50,
      pausedAt: subDays(new Date(), 3),
      lines: {
        create: [
          {
            productId: prodPlatform.id,
            description: "Weekly Agile Sprint Plan",
            quantity: 1,
            unitPrice: 125.00,
            taxRate: 0.18,
            taxAmount: 22.50,
            subtotal: 125.00,
            total: 147.50,
          },
        ],
      },
      events: {
        create: [
          { eventType: "CREATED", description: "Subscription created" },
          { eventType: "ACTIVATED", description: "Subscription activated" },
          { eventType: "PAUSED", description: "Subscription paused at customer request" },
        ],
      },
    },
  });

  // Closed Subscription
  const subClosed = await prisma.subscription.upsert({
    where: { subscriptionNumber: "SUB-2024-003" },
    update: {},
    create: {
      subscriptionNumber: "SUB-2024-003",
      customerId: customers[2].id,
      planId: planDaily.id,
      status: SubscriptionStatus.CLOSED,
      startDate: subMonths(new Date(), 3),
      endDate: subMonths(new Date(), 1),
      billingFrequency: BillingFrequency.DAILY,
      paymentTerms: 7,
      subtotal: 25.00,
      total: 25.00,
      closedAt: subMonths(new Date(), 1),
      lines: {
        create: [
          {
            productId: prodPlatform.id,
            description: "Daily High-Frequency Testing Plan",
            quantity: 1,
            unitPrice: 25.00,
            subtotal: 25.00,
            total: 25.00,
          },
        ],
      },
      events: {
        create: [
          { eventType: "CREATED", description: "Subscription created" },
          { eventType: "CLOSED", description: "Completed contract duration" },
        ],
      },
    },
  });
  console.log("✔ Subscriptions created (Active, Paused, Closed)");

  // 12. INVOICES (PAID, PARTIALLY PAID, CONFIRMED/OVERDUE)
  // Fully Paid Invoice
  const invPaid = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-202409-0001" },
    update: {},
    create: {
      invoiceNumber: "INV-202409-0001",
      customerId: customers[0].id,
      subscriptionId: subActive.id,
      status: InvoiceStatus.PAID,
      invoiceDate: subMonths(new Date(), 1),
      dueDate: subDays(new Date(), 1),
      subtotal: 698.00,
      taxAmount: 125.64,
      total: 823.64,
      paidAmount: 823.64,
      outstandingAmount: 0.00,
      paidAt: subDays(new Date(), 5),
      idempotencyKey: `sub-${subActive.id}-${subMonths(new Date(), 1).toISOString().slice(0, 10)}`,
      lines: {
        create: [
          {
            productId: prodPlatform.id,
            description: "Brightloop Core Engine (Monthly)",
            quantity: 1,
            unitPrice: 499.00,
            taxRate: 0.18,
            taxAmount: 89.82,
            subtotal: 499.00,
            total: 588.82,
          },
          {
            productId: prodAnalytics.id,
            description: "Revenue Intelligence & Churn Analytics",
            quantity: 1,
            unitPrice: 199.00,
            taxRate: 0.18,
            taxAmount: 35.82,
            subtotal: 199.00,
            total: 234.82,
          },
        ],
      },
    },
  });

  // Partially Paid Invoice
  const invPartial = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-202410-0002" },
    update: {},
    create: {
      invoiceNumber: "INV-202410-0002",
      customerId: customers[1].id,
      status: InvoiceStatus.PARTIALLY_PAID,
      invoiceDate: subDays(new Date(), 15),
      dueDate: addDays(new Date(), 15),
      subtotal: 1500.00,
      taxAmount: 270.00,
      total: 1770.00,
      paidAmount: 1000.00,
      outstandingAmount: 770.00,
      lines: {
        create: [
          {
            productId: prodPlatform.id,
            description: "Enterprise Onboarding Consulting Pack",
            quantity: 1,
            unitPrice: 1500.00,
            taxRate: 0.18,
            taxAmount: 270.00,
            subtotal: 1500.00,
            total: 1770.00,
          },
        ],
      },
    },
  });

  // Overdue Confirmed Invoice
  const invOverdue = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-202409-0003" },
    update: {},
    create: {
      invoiceNumber: "INV-202409-0003",
      customerId: customers[2].id,
      status: InvoiceStatus.CONFIRMED,
      invoiceDate: subMonths(new Date(), 2),
      dueDate: subMonths(new Date(), 1), // Past due date
      subtotal: 450.00,
      taxAmount: 81.00,
      total: 531.00,
      paidAmount: 0.00,
      outstandingAmount: 531.00,
      lines: {
        create: [
          {
            productId: prodSLA.id,
            description: "24/7 Enterprise Mission-Critical SLA (Quarterly)",
            quantity: 1,
            unitPrice: 450.00,
            taxRate: 0.18,
            taxAmount: 81.00,
            subtotal: 450.00,
            total: 531.00,
          },
        ],
      },
    },
  });
  console.log("✔ Invoices created: Paid, Partially Paid, and Overdue");

  // 13. PAYMENTS & ALLOCATIONS
  // Payment 1: Full settlement for INV-202409-0001
  const pay1 = await prisma.payment.upsert({
    where: { paymentReference: "PAY-REF-99201" },
    update: {},
    create: {
      paymentReference: "PAY-REF-99201",
      customerId: customers[0].id,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      amount: 823.64,
      paymentDate: subDays(new Date(), 5),
      recordedById: staff1.id,
      status: PaymentStatus.COMPLETED,
      notes: "Wire transfer wire confirmation WT-88392",
      allocations: {
        create: [
          { invoiceId: invPaid.id, amount: 823.64 },
        ],
      },
    },
  });

  // Payment 2: Partial payment for INV-202410-0002
  const pay2 = await prisma.payment.upsert({
    where: { paymentReference: "PAY-REF-99202" },
    update: {},
    create: {
      paymentReference: "PAY-REF-99202",
      customerId: customers[1].id,
      paymentMethod: PaymentMethod.CARD,
      amount: 1000.00,
      paymentDate: subDays(new Date(), 10),
      recordedById: staff2.id,
      status: PaymentStatus.COMPLETED,
      notes: "First installment via Corporate Credit Card",
      allocations: {
        create: [
          { invoiceId: invPartial.id, amount: 1000.00 },
        ],
      },
    },
  });
  console.log("✔ Payments and Allocations recorded");

  // 14. AUDIT LOGS
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: "SEED_INIT",
        resource: "SYSTEM",
        description: "Initial database seed data populated with enterprise SaaS records.",
      },
      {
        userId: staff1.id,
        action: "RECORD_PAYMENT",
        resource: "PAYMENT",
        resourceId: pay1.id,
        description: "Recorded bank wire transfer PAY-REF-99201 for $823.64",
      },
    ],
  });

  // 15. IN-APP NOTIFICATIONS
  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        type: "BILLING",
        title: "Automated Billing Ready",
        message: "Subscription SUB-2024-001 has reached its scheduled billing date and is queued for processing.",
      },
      {
        userId: customers[0].userId!,
        type: "INVOICE",
        title: "Payment Receipt Confirmation",
        message: "Thank you! Payment of $823.64 has been applied to invoice INV-202409-0001.",
      },
    ],
  });

  console.log("🎉 Brightloop Database Seeding Finished Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

