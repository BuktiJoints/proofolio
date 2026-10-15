import { z } from "zod";
export const phoneInput = z
  .string()
  .trim()
  .regex(
    /^(?:\+62|62|0)8[1-9][0-9]{6,11}$/,
    "Nomor telepon Indonesia tidak valid",
  )
  .transform((value) => `+62${value.replace(/^(?:\+62|62|0)/, "")}`);
const common = {
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  schoolName: z.string().trim().min(2).max(180),
  programKeahlian: z.string().trim().min(2).max(180),
};
export const registrationInput = z.discriminatedUnion("intent", [
  z.object({
    ...common,
    intent: z.literal("STUDENT"),
    nisn: z.string().regex(/^\d{10}$/),
    phone: phoneInput,
  }),
  z.object({
    ...common,
    intent: z.literal("ASSESSOR"),
    employeeId: z.string().trim().min(2).max(80),
  }),
]);
