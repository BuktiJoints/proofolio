import { currentUser } from "@/server/auth";
import { extractRubricDraft } from "@/server/domain/rubric-extraction";
import { generateRubricFromPdf } from "@/server/integrations/rubric-extraction";
import { readRubricPdf } from "@/server/rubric-upload";
import { ok, route } from "@/server/http";

export const POST = (request: Request) =>
  route(async () => {
    await currentUser(["ASSESSOR"]);
    const bytes = await readRubricPdf(request);
    return ok(await extractRubricDraft(bytes, generateRubricFromPdf));
  });
