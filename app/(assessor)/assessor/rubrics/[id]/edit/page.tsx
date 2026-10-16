import { RubricEditorPage } from "@/modules/rubrics/rubric-pages";
export default async function Page({
  params,
  searchParams,
}: PageProps<"/assessor/rubrics/[id]/edit">) {
  const { id } = await params;
  const { versionId } = await searchParams;
  return (
    <RubricEditorPage
      id={id}
      versionId={typeof versionId === "string" ? versionId : undefined}
    />
  );
}
