import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    logId: { type: String, required: true, unique: true },
    adminName: { type: String, required: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    reason: { type: String, default: "" },
    outcome: { type: String, default: "Completed" },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);