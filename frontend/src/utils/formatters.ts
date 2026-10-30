export const currency = (amount: number, code = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
export const monthName = (month: number) =>
  new Date(2024, month - 1, 1).toLocaleString("en-IN", { month: "long" });
