const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000/api/v1"
    : "/api/v1");
const HEALTH_URL = `${API_BASE}/health`;
const AUTH_URL = `${API_BASE}/auth`;
const COURSES_URL = `${API_BASE}/courses`;
const ENROLLMENTS_URL = `${API_BASE}/enrollments`;
const ADMIN_URL = `${API_BASE}/admin`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("nexalearn_token");
  let savedUser = null;
  try {
    const raw = localStorage.getItem("nexalearn_user");
    if (raw) savedUser = JSON.parse(raw);
  } catch {
    savedUser = null;
  }

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(savedUser?.email ? { "X-User-Email": savedUser.email } : {}),
    ...(savedUser?.role ? { "X-User-Role": savedUser.role } : {}),
  };
};

const parseJsonSafe = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

export const pingHealth = async () => {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(HEALTH_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Offline");
    const json = await parseJsonSafe(res);
    return {
      serverOnline: true,
      dbConnected: json.status === "Connected",
      cluster: json.cluster || "MongoDB Atlas",
      latency: Math.max(1, Math.round(performance.now() - start)),
      lastSync: new Date().toLocaleTimeString(),
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      serverOnline: false,
      dbConnected: false,
      cluster: "Server Stopped",
      latency: null,
      lastSync: new Date().toLocaleTimeString(),
    };
  }
};

export const fetchCourses = async (includeAll = true) => {
  try {
    const res = await fetch(
      `${COURSES_URL}?includeAll=${includeAll ? "true" : "false"}`,
      {
        headers: getAuthHeaders(),
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const json = await parseJsonSafe(res);
    return Array.isArray(json.data) ? json.data : null;
  } catch {
    return null;
  }
};

export const fetchInstructors = async () => {
  try {
    const res = await fetch(`${COURSES_URL}/instructors`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await parseJsonSafe(res);
    return Array.isArray(json.data) ? json.data : null;
  } catch {
    return null;
  }
};

export const apiAuthRequest = async (endpoint, payload) => {
  const isProfile = endpoint === "profile";
  const url = isProfile ? `${AUTH_URL}/profile` : `${AUTH_URL}/${endpoint}`;
  const method = isProfile ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(json.message || "Authentication request failed.");
  }
  return json;
};

export const apiForgotPassword = async (email) => {
  const res = await fetch(`${AUTH_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(json.message || "Could not process recovery request.");
  }
  return json;
};

export const fetchStudentEnrollments = async () => {
  try {
    const res = await fetch(ENROLLMENTS_URL, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await parseJsonSafe(res);
    return Array.isArray(json.data) ? json.data : null;
  } catch {
    return null;
  }
};

export const apiEnrollCourse = async (courseId) => {
  const res = await fetch(`${ENROLLMENTS_URL}/enroll`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ courseId }),
  });
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "Enrollment failed");
  return json.data;
};

export const fetchStudentSubmissions = async () => {
  try {
    const res = await fetch(`${ENROLLMENTS_URL}/submissions`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await parseJsonSafe(res);
    return Array.isArray(json.data) ? json.data : null;
  } catch {
    return null;
  }
};

export const apiSubmitAssignment = async (payload) => {
  const res = await fetch(`${ENROLLMENTS_URL}/submissions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "Submission failed");
  return json.data;
};

export const apiUpdateClassroomProgress = async (courseId, payload) => {
  const res = await fetch(
    `${ENROLLMENTS_URL}/${encodeURIComponent(courseId)}/progress`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "Progress sync failed");
  return json.data;
};

export const apiCreateCourse = async (payload) => {
  const res = await fetch(COURSES_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "Course creation failed");
  return json.data;
};

export const apiUpdateCourse = async (courseId, payload) => {
  const res = await fetch(
    `${COURSES_URL}/${encodeURIComponent(courseId)}`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "Course update failed");
  return json.data;
};

export const apiDeleteCourse = async (courseId) => {
  const res = await fetch(
    `${COURSES_URL}/${encodeURIComponent(courseId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "Course deletion failed");
  return json;
};

export const apiGradeSubmission = async (submissionId, payload) => {
  const res = await fetch(
    `${ENROLLMENTS_URL}/submissions/${encodeURIComponent(submissionId)}/grade`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "Grading failed");
  return json.data;
};

export const fetchAdminUsersList = async () => {
  try {
    const res = await fetch(`${ADMIN_URL}/users`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await parseJsonSafe(res);
    return Array.isArray(json.data) ? json.data : null;
  } catch {
    return null;
  }
};

export const fetchAdminAuditLedger = async () => {
  try {
    const res = await fetch(`${ADMIN_URL}/audit-logs`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await parseJsonSafe(res);
    return Array.isArray(json.data) ? json.data : null;
  } catch {
    return null;
  }
};

export const apiAdminModerateCourse = async (courseId, payload) => {
  const res = await fetch(
    `${ADMIN_URL}/courses/${encodeURIComponent(courseId)}/moderate`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "Moderation failed");
  return json.data;
};

export const apiAdminToggleUserStatus = async (userId, payload) => {
  const res = await fetch(
    `${ADMIN_URL}/users/${encodeURIComponent(userId)}/status`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "User status update failed");
  return json.data;
};

export const apiAdminDeleteUser = async (userId, payload = {}) => {
  const res = await fetch(
    `${ADMIN_URL}/users/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
  const json = await parseJsonSafe(res);
  if (!res.ok) throw new Error(json.message || "User deletion failed");
  return json;
};

export const apiCheckCurrentSession = async () => {
  const token = localStorage.getItem("nexalearn_token");
  if (!token) return { valid: true };
  try {
    const res = await fetch(`${AUTH_URL}/me`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const json = await parseJsonSafe(res);
    if (res.status === 403 && json.code === "ACCOUNT_SUSPENDED") {
      return { valid: false, reason: "SUSPENDED", message: json.message };
    }
    if (res.status === 401 && json.code === "ACCOUNT_DELETED") {
      return { valid: false, reason: "DELETED", message: json.message };
    }
    return { valid: true, user: json.user };
  } catch {
    return { valid: true };
  }
};

// Export Helpers (Syllabus PDF, Certificate PDF, Gradebook & Audit Ledger)
export const exportCourseSyllabusPDF = (course) => {
  if (!course) return;
  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) return;
  const modulesHtml = (course.modules || [])
    .map(
      (m, idx) => `
      <div style="margin-bottom:14px;padding:12px;border:1px solid #cbd5e1;border-radius:8px;">
        <strong>Module ${m.number || idx + 1}: ${m.title}</strong>
        <ul>
          ${(m.lessons || [])
            .map((l) => `<li>${l.title} (${l.duration || "20m"})</li>`)
            .join("")}
        </ul>
      </div>`
    )
    .join("");

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head><title>${course.title} — Syllabus</title></head>
      <body style="font-family:sans-serif;padding:32px;color:#0f172a;">
        <h1>${course.title} (#${course.courseId})</h1>
        <p><strong>Instructor:</strong> ${course.instructorName} • <strong>Category:</strong> ${course.category}</p>
        <p>${course.overview || course.shortDescription || ""}</p>
        <h3>Course Curriculum</h3>
        ${modulesHtml}
        <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
      </body>
    </html>
  `);
  win.document.close();
};

export const exportCertificatePDF = ({
  studentName,
  courseTitle,
  issueDate,
  instructorName,
  instructorRole,
  credentialId,
}) => {
  const win = window.open("", "_blank", "width=1040,height=740");
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Certificate_${credentialId}</title>
        <style>
          @page { size: landscape; margin: 18mm; }
          body { font-family: 'Georgia', serif; text-align: center; padding: 40px; border: 8px double #3525cd; color: #0b1c30; }
        </style>
      </head>
      <body>
        <h3 style="letter-spacing:3px;color:#3525cd;">NEXALEARN ACADEMY • VERIFIED CREDENTIAL</h3>
        <p>This credential is proudly awarded to</p>
        <h1 style="font-size:40px;font-style:italic;margin:16px 0;">${studentName}</h1>
        <p>for successfully mastering all coursework and assessments in</p>
        <h2 style="color:#3525cd;">${courseTitle}</h2>
        <p style="margin-top:32px;"><strong>Issued:</strong> ${issueDate} &nbsp;|&nbsp; <strong>Instructor:</strong> ${instructorName} (${instructorRole}) &nbsp;|&nbsp; <strong>ID:</strong> ${credentialId}</p>
        <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
      </body>
    </html>
  `);
  win.document.close();
};

export const exportGradebookCSV = (submissions = []) => {
  const headers = [
    "Submission ID",
    "Student Name",
    "Student Email",
    "Course ID",
    "Assignment",
    "Status",
    "Grade",
  ];
  const rows = submissions.map((s) => [
    s.submissionId,
    `"${(s.studentName || "").replace(/"/g, '""')}"`,
    s.studentEmail,
    s.courseId,
    `"${(s.assignmentTitle || "").replace(/"/g, '""')}"`,
    s.status,
    s.grade ?? "Pending",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "NexaLearn_Instructor_Gradebook.csv";
  a.click();
  URL.revokeObjectURL(url);
};

export const exportGradebookExcel = (
  submissions = [],
  instructorName = "Instructor"
) => {
  const rowsHtml = submissions
    .map(
      (s) =>
        `<tr><td>${s.submissionId}</td><td>${s.studentName}</td><td>${s.studentEmail}</td><td>#${s.courseId}</td><td>${s.assignmentTitle}</td><td>${s.status}</td><td>${
          s.grade ?? "Pending"
        }</td></tr>`
    )
    .join("");
  const html = `<html><head><meta charset="UTF-8"></head><body><h2>NexaLearn Gradebook (${instructorName})</h2><table border="1"><thead><tr><th>ID</th><th>Student</th><th>Email</th><th>Course</th><th>Assignment</th><th>Status</th><th>Grade</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "NexaLearn_Instructor_Gradebook.xls";
  a.click();
  URL.revokeObjectURL(url);
};

export const exportGradebookPDF = (
  submissions = [],
  instructorName = "Instructor"
) => {
  const win = window.open("", "_blank", "width=960,height=700");
  if (!win) return;
  const rowsHtml = submissions
    .map(
      (s) =>
        `<tr><td style="padding:8px;border:1px solid #cbd5e1;">${s.submissionId}</td><td style="padding:8px;border:1px solid #cbd5e1;">${s.studentName}</td><td style="padding:8px;border:1px solid #cbd5e1;">#${s.courseId}</td><td style="padding:8px;border:1px solid #cbd5e1;">${s.assignmentTitle}</td><td style="padding:8px;border:1px solid #cbd5e1;">${s.status}</td><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">${
          s.grade ?? "Pending"
        }</td></tr>`
    )
    .join("");
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head><title>NexaLearn_Gradebook</title></head>
      <body style="font-family:sans-serif;padding:32px;">
        <h2>NexaLearn — Instructor Gradebook (${instructorName})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#f1f5f9;"><th>ID</th><th>Student</th><th>Course</th><th>Assignment</th><th>Status</th><th>Score</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
      </body>
    </html>
  `);
  win.document.close();
};

export const exportAdminLedgerCSV = (
  auditLogs = [],
  filename = "NexaLearn_Governance_Audit_Ledger"
) => {
  const headers = [
    "Timestamp (Local Time)",
    "Admin Name",
    "Action",
    "Target Entity",
    "Reason",
    "Outcome",
  ];
  const rows = auditLogs.map((l) => [
    `"${new Date(l.createdAt || Date.now()).toLocaleString()}"`,
    `"${(l.adminName || "Platform Admin").replace(/"/g, '""')}"`,
    `"${(l.action || "").replace(/"/g, '""')}"`,
    `"${(l.target || "").replace(/"/g, '""')}"`,
    `"${(l.reason || "").replace(/"/g, '""')}"`,
    l.outcome || "SUCCESS",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportAdminLedgerExcel = (auditLogs = []) => {
  const rowsHtml = auditLogs
    .map(
      (l) => `
      <tr>
        <td>${new Date(l.createdAt || Date.now()).toLocaleString()}</td>
        <td>${l.adminName || "Platform Admin"}</td>
        <td>${l.action}</td>
        <td>${l.target}</td>
        <td>${l.reason}</td>
        <td>${l.outcome || "SUCCESS"}</td>
      </tr>`
    )
    .join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>NexaLearn — Immutable Governance Audit Ledger</h2>
        <table border="1">
          <thead style="background:#0f172a;color:#ffffff;font-weight:bold;">
            <tr>
              <th>Timestamp (Local Time)</th>
              <th>Admin Name</th>
              <th>Action</th>
              <th>Target Entity</th>
              <th>Reason</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "NexaLearn_Governance_Audit_Ledger.xls";
  a.click();
  URL.revokeObjectURL(url);
};

export const exportAdminLedgerPDF = (auditLogs = [], courses = []) => {
  const win = window.open("", "_blank", "width=1020,height=760");
  if (!win) return;

  const logsHtml = auditLogs
    .map(
      (l) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;font-family:monospace;font-size:11px;">${new Date(
          l.createdAt || Date.now()
        ).toLocaleString()}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">${
          l.adminName || "Platform Admin"
        }</td>
        <td style="padding:8px;border:1px solid #e2e8f0;font-weight:700;color:#4f46e5;">${
          l.action
        }</td>
        <td style="padding:8px;border:1px solid #e2e8f0;font-family:monospace;">${
          l.target
        }</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${l.reason}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;font-weight:700;color:#16a34a;">${
          l.outcome || "SUCCESS"
        }</td>
      </tr>`
    )
    .join("");

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>NexaLearn_Platform_Governance_Ledger</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; color: #0f172a; margin: 32px; }
          .head { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
          th { background: #f1f5f9; color: #0f172a; text-align: left; padding: 9px 8px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="head">
          <div>
            <div style="font-size:20px;font-weight:800;color:#0f172a;">NexaLearn — Platform Governance &amp; Audit Ledger</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Generated (Local Time): ${new Date().toLocaleString()} • Catalog Courses Tracked: ${
    courses.length
  }</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Timestamp (Local Time)</th>
              <th>Admin Name</th>
              <th>Action</th>
              <th>Target Entity</th>
              <th>Reason</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>${logsHtml}</tbody>
        </table>
        <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
      </body>
    </html>
  `);
  win.document.close();
};