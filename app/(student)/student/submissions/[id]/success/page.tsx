import { SubmissionSuccessPage } from "@/modules/submissions/success-page";
export default async function Page({
  params,
}: PageProps<"/student/submissions/[id]/success">) {
  const { id } = await params;
  return <SubmissionSuccessPage id={id} />;
}
