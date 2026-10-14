import { Suspense } from "react";
import { env } from "@/server/env";
import { UploadPage } from "@/modules/submissions/upload-page";
import { LoadingState } from "@/modules/shared/ui";
export default function Page() {
  const config = env();
  return (
    <Suspense fallback={<LoadingState />}>
      <UploadPage
        maxBytes={config.UPLOAD_MAX_BYTES}
        maxSeconds={config.UPLOAD_MAX_DURATION_SECONDS}
      />
    </Suspense>
  );
}
