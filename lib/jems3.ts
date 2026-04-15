import { getJems3ApiBaseUrl } from "./auth";
import type {
  NormalizedPerson,
  NormalizedReview,
  NormalizedReviewAnswer,
  NormalizedReviewChoice,
  NormalizedReviewCriterion,
  NormalizedReviewScore,
  NormalizedSession,
  NormalizedSubmissionAuthor,
  NormalizedSubmissionFile,
  NormalizedSubmission,
  NormalizedSubmissionDossier,
  NormalizedSubmissionTopic,
} from "../types/jems3";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readIdentifier(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  return Buffer.from(padded, "base64").toString("utf-8");
}

function parseJsonRecord(value: string): JsonRecord | null {
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractUserIdFromJwt(token: string): string | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  const payload = parseJsonRecord(decodeBase64Url(parts[1]));

  if (!payload) {
    return null;
  }

  const candidate =
    payload.user_id ?? payload.userId ?? payload.sub ?? payload.id;

  if (typeof candidate === "string" || typeof candidate === "number") {
    return String(candidate);
  }

  return null;
}

function unwrapPayload(value: unknown) {
  if (isRecord(value) && "data" in value) {
    return value.data;
  }

  return value;
}

function getAffiliationName(input: unknown) {
  if (!isRecord(input)) {
    return undefined;
  }

  const affiliation = input.affiliation;

  if (!isRecord(affiliation)) {
    return undefined;
  }

  return readString(affiliation.name);
}

function resolveJems3AssetUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const baseUrl = getJems3ApiBaseUrl();

  if (!baseUrl) {
    return value;
  }

  try {
    const origin = new URL(baseUrl).origin;

    return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
  } catch {
    return value;
  }
}

function getAvatar(input: unknown) {
  if (!isRecord(input)) {
    return undefined;
  }

  return resolveJems3AssetUrl(
    readString(input.picAvatar) ?? readString(input.imageAvatar),
  );
}

function getCountry(input: unknown) {
  if (!isRecord(input)) {
    return undefined;
  }

  return readString(input.country);
}

function getOrcid(input: unknown) {
  if (!isRecord(input)) {
    return undefined;
  }

  return readString(input.orcid);
}

function normalizePerson(input: unknown): NormalizedPerson | null {
  if (!isRecord(input)) {
    return null;
  }

  const profile = isRecord(input.profile) ? input.profile : undefined;
  const profileUser = profile ? profile.user : undefined;
  const id = input.id ?? input.user ?? input.user_id ?? profileUser;
  const firstName = readString(input.firstName);
  const lastName = readString(input.lastName);
  const displayName =
    readString(input.name) ??
    readString(input.fullName) ??
    readString(input.username);
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || displayName || "";

  if (id === undefined || !fullName) {
    return null;
  }

  return {
    id: String(id),
    name: fullName,
    email: readString(input.email) ?? "",
    affiliation: getAffiliationName(input.profile ?? input),
    avatar: getAvatar(input.profile ?? input),
    isActive: typeof input.isActive === "boolean" ? input.isActive : undefined,
    reviewCount: readNumber(input.reviews),
    country: getCountry(input.profile ?? input),
    orcid: getOrcid(input.profile ?? input),
    profileTitle:
      readString(profile?.profileTitle) ?? readString(input.profileTitle),
    actingArea: readString(profile?.actingArea) ?? readString(input.actingArea),
    language: readString(profile?.language) ?? readString(input.language),
    lattes: readString(profile?.lattes) ?? readString(input.lattes),
    bio: readString(profile?.bio) ?? readString(input.bio),
    claimedSubmissions: readNumber(input.claimedSubmissions),
    assignedClaimedSubmissions: readNumber(input.assignedClaimedSubmissions),
  };
}

function normalizeSubmissionAuthors(
  input: unknown,
): NormalizedSubmissionAuthor[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const authors: NormalizedSubmissionAuthor[] = [];

  for (const item of input) {
    if (!isRecord(item)) {
      continue;
    }

    const person = normalizePerson(item.user ?? item);

    if (!person) {
      continue;
    }

    const order = readNumber(item.order);
    const isMainAuthor =
      readBoolean(item.isMainAuthor) ??
      readBoolean(item.mainAuthor) ??
      readBoolean(item.correspondingAuthor) ??
      order === 0;

    authors.push({
      order,
      isMainAuthor,
      person,
    });
  }

  return authors;
}

function normalizeSubmissionTopics(
  input: unknown,
): NormalizedSubmissionTopic[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `${index}`,
          name: item,
        } satisfies NormalizedSubmissionTopic;
      }

      if (!isRecord(item)) {
        return null;
      }

      const id = item.id ?? index;
      const name =
        readString(item.name) ??
        readString(item.title) ??
        readString(item.description);

      if (!name) {
        return null;
      }

      return {
        id: String(id),
        name,
      } satisfies NormalizedSubmissionTopic;
    })
    .filter((topic): topic is NormalizedSubmissionTopic => Boolean(topic));
}

function normalizeSubmissionFiles(input: unknown): NormalizedSubmissionFile[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const files: NormalizedSubmissionFile[] = [];

  for (const item of input) {
    if (!isRecord(item)) {
      continue;
    }

    const trackFile = isRecord(item.trackFile) ? item.trackFile : undefined;

    files.push({
      id: String(item.id ?? "unknown"),
      name: readString(item.name) ?? "Arquivo",
      downloadUrl: resolveJems3AssetUrl(readString(item.file)),
      size: readNumber(item.size),
      pageCount: readNumber(item.pageCount),
      contentType: readString(item.contentType),
      required: trackFile ? readBoolean(trackFile.required) : undefined,
      visibleReviewer: trackFile
        ? readBoolean(trackFile.visibleReviewer)
        : undefined,
      visibleSessionChair: trackFile
        ? readBoolean(trackFile.visibleSessionChair)
        : undefined,
      maxPages: trackFile ? readNumber(trackFile.maxPages) : undefined,
    });
  }

  return files;
}

function normalizeSubmissionBase(input: unknown): NormalizedSubmission {
  if (!isRecord(input)) {
    return {
      id: "unknown",
      title: "Submissão",
      abstract: "",
      status: "UNKNOWN",
      reviewCount: 0,
      reviewerCount: 0,
    };
  }

  const reviewersByInterest = Array.isArray(input.usersByInterest)
    ? input.usersByInterest
    : [];
  const reviewerClaims = Array.isArray(input.userClaims)
    ? input.userClaims
    : [];
  const mergedReviewers = [...reviewersByInterest, ...reviewerClaims];
  const reviewerById = new Map<string, NormalizedPerson>();

  for (const candidate of mergedReviewers) {
    const person = normalizePerson(candidate);

    if (!person) {
      continue;
    }

    if (!reviewerById.has(person.id)) {
      reviewerById.set(person.id, person);
    }
  }

  const reviewers = Array.from(reviewerById.values());

  const reviews = Array.isArray(input.reviews) ? input.reviews : [];
  const authors = normalizeSubmissionAuthors(input.authors);
  const topics = normalizeSubmissionTopics(input.topics);
  const files = normalizeSubmissionFiles(input.files);
  const track = isRecord(input.track) ? input.track : undefined;

  return {
    id: String(input.id ?? "unknown"),
    title: readString(input.title) ?? "Submissão sem título",
    abstract: readString(input.abstract) ?? "",
    status: readString(input.status) ?? "UNKNOWN",
    trackId:
      input.track !== undefined && input.track !== null
        ? String(track?.id ?? input.track)
        : undefined,
    trackName: readString(track?.name) ?? readString(track?.title),
    createdAt: readString(input.createdAt),
    updatedAt: readString(input.updatedAt),
    submittedAt: readString(input.submittedAt),
    statusChangedAt: readString(input.statusChangedAt),
    reviewCount: reviews.length,
    reviewerCount: reviewers.length,
    reviewers,
    authors,
    topics,
    files,
  };
}

function readAnswerValue(answer: unknown) {
  if (!isRecord(answer)) {
    return undefined;
  }

  const rawValue = answer.value;

  if (typeof rawValue === "string" && rawValue.length > 0) {
    return rawValue;
  }

  if (typeof rawValue === "number") {
    return String(rawValue);
  }

  if (typeof rawValue === "boolean") {
    return rawValue ? "Sim" : "Nao";
  }

  if (Array.isArray(rawValue)) {
    const values = rawValue
      .map((entry) => readIdentifier(entry))
      .filter((entry): entry is string => Boolean(entry));

    if (values.length > 0) {
      return values.join(", ");
    }
  }

  return undefined;
}

function normalizeReviewChoices(input: unknown): NormalizedReviewChoice[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: NormalizedReviewChoice[] = [];

  for (const choice of input) {
    if (!isRecord(choice)) {
      continue;
    }

    const choiceId = readIdentifier(choice.id);

    if (!choiceId) {
      continue;
    }

    const item: NormalizedReviewChoice = {
      id: choiceId,
      label:
        readString(choice.description) ??
        readString(choice.label) ??
        readString(choice.name) ??
        choiceId,
    };

    const order = readNumber(choice.order);
    const weight = readNumber(choice.weight);

    if (typeof order === "number") {
      item.order = order;
    }

    if (typeof weight === "number") {
      item.weight = weight;
    }

    normalized.push(item);
  }

  return normalized;
}

function normalizeReviewAnswer(
  answer: unknown,
  choices: NormalizedReviewChoice[],
): NormalizedReviewAnswer | null {
  if (!isRecord(answer)) {
    return null;
  }

  const rawFieldChoice = answer.fieldChoice ?? answer.choice;
  const fieldChoiceId = isRecord(rawFieldChoice)
    ? readIdentifier(rawFieldChoice.id)
    : readIdentifier(rawFieldChoice);
  const choiceById = choices.find((choice) => choice.id === fieldChoiceId);
  const fallbackValue = readAnswerValue(answer);
  const fallbackChoice = choices.find((choice) => choice.id === fallbackValue);
  const valueFromChoice = fallbackChoice?.label;
  const value =
    choiceById && (!fallbackValue || fallbackValue === fieldChoiceId)
      ? choiceById.label
      : (valueFromChoice ?? fallbackValue);

  return {
    id: readIdentifier(answer.id) ?? Math.random().toString(36).slice(2),
    value,
    fieldChoiceId,
    fieldChoiceLabel:
      choiceById?.label ??
      (isRecord(rawFieldChoice)
        ? (readString(rawFieldChoice.description) ??
          readString(rawFieldChoice.label))
        : undefined),
    createdAt: readString(answer.createdAt),
    updatedAt: readString(answer.updatedAt),
  } satisfies NormalizedReviewAnswer;
}

function normalizeReviewCriterion(
  field: unknown,
): NormalizedReviewCriterion | null {
  if (!isRecord(field)) {
    return null;
  }

  const choices = normalizeReviewChoices(field.choices);
  const answers = Array.isArray(field.answers)
    ? field.answers
        .map((answer) => normalizeReviewAnswer(answer, choices))
        .filter((answer): answer is NormalizedReviewAnswer => Boolean(answer))
    : [];
  const label =
    readString(field.shortLabel) ?? readString(field.description) ?? "Campo";
  const answerText = answers
    .map(
      (answer) =>
        answer.value ?? answer.fieldChoiceLabel ?? answer.fieldChoiceId,
    )
    .filter((value): value is string => Boolean(value));

  return {
    fieldId: readIdentifier(field.id) ?? label,
    label,
    description: readString(field.description),
    type: readString(field.type) ?? "TEXT",
    order: readNumber(field.order),
    weight: readNumber(field.weight),
    mandatory: readBoolean(field.required) ?? readBoolean(field.mandatory),
    hidden: readBoolean(field.hidden),
    valueText: answerText.length ? answerText.join(" | ") : undefined,
    choices,
    answers,
  } satisfies NormalizedReviewCriterion;
}

function normalizeReviewScores(
  criteria: NormalizedReviewCriterion[],
): NormalizedReviewScore[] {
  return criteria.map((criterion) => ({
    fieldId: criterion.fieldId,
    label: criterion.label,
    type: criterion.type,
    value: criterion.valueText,
    choiceId: criterion.answers.find((answer) => answer.fieldChoiceId)
      ?.fieldChoiceId,
    hidden: criterion.hidden,
  }));
}

function summarizeReview(criteria: NormalizedReviewCriterion[]) {
  const textFragments: string[] = [];

  for (const criterion of criteria) {
    const isTextCriterion =
      criterion.type === "TEXT" ||
      criterion.type === "LONGTEXT" ||
      criterion.type === "LONG_TEXT";

    if (isTextCriterion && criterion.valueText) {
      textFragments.push(`${criterion.label}: ${criterion.valueText}`);
    }
  }

  const scores = normalizeReviewScores(criteria);

  return {
    scores,
    summary: textFragments.slice(0, 3).join("\n\n"),
  };
}

function normalizeReview(
  input: unknown,
  reviewers: NormalizedPerson[],
): NormalizedReview | null {
  if (!isRecord(input)) {
    return null;
  }

  const form = isRecord(input.form) ? input.form : undefined;
  const fields = form && Array.isArray(form.fields) ? form.fields : [];
  const rawUser = input.user;
  const rawReviewer = input.reviewer;
  const rawUserClaim = input.userClaim;
  const rawUserProfile = input.userProfile;
  const reviewerId =
    readIdentifier(rawUser) ??
    (isRecord(rawUser)
      ? readIdentifier(rawUser.id ?? rawUser.user)
      : undefined) ??
    readIdentifier(rawReviewer) ??
    (isRecord(rawReviewer)
      ? readIdentifier(rawReviewer.id ?? rawReviewer.user)
      : undefined) ??
    (isRecord(rawUserClaim)
      ? readIdentifier(rawUserClaim.user ?? rawUserClaim.id)
      : undefined) ??
    (isRecord(rawUserProfile)
      ? readIdentifier(rawUserProfile.user ?? rawUserProfile.id)
      : undefined) ??
    "unknown";
  const reviewerFromReview =
    normalizePerson(rawUser) ??
    normalizePerson(rawReviewer) ??
    normalizePerson(rawUserClaim) ??
    normalizePerson(rawUserProfile) ??
    undefined;
  const reviewerFromList = reviewers.find((person) => person.id === reviewerId);
  const reviewer = reviewerFromList ?? reviewerFromReview;
  const criteria = fields
    .map((field) => normalizeReviewCriterion(field))
    .filter((field): field is NormalizedReviewCriterion => Boolean(field));
  const summary = summarizeReview(criteria);
  const answeredCriteriaCount = criteria.filter(
    (criterion) => criterion.answers.length > 0,
  ).length;

  return {
    id: String(input.id ?? "unknown"),
    status: readString(input.status) ?? "UNKNOWN",
    reviewerId,
    ...(reviewer ? { reviewer } : {}),
    createdAt: readString(input.createdAt),
    updatedAt: readString(input.updatedAt),
    dueAt: readString(input.dueAt),
    assignedAt: readString(input.assignedAt),
    completedAt: readString(input.completedAt),
    formId: readIdentifier(form?.id),
    formName: readString(form?.name),
    criteriaCount: criteria.length,
    answeredCriteriaCount,
    summary: summary.summary,
    scores: summary.scores,
    criteria,
  };
}

function normalizeListPayload(payload: unknown) {
  const unwrapped = unwrapPayload(payload);

  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  if (isRecord(unwrapped)) {
    if (Array.isArray(unwrapped.results)) {
      return unwrapped.results;
    }

    if (Array.isArray(unwrapped.items)) {
      return unwrapped.items;
    }

    if (Array.isArray(unwrapped.submissions)) {
      return unwrapped.submissions;
    }
  }

  return [] as unknown[];
}

export function normalizeSubmission(input: unknown): NormalizedSubmission {
  return normalizeSubmissionBase(unwrapPayload(input));
}

export function normalizeSubmissionList(
  input: unknown,
): NormalizedSubmission[] {
  return normalizeListPayload(input).map((item) => normalizeSubmission(item));
}

export function normalizeSubmissionDossier(
  input: unknown,
  reviewPayload?: unknown,
): NormalizedSubmissionDossier {
  const source = unwrapPayload(input);
  const submission = normalizeSubmissionBase(source);
  const reviewers = submission.reviewers ?? [];
  const dossierRawReviews =
    isRecord(source) && Array.isArray(source.reviews) ? source.reviews : [];
  const reviewEndpointItems = normalizeListPayload(reviewPayload);
  const rawReviews = reviewEndpointItems.length
    ? reviewEndpointItems
    : dossierRawReviews;
  const reviewSource = reviewEndpointItems.length
    ? "fallback"
    : isRecord(source) && Array.isArray(source.reviews)
      ? "reviewersByInterest"
      : "fallback";

  return {
    submission,
    reviewers,
    reviews: rawReviews
      .map((review) => normalizeReview(review, reviewers))
      .filter((review): review is NormalizedReview => Boolean(review)),
    source: reviewSource,
  };
}

export function normalizeSession(input: unknown): NormalizedSession {
  const source = unwrapPayload(input);

  const user = isRecord(source)
    ? normalizePerson(source.user ?? source.account ?? source)
    : normalizePerson(source);

  return {
    authenticated: Boolean(user),
    user,
  };
}

export async function fetchJems3Json(
  path: string,
  init: RequestInit & { token?: string } = {},
) {
  const baseUrl = getJems3ApiBaseUrl();

  if (!baseUrl) {
    throw new Error("JEMS3_API_BASE_URL não configurada.");
  }

  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (init.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  return { response, payload };
}

export async function getServerSession(token: string | undefined | null) {
  if (!token) {
    return { authenticated: false, user: null } satisfies NormalizedSession;
  }

  const { response, payload } = await fetchJems3Json("/auth/me/", { token });

  if (response.ok) {
    const normalizedSession = normalizeSession(payload);

    if (normalizedSession.authenticated && normalizedSession.user) {
      return normalizedSession;
    }
  }

  const userId = extractUserIdFromJwt(token);

  if (!userId) {
    return { authenticated: false, user: null } satisfies NormalizedSession;
  }

  return {
    authenticated: true,
    user: {
      id: userId,
      name: "Usuário autenticado",
      email: "",
    },
  } satisfies NormalizedSession;
}

export async function getSubmissionListForUser(token: string, userId: string) {
  const { response, payload } = await fetchJems3Json(
    `/submission/byUser/${userId}/`,
    {
      token,
    },
  );

  if (!response.ok) {
    const message = isRecord(payload)
      ? (readString(payload.message) ??
        readString(payload.detail) ??
        "Falha ao carregar submissões.")
      : "Falha ao carregar submissões.";

    throw new Error(message);
  }

  return normalizeSubmissionList(payload);
}

export async function getSubmissionDossier(
  token: string,
  submissionId: string,
) {
  const [reviewersByInterestResult, submissionResult] =
    await Promise.allSettled([
      fetchJems3Json(`/submission/${submissionId}/reviewersByInterest/`, {
        token,
      }),
      fetchJems3Json(`/submission/${submissionId}/`, { token }),
    ]);

  const reviewersByInterestPayload =
    reviewersByInterestResult.status === "fulfilled" &&
    reviewersByInterestResult.value.response.ok
      ? reviewersByInterestResult.value.payload
      : null;
  const submissionPayload =
    submissionResult.status === "fulfilled"
      ? submissionResult.value.payload
      : null;

  if (reviewersByInterestPayload) {
    const reviewersByInterestData = unwrapPayload(reviewersByInterestPayload);
    const submissionData = unwrapPayload(submissionPayload);

    const mergedPayload =
      isRecord(reviewersByInterestData) && isRecord(submissionData)
        ? {
            data: {
              ...submissionData,
              ...reviewersByInterestData,
              authors:
                submissionData.authors ?? reviewersByInterestData.authors,
              files: submissionData.files ?? reviewersByInterestData.files,
              topics: submissionData.topics ?? reviewersByInterestData.topics,
              track: submissionData.track ?? reviewersByInterestData.track,
              reviews:
                reviewersByInterestData.reviews ?? submissionData.reviews,
              usersByInterest:
                reviewersByInterestData.usersByInterest ??
                submissionData.usersByInterest,
              userClaims:
                reviewersByInterestData.userClaims ?? submissionData.userClaims,
            },
          }
        : reviewersByInterestPayload;

    return normalizeSubmissionDossier(mergedPayload);
  }

  const submission = normalizeSubmission(submissionPayload);
  const reviewers = submission.reviewers ?? [];
  const submissionData = unwrapPayload(submissionPayload);
  const rawReviews =
    isRecord(submissionData) && Array.isArray(submissionData.reviews)
      ? submissionData.reviews
      : normalizeListPayload(submissionPayload);

  return {
    submission,
    reviews: rawReviews
      .map((review) => normalizeReview(review, reviewers))
      .filter((review): review is NormalizedReview => Boolean(review)),
    reviewers,
    source: "fallback" as const,
  } satisfies NormalizedSubmissionDossier;
}

export async function getReviewerDetails(token: string, reviewerId: string) {
  const candidates = [
    `/user/${reviewerId}/`,
    `/user/${reviewerId}`,
    `/profile/${reviewerId}/`,
  ];

  for (const path of candidates) {
    const { response, payload } = await fetchJems3Json(path, { token });

    if (!response.ok) {
      continue;
    }

    const reviewer = normalizePerson(unwrapPayload(payload));

    if (reviewer) {
      return reviewer;
    }
  }

  return null;
}
