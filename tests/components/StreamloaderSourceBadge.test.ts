import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    providers: {} as Record<
      string,
      { name: string; is_streaming_provider: boolean }
    >,
  },
}));

vi.mock("@/plugins/api", () => ({ default: apiMock }));

// vue-i18n's useI18n() throws "Need to install with `app.use` function"
// when called outside an installed plugin. The shared mock resolves keys
// against the real en.json so assertions still match the rendered copy
// without installing the live plugin.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

import StreamloaderSourceBadge from "@/components/StreamloaderSourceBadge.vue";

const buildItem = (
  mappings: Array<{ provider_domain: string; provider_instance: string }>,
) => ({
  provider_mappings: mappings,
});

describe("StreamloaderSourceBadge.vue", () => {
  beforeEach(() => {
    apiMock.providers = {
      // Streaming providers — flagged as such in the providers map.
      tidal_inst: { name: "Tidal", is_streaming_provider: true },
      spotify_inst: { name: "Spotify", is_streaming_provider: true },
      // Local / library provider — no streaming flag.
      plex_inst: { name: "Plex", is_streaming_provider: false },
      // Streamloader is NOT marked as a streaming provider — its domain
      // alone determines the "cached" classification.
      sl_inst: { name: "Streamloader", is_streaming_provider: false },
    };
  });

  it("renders the Streamloader pill for a streamloader-only mapping", () => {
    const wrapper = mount(StreamloaderSourceBadge, {
      props: {
        item: buildItem([
          { provider_domain: "streamloader", provider_instance: "sl_inst" },
        ]) as never,
      },
    });
    expect(wrapper.text()).toContain("Streamloader");
    expect(wrapper.find(".sl-source-badge--cached").exists()).toBe(true);
  });

  it("renders the Local pill for a non-streaming, non-streamloader mapping", () => {
    const wrapper = mount(StreamloaderSourceBadge, {
      props: {
        item: buildItem([
          { provider_domain: "plex_local", provider_instance: "plex_inst" },
        ]) as never,
      },
    });
    expect(wrapper.text()).toContain("Local");
    expect(wrapper.find(".sl-source-badge--local").exists()).toBe(true);
  });

  it("renders the Streaming pill when only streaming providers map the item", () => {
    const wrapper = mount(StreamloaderSourceBadge, {
      props: {
        item: buildItem([
          { provider_domain: "tidal", provider_instance: "tidal_inst" },
        ]) as never,
      },
    });
    expect(wrapper.text()).toContain("Streaming");
    expect(wrapper.find(".sl-source-badge--streaming").exists()).toBe(true);
  });

  it("prioritises Local > Streamloader > Streaming for mixed mappings", () => {
    const wrapper = mount(StreamloaderSourceBadge, {
      props: {
        item: buildItem([
          { provider_domain: "streamloader", provider_instance: "sl_inst" },
          { provider_domain: "tidal", provider_instance: "tidal_inst" },
          { provider_domain: "plex_local", provider_instance: "plex_inst" },
        ]) as never,
      },
    });
    // Local wins over Streamloader and Streaming.
    expect(wrapper.text()).toContain("Local");
    expect(wrapper.text()).not.toContain("Streamloader");
    expect(wrapper.find(".sl-source-badge--local").exists()).toBe(true);
  });

  it("prefers Streamloader over Streaming when no Local mapping exists", () => {
    const wrapper = mount(StreamloaderSourceBadge, {
      props: {
        item: buildItem([
          { provider_domain: "streamloader", provider_instance: "sl_inst" },
          { provider_domain: "tidal", provider_instance: "tidal_inst" },
        ]) as never,
      },
    });
    expect(wrapper.text()).toContain("Streamloader");
    expect(wrapper.text()).not.toContain("Streaming");
  });

  it("compact mode hides the label but keeps the dot", () => {
    const wrapper = mount(StreamloaderSourceBadge, {
      props: {
        compact: true,
        item: buildItem([
          { provider_domain: "streamloader", provider_instance: "sl_inst" },
        ]) as never,
      },
    });
    expect(wrapper.find(".sl-source-badge--compact").exists()).toBe(true);
    expect(wrapper.find(".sl-source-badge__dot").exists()).toBe(true);
    expect(wrapper.find(".sl-source-badge__label").exists()).toBe(false);
  });

  it("sets aria-label with the resolved source label", () => {
    const wrapper = mount(StreamloaderSourceBadge, {
      props: {
        item: buildItem([
          { provider_domain: "tidal", provider_instance: "tidal_inst" },
        ]) as never,
      },
    });
    expect(wrapper.find(".sl-source-badge").attributes("aria-label")).toBe(
      "Source: Streaming",
    );
  });

  it("renders nothing when item has no provider mappings", () => {
    const wrapper = mount(StreamloaderSourceBadge, {
      props: { item: { provider_mappings: [] } as never },
    });
    expect(wrapper.find(".sl-source-badge").exists()).toBe(false);
  });
});
