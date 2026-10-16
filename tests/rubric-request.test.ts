import { describe, expect, it } from "vitest";
import { requestJson, errorResponse } from "@/server/http";
describe("rubric mutation JSON input", () => {
  it("accepts legacy empty body and version selection JSON", async () => {
    expect(
      await requestJson(
        new Request("http://localhost", { method: "POST" }),
        true,
      ),
    ).toBeUndefined();
    expect(
      await requestJson(
        new Request("http://localhost", {
          method: "POST",
          body: '{"versionId":"selected"}',
        }),
        true,
      ),
    ).toEqual({ versionId: "selected" });
  });
  it("returns a safe validation response for malformed or required empty JSON", async () => {
    for (const body of ["{", ""]) {
      try {
        await requestJson(
          new Request("http://localhost", { method: "PUT", body }),
        );
        throw new Error("Must reject invalid JSON");
      } catch (error) {
        const response = errorResponse(error);
        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.requestId).toBeTypeOf("string");
      }
    }
  });
});
