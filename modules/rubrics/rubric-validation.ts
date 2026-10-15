import { z } from "zod";
export const rubricFormSchema = z
  .object({
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(4000).nullable(),
    programKeahlian: z.string().trim().max(180).nullable().optional(),
    partnerName: z.string().trim().max(180).nullable().optional(),
    requirements: z.string().trim().max(4000).nullable().optional(),
    criteria: z
      .array(
        z.object({
          code: z.string().trim().min(1).max(40),
          title: z.string().trim().min(2).max(180),
          description: z.string().trim().min(2).max(2000),
          order: z.number().int().min(0),
          required: z.boolean(),
          maxScore: z.number().int().min(1).max(100),
        }),
      )
      .min(1)
      .max(30),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.criteria.map((item) => item.code)).size !==
      value.criteria.length
    )
      ctx.addIssue({ code: "custom", message: "Kode kriteria harus unik." });
  });
