export type NormalizedPerson = {
  id: string;
  name: string;
  email: string;
  affiliation?: string;
  avatar?: string;
  isActive?: boolean;
  reviewCount?: number;
  country?: string;
  orcid?: string;
  profileTitle?: string;
  actingArea?: string;
  language?: string;
  lattes?: string;
  bio?: string;
  claimedSubmissions?: number;
  assignedClaimedSubmissions?: number;
};

export type NormalizedSubmissionAuthor = {
  order?: number;
  isMainAuthor: boolean;
  person: NormalizedPerson;
};

export type NormalizedSubmissionTopic = {
  id: string;
  name: string;
};

export type NormalizedSubmissionFile = {
  id: string;
  name: string;
  downloadUrl?: string;
  size?: number;
  pageCount?: number;
  contentType?: string;
  required?: boolean;
  visibleReviewer?: boolean;
  visibleSessionChair?: boolean;
  maxPages?: number;
};

export type NormalizedSubmission = {
  id: string;
  title: string;
  abstract: string;
  status: string;
  trackId?: string;
  trackName?: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  statusChangedAt?: string;
  reviewCount: number;
  reviewerCount: number;
  reviewers?: NormalizedPerson[];
  authors?: NormalizedSubmissionAuthor[];
  topics?: NormalizedSubmissionTopic[];
  files?: NormalizedSubmissionFile[];
};

export type NormalizedReviewScore = {
  fieldId: string;
  label: string;
  type: string;
  value?: string;
  choiceId?: string;
  hidden?: boolean;
};

export type NormalizedReviewChoice = {
  id: string;
  label: string;
  order?: number;
  weight?: number;
};

export type NormalizedReviewAnswer = {
  id: string;
  value?: string;
  fieldChoiceId?: string;
  fieldChoiceLabel?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type NormalizedReviewCriterion = {
  fieldId: string;
  label: string;
  description?: string;
  type: string;
  order?: number;
  weight?: number;
  mandatory?: boolean;
  hidden?: boolean;
  valueText?: string;
  choices: NormalizedReviewChoice[];
  answers: NormalizedReviewAnswer[];
};

export type NormalizedReview = {
  id: string;
  status: string;
  reviewerId: string;
  reviewer?: NormalizedPerson;
  createdAt?: string;
  updatedAt?: string;
  dueAt?: string;
  assignedAt?: string;
  completedAt?: string;
  formId?: string;
  formName?: string;
  criteriaCount: number;
  answeredCriteriaCount: number;
  summary: string;
  scores: NormalizedReviewScore[];
  criteria: NormalizedReviewCriterion[];
};

export type NormalizedSubmissionDossier = {
  submission: NormalizedSubmission;
  reviews: NormalizedReview[];
  reviewers: NormalizedPerson[];
  source: "reviewersByInterest" | "fallback";
};

export type NormalizedSession = {
  authenticated: boolean;
  user: NormalizedPerson | null;
};
