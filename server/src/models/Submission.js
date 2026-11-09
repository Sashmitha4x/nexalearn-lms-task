import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    submissionId: { type: String, required: true, unique: true },
    courseId: { type: String, required: true, uppercase: true, index: true },
    courseTitle: { type: String, required: true },
    assignmentTitle: { type: String, required: true },
    instructorEmail: { type: String, default: "alex.morgan@nexalearn.io", index: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true, lowercase: true, index: true },
    fileName: { type: String, required: true },
    fileSizeKB: { type: Number, default: 1420 },
    fileDataUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Graded", "Late"],
      default: "Pending",
      index: true,
    },
    grade: { type: Number, default: null },
    feedback: { type: String, default: "" },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Submission", submissionSchema);