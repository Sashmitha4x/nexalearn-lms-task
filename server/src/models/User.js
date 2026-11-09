import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 90 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
      index: true,
    },
    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active",
      index: true,
    },
    avatar: { type: String, default: "" },
    headline: {
      type: String,
      default: "Full-Stack Software Learner",
      trim: true,
    },
    specialty: {
      type: String,
      default: "Software Engineering",
      trim: true,
    },
    bio: {
      type: String,
      default:
        "Passionate about building scalable cloud systems and mastering modern web engineering.",
      trim: true,
    },
    institution: { type: String, default: "NexaLearn Academy", trim: true },
    rating: { type: Number, default: 4.9 },
    studentsMentored: { type: String, default: "12,400+", trim: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);