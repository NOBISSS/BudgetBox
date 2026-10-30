import { Schema, model, Types, type InferSchemaType } from "mongoose";

const amountDefinition = {
  type: Number,
  default: 0,
  min: 0,
  max: 1_000_000_000_000,
  validate: { validator: Number.isFinite, message: "Amount must be finite" },
} as const;

const budgetSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: false,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      validate: Number.isInteger,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
      validate: Number.isInteger,
    },
    income: amountDefinition,
    bills: amountDefinition,
    food: amountDefinition,
    transport: amountDefinition,
    subscriptions: amountDefinition,
    miscellaneous: amountDefinition,
    clientUpdatedAt: { type: Date, required: true },
    serverUpdatedAt: { type: Date, required: true, default: Date.now },
    version: { type: Number, required: true, default: 1, min: 1 },
    isDeleted: { type: Boolean, required: true, default: false },
    clientRecordId: { type: String, trim: true, maxlength: 100 },
  },
  { timestamps: true },
);

// The compound unique key makes a month safe to upsert and prevents duplicate rows during concurrent syncs.
budgetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });
// Delta pulls use serverUpdatedAt to fetch only records changed since the client's last pull.
budgetSchema.index({ userId: 1, serverUpdatedAt: -1 });

export type BudgetDocument = InferSchemaType<typeof budgetSchema> & {
  _id: Types.ObjectId;
};
export const BudgetModel = model("Budget", budgetSchema);
