import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import StreamloaderFanart from "@/components/StreamloaderFanart.vue";

describe("StreamloaderFanart.vue", () => {
  it("renders the blurred fanart layer when src is provided", () => {
    const wrapper = mount(StreamloaderFanart, {
      props: { src: "https://example.invalid/cover.jpg" },
    });
    const layer = wrapper.find(".sl-fanart-layer");
    expect(layer.exists()).toBe(true);
    // Cover-art is applied via inline background-image so the same
    // element can be reused for crossfades on src change.
    expect(layer.attributes("style")).toContain(
      "https://example.invalid/cover.jpg",
    );
    // Vignette accompanies any rendered layer.
    expect(wrapper.find(".sl-fanart-vignette").exists()).toBe(true);
  });

  it("renders no fanart layer when src is empty or undefined", () => {
    const wrapperEmpty = mount(StreamloaderFanart, { props: { src: "" } });
    expect(wrapperEmpty.find(".sl-fanart-layer").exists()).toBe(false);
    expect(wrapperEmpty.find(".sl-fanart-vignette").exists()).toBe(false);
    // Root container still mounts (it's the absolute-positioned wash
    // host — InfoHeader expects it to always exist).
    expect(wrapperEmpty.find(".sl-fanart-root").exists()).toBe(true);

    const wrapperUndef = mount(StreamloaderFanart, {
      props: { src: undefined },
    });
    expect(wrapperUndef.find(".sl-fanart-layer").exists()).toBe(false);
  });

  it("marks the root as aria-hidden so screen readers skip the decoration", () => {
    const wrapper = mount(StreamloaderFanart, {
      props: { src: "https://example.invalid/x.jpg" },
    });
    const root = wrapper.find(".sl-fanart-root");
    expect(root.exists()).toBe(true);
    expect(root.attributes("aria-hidden")).toBe("true");
  });

  it("uses the src as the element key so a new src remounts the layer (crossfade contract)", async () => {
    // The transition wrapper is what crossfades between covers; its
    // contract relies on `:key="src"` so Vue swaps the element. We
    // verify the element identity changes on src change rather than
    // asserting the transition's internal animation state (which
    // happy-dom doesn't simulate).
    const wrapper = mount(StreamloaderFanart, {
      props: { src: "https://example.invalid/a.jpg" },
    });
    const layerA = wrapper.find(".sl-fanart-layer").element;
    expect(layerA).toBeTruthy();

    await wrapper.setProps({ src: "https://example.invalid/b.jpg" });
    const layerB = wrapper.find(".sl-fanart-layer").element;
    // Different keys → different DOM nodes.
    expect(layerB).not.toBe(layerA);
    expect(wrapper.find(".sl-fanart-layer").attributes("style")).toContain(
      "https://example.invalid/b.jpg",
    );
  });
});
