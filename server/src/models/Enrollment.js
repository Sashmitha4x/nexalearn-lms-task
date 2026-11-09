import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    enrollmentId: { type: String, required: true, unique: true },
    courseId: { type: String, required: true, uppercase: true, index: true },
    courseTitle: { type: String, required: true },
    courseCategory: { type: String, default: "Software Engineering" },
    courseThumbnail: { type: String, default: "" },
    instructorName: { type: String, default: "Alex Morgan" },
    instructorEmail: { type: String, default: "alex.morgan@nexalearn.io" },
    studentEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    studentName: { type: String, required: true },
    completedLessonIds: { type: [String], default: [] },
    progressPercent: { type: Number, default: 0 },
    quizCompleted: { type: Boolean, default: false },
    bestQuizScore: { type: Number, default: null },
    quizPassed: { type: Boolean, default: false },
    quizAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
    assignmentStatus: {
      type: String,
      enum: ["Pending", "Submitted", "Graded"],
      default: "Pending",
    },
    assignmentGrade: { type: Number, default: null },
    assignmentFeedback: { type: String, default: "" },
    certificateIssued: { type: Boolean, default: false },
    certificateId: { type: String, default: "" },
    personalNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

enrollmentSchema.index({ courseId: 1, studentEmail: 1 }, { unique: true });

export default mongoose.model("Enrollment", enrollmentSchema);