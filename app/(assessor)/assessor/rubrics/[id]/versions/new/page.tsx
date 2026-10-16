import { RubricEditorPage } from "@/modules/rubrics/rubric-pages";
export default async function Page({
  params,
}: PageProps<"/assessor/rubrics/[id]/versions/new">) {
  const { id } = await params;
  return <RubricEditorPage id={id} createVersion />;
}
