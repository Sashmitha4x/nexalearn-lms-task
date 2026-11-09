export const NEXA_LOGO_URL = "";

export const HERO_LEARNER_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBVbLK5zv3fCGI0LQY3JcseIH2cV3Y1SDQBFPuJBlN50W320ALlNXGY_VRIMZU2iLPTAXbfsJ4jomQ3KIZs6i0jtZjIJ3b8kHBB7-PhLvgXqJE2Ve1jfZrEWU41RFCDfuEfEtfL8mMsZGloU-M9XeTxYmhM7cXg1u9csmmpuigpVmDGvsi46ufavs61NL1fdGbguOx8h3sjl7KGM5VVWA64aUr8JHnvJi_yxDPe9kU";

export const SPOTLIGHT_VIDEO_PREVIEW_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDCCkMQFY-CfA3cDo33zg9Z1f3hZ1CewcEgjbC3w0fbwur_jICkdQ2YOkO8jpKCRbYD9tt9QKmS1kxJ5fHi4bgJg1Tg8KGDuCPVb2W6HEtXpRvloZRc7G3lNmmMGZ9EJ9nb_igFWLHJBQqUdyZJPjSkc8pbMj_PFJxYax-8gleydVtrp-l5Q6oqhBCjQ6-Cyg8RUpQgeQ5ExxXpcB35hDBHskzed9I55YqCjpdUN2Q";

export const COURSE_CATEGORIES = [
  {
    id: "Software Engineering",
    title: "Software Engineering",
    countLabel: "Full-Stack & Distributed Systems",
    badgeCount: 1,
    icon: "terminal",
    theme: "primary",
  },
  {
    id: "AI & Data Science",
    title: "AI & Data Science",
    countLabel: "Applied LLMs & Machine Learning",
    badgeCount: 1,
    icon: "neurology",
    theme: "secondary",
  },
  {
    id: "Cloud & DevOps",
    title: "Cloud & DevOps",
    countLabel: "Kubernetes & CI/CD Pipelines",
    badgeCount: 0,
    icon: "cloud_sync",
    theme: "primary",
  },
  {
    id: "UI/UX Design",
    title: "UI/UX Design",
    countLabel: "Design Systems & Tokens",
    badgeCount: 0,
    icon: "dashboard_customize",
    theme: "tertiary",
  },
];

export const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"];

export const DURATION_BUCKETS = [
  { id: "UNDER_2", label: "Under 2 Hours", test: (h) => h < 2 },
  { id: "2_TO_5", label: "2 – 5 Hours", test: (h) => h >= 2 && h <= 5 },
  { id: "5_TO_10", label: "5 – 10 Hours", test: (h) => h > 5 && h <= 10 },
  { id: "OVER_10", label: "10+ Hours (Comprehensive)", test: (h) => h > 10 },
];

export const SORT_OPTIONS = [
  { value: "POPULAR", label: "Most Popular" },
  { value: "RATED", label: "Highest Rated" },
  { value: "NEWEST", label: "Newest Curriculum" },
  { value: "DURATION_ASC", label: "Duration: Short to Long" },
];

// ONLY 1 SEEDED INSTRUCTOR
export const FALLBACK_INSTRUCTORS = [
  {
    id: "nl-inst-001",
    name: "Alex Morgan",
    email: "alex.morgan@nexalearn.io",
    headline: "Staff Engineer & Lead Instructor",
    specialty: "Software Engineering",
    coursesCount: 2,
    studentsMentored: "1,240 Students",
    rating: 4.9,
    bio: "Former Principal Architect at HyperScale and lead full-stack engineering educator on NexaLearn.",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCQzEayrS8uYewSU2fPlpfOYPLBIjxaVz8jSYgwqmyOJoxN1j5pIXpfne4bfyJyGPPnsCTn3gNQjZ6Z3jFo_koop7wuB4hhQC_pNcKUj1yX6_Tlh-di0m7p9pBuUOgbkpdQHKeDOqfRdvJ9SU-39C-2KIIIW5TSnB6V085pHKOb_hCzxsAx-I13SG4-dqgHebQ6SHsR5tA8eZmxKHQZjVcmv6C910_pwBsc6cWMUAI",
  },
];

// CLEAN SEEDED COURSES (Owned by Alex Morgan: 1 Published, 1 Hidden by Admin for moderation testing)
export const FALLBACK_COURSES = [
  {
    courseId: "CRS-2026-001",
    title: "Full-Stack Web Development with MERN",
    shortDescription:
      "Master MongoDB, Express, React 19, and Node.js with JWT security, REST APIs, and production deployment.",
    overview:
      "An end-to-end engineering course covering modern ESNext JavaScript, React 19 hooks, Node.js/Express REST APIs, and MongoDB schema architecture.",
    category: "Software Engineering",
    difficulty: "Intermediate",
    durationHours: 24,
    durationLabel: "24 Hours",
    durationText: "24 Hours (6 Weeks)",
    expiryDate: "2026-12-15",
    rating: 4.9,
    reviewsCount: "120",
    enrolledCount: 148,
    completionAvg: 78,
    price: 49,
    originalPrice: 189,
    thumbnail:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAaswXgfmOIH-Y5sPi1RShq7iP21Impmjw-VwhBja1N-rh0_C5q2SmLl-nXwLSUbGivAXrRySJXXknxgecSk1qnzvSPd8WsEhvPht1eND5QqjEpweeKR-NXV1W1rKhZfJ6i3EC516gckdNTj9YgO2up0r5lhg0mPxBNWFs6pf_qaZMlfK8ApEO4d0_qT_iyXsXGewtrvWWEJ9bRkHBciu4W54jXfhG4vil6vWtRA7U",
    instructorEmail: "alex.morgan@nexalearn.io",
    instructorName: "Alex Morgan",
    instructorTitle: "Staff Engineer & Lead Instructor",
    instructorAvatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCQzEayrS8uYewSU2fPlpfOYPLBIjxaVz8jSYgwqmyOJoxN1j5pIXpfne4bfyJyGPPnsCTn3gNQjZ6Z3jFo_koop7wuB4hhQC_pNcKUj1yX6_Tlh-di0m7p9pBuUOgbkpdQHKeDOqfRdvJ9SU-39C-2KIIIW5TSnB6V085pHKOb_hCzxsAx-I13SG4-dqgHebQ6SHsR5tA8eZmxKHQZjVcmv6C910_pwBsc6cWMUAI",
    instructorBio:
      "Alex has designed distributed cloud systems serving millions of users and mentors full-stack engineers.",
    learningOutcomes: [
      "Architect modular full-stack web apps with React 19 and Node.js.",
      "Implement JWT authentication, bcrypt hashing, and RBAC middleware.",
      "Model production MongoDB schemas with compound indexes.",
      "Build, test, and deploy a full-stack capstone project.",
    ],
    modules: [
      {
        moduleId: "MOD-01",
        number: "01",
        title: "Module 1: Modern JavaScript & React 19 Foundations",
        durationSummary: "2 Lessons • 1h 15m",
        expanded: true,
        lessons: [
          {
            lessonId: "LES-101",
            title: "1.1 Scope, Closures & Component Architecture",
            type: "Video",
            duration: "20m",
            isFreePreview: true,
          },
          {
            lessonId: "LES-102",
            title: "1.2 React State, Props & useEffect Lifecycle",
            type: "Video",
            duration: "25m",
            isFreePreview: false,
          },
        ],
      },
      {
        moduleId: "MOD-02",
        number: "02",
        title: "Module 2: Node.js, Express REST APIs & MongoDB",
        durationSummary: "2 Lessons • 1h 30m",
        expanded: true,
        lessons: [
          {
            lessonId: "LES-201",
            title: "2.1 Express Routing, Middleware & JWT Security",
            type: "Video",
            duration: "30m",
            isFreePreview: false,
          },
          {
            lessonId: "LES-202",
            title: "2.2 Mongoose Schemas & Compound Indexing",
            type: "Text/Code Guide",
            duration: "35m",
            isFreePreview: false,
          },
        ],
      },
    ],
    quiz: {
      title: "MERN Stack & React 19 Mastery Quiz",
      passingScore: 70,
      timeLimitMinutes: 5,
      questions: [
        {
          questionId: "Q-101",
          concept: "React Hooks",
          question:
            "Which React hook is used to synchronize a component with an external system or side effect?",
          options: ["useState", "useEffect", "useMemo", "useRef"],
          correctIndex: 1,
          explanation:
            "useEffect lets you synchronize a component with an external system (such as API calls or timers) after rendering.",
        },
        {
          questionId: "Q-102",
          concept: "Local State",
          question:
            "Which React hook declares a state variable that triggers a re-render when updated?",
          options: ["useState", "useContext", "useCallback", "useId"],
          correctIndex: 0,
          explanation:
            "useState returns the current state value and a setter function that triggers a component re-render.",
        },
        {
          questionId: "Q-103",
          concept: "Backend Security",
          question:
            "Why must Role-Based Access Control (RBAC) be checked inside Express API middleware?",
          options: [
            "Because client-side UI checks can be bypassed via direct HTTP requests",
            "Because React does not support buttons",
            "To make images load faster",
            "Because MongoDB requires it",
          ],
          correctIndex: 0,
          explanation:
            "Frontend checks are only for UX; true security requires verifying the JWT token and role on the backend server.",
        },
      ],
    },
    assignment: {
      title: "REST API Authentication & JWT Middleware",
      instructions:
        "Upload your project deliverable (.zip, .pdf, or .docx) demonstrating Express JWT authentication and protected routes.",
      dueDate: "2026-12-15",
      maxScore: 100,
    },
    assignments: [
      {
        assignmentId: "ASN-2026-001",
        title: "REST API Authentication & JWT Middleware",
        instructions:
          "Upload your project deliverable (.zip, .pdf, or .docx) demonstrating Express JWT authentication and protected routes.",
        dueDate: "2026-12-15",
        maxScore: 100,
        deliverableFormat: "ZIP, PDF, or DOCX",
      },
    ],
    status: "Published",
    moderationReason: "",
    instructorResolutionNote: "",
  },
  {
    courseId: "CRS-2026-002",
    title: "Applied LLM Architecture & Prompt Fine-Tuning",
    shortDescription:
      "Build production RAG pipelines, vector embeddings, and LoRA fine-tuned models with automated evaluation rubrics.",
    overview:
      "Hands-on AI engineering covering vector databases, hybrid search retrieval, and parameter-efficient fine-tuning.",
    category: "AI & Data Science",
    difficulty: "Advanced",
    durationHours: 16,
    durationLabel: "16 Hours",
    durationText: "16 Hours (4 Weeks)",
    expiryDate: "2026-12-30",
    rating: 4.9,
    reviewsCount: "82",
    enrolledCount: 82,
    completionAvg: 65,
    price: 59,
    originalPrice: 199,
    thumbnail:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD5xBeiImCLlEcoU6ZzJTR6YZBjWZj-0QAvJsckHDnoNOWQV9D1mACgck4HkRlh9z8eGBhbEftAi72SyOnYmTqodvdvZenOLX7L5RpSYe5XzL9WlFuyzr8LKJYJA_-yC3Xg_D154uKFW8vjqm2lBVv9vWe1D81NT6lD3Ii-15nYBOTOge_Trb179oKD2Od7m2a10thGVcNOiFubhws2Plsvp1rhAh7p3ggKdE4GLIU",
    instructorEmail: "alex.morgan@nexalearn.io",
    instructorName: "Alex Morgan",
    instructorTitle: "Staff Engineer & Lead Instructor",
    instructorAvatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCQzEayrS8uYewSU2fPlpfOYPLBIjxaVz8jSYgwqmyOJoxN1j5pIXpfne4bfyJyGPPnsCTn3gNQjZ6Z3jFo_koop7wuB4hhQC_pNcKUj1yX6_Tlh-di0m7p9pBuUOgbkpdQHKeDOqfRdvJ9SU-39C-2KIIIW5TSnB6V085pHKOb_hCzxsAx-I13SG4-dqgHebQ6SHsR5tA8eZmxKHQZjVcmv6C910_pwBsc6cWMUAI",
    instructorBio:
      "Alex has designed distributed cloud systems serving millions of users and mentors full-stack engineers.",
    learningOutcomes: [
      "Implement hybrid RAG pipelines with dense vector embeddings.",
      "Fine-tune open-weights models using LoRA and QLoRA.",
    ],
    modules: [
      {
        moduleId: "LLM-MOD-01",
        number: "01",
        title: "Module 1: Vector Embeddings & RAG Pipelines",
        durationSummary: "2 Lessons • 1h 20m",
        expanded: true,
        lessons: [
          {
            lessonId: "LLM-101",
            title: "1.1 Semantic Chunking & Vector Similarity",
            type: "Video",
            duration: "35m",
            isFreePreview: true,
          },
          {
            lessonId: "LLM-102",
            title: "1.2 LoRA Fine-Tuning Walkthrough",
            type: "Video",
            duration: "45m",
            isFreePreview: false,
          },
        ],
      },
    ],
    quiz: {
      title: "Applied LLM & RAG Evaluation Quiz",
      passingScore: 70,
      timeLimitMinutes: 5,
      questions: [
        {
          questionId: "Q-201",
          concept: "LoRA Fine-Tuning",
          question:
            "How does LoRA reduce GPU memory usage during LLM fine-tuning?",
          options: [
            "By deleting half the dataset",
            "By freezing pretrained weights and training low-rank adapter matrices",
            "By running only on CPU",
            "By removing attention layers",
          ],
          correctIndex: 1,
          explanation:
            "LoRA freezes the base model weights and trains small rank-decomposition matrices, reducing trainable parameters by over 99%.",
        },
        {
          questionId: "Q-202",
          concept: "RAG Architecture",
          question:
            "What is the primary purpose of Retrieval-Augmented Generation (RAG)?",
          options: [
            "To ground LLM responses in verified external documents and reduce hallucinations",
            "To compress CSS files",
            "To replace HTTP servers",
            "To compile TypeScript code",
          ],
          correctIndex: 0,
          explanation:
            "RAG retrieves relevant document chunks at query time and injects them into the prompt context.",
        },
      ],
    },
    assignment: {
      title: "Production RAG Pipeline & Evaluation Benchmark",
      instructions:
        "Submit your RAG pipeline archive (.zip or .pdf) with retrieval evaluation metrics.",
      dueDate: "2026-12-28",
      maxScore: 100,
    },
    assignments: [
      {
        assignmentId: "ASN-2026-002",
        title: "Production RAG Pipeline & Evaluation Benchmark",
        instructions:
          "Submit your RAG pipeline archive (.zip or .pdf) with retrieval evaluation metrics.",
        dueDate: "2026-12-28",
        maxScore: 100,
        deliverableFormat: "ZIP, PDF, or DOCX",
      },
    ],
    status: "Hidden",
    moderationReason: "Missing quiz grading rubric in Module 1.",
    instructorResolutionNote: "",
  },
];