import { registerAccount } from "@/server/domain/onboarding";
import { route } from "@/server/http";
export const POST = (request: Request) => route(() => registerAccount(request));
