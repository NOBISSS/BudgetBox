import { Schema, model, Types, type InferSchemaType } from "mongoose";

const recurringExpenseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: String, required: true, trim: true, maxlength: 100 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: {
      type: String,
      required: true,
      enum: ["bills", "food", "transport", "subscriptions", "miscellaneous"],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      max: 1_000_000_000_000,
      validate: { validator: Number.isFinite, message: "Amount must be finite" },
    },
    frequency: {
      type: String,
      required: true,
      enum: ["daily", "weekly", "monthly", "quarterly", "yearly", "one-time"],
    },
    startDate: { type: String, required: true },
    endDate: { type: String },
    dueDay: { type: Number, min: 1, max: 31 },
    isActive: { type: Boolean, default: true, required: true },
    paidOccurrences: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false, required: true },
    clientUpdatedAt: { type: Date, required: true },
    serverUpdatedAt: { type: Date, required: true, default: Date.now },
    version: { type: Number, required: true, default: 1, min: 1 },
  },
  { timestamps: true },
);

// The user/client id pair supports idempotent multi-device sync without exposing another user's schedules.
recurringExpenseSchema.index({ userId: 1, clientId: 1 }, { unique: true });
// Delta pulls are scoped by user and ordered by server update time.
recurringExpenseSchema.index({ userId: 1, serverUpdatedAt: 1 });

export type RecurringExpenseDocument = InferSchemaType<typeof recurringExpenseSchema> & {
  _id: Types.ObjectId;
};
export const RecurringExpenseModel = model("RecurringExpense", recurringExpenseSchema);
