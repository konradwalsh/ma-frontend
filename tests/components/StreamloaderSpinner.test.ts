import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

// Stub the SVG asset import — Vite's asset pipeline isn't running in the
// happy-dom test env, so resolve to a deterministic placeholder string.
vi.mock("@/assets/streamloader-mark.svg", () => ({
  default: "/test/streamloader-mark.svg",
}));

// The spinner now calls `useI18n()` to localize the default screen-reader
// label. Resolve keys against the real en.json so existing assertions
// against "Loading" still hold.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

import StreamloaderSpinner from "@/components/StreamloaderSpinner.vue";

describe("StreamloaderSpinner.vue", () => {
  it("renders with the default size of 40px", () => {
    const wrapper = mount(StreamloaderSpinner);
    const root = wrapper.find(".sl-spinner");
    expect(root.exists()).toBe(true);
    expect(root.attributes("style")).toContain("--sl-spin-size: 40px");
  });

  it("respects an explicit size prop of 32", () => {
    const wrapper = mount(StreamloaderSpinner, { props: { size: 32 } });
    expect(wrapper.find(".sl-spinner").attributes("style")).toContain(
      "--sl-spin-size: 32px",
    );
  });

  it("respects an explicit size prop of 48", () => {
    const wrapper = mount(StreamloaderSpinner, { props: { size: 48 } });
    expect(wrapper.find(".sl-spinner").attributes("style")).toContain(
      "--sl-spin-size: 48px",
    );
  });

  it("exposes role='status' so assistive tech announces loading state", () => {
    const wrapper = mount(StreamloaderSpinner);
    const root = wrapper.find(".sl-spinner");
    expect(root.attributes("role")).toBe("status");
    expect(root.attributes("aria-label")).toBe("Loading");
  });

  it("renders a visually-hidden label element for screen readers", () => {
    const wrapper = mount(StreamloaderSpinner, {
      props: { label: "Fetching library" },
    });
    const sr = wrapper.find(".sl-spinner__sr");
    expect(sr.exists()).toBe(true);
    expect(sr.text()).toBe("Fetching library");
    // aria-label on the live region is also updated for non-visual UAs.
    expect(wrapper.find(".sl-spinner").attributes("aria-label")).toBe(
      "Fetching library",
    );
  });
});
