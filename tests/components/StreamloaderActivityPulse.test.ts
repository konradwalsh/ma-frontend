import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { TaskStatus, type BackgroundTask } from "@/plugins/api/interfaces";

const { apiMock, tasksRef } = vi.hoisted(() => ({
  apiMock: {
    providers: {} as Record<string, { domain: string; instance_id: string }>,
  },
  tasksRef: { current: [] as BackgroundTask[] },
}));

vi.mock("@/plugins/api", () => ({ default: apiMock }));
vi.mock("@/composables/useBackgroundTasks", () => ({
  useBackgroundTasks: () => ({
    tasks: ref(tasksRef.current),
  }),
}));

// vue-i18n's useI18n() throws "Need to install with `app.use` function"
// when called outside an installed plugin. The shared mock resolves keys
// against the real en.json so assertions still match the rendered copy
// without installing the live plugin.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

import StreamloaderActivityPulse from "@/components/StreamloaderActivityPulse.vue";

const makeTask = (
  id: string,
  status: TaskStatus,
  metadata: Record<string, unknown> = {},
): BackgroundTask =>
  ({
    id,
    name: `task-${id}`,
    status,
    translation_args: [],
    logs: [],
    failure_count: 0,
    failure_messages: [],
    metadata,
    created_at: "",
    updated_at: "",
    allow_retry: false,
  }) as unknown as BackgroundTask;

describe("StreamloaderActivityPulse.vue", () => {
  beforeEach(() => {
    apiMock.providers = {
      sl_inst: { domain: "streamloader", instance_id: "sl_inst" },
      tidal_inst: { domain: "tidal", instance_id: "tidal_inst" },
    };
    tasksRef.current = [];
  });

  it("renders nothing when there are no in-flight tasks", () => {
    tasksRef.current = [
      makeTask("done", TaskStatus.SUCCESS, { provider_instance: "sl_inst" }),
    ];
    const wrapper = mount(StreamloaderActivityPulse);
    expect(wrapper.find(".sl-activity-pulse").exists()).toBe(false);
  });

  it("renders only tasks that belong to a streamloader provider instance", () => {
    tasksRef.current = [
      makeTask("a", TaskStatus.RUNNING, { provider_instance: "sl_inst" }),
      makeTask("b", TaskStatus.RUNNING, { provider_instance: "tidal_inst" }),
      makeTask("c", TaskStatus.PENDING, { provider_domain: "streamloader" }),
    ];
    const wrapper = mount(StreamloaderActivityPulse);
    expect(wrapper.find(".sl-activity-pulse").exists()).toBe(true);
    const rows = wrapper.findAll(".sl-activity-pulse__row");
    // task-a (matches by instance) + task-c (matches by domain fallback)
    expect(rows).toHaveLength(2);
    expect(wrapper.text()).toContain("task-a");
    expect(wrapper.text()).toContain("task-c");
    expect(wrapper.text()).not.toContain("task-b");
  });

  it("caps visible rows at 4", () => {
    tasksRef.current = Array.from({ length: 7 }, (_, i) =>
      makeTask(`t${i}`, TaskStatus.RUNNING, { provider_instance: "sl_inst" }),
    );
    const wrapper = mount(StreamloaderActivityPulse);
    expect(wrapper.findAll(".sl-activity-pulse__row")).toHaveLength(4);
  });

  it("shows the visible task count in the header", () => {
    tasksRef.current = Array.from({ length: 3 }, (_, i) =>
      makeTask(`t${i}`, TaskStatus.RUNNING, { provider_instance: "sl_inst" }),
    );
    const wrapper = mount(StreamloaderActivityPulse);
    expect(wrapper.find(".sl-activity-pulse__count").text()).toContain("3");
  });

  it("excludes tasks with terminal statuses (success / failed / cancelled)", () => {
    tasksRef.current = [
      makeTask("ok", TaskStatus.SUCCESS, { provider_instance: "sl_inst" }),
      makeTask("fail", TaskStatus.FAILED, { provider_instance: "sl_inst" }),
      makeTask("cancel", TaskStatus.CANCELLED, {
        provider_instance: "sl_inst",
      }),
      makeTask("idle", TaskStatus.IDLE, { provider_instance: "sl_inst" }),
    ];
    const wrapper = mount(StreamloaderActivityPulse);
    expect(wrapper.find(".sl-activity-pulse").exists()).toBe(false);
  });
});
