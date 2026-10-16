import { env } from "@/server/env";
import { RubricDetailPage } from "@/modules/rubrics/rubric-pages";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RubricDetailPage
      id={id}
      role="STUDENT"
      maxSeconds={env().UPLOAD_MAX_DURATION_SECONDS}
    />
  );
}
