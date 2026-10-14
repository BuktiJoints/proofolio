export type Role = "STUDENT" | "ASSESSOR";
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
};
export type Me = {
  user: User;
  profile: { schoolName: string | null; programKeahlian: string | null } | null;
};
export type Envelope<T> = { data: T };
export type Paginated<T> = Envelope<T[]> & {
  meta: { page: number; limit: number; total: number };
};
export type SubmissionStatus =
  | "QUEUED"
  | "ANALYZING"
  | "ANALYSIS_FAILED"
  | "AWAITING_REVIEW"
  | "IN_REVIEW"
  | "COMPLETED";
export type Submission = {
  id: string;
  status: SubmissionStatus;
  rubricVersionId: string;
  originalFilename: string;
  createdAt: string;
  completedAt: string | null;
  normalizedScore: string | null;
  durationMs: number;
};
export type CriterionInput = {
  code: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
  maxScore: number;
};
export type Criterion = CriterionInput & { id: string };
export type RubricInput = {
  title: string;
  description: string | null;
  criteria: CriterionInput[];
};
export type RubricVersion = {
  id: string;
  version: number;
  title: string;
  description: string | null;
  publishedAt: string | null;
  criteria: Criterion[];
};
export type Rubric = {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  activeVersionId: string | null;
  versions?: RubricVersion[];
};
export type ReviewDecision = "CONFIRMED" | "REJECTED" | "ADJUSTED";
export type ReviewItem = {
  criterionId: string;
  decision: ReviewDecision;
  score: number;
  note?: string | null;
};
export type Review = {
  id: string;
  assessorId: string;
  feedback: string | null;
  finalizedAt: string | null;
  items: ReviewItem[];
};
export type Evidence = {
  criterionId: string;
  status: "OBSERVED" | "NOT_OBSERVED" | "UNCERTAIN";
  startMs: number | null;
  endMs: number | null;
  evidence: string;
  quality: string;
};
export type SubmissionDetail = Submission & {
  rubricVersion: RubricVersion;
  criteria: Criterion[];
  analysis: { evidence: Evidence[] } | null;
  review: Review | null;
};
export type Share = {
  id: string;
  submissionId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};
