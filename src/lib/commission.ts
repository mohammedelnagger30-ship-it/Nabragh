export const DEFAULT_PLATFORM_COMMISSION_RATE = 20;

export interface CommissionBreakdown {
  grossAmount: number;
  discountAmount: number;
  refundAmount: number;
  platformFee: number;
  teacherPayout: number;
  commissionRate: number;
}

export function calculateCommissionBreakdown(
  grossAmount: number,
  discountAmount = 0,
  refundAmount = 0,
  commissionRate = DEFAULT_PLATFORM_COMMISSION_RATE,
): CommissionBreakdown {
  const netAmount = Math.max(0, grossAmount - discountAmount - refundAmount);
  const rate = Math.max(0, Math.min(100, commissionRate));
  const platformFee = Number((netAmount * (rate / 100)).toFixed(2));
  const teacherPayout = Number((netAmount - platformFee).toFixed(2));

  return {
    grossAmount: Number(grossAmount.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    refundAmount: Number(refundAmount.toFixed(2)),
    platformFee,
    teacherPayout,
    commissionRate: rate,
  };
}

export function formatCurrency(value: number): string {
  return `${Number(value).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} جنيه`;
}

export function canCreatePayout(teacherPayout: number, minimumPayout = 0): boolean {
  return teacherPayout >= minimumPayout;
}
