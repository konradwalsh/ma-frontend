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

  it("returns empty string for an empty input string", () => {
    // Empty input has no underscore and no number prefix → quick-exit
    // returns the original "" verbatim.
    expect(prettifyMediaName("")).toBe("");
  });

  it("returns whitespace-only input untouched (quick-exit branch)", () => {
    // Whitespace-only carries no filename-shaped tells (no underscore,
    // no leading digits) so the prettifier intentionally leaves it
    // alone rather than collapsing to "". Documenting that contract
    // here so a future change that "fixes" it surfaces immediately.
    expect(prettifyMediaName("   ")).toBe("   ");
  });

  it("preserves CJK characters when there is no underscore or number prefix", () => {
    // Quick-exit applies — non-Latin scripts that already arrive clean
    // must pass through verbatim regardless of script.
    expect(prettifyMediaName("中文 専輯")).toBe("中文 専輯");
  });

  it("retains Cyrillic + CJK segments when title-casing a mixed Latin name", () => {
    // Mixed-script name with an underscore triggers the full pipeline:
    // underscores → spaces, then title-case (because the working string
    // has no Latin uppercase). Cyrillic letters get their leading char
    // upper-cased by JS's locale-aware toUpperCase; CJK has no case so
    // those characters are preserved byte-for-byte. Either way the
    // non-Latin glyphs themselves survive — that's the contract under
    // test.
    const result = prettifyMediaName("foo_бар_中文");
    expect(result).toContain("中文");
    expect(result.toLowerCase()).toContain("бар");
    expect(result.toLowerCase()).toContain("foo");
  });
});
