import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, ref } from "vue";
import { TaskStatus, type BackgroundTask } from "@/plugins/api/interfaces";
import type { ActivityEntry } from "@/composables/useStreamloaderActivityLog";

// Per-test mutable activity-log state — we mock the composable directly so
// we can drive the bell's hasUnread/entries from the test without spinning
// up the real singleton (which would touch localStorage + the websocket
// task subscription).
const { activityState } = vi.hoisted(() => ({
  activityState: {
    entries: [] as ActivityEntry[],
    hasUnread: false,
    unreadCount: 0,
    markAllRead: () => {},
    clearAll: () => {},
  },
}));

// vue-i18n's useI18n() throws "Need to install with `app.use` function"
// when called outside an installed plugin. Several Streamloader components
// added i18n strings mid-batch — mocking the composable globally with an
// identity translator keeps every test in this file isolated from that.
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, _params?: Record<string, unknown>) => key,
  }),
}));

vi.mock("@/composables/useStreamloaderActivityLog", async () => {
  const { ref: vueRef, computed: vueComputed } = await import("vue");
  return {
    useStreamloaderActivityLog: () => {
      // Wrap the static mock state in refs/computeds so the component's
      // reactive bindings behave the same as in production.
      const entries = vueRef(activityState.entries);
      const hasUnread = vueComputed(() => activityState.hasUnread);
      const unreadCount = vueComputed(() => activityState.unreadCount);
      return {
        entries,
        hasUnread,
        unreadCount,
        markAllRead: vi.fn(activityState.markAllRead),
        clearAll: vi.fn(activityState.clearAll),
      };
    },
  };
});

// useSidebar() returns a context that includes a `state` ref ('expanded' or
// 'collapsed'). The component only reads `.value === "collapsed"` so a
// minimal stub is enough.
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ state: ref("expanded") }),
}));

// Vuetify menu/card/icon stubs — same auto-importer rationale as the other
// Streamloader dialog tests. v-menu must always render its activator slot
// AND its default slot so we can probe both the bell button and the popover
// contents in one mount.
vi.mock("vuetify/lib/components/VMenu/index.mjs", () => {
  const VMenu = defineComponent({
    name: "VMenu",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    setup(_, { slots }) {
      return () =>
        h("div", { class: "v-menu-stub" }, [
          slots.activator?.({ props: {} }),
          slots.default?.(),
        ]);
    },
  });
  return { VMenu, default: VMenu };
});

vi.mock("vuetify/lib/components/VCard/index.mjs", () => {
  const VCard = defineComponent({
    name: "VCard",
    setup(_, { slots }) {
      return () => h("div", { class: "v-card-stub" }, slots.default?.());
    },
  });
  return { VCard, default: VCard };
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

// VBtn is pulled in transitively by StreamloaderEmptyState — must be
// stubbed here too so its CSS side-effect import doesn't crash vitest.
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

import StreamloaderActivityLog from "@/components/StreamloaderActivityLog.vue";

const passthroughStub = (name: string, tag = "div") =>
  defineComponent({
    name,
    setup(_, { slots }) {
      return () => h(tag, { class: name.toLowerCase() }, slots.default?.());
    },
  });

const VMenuStub = defineComponent({
  name: "VMenuStub",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  setup(_, { slots }) {
    return () =>
      h("div", { class: "v-menu-stub" }, [
        slots.activator?.({ props: {} }),
        slots.default?.(),
      ]);
  },
});

const VIconStub = defineComponent({
  name: "VIconStub",
  props: ["size"],
  setup(_, { slots }) {
    return () => h("i", { class: "v-icon-stub" }, slots.default?.());
  },
});

const mountLog = () =>
  mount(StreamloaderActivityLog, {
    global: {
      stubs: {
        "v-menu": VMenuStub,
        "v-card": passthroughStub("VCard"),
        "v-icon": VIconStub,
        StreamloaderEmptyState: passthroughStub("StreamloaderEmptyState"),
      },
    },
  });

const makeEntry = (overrides: Partial<ActivityEntry> = {}): ActivityEntry => ({
  id: overrides.id ?? `e-${Math.random()}`,
  taskId: overrides.taskId ?? "task-1",
  kind: overrides.kind ?? "download",
  status: overrides.status ?? TaskStatus.SUCCESS,
  message: overrides.message ?? "Downloaded x",
  timestamp: overrides.timestamp ?? Date.now(),
});

// Silence unused-import lint — BackgroundTask is referenced for shape parity
// with the rest of the test suite even though we don't construct one here.
void (null as unknown as BackgroundTask);

describe("StreamloaderActivityLog.vue", () => {
  beforeEach(() => {
    activityState.entries = [];
    activityState.hasUnread = false;
    activityState.unreadCount = 0;
  });

  it("renders the bell button with the bell-outline icon", () => {
    const wrapper = mountLog();
    const bell = wrapper.find(".sl-activity-log__bell");
    expect(bell.exists()).toBe(true);
    // The icon text is the mdi name passed into <v-icon> — checking it
    // here guards against a silent rename of the bell icon.
    expect(wrapper.text()).toContain("mdi-bell-outline");
  });

  it("renders the unread red dot when hasUnread is true", () => {
    activityState.hasUnread = true;
    activityState.unreadCount = 3;
    const wrapper = mountLog();
    expect(wrapper.find(".sl-activity-log__dot").exists()).toBe(true);
    // aria-label must switch to the unread variant for screen readers
    // — the identity-mock returns the i18n KEY so we can assert against it.
    expect(
      wrapper.find(".sl-activity-log__bell").attributes("aria-label"),
    ).toBe("streamloader.activity_log.bell_label_unread");
  });

  it("renders all four filter chips (All / Downloads / Scans / Errors)", () => {
    const wrapper = mountLog();
    const chips = wrapper.findAll(".sl-activity-log__chip");
    expect(chips).toHaveLength(4);
    // With the identity translator, chip labels surface as their i18n keys.
    // Asserting on the keys themselves keeps the test robust to copy edits.
    const labels = chips.map((c) => c.text());
    expect(labels).toEqual([
      "streamloader.activity_log.filter_all",
      "streamloader.activity_log.filter_downloads",
      "streamloader.activity_log.filter_scans",
      "streamloader.activity_log.filter_errors",
    ]);
  });

  it("renders the empty state when entries is empty", () => {
    const wrapper = mountLog();
    // The Streamloader empty-state stub passes through children, so its
    // presence is asserted via the component name registration.
    expect(
      wrapper.findComponent({ name: "StreamloaderEmptyState" }).exists(),
    ).toBe(true);
    expect(wrapper.find(".sl-activity-log__list").exists()).toBe(false);
  });

  it("renders the entry list (and not the empty state) when entries are present", () => {
    activityState.entries = [
      makeEntry({ id: "1", message: "Downloaded one" }),
      makeEntry({ id: "2", message: "Downloaded two" }),
    ];
    const wrapper = mountLog();
    const rows = wrapper.findAll(".sl-activity-log__row");
    expect(rows).toHaveLength(2);
    expect(wrapper.text()).toContain("Downloaded one");
    expect(wrapper.text()).toContain("Downloaded two");
  });
});

// Touch the imported `computed` so the test file's import block stays clean
// after refactors — also doubles as a sanity check that vue is loaded.
void computed;
