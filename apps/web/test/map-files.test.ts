import { dedicatedFileName } from "@/lib/map-files";
import { describe, expect, it } from "vitest";

describe("dedicatedFileName", () => {
  it("swaps the characters Windows forbids, as the dedicated server does", () => {
    expect(dedicatedFileName('5 - Go "Snow" Car.Map.Gbx')).toBe(
      "5 - Go _Snow_ Car.Map.Gbx",
    );
    expect(dedicatedFileName("a<b>c:d|e?f*g.Map.Gbx")).toBe(
      "a_b_c_d_e_f_g.Map.Gbx",
    );
  });

  it("leaves ordinary names alone", () => {
    expect(dedicatedFileName(" 3 - PipeLand (v2) 100%.Map.Gbx")).toBe(
      " 3 - PipeLand (v2) 100%.Map.Gbx",
    );
  });
});
