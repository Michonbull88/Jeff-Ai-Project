import { test, expect } from "@playwright/test";
import { getNodAmount } from "../lib/visual/faceGeometry";

test("Jeff nods smoothly every nine seconds", () => {
  expect(getNodAmount(0)).toBe(0);
  expect(getNodAmount(8999)).toBe(0);
  expect(getNodAmount(9000)).toBe(0);
  expect(getNodAmount(9600)).toBeCloseTo(1);
  expect(getNodAmount(10200)).toBeCloseTo(0);
  expect(getNodAmount(18000)).toBe(0);
  expect(getNodAmount(18600)).toBeCloseTo(1);
});
