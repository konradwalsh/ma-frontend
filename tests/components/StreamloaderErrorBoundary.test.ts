import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";

// Vuetify auto-importer (vite-plugin-vuetify) injects raw component imports
// — including their CSS side-effects — at SFC compile time. Mocking the
// surface modules the boundary actually uses keeps the import graph
// CSS-free without teaching vitest the vuetify build pipeline.
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

// The boundary imports a static asset; vite handles this in production but
// in vitest we short-circuit it to a string URL.
vi.mock("@/assets/streamloader-mark.svg", () => ({
  default: "/streamloader-mark.svg",
}));

// vue-i18n's useI18n() throws "Need to install with `app.use` function"
// when called outside an installed plugin. The shared mock resolves keys
// against the real en.json so assertions still match the rendered copy
// without installing the live plugin.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

import StreamloaderErrorBoundary from "@/components/StreamloaderErrorBoundary.vue";

// Local kebab-case fallback stub — used when the SFC template path
// resolves v-btn as a global component rather than via auto-import.
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

// A child whose render function throws on demand — toggles via a prop so
// we can flip "no-error" → "error" within a single mounted wrapper.
const Boom = defineComponent({
  name: "Boom",
  props: {
    explode: { type: Boolean, default: false },
  },
  setup(props) {
    return () => {
      if (props.explode) {
        throw new Error("kaboom");
      }
      return h("div", { class: "boom-ok" }, "child-content");
    };
  },
});

const mountBoundary = (childProps: { explode: boolean } = { explode: false }) =>
  mount(StreamloaderErrorBoundary, {
    slots: {
      default: () => h(Boom, childProps),
    },
    global: {
      stubs: { "v-btn": VBtnStub },
    },
  });

describe("StreamloaderErrorBoundary.vue", () => {
  it("renders slot content when no error is captured", () => {
    // Suppress noisy console.error from any unexpected captures.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mount(StreamloaderErrorBoundary, {
      slots: { default: () => h("div", { class: "happy-child" }, "ok") },
      global: { stubs: { "v-btn": VBtnStub } },
    });
    expect(wrapper.find(".happy-child").exists()).toBe(true);
    expect(wrapper.find(".sl-eb").exists()).toBe(false);
    errSpy.mockRestore();
  });

  it("catches a descendant error and renders the branded fallback", async () => {
    // Boundary always console.errors the captured error — silence it so
    // the test output stays clean.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mount(StreamloaderErrorBoundary, {
      slots: { default: () => h(Boom, { explode: true }) },
      global: { stubs: { "v-btn": VBtnStub } },
    });
    await nextTick();
    expect(wrapper.find(".sl-eb").exists()).toBe(true);
    expect(wrapper.text()).toContain("Something went wrong");
    // Confirm the captured error was forwarded to console for dev-tools/Sentry.
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("'Try again' clears the captured error and re-renders the slot", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Mount with a child that explodes, then patch the slot via setProps
    // isn't possible — instead we drive the explode flag through a parent
    // wrapper component so we can flip it after the boundary recovers.
    const Parent = defineComponent({
      components: { StreamloaderErrorBoundary, Boom },
      data() {
        return { explode: true };
      },
      template: `
        <StreamloaderErrorBoundary>
          <Boom :explode="explode" />
        </StreamloaderErrorBoundary>
      `,
    });
    const wrapper = mount(Parent, {
      global: { stubs: { "v-btn": VBtnStub } },
    });
    await nextTick();
    expect(wrapper.find(".sl-eb").exists()).toBe(true);

    // Stop the child from throwing on the next render, then click Try again.
    await wrapper.setData({ explode: false });
    const tryAgain = wrapper
      .findAll(".v-btn-stub")
      .find((btn) => btn.text().includes("Try again"));
    expect(tryAgain).toBeTruthy();
    await tryAgain!.trigger("click");
    await nextTick();

    expect(wrapper.find(".sl-eb").exists()).toBe(false);
    expect(wrapper.find(".boom-ok").exists()).toBe(true);
    errSpy.mockRestore();
  });

  it("fallback container exposes role='alert' for assistive tech", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountBoundary({ explode: true });
    await nextTick();
    const alert = wrapper.find(".sl-eb");
    expect(alert.exists()).toBe(true);
    expect(alert.attributes("role")).toBe("alert");
    expect(alert.attributes("aria-live")).toBe("assertive");
    errSpy.mockRestore();
  });

  it("does not render the technical-details <details> when no error is present", () => {
    // The technical block is gated by both `capturedError` AND `isDev`.
    // We can't easily flip import.meta.env.DEV inside a vitest run, but we
    // can lock in the safer half of the contract: when no error exists the
    // <details> element MUST never be rendered, so production users never
    // see a stack trace from a healthy mount.
    const wrapper = mount(StreamloaderErrorBoundary, {
      slots: { default: () => h("span", "ok") },
      global: { stubs: { "v-btn": VBtnStub } },
    });
    expect(wrapper.find("details").exists()).toBe(false);
    expect(wrapper.find(".sl-eb__details").exists()).toBe(false);
  });
});
