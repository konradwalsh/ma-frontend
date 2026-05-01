import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, markRaw, type Component } from "vue";

// Vuetify auto-importer (vite-plugin-vuetify) injects raw component imports
// — including their CSS side-effects — at SFC compile time, which Node's
// loader can't satisfy in a vitest run. Mocking the two surface modules
// the empty-state actually uses keeps the import graph CSS-free without
// having to teach vitest about the vuetify build pipeline.
vi.mock("vuetify/lib/components/VBtn/index.mjs", () => {
  const VBtn = defineComponent({
    name: "VBtn",
    emits: ["click"],
    setup(_, { slots, emit }) {
      return () =>
        h(
          "button",
          { class: "v-btn-stub", onClick: () => emit("click") },
          slots.default?.(),
        );
    },
  });
  return { VBtn, default: VBtn };
});

vi.mock("vuetify/lib/components/VIcon/index.mjs", () => {
  const VIcon = defineComponent({
    name: "VIcon",
    props: ["size"],
    setup(_, { slots }) {
      return () => h("i", { class: "v-icon-stub" }, slots.default?.());
    },
  });
  return { VIcon, default: VIcon };
});

import StreamloaderEmptyState from "@/components/StreamloaderEmptyState.vue";

// Fallback stubs for the kebab-case template usage — when v-btn/v-icon are
// resolved as global components rather than via the auto-import path.
const VIconStub = defineComponent({
  name: "VIconStub",
  props: ["size"],
  setup(_, { slots }) {
    return () => h("i", { class: "v-icon-stub" }, slots.default?.());
  },
});

const VBtnStub = defineComponent({
  name: "VBtnStub",
  emits: ["click"],
  setup(_, { slots, emit }) {
    return () =>
      h(
        "button",
        { class: "v-btn-stub", onClick: () => emit("click") },
        slots.default?.(),
      );
  },
});

interface EmptyStateProps {
  icon?: string | Component;
  title: string;
  message?: string;
  ctaLabel?: string;
  ctaAction?: () => void;
}

const mountWithStubs = (props: EmptyStateProps) =>
  mount(StreamloaderEmptyState, {
    props,
    global: {
      stubs: {
        "v-icon": VIconStub,
        "v-btn": VBtnStub,
      },
    },
  });

describe("StreamloaderEmptyState.vue", () => {
  it("renders the title and message text", () => {
    const wrapper = mountWithStubs({
      title: "No albums yet",
      message: "Play something to start your library.",
    });
    expect(wrapper.find(".sl-empty__title").text()).toBe("No albums yet");
    expect(wrapper.find(".sl-empty__message").text()).toBe(
      "Play something to start your library.",
    );
  });

  it("renders a CTA button when ctaLabel + ctaAction are provided and fires action on click", async () => {
    const ctaAction = vi.fn();
    const wrapper = mountWithStubs({
      title: "No results",
      ctaLabel: "Refresh",
      ctaAction,
    });
    const cta = wrapper.find(".sl-empty__cta");
    expect(cta.exists()).toBe(true);
    expect(cta.text()).toContain("Refresh");

    await cta.trigger("click");
    expect(ctaAction).toHaveBeenCalledTimes(1);
  });

  it("omits the CTA button when ctaLabel is not provided", () => {
    const wrapper = mountWithStubs({
      title: "Quiet here",
      message: "Nothing to show.",
    });
    expect(wrapper.find(".sl-empty__cta").exists()).toBe(false);
  });

  it("renders an mdi v-icon when the icon prop is a string", () => {
    const wrapper = mountWithStubs({
      title: "No albums",
      icon: "mdi-album",
    });
    const icon = wrapper.find(".sl-empty__icon");
    expect(icon.exists()).toBe(true);
    expect(icon.text()).toContain("mdi-album");
  });

  it("renders a Vue component when the icon prop is a component reference", () => {
    const CustomIcon = markRaw(
      defineComponent({
        name: "CustomIcon",
        props: ["size"],
        setup() {
          return () => h("svg", { class: "custom-icon-marker" });
        },
      }),
    );
    const wrapper = mountWithStubs({
      title: "Headphones unplugged",
      icon: CustomIcon,
    });
    expect(wrapper.find(".custom-icon-marker").exists()).toBe(true);
    // String-icon path must NOT also render a v-icon.
    expect(wrapper.find(".v-icon-stub").exists()).toBe(false);
  });

  it("wraps content in an inner column with the brand wash decoration", () => {
    // The decorative wash is aria-hidden so SR users skip it; the inner
    // column carries the announceable content. This pair is the component's
    // de-facto landmark structure.
    const wrapper = mountWithStubs({ title: "Empty" });
    const wash = wrapper.find(".sl-empty__wash");
    const inner = wrapper.find(".sl-empty__inner");
    expect(wash.exists()).toBe(true);
    expect(wash.attributes("aria-hidden")).toBe("true");
    expect(inner.exists()).toBe(true);
  });
});
