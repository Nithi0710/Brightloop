import {
  calculateLineFinancials,
  calculateTotals,
  calculateNextBillingDate,
} from "../src/lib/calculations/financial";
import { passwordValidation } from "../src/lib/validations";
import { Prisma } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
}

async function runAllTests() {
  console.log("🧪 Running Brightloop Core Financial & Validation Unit Tests...\n");

  // TEST 1: Password Complexity
  console.log("Test 1: Password validation requirements");
  assert(passwordValidation.safeParse("Password123!").success === true, "Valid strong password should pass");
  assert(passwordValidation.safeParse("short1!").success === false, "Passwords <= 8 chars must fail");
  assert(passwordValidation.safeParse("alllowercase123!").success === false, "Missing uppercase must fail");
  assert(passwordValidation.safeParse("ALLUPPERCASE123!").success === false, "Missing lowercase must fail");
  assert(passwordValidation.safeParse("NoSpecialChar123").success === false, "Missing special char must fail");
  console.log("✔ Password validation passed.\n");

  // TEST 2: Line Calculation without discount or tax
  console.log("Test 2: Base line calculation");
  const line1 = calculateLineFinancials({
    quantity: 2,
    unitPrice: 500,
    variantPrice: 0,
  });
  assert(line1.baseAmount.equals(new Prisma.Decimal(1000)), "Base amount should be 1000");
  assert(line1.discountAmount.equals(new Prisma.Decimal(0)), "Discount amount should be 0");
  assert(line1.taxAmount.equals(new Prisma.Decimal(0)), "Tax amount should be 0");
  assert(line1.total.equals(new Prisma.Decimal(1000)), "Total should be 1000");
  console.log("✔ Base calculation passed.\n");

  // TEST 3: Variant Price Adjustments
  console.log("Test 3: Variant pricing (Base: 5000 + Odoo Variant: 560)");
  const lineVariant = calculateLineFinancials({
    quantity: 1,
    unitPrice: 5000,
    variantPrice: 560,
  });
  assert(lineVariant.unitPriceTotal.equals(new Prisma.Decimal(5560)), "Combined unit price should be 5560");
  assert(lineVariant.total.equals(new Prisma.Decimal(5560)), "Total should be 5560");
  console.log("✔ Variant price calculation passed.\n");

  // TEST 4: Percentage Discount + 18% Tax
  console.log("Test 4: Percentage discount and tax calculation");
  const lineDiscountTax = calculateLineFinancials({
    quantity: 1,
    unitPrice: 1000,
    discountType: "PERCENTAGE",
    discountValue: 10, // 10% off -> $100 off -> Taxable: $900
    taxRate: 0.18,      // 18% tax on $900 = $162 -> Total: $1062
  });
  assert(lineDiscountTax.discountAmount.equals(new Prisma.Decimal(100)), "Discount should be $100");
  assert(lineDiscountTax.taxableAmount.equals(new Prisma.Decimal(900)), "Taxable should be $900");
  assert(lineDiscountTax.taxAmount.equals(new Prisma.Decimal(162)), "Tax amount should be $162");
  assert(lineDiscountTax.total.equals(new Prisma.Decimal(1062)), "Total should be $1062");
  console.log("✔ Discount & tax calculation passed.\n");

  // TEST 5: Fixed Discount
  console.log("Test 5: Fixed amount discount");
  const lineFixed = calculateLineFinancials({
    quantity: 1,
    unitPrice: 500,
    discountType: "FIXED",
    discountValue: 75,
    taxRate: 0,
  });
  assert(lineFixed.discountAmount.equals(new Prisma.Decimal(75)), "Discount should be $75");
  assert(lineFixed.total.equals(new Prisma.Decimal(425)), "Total should be $425");
  console.log("✔ Fixed discount calculation passed.\n");

  // TEST 6: Next Billing Date - Month-End Edge Cases
  console.log("Test 6: Month-end date arithmetic (Jan 31 -> Feb 28/29)");
  const jan31 = new Date("2024-01-31T00:00:00Z");
  const febDate = calculateNextBillingDate(jan31, "MONTHLY");
  // 2024 is a leap year, February has 29 days
  assert(febDate.getDate() === 29, "Jan 31 in leap year should pin to Feb 29");
  console.log("✔ Month-end date arithmetic passed.\n");

  // TEST 7: Next Billing Date - Leap Year Yearly Renewal
  console.log("Test 7: Leap year Feb 29 yearly renewal (2024-02-29 -> 2025-02-28)");
  const leapFeb29 = new Date(2024, 1, 29);
  const nextYearFeb = calculateNextBillingDate(leapFeb29, "YEARLY");
  assert(nextYearFeb.getDate() === 28, "Feb 29 next non-leap year should pin to Feb 28");
  console.log("✔ Leap year yearly renewal passed.\n");

  // TEST 8: Daily and Weekly Cadence
  console.log("Test 8: Daily and Weekly Cadence");
  const startD = new Date("2024-05-10T12:00:00Z");
  const nextDaily = calculateNextBillingDate(startD, "DAILY");
  const nextWeekly = calculateNextBillingDate(startD, "WEEKLY");
  assert(nextDaily.getDate() === 11, "Daily should increment by 1 day");
  assert(nextWeekly.getDate() === 17, "Weekly should increment by 7 days");
  console.log("✔ Daily and weekly arithmetic passed.\n");

  console.log("🎉 ALL 8 UNIT TESTS PASSED WITH 100% SUCCESS!");
}

runAllTests().catch((e) => {
  console.error(e);
  process.exit(1);
});

