import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    acceptedByNgoId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedVolunteerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    volunteerAcceptedAt: { type: Date },
    volunteerRejectedAt: { type: Date },
    acceptedAt: { type: Date },
    pickedAt: { type: Date },
    deliveredAt: { type: Date },
    foodType: { type: String, required: true },
    quantity: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "picked", "delivered", "expired"],
      default: "pending"
    },
    escalationLevel: {
      type: String,
      enum: ["none", "warning", "critical"],
      default: "none"
    },
    deliveryProof: {
      proofImageUrl: { type: String },
      receiverName: { type: String },
      receiverSignature: { type: String },
      notes: { type: String },
      confirmedAt: { type: Date }
    },
    imageUrl: { type: String },
    ngoPickupImageUrl: { type: String },
    locationText: { type: String, trim: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    pickupTime: { type: Date, required: true },
    expiryTime: { type: Date, required: true }
  },
  { timestamps: true }
);

donationSchema.index({ location: "2dsphere" });

export const Donation = mongoose.model("Donation", donationSchema);
