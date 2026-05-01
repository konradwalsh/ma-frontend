import { prettifyMediaName } from "@/helpers/prettifyMediaName";
import { describe, expect, it } from "vitest";

describe("prettifyMediaName", () => {
  it("converts underscores to spaces", () => {
    expect(prettifyMediaName("fun_people")).toBe("Fun People");
  });

  it("strips leading numeric prefix like '04-'", () => {
    expect(prettifyMediaName("04-only_way_out_is_through")).toBe(
      "Only Way Out Is Through",
    );
  });

  it("strips leading numeric prefix like '109_'", () => {
    expect(prettifyMediaName("109_carrot_rope")).toBe("Carrot Rope");
  });

  it("returns already-clean names unchanged", () => {
    expect(prettifyMediaName("Carrot Rope")).toBe("Carrot Rope");
  });

  it("strips artist prefix case-insensitively", () => {
    expect(
      prettifyMediaName("graham_coxon_fun_people", {
        artist: "Graham Coxon",
      }),
    ).toBe("Fun People");
  });

  it("title-cases an all-lowercase name", () => {
    expect(prettifyMediaName("only_way_out_is_through")).toBe(
      "Only Way Out Is Through",
    );
  });

  it("leaves mixed-case stylized names alone", () => {
    // No underscores, no number prefix → quick exit, untouched.
    expect(prettifyMediaName("iLuminate")).toBe("iLuminate");
  });

  it("preserves bracketed segments without title-casing inside", () => {
    expect(
      prettifyMediaName("109-pavement-carrot_rope_(2022_remaster)", {
        artist: "Pavement",
      }),
    ).toBe("Carrot Rope (2022 remaster)");
  });

  it("strips full track-prefix + artist + underscores together", () => {
    expect(
      prettifyMediaName("04-sarah_mclachlan-only_way_out_is_through", {
        artist: "Sarah McLachlan",
      }),
    ).toBe("Only Way Out Is Through");
  });

  it("preserves common acronyms when title-casing", () => {
    expect(prettifyMediaName("welcome_to_the_usa")).toBe("Welcome To The USA");
  });

  it("returns empty string for null/undefined input", () => {
    expect(prettifyMediaName(null)).toBe("");
    expect(prettifyMediaName(undefined)).toBe("");
  });

  it("does not strip a numeric prefix that consumes the entire name", () => {
    expect(prettifyMediaName("04-")).toBe("04-");
  });
});
