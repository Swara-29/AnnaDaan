import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: "Donation", required: true },
    volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["assigned", "picked", "delivered"],
      default: "assigned"
    },
    timestamps: {
      assignedAt: { type: Date, default: Date.now },
      pickedAt: { type: Date },
      deliveredAt: { type: Date }
    }
  },
  { timestamps: true }
);

export const Assignment = mongoose.model("Assignment", assignmentSchema);
