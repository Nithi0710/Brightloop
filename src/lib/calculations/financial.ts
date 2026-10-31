import { Prisma } from "@prisma/client";
import { addDays, addWeeks, addMonths, addYears, lastDayOfMonth, setDate, isLeapYear } from "date-fns";

export type DecimalLike = Prisma.Decimal | number | string;

export function toDecimal(val: DecimalLike | null | undefined): Prisma.Decimal {
  if (val === null || val === undefined) return new Prisma.Decimal(0);
  if (val instanceof Prisma.Decimal) return val;
  return new Prisma.Decimal(val.toString());
}

export function roundMoney(val: DecimalLike): Prisma.Decimal {
  const dec = toDecimal(val);
  return dec.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export interface LineCalculationInput {
  quantity: DecimalLike;
  unitPrice: DecimalLike;
  variantPrice?: DecimalLike;
  discountType?: "FIXED" | "PERCENTAGE" | null;
  discountValue?: DecimalLike | null;
  taxRate?: DecimalLike | null; // e.g. 0.18 for 18%
}

export interface LineCalculationResult {
  unitPriceTotal: Prisma.Decimal;
  baseAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
}

/**
 * Calculates line-level financials with exact decimal arithmetic:
 * Base Price = (Unit Price + Variant Price) * Quantity
 * Discount = Percentage of Base Price OR Fixed Amount
 * Taxable Amount = Base Price - Discount
 * Tax Amount = Taxable Amount * Tax Rate
 * Total = Taxable Amount + Tax Amount
 */
export function calculateLineFinancials(input: LineCalculationInput): LineCalculationResult {
  const quantity = toDecimal(input.quantity);
  const unitPrice = toDecimal(input.unitPrice);
  const variantPrice = toDecimal(input.variantPrice ?? 0);
  const combinedUnitPrice = unitPrice.plus(variantPrice);

  const baseAmount = combinedUnitPrice.times(quantity);

  let discountAmount = new Prisma.Decimal(0);
  if (input.discountType && input.discountValue) {
    const dVal = toDecimal(input.discountValue);
    if (input.discountType === "PERCENTAGE") {
      // discountValue is e.g. 10 for 10%
      discountAmount = baseAmount.times(dVal.dividedBy(100));
    } else if (input.discountType === "FIXED") {
      discountAmount = dVal;
    }
  }

  // Ensure discount does not exceed base amount
  if (discountAmount.greaterThan(baseAmount)) {
    discountAmount = baseAmount;
  }
  discountAmount = roundMoney(discountAmount);

  const taxableAmount = baseAmount.minus(discountAmount);
  const taxRate = toDecimal(input.taxRate ?? 0);
  const taxAmount = roundMoney(taxableAmount.times(taxRate));
  const subtotal = roundMoney(taxableAmount);
  const total = roundMoney(taxableAmount.plus(taxAmount));

  return {
    unitPriceTotal: roundMoney(combinedUnitPrice),
    baseAmount: roundMoney(baseAmount),
    discountAmount,
    taxableAmount,
    taxAmount,
    subtotal,
    total,
  };
}

export interface SummaryCalculationInput {
  lines: Array<{
    quantity: DecimalLike;
    unitPrice: DecimalLike;
    variantPrice?: DecimalLike;
    discountType?: "FIXED" | "PERCENTAGE" | null;
    discountValue?: DecimalLike | null;
    taxRate?: DecimalLike | null;
  }>;
}

export interface SummaryCalculationResult {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

export function calculateTotals(input: SummaryCalculationInput): SummaryCalculationResult {
  let subtotal = new Prisma.Decimal(0);
  let discountAmount = new Prisma.Decimal(0);
  let taxAmount = new Prisma.Decimal(0);
  let total = new Prisma.Decimal(0);

  for (const line of input.lines) {
    const res = calculateLineFinancials(line);
    subtotal = subtotal.plus(res.subtotal);
    discountAmount = discountAmount.plus(res.discountAmount);
    taxAmount = taxAmount.plus(res.taxAmount);
    total = total.plus(res.total);
  }

  return {
    subtotal: roundMoney(subtotal),
    discountAmount: roundMoney(discountAmount),
    taxAmount: roundMoney(taxAmount),
    total: roundMoney(total),
  };
}

/**
 * Calculates next billing date respecting month-end and leap-year edge cases
 */
export function calculateNextBillingDate(
  currentDate: Date,
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
): Date {
  const d = new Date(currentDate);

  switch (frequency) {
    case "DAILY":
      return addDays(d, 1);
    case "WEEKLY":
      return addWeeks(d, 1);
    case "MONTHLY": {
      const originalDay = d.getDate();
      const nextMonth = addMonths(d, 1);
      const lastDayOfNextMonth = lastDayOfMonth(nextMonth).getDate();
      
      // If original day was 31st and next month has 28/30 days, pin to last day
      if (originalDay > lastDayOfNextMonth) {
        return lastDayOfMonth(nextMonth);
      }
      return setDate(nextMonth, originalDay);
    }
    case "YEARLY": {
      const originalDay = d.getDate();
      const originalMonth = d.getMonth();
      // Leap year Feb 29 check
      if (originalMonth === 1 && originalDay === 29) {
        const nextYear = addYears(d, 1);
        if (!isLeapYear(nextYear)) {
          return new Date(nextYear.getFullYear(), 1, 28);
        }
      }
      return addYears(d, 1);
    }
    default:
      return addMonths(d, 1);
  }
}

