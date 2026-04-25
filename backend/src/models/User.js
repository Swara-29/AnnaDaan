import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["donor", "ngo", "volunteer", "admin"],
      default: "donor"
    },
    onboardingStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    isActive: {
      type: Boolean,
      default: true
    },
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
    stats: {
      donationsCreated: { type: Number, default: 0 },
      donationsDelivered: { type: Number, default: 0 },
      donationsExpired: { type: Number, default: 0 },
      acceptances: { type: Number, default: 0 },
      completions: { type: Number, default: 0 }
    },
    reliabilityScore: {
      type: Number,
      default: 80,
      min: 0,
      max: 100
    }
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });

export const User = mongoose.model("User", userSchema);
