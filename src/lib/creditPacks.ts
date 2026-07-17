// クレジットパックの定義。回数・金額はここが唯一の正
// （Stripe 側に Price は作らず、Checkout で price_data をインライン指定する）。
// 円はゼロ小数通貨なので unit_amount にはそのまま円の値を渡す（¥300 → 300）。
export const CREDIT_PACKS = [
  { id: "pack10", credits: 10, amountJpy: 300, name: "10回パック" },
  { id: "pack50", credits: 50, amountJpy: 980, name: "50回パック" },
] as const;

export type CreditPack = (typeof CREDIT_PACKS)[number];
export type CreditPackId = CreditPack["id"];

export function getCreditPack(id: string): CreditPack | null {
  return CREDIT_PACKS.find((pack) => pack.id === id) ?? null;
}
