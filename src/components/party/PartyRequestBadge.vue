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
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-primary));
  margin-right: 0.5rem;
  line-height: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}

.party-badge.is-boost {
  /* Slight lift to differentiate boost from a regular request */
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.22),
    0 0 6px v-bind(resolvedColor);
}

.party-badge-icon {
  flex-shrink: 0;
}

.party-badge-label {
  white-space: nowrap;
}
</style>
