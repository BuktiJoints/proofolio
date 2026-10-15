import { describe, expect, it } from "vitest";
import { cn } from "../lib/utils";

describe("SkillFolio typography in shadcn class merging", () => {
  it("keeps typography and text colors together, independent of argument order", () => {
    expect(cn("text-s7", "text-primary-70")).toBe("text-s7 text-primary-70");
    expect(cn("text-secondary-30", "text-h3")).toBe("text-secondary-30 text-h3");
    expect(cn("text-b4 text-neutral-80", "md:text-sh2 md:text-red-70")).toBe(
      "text-b4 text-neutral-80 md:text-sh2 md:text-red-70",
    );
  });
  it("allows caller typography and color overrides independently", () => {
    expect(cn("text-s7 text-primary-70", "text-b8 text-red-70")).toBe("text-b8 text-red-70");
    expect(cn("text-s8 md:text-s7", "text-xs md:text-b8")).toBe("text-xs md:text-b8");
  });
});
