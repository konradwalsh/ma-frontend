<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t("auth.active_sessions") }}</CardTitle>
      <CardDescription>
        {{ $t("auth.manage_active_sessions") }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="tokens.length === 0" class="empty-state">
        <div
          class="flex size-16 items-center justify-center rounded-full bg-muted mb-3"
        >
          <MonitorOff :size="32" class="text-muted-foreground" />
        </div>
        <p class="text-muted-foreground">{{ $t("no_content") }}</p>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="token in tokens"
          :key="token.token_id"
          class="group flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:border-[#0f766e]/40 dark:hover:border-[#2dd4bf]/40 hover:bg-[#0f766e]/5 dark:hover:bg-[#2dd4bf]/5"
          :class="
            isCurrentSession(token)
              ? 'border-[#0f766e]/40 dark:border-[#2dd4bf]/40 bg-[#0f766e]/[0.04] dark:bg-[#2dd4bf]/[0.04]'
              : ''
          "
        >
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-[#0f766e]/10 dark:group-hover:bg-[#2dd4bf]/10"
            :class="
              isCurrentSession(token)
                ? 'bg-[#0f766e]/10 dark:bg-[#2dd4bf]/15'
                : ''
            "
          >
            <Monitor
              :size="20"
              class="text-muted-foreground transition-colors group-hover:text-[#0f766e] dark:group-hover:text-[#2dd4bf]"
              :class="
                isCurrentSession(token)
                  ? 'text-[#0f766e] dark:text-[#2dd4bf]'
                  : ''
              "
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium truncate">{{ token.name }}</span>
              <span
                v-if="isCurrentSession(token)"
                class="inline-flex items-center gap-1 rounded-full border border-[#0f766e]/30 dark:border-[#2dd4bf]/30 bg-[#0f766e]/10 dark:bg-[#2dd4bf]/15 px-2 py-0.5 text-[11px] font-medium text-[#0f766e] dark:text-[#2dd4bf]"
              >
                <span
                  class="size-1.5 rounded-full bg-[#0f766e] dark:bg-[#2dd4bf] animate-pulse"
                  aria-hidden="true"
                />
                {{ $t("auth.current_session") || "Current session" }}
              </span>
            </div>
            <div class="text-sm text-muted-foreground flex flex-wrap gap-2">
              <span
                >{{ $t("created") }}: {{ formatDate(token.created_at) }}</span
              >
              <span v-if="token.last_used_at">•</span>
              <span v-if="token.last_used_at">
                {{ $t("last_used") }}: {{ formatDate(token.last_used_at) }}
              </span>
            </div>
          </div>
          <Button
            v-if="!isCurrentSession(token)"
            variant="ghost"
            size="icon"
            :aria-label="$t('auth.revoke_session') || 'Revoke session'"
            class="text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/15"
            @click.stop="emit('revoke', token)"
          >
            <Trash2 :size="16" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuthToken } from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { Monitor, MonitorOff, Trash2 } from "lucide-vue-next";
import { computed } from "vue";

defineProps<{
  tokens: AuthToken[];
}>();

const emit = defineEmits<{
  revoke: [token: AuthToken];
}>();

// Match the active JWT's token_id (jti claim) to mark the user's own session.
const currentTokenId = computed(() => authManager.getClaim("jti") ?? null);

const isCurrentSession = (token: AuthToken) =>
  currentTokenId.value !== null && token.token_id === currentTokenId.value;

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}
</style>
