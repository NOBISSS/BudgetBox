export const CATEGORIES = [
  "bills",
  "food",
  "transport",
  "subscriptions",
  "miscellaneous",
] as const;
export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  bills: "Monthly bills",
  food: "Food & groceries",
  transport: "Transport",
  subscriptions: "Subscriptions",
  miscellaneous: "Miscellaneous",
};
