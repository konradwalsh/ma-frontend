import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    providers: {} as Record<
      string,
      { domain: string; name: string; available: boolean }
    >,
  },
}));

vi.mock("@/plugins/api", () => ({ default: apiMock }));

import StreamloaderHealthDot from "@/components/StreamloaderHealthDot.vue";

describe("StreamloaderHealthDot.vue", () => {
  beforeEach(() => {
    apiMock.providers = {};
  });

  it("renders nothing when providers map is empty (still loading)", () => {
    const wrapper = mount(StreamloaderHealthDot);
    expect(wrapper.find(".sl-health-dot").exists()).toBe(false);
  });

  it("renders the teal 'ok' dot when streamloader provider is available", () => {
    apiMock.providers = {
      sl_inst: {
        domain: "streamloader",
        name: "Streamloader",
        available: true,
      },
      tidal_inst: { domain: "tidal", name: "Tidal", available: true },
    };
    const wrapper = mount(StreamloaderHealthDot);
    const dot = wrapper.find(".sl-health-dot");
    expect(dot.exists()).toBe(true);
    expect(dot.classes()).toContain("sl-health-dot--ok");
    expect(dot.attributes("aria-label")).toBe("Streamloader status: Ready");
  });

  it("renders the amber 'warn' dot when streamloader provider is unavailable", () => {
    apiMock.providers = {
      sl_inst: {
        domain: "streamloader",
        name: "Streamloader",
        available: false,
      },
    };
    const wrapper = mount(StreamloaderHealthDot);
    const dot = wrapper.find(".sl-health-dot");
    expect(dot.exists()).toBe(true);
    expect(dot.classes()).toContain("sl-health-dot--warn");
    expect(dot.attributes("aria-label")).toBe("Streamloader status: Degraded");
  });

  it("renders the red 'error' dot when no streamloader provider is configured", () => {
    apiMock.providers = {
      tidal_inst: { domain: "tidal", name: "Tidal", available: true },
      plex_inst: { domain: "plex", name: "Plex", available: true },
    };
    const wrapper = mount(StreamloaderHealthDot);
    const dot = wrapper.find(".sl-health-dot");
    expect(dot.exists()).toBe(true);
    expect(dot.classes()).toContain("sl-health-dot--error");
    expect(dot.attributes("aria-label")).toBe("Streamloader status: Offline");
  });

  it("sets a descriptive native title tooltip", () => {
    apiMock.providers = {
      sl_inst: {
        domain: "streamloader",
        name: "Streamloader",
        available: true,
      },
    };
    const wrapper = mount(StreamloaderHealthDot);
    const title = wrapper.find(".sl-health-dot").attributes("title");
    expect(title).toBeTruthy();
    expect(title).toContain("Streamloader");
  });

  it("uses role='img' for assistive tech", () => {
    apiMock.providers = {
      sl_inst: {
        domain: "streamloader",
        name: "Streamloader",
        available: true,
      },
    };
    const wrapper = mount(StreamloaderHealthDot);
    expect(wrapper.find(".sl-health-dot").attributes("role")).toBe("img");
  });
});
