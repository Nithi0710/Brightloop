import { z } from "zod";

// ==========================================
// AUTHENTICATION VALIDATIONS
// ==========================================

export const passwordValidation = z
  .string()
  .min(9, "Password must be more than 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordValidation,
  businessName: z.string().optional(),
  phone: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordValidation,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ==========================================
// CUSTOMER VALIDATIONS
// ==========================================

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required").transform((v) => v.trim()),
  email: z.string().trim().email("Please enter a valid email address").transform((v) => v.toLowerCase()),
  phone: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  businessName: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  billingAddress: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  city: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  state: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  country: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  postalCode: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  taxId: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  notes: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null)),
});

export type CustomerInput = z.infer<typeof customerSchema>;

// ==========================================
// PRODUCT & VARIANT VALIDATIONS
// ==========================================

export const productVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Variant name is required"),
  priceAdjustment: z.coerce.number().default(0),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  type: z.enum(["SOFTWARE", "SERVICE", "ADDON", "HARDWARE", "CONSULTING", "OTHER"]),
  salesPrice: z.coerce.number().min(0, "Sales price must be positive"),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
  variants: z.array(productVariantSchema).optional().default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

// ==========================================
// PLAN VALIDATIONS
// ==========================================

export const planSchema = z.object({
  name: z.string().min(2, "Plan name is required"),
  productId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  billingFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  billingPrice: z.coerce.number().min(0, "Billing price must be positive"),
  minQuantity: z.coerce.number().int().min(1).default(1),
  availableFrom: z.string().optional().nullable(),
  availableUntil: z.string().optional().nullable(),
  autoClose: z.boolean().default(false),
  allowEarlyClosure: z.boolean().default(true),
  allowPause: z.boolean().default(true),
  allowRenewal: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export type PlanInput = z.infer<typeof planSchema>;

// ==========================================
// TAX VALIDATIONS
// ==========================================

export const taxSchema = z.object({
  name: z.string().min(2, "Tax name is required"),
  rate: z.coerce.number().min(0, "Rate must be positive").max(1, "Rate must be expressed as decimal (e.g. 0.18 for 18%)"),
  type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type TaxInput = z.infer<typeof taxSchema>;

// ==========================================
// DISCOUNT VALIDATIONS
// ==========================================

export const discountSchema = z.object({
  name: z.string().min(2, "Discount name is required"),
  code: z.string().optional().nullable(),
  type: z.enum(["FIXED", "PERCENTAGE"]),
  value: z.coerce.number().min(0, "Discount value must be positive"),
  minPurchase: z.coerce.number().min(0).optional().nullable(),
  minQuantity: z.coerce.number().int().min(0).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  maxUsageCount: z.coerce.number().int().min(1).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).default("ACTIVE"),
});

export type DiscountInput = z.infer<typeof discountSchema>;

// ==========================================
// QUOTATION VALIDATIONS
// ==========================================

export const quotationLineSchema = z.object({
  productId: z.string().optional().nullable(),
  variantId: z.string().optional().nullable(),
  discountId: z.string().optional().nullable(),
  description: z.string().min(1, "Line description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be positive"),
  variantPrice: z.coerce.number().default(0),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).optional().nullable(),
  discountValue: z.coerce.number().optional().nullable(),
  taxRate: z.coerce.number().default(0),
});

export const quotationSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  planId: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(quotationLineSchema).min(1, "At least one product line is required"),
});

export type QuotationInput = z.infer<typeof quotationSchema>;

// ==========================================
// SUBSCRIPTION VALIDATIONS
// ==========================================

export const subscriptionLineSchema = z.object({
  productId: z.string().optional().nullable(),
  variantId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01),
  unitPrice: z.coerce.number().min(0),
  variantPrice: z.coerce.number().default(0),
  taxRate: z.coerce.number().default(0),
  discountAmount: z.coerce.number().default(0),
});

export const subscriptionSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  planId: z.string().min(1, "Plan is required"),
  quotationId: z.string().optional().nullable(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  billingFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  paymentTerms: z.coerce.number().int().default(30),
  notes: z.string().optional().nullable(),
  lines: z.array(subscriptionLineSchema).min(1, "At least one line is required"),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

// ==========================================
// INVOICE VALIDATIONS
// ==========================================

export const invoiceLineSchema = z.object({
  productId: z.string().optional().nullable(),
  variantId: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  discountId: z.string().optional().nullable(),
  description: z.string().min(1, "Line description is required"),
  quantity: z.coerce.number().min(0.01),
  unitPrice: z.coerce.number().min(0),
  variantPrice: z.coerce.number().default(0),
  taxName: z.string().optional().nullable(),
  taxRate: z.coerce.number().default(0),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).optional().nullable(),
  discountValue: z.coerce.number().optional().nullable(),
});

export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  subscriptionId: z.string().optional().nullable(),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  billingPeriodStart: z.string().optional().nullable(),
  billingPeriodEnd: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(invoiceLineSchema).min(1, "At least one invoice line is required"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

// ==========================================
// PAYMENT RECORDING VALIDATIONS
// ==========================================

export const paymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  invoiceId: z.string().min(1, "Invoice is required"),
  paymentReference: z.string().min(2, "Payment reference or transaction ID is required"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "UPI", "CHEQUE", "OTHER"]),
  amount: z.coerce.number().min(0.01, "Payment amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional().nullable(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// ==========================================
// STAFF MANAGEMENT VALIDATIONS
// ==========================================

export const staffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: passwordValidation,
  role: z.literal("STAFF"),
  isActive: z.boolean().default(true),
});

export type StaffInput = z.infer<typeof staffSchema>;

