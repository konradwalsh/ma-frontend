<template>
  <span :class="['party-badge', { 'is-boost': type === 'boost' }]">
    <v-icon size="x-small" class="party-badge-icon">{{ icon }}</v-icon>
    <span class="party-badge-label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { $t } from "@/plugins/i18n";
import { computed } from "vue";

interface Props {
  type: "request" | "boost";
  badgeColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  badgeColor: undefined,
});

const icon = computed(() =>
  props.type === "boost" ? "mdi-rocket-launch" : "mdi-account-music",
);

const label = computed(() =>
  props.type === "boost"
    ? $t("providers.party.boost")
    : $t("providers.party.request"),
);

// Fall back to brand teal when no per-guest color is supplied.
const resolvedColor = computed(
  () => props.badgeColor || "rgb(var(--v-theme-primary))",
);
</script>

<style scoped>
.party-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: v-bind(resolvedColor);
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  /* Slightly tighter tracking matches established pill-chip spec while
     keeping the all-caps badge visually distinct. */
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-primary));
  margin-right: 0.5rem;
  line-height: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  /* Springy overshoot when a badge appears alongside a freshly-added
     request — matches the established brand motion vocabulary. */
  transition:
    box-shadow 0.25s cubic-bezier(0.34, 1.36, 0.64, 1),
    transform 0.25s cubic-bezier(0.34, 1.36, 0.64, 1);
}

.party-badge.is-boost {
  /* Slight lift to differentiate boost from a regular request */
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.22),
    0 0 6px v-bind(resolvedColor);
}

/* Subtle hover affordance — only on devices that actually have hover. The
   touch suppression keeps mobile guests from getting a sticky highlight. */
@media (hover: hover) {
  .party-badge:hover {
    transform: translateY(-1px);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.25),
      0 0 10px v-bind(resolvedColor);
  }

  .party-badge.is-boost:hover {
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.28),
      0 0 14px v-bind(resolvedColor);
  }
}

@media (hover: none) {
  .party-badge:hover {
    transform: none;
  }
}

.party-badge-icon {
  flex-shrink: 0;
}

.party-badge-label {
  white-space: nowrap;
  /* Tabular feel — letter-spacing harmonised with the rest of the badge */
  letter-spacing: 0.01em;
  font-weight: 700;
}
</style>
