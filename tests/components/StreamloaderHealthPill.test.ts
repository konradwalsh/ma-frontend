import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

// StreamloaderHealthPill mirrors HealthDot's data source: it reads the live
// `api.providers` map and renders nothing while it's still empty (cold app
// boot). We hoist a single mutable provider map so each test can dial in
// the state under test without reaching into the singleton.
const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    providers: {} as Record<
      string,
      { domain: string; name: string; available: boolean }
    >,
  },
}));

vi.mock("@/plugins/api", () => ({ default: apiMock }));

// Resolve i18n keys against the real en.json so label assertions stay
// honest if a copy edit lands upstream.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

import StreamloaderHealthPill from "@/components/StreamloaderHealthPill.vue";

describe("StreamloaderHealthPill.vue", () => {
  beforeEach(() => {
    apiMock.providers = {};
  });

  it("renders the 'Ready' label when streamloader provider is available", () => {
    apiMock.providers = {
      sl_inst: {
        domain: "streamloader",
        name: "Streamloader",
        available: true,
      },
    };
    const wrapper = mount(StreamloaderHealthPill);
    const pill = wrapper.find(".sl-health-pill");
    expect(pill.exists()).toBe(true);
    expect(pill.classes()).toContain("sl-health-pill--ok");
    expect(pill.text()).toBe("Ready");
  });

  it("renders the 'Provider issue' label when streamloader provider is degraded", () => {
    apiMock.providers = {
      sl_inst: {
        domain: "streamloader",
        name: "Streamloader",
        available: false,
      },
    };
    const wrapper = mount(StreamloaderHealthPill);
    const pill = wrapper.find(".sl-health-pill");
    expect(pill.exists()).toBe(true);
    expect(pill.classes()).toContain("sl-health-pill--warn");
    expect(pill.text()).toBe("Provider issue");
  });

  it("renders the 'Not configured' (offline) label when no streamloader provider is registered", () => {
    apiMock.providers = {
      tidal_inst: { domain: "tidal", name: "Tidal", available: true },
    };
    const wrapper = mount(StreamloaderHealthPill);
    const pill = wrapper.find(".sl-health-pill");
    expect(pill.exists()).toBe(true);
    expect(pill.classes()).toContain("sl-health-pill--error");
    expect(pill.text()).toBe("Not configured");
  });

  it("links to the providers settings page so a click navigates there", () => {
    // The pill is an anchor, not a router-link — the production code uses a
    // hash href so the browser handles the navigation. Asserting the href
    // protects the click-to-settings affordance the user task calls out.
    apiMock.providers = {
      sl_inst: {
        domain: "streamloader",
        name: "Streamloader",
        available: true,
      },
    };
    const wrapper = mount(StreamloaderHealthPill);
    const pill = wrapper.find("a.sl-health-pill");
    expect(pill.exists()).toBe(true);
    expect(pill.attributes("href")).toBe("/#/settings/providers");
  });
});
