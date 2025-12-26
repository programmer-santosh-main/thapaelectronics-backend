import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true },

    // For existing "local" users you already have.
    // For OAuth users you can keep it optional.
    contact: { type: String, required: false, trim: true },

    // Facebook may not provide email. Google always provides.
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // IMPORTANT: allows multiple docs with missing email without unique-index errors
      lowercase: true,
      trim: true,
    },

    // Local users have password, OAuth users won't.
    password: {
      type: String,
      required: false,
      select: false,
    },

    // Add provider fields (new)
    provider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
    providerId: {
      type: String, // google profile.id or facebook profile.id
    },
    avatar: {
      type: String,
    },

    // Keep your existing verification & reset fields (no breaking changes)
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Optional but recommended: provider+providerId unique (prevents duplicates)
userSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });

// 🔒 Hash password before saving (ONLY if password exists and changed)
userSchema.pre("save", async function (next) {
  // If no password (OAuth users), skip hashing
  if (!this.password) return next();

  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("User", userSchema);
