import { describe, expect, it } from "vitest";
import { registrationInput } from "@/server/domain/onboarding-input";
const common = {
  name: "Siswa Uji",
  email: "uji@example.test",
  password: "PasswordUji123!",
  schoolName: "SMK Uji",
  programKeahlian: "Teknik",
};
describe("WBS onboarding validation", () => {
  it("requires a complete student profile and normalizes Indonesian phone numbers", () => {
    expect(
      registrationInput.safeParse({ ...common, intent: "STUDENT" }).success,
    ).toBe(false);
    const value = registrationInput.parse({
      ...common,
      intent: "STUDENT",
      nisn: "0123456789",
      phone: "081234567890",
    });
    expect(value.intent === "STUDENT" && value.phone).toBe("+6281234567890");
  });
  it("accepts assessor applications without allowing client role or tenant assignment", () => {
    const value = registrationInput.parse({
      ...common,
      intent: "ASSESSOR",
      employeeId: "NIP-123",
      role: "ASSESSOR",
      accessStatus: "ACTIVE",
      organizationId: "untrusted",
    });
    expect(value).not.toHaveProperty("role");
    expect(value).not.toHaveProperty("accessStatus");
    expect(value).not.toHaveProperty("organizationId");
  });
  it("rejects unknown roles and malformed student identity", () => {
    expect(
      registrationInput.safeParse({ ...common, intent: "ADMIN" }).success,
    ).toBe(false);
    expect(
      registrationInput.safeParse({
        ...common,
        intent: "STUDENT",
        nisn: "123",
        phone: "123",
      }).success,
    ).toBe(false);
  });
});
