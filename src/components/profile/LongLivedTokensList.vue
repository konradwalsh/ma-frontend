<template>
  <Card>
    <CardHeader>
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <CardTitle>{{ $t("auth.long_lived_tokens") }}</CardTitle>
          <CardDescription>
            {{ $t("auth.api_tokens_description") }}
          </CardDescription>
        </div>
        <Button color="primary" @click="showCreateDialog = true">
          <Plus :size="16" />
          {{ $t("auth.create_token") }}
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div v-if="tokens.length === 0" class="empty-state">
        <div
          class="flex size-16 items-center justify-center rounded-full bg-muted mb-3"
        >
          <Key :size="32" class="text-muted-foreground" />
        </div>
        <p class="text-muted-foreground font-medium">
          {{ $t("auth.no_tokens") }}
        </p>
        <p class="text-sm text-muted-foreground mt-1">
          {{ $t("auth.create_token_hint") }}
        </p>
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="token in tokens"
          :key="token.token_id"
          class="group flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:border-[#0f766e]/40 dark:hover:border-[#2dd4bf]/40 hover:bg-[#0f766e]/5 dark:hover:bg-[#2dd4bf]/5"
          :class="
            isTokenActive(token)
              ? 'border-[#0f766e]/40 dark:border-[#2dd4bf]/40 bg-[#0f766e]/[0.04] dark:bg-[#2dd4bf]/[0.04]'
              : ''
          "
        >
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-[#0f766e]/10 dark:group-hover:bg-[#2dd4bf]/10"
            :class="
              isTokenActive(token) ? 'bg-[#0f766e]/10 dark:bg-[#2dd4bf]/15' : ''
            "
          >
            <Key
              :size="20"
              class="text-muted-foreground transition-colors group-hover:text-[#0f766e] dark:group-hover:text-[#2dd4bf]"
              :class="
                isTokenActive(token) ? 'text-[#0f766e] dark:text-[#2dd4bf]' : ''
              "
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium truncate">{{ token.name }}</span>
              <span
                v-if="isTokenActive(token)"
                class="inline-flex items-center gap-1 rounded-full border border-[#0f766e]/30 dark:border-[#2dd4bf]/30 bg-[#0f766e]/10 dark:bg-[#2dd4bf]/15 px-2 py-0.5 text-[11px] font-medium text-[#0f766e] dark:text-[#2dd4bf]"
              >
                <span
                  class="size-1.5 rounded-full bg-[#0f766e] dark:bg-[#2dd4bf]"
                  aria-hidden="true"
                ></span>
                {{ te("auth.active") ? $t("auth.active") : "Active" }}
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
            variant="ghost"
            size="icon"
            :aria-label="
              te('auth.revoke_token') ? $t('auth.revoke_token') : 'Revoke token'
            "
            class="text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/15"
            @click.stop="emit('revoke', token)"
          >
            <Trash2 :size="16" />
          </Button>
        </div>
      </div>
    </CardContent>
    <CreateTokenDialog
      v-model="showCreateDialog"
      @created="handleTokenCreated"
    />
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
import CreateTokenDialog from "@/components/users/CreateTokenDialog.vue";
import type { AuthToken } from "@/plugins/api/interfaces";
import { Key, Plus, Trash2 } from "lucide-vue-next";
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t, te } = useI18n();

defineProps<{
  tokens: AuthToken[];
}>();

const emit = defineEmits<{
  revoke: [token: AuthToken];
  created: [];
}>();

const showCreateDialog = ref(false);

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};

// A long-lived token counts as "active" if it has been used within the last 7 days.
const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const isTokenActive = (token: AuthToken) => {
  if (!token.last_used_at) return false;
  const used = new Date(token.last_used_at).getTime();
  if (Number.isNaN(used)) return false;
  return Date.now() - used < ACTIVE_WINDOW_MS;
};

const handleTokenCreated = () => {
  emit("created");
};
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}
</style>
