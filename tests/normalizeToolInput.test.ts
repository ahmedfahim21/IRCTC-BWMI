import { describe, expect, it } from "vitest";
import { applyBookingOptionsPatch, normalizeSetOptionsInput } from "@/lib/agent/normalizeToolInput";

describe("normalizeSetOptionsInput", () => {
  it("accepts direct boolean fields", () => {
    expect(normalizeSetOptionsInput({ travelInsurance: false })).toEqual({ travelInsurance: false });
  });

  it("coerces string booleans from the model", () => {
    expect(normalizeSetOptionsInput({ travelInsurance: "false" })).toEqual({ travelInsurance: false });
  });

  it("maps remove-insurance aliases", () => {
    expect(normalizeSetOptionsInput({ removeTravelInsurance: true })).toEqual({ travelInsurance: false });
  });

  it("applies a patch to current options", () => {
    const { next, changed } = applyBookingOptionsPatch(
      { addMeals: false, travelInsurance: true, keepTogether: true, autoUpgrade: true },
      { travelInsurance: false }
    );
    expect(next.travelInsurance).toBe(false);
    expect(changed).toEqual(["insurance"]);
  });
});
