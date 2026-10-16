import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  Envelope,
  RubricVersion,
  Share,
  Submission,
} from "@/modules/shared/types";

export type PortfolioItem = {
  submission: Submission;
  rubric: RubricVersion;
  shares: Share[];
  verifiedCriterionCount?: number;
};

// All consumers of this cache key must store the same response shape.
export const portfolioQueryOptions = queryOptions({
  queryKey: ["portfolio", "list"],
  queryFn: async () =>
    (await api<Envelope<PortfolioItem[]>>("/api/v1/portfolio")).data,
});
