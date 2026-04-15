import { SubmissionDossierPanel } from "../../../components/submissions/submission-dossier-panel";

type SubmissionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SubmissionPage({ params }: SubmissionPageProps) {
  const { id } = await params;

  return <SubmissionDossierPanel submissionId={id} />;
}
