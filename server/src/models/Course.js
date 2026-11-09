import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    lessonId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      default: "Video",
    },
    duration: { type: String, default: "20m" },
    isFreePreview: { type: Boolean, default: false },
    videoUrl: { type: String, default: "" },
    summary: { type: String, default: "" },
    badge: { type: String, default: "Ready" },
  },
  { _id: false }
);

const moduleSchema = new mongoose.Schema(
  {
    moduleId: { type: String, required: true },
    number: { type: String, default: "01" },
    title: { type: String, required: true, trim: true },
    durationSummary: { type: String, default: "2 Lessons • 1h 15m" },
    expanded: { type: Boolean, default: true },
    lessons: { type: [lessonSchema], default: [] },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    concept: { type: String, default: "Core Concept" },
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true, default: 0 },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const assignmentItemSchema = new mongoose.Schema(
  {
    assignmentId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    dueDate: { type: String, default: "2026-12-15" },
    maxScore: { type: Number, default: 100 },
    deliverableFormat: { type: String, default: "ZIP, PDF, or DOCX" },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, index: true },
    shortDescription: {
      type: String,
      default:
        "Hands-on engineering course with interactive modules, auto-graded quizzes, and a graded capstone project.",
      trim: true,
    },
    overview: {
      type: String,
      default:
        "Comprehensive curriculum designed for production engineering mastery.",
      trim: true,
    },
    category: {
      type: String,
      default: "Software Engineering",
      index: true,
    },
    difficulty: {
      type: String,
      default: "Intermediate",
      index: true,
    },
    durationHours: { type: Number, default: 20, index: true },
    durationLabel: { type: String, default: "20 Hours" },
    durationText: { type: String, default: "20 Hours (5 Weeks)" },
    expiryDate: { type: String, default: "2026-12-31" },
    rating: { type: Number, default: 4.9 },
    reviewsCount: { type: String, default: "120" },
    enrolledCount: { type: Number, default: 0 },
    completionAvg: { type: Number, default: 75 },
    price: { type: Number, default: 49 },
    originalPrice: { type: Number, default: 189 },
    thumbnail: { type: String, default: "" },
    instructorEmail: {
      type: String,
      default: "alex.morgan@nexalearn.io",
      lowercase: true,
      index: true,
    },
    instructorName: { type: String, default: "Alex Morgan" },
    instructorTitle: {
      type: String,
      default: "Staff Engineer & Lead Instructor",
    },
    instructorAvatar: { type: String, default: "" },
    instructorBio: { type: String, default: "" },
    learningOutcomes: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    modules: { type: [moduleSchema], default: [] },
    quiz: {
      title: { type: String, default: "Course Mastery Evaluation Quiz" },
      passingScore: { type: Number, default: 70 },
      timeLimitMinutes: { type: Number, default: 5 },
      questions: { type: [quizQuestionSchema], default: [] },
    },
    assignment: {
      title: {
        type: String,
        default: "Production REST API, JWT Security & React Integration",
      },
      instructions: {
        type: String,
        default:
          "Upload your project deliverable (.zip, .pdf, or .docx) demonstrating all module requirements.",
      },
      dueDate: { type: String, default: "2026-12-15" },
      maxScore: { type: Number, default: 100 },
    },
    assignments: { type: [assignmentItemSchema], default: [] },
    status: {
      type: String,
      enum: [
        "Published",
        "Draft",
        "Paused",
        "Hidden",
        "Pending Review",
        "Removed",
      ],
      default: "Published",
      index: true,
    },
    moderationReason: { type: String, default: "" },
    instructorResolutionNote: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);