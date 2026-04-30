<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t("auth.change_password") }}</CardTitle>
      <CardDescription>
        {{ $t("auth.update_your_password") }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div
        v-if="store.isIngressSession"
        class="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-600 dark:text-blue-400"
      >
        {{ $t("auth.ingress_password_note") }}
      </div>

      <form id="form-password-settings" @submit.prevent="form.handleSubmit">
        <FieldGroup>
          <form.Field name="newPassword">
            <template #default="{ field }">
              <Field :data-invalid="isInvalid(field)">
                <FieldLabel :for="field.name">
                  {{ $t("auth.new_password") }}
                </FieldLabel>
                <div class="relative">
                  <Input
                    :id="field.name"
                    :name="field.name"
                    :model-value="field.state.value"
                    :type="showNewPassword ? 'text' : 'password'"
                    :aria-invalid="isInvalid(field)"
                    autocomplete="new-password"
                    class="pr-10 focus-visible:ring-[#0f766e] dark:focus-visible:ring-[#2dd4bf] focus-visible:ring-offset-0 focus-visible:border-[#0f766e] dark:focus-visible:border-[#2dd4bf]"
                    @blur="field.handleBlur"
                    @input="handleNewPasswordInput($event, field)"
                  />
                  <button
                    type="button"
                    tabindex="-1"
                    :aria-label="
                      showNewPassword
                        ? te('auth.hide_password') ? $t('auth.hide_password') : 'Hide password'
                        : te('auth.show_password') ? $t('auth.show_password') : 'Show password'
                    "
                    class="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[#0f766e]/10 dark:hover:bg-[#2dd4bf]/10 hover:text-[#0f766e] dark:hover:text-[#2dd4bf] transition-colors"
                    @click="showNewPassword = !showNewPassword"
                  >
                    <EyeOff v-if="showNewPassword" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
                <div
                  v-if="currentNewPassword.length > 0"
                  class="mt-2 space-y-1"
                  aria-live="polite"
                >
                  <div
                    class="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      class="h-full transition-all duration-300 ease-out"
                      :class="strengthBarClass"
                      :style="{ width: `${strengthPercent}%` }"
                    />
                  </div>
                  <div class="flex items-center justify-between">
                    <span
                      class="text-xs font-medium"
                      :class="strengthLabelClass"
                    >
                      {{ strengthLabel }}
                    </span>
                  </div>
                </div>
                <FieldError
                  v-if="isInvalid(field)"
                  :errors="field.state.meta.errors"
                />
              </Field>
            </template>
          </form.Field>

          <form.Field name="confirmPassword">
            <template #default="{ field }">
              <Field :data-invalid="isInvalid(field)">
                <FieldLabel :for="field.name">
                  {{ $t("auth.confirm_password") }}
                </FieldLabel>
                <div class="relative">
                  <Input
                    :id="field.name"
                    :name="field.name"
                    :model-value="field.state.value"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    :aria-invalid="isInvalid(field)"
                    autocomplete="new-password"
                    class="pr-10 focus-visible:ring-[#0f766e] dark:focus-visible:ring-[#2dd4bf] focus-visible:ring-offset-0 focus-visible:border-[#0f766e] dark:focus-visible:border-[#2dd4bf]"
                    @blur="field.handleBlur"
                    @input="handleConfirmPasswordInput($event, field)"
                  />
                  <button
                    type="button"
                    tabindex="-1"
                    :aria-label="
                      showConfirmPassword
                        ? te('auth.hide_password') ? $t('auth.hide_password') : 'Hide password'
                        : te('auth.show_password') ? $t('auth.show_password') : 'Show password'
                    "
                    class="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[#0f766e]/10 dark:hover:bg-[#2dd4bf]/10 hover:text-[#0f766e] dark:hover:text-[#2dd4bf] transition-colors"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <EyeOff v-if="showConfirmPassword" :size="16" />
                    <Eye v-else :size="16" />
                  </button>
                </div>
                <FieldError
                  v-if="isInvalid(field)"
                  :errors="field.state.meta.errors"
                />
              </Field>
            </template>
          </form.Field>
        </FieldGroup>
      </form>
    </CardContent>
    <CardFooter>
      <Button
        type="submit"
        form="form-password-settings"
        color="primary"
        :disabled="!canChangePassword || changing"
        :loading="changing"
      >
        {{ te("auth.update_password") ? $t("auth.update_password") : "Update password" }}
      </Button>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import type { AnyFieldApi } from "@tanstack/form-core";
import { useForm } from "@tanstack/vue-form";
import { Eye, EyeOff } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createPasswordSchema } from "@/lib/forms/profile";
import { api } from "@/plugins/api";
import { store } from "@/plugins/store";

const { t, te } = useI18n();

const changing = ref(false);

const currentNewPassword = ref("");
const currentConfirmPassword = ref("");

const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const strengthScore = computed(() => {
  const pwd = currentNewPassword.value;
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
});

const strengthPercent = computed(() => (strengthScore.value / 4) * 100);

// Brand teal: #2dd4bf dark / #0f766e light. Amber + red for weaker tiers.
const strengthBarClass = computed(() => {
  switch (strengthScore.value) {
    case 0:
    case 1:
      return "bg-red-500";
    case 2:
      return "bg-amber-500";
    case 3:
      return "bg-[#0f766e] dark:bg-[#2dd4bf]/80";
    case 4:
    default:
      return "bg-[#0f766e] dark:bg-[#2dd4bf]";
  }
});

const strengthLabelClass = computed(() => {
  switch (strengthScore.value) {
    case 0:
    case 1:
      return "text-red-600 dark:text-red-400";
    case 2:
      return "text-amber-600 dark:text-amber-400";
    case 3:
    case 4:
    default:
      return "text-[#0f766e] dark:text-[#2dd4bf]";
  }
});

const strengthLabel = computed(() => {
  switch (strengthScore.value) {
    case 0:
    case 1:
      return te("auth.password_strength_weak") ? t("auth.password_strength_weak") : "Weak";
    case 2:
      return te("auth.password_strength_fair") ? t("auth.password_strength_fair") : "Fair";
    case 3:
      return te("auth.password_strength_good") ? t("auth.password_strength_good") : "Good";
    case 4:
    default:
      return te("auth.password_strength_strong") ? t("auth.password_strength_strong") : "Strong";
  }
});

const form = useForm({
  defaultValues: {
    newPassword: "",
    confirmPassword: "",
  },
  validators: {
    onSubmit: createPasswordSchema(t),
  },
  onSubmit: async ({ value }) => {
    changing.value = true;

    try {
      const result = await api.changePassword(value.newPassword);

      if (result) {
        toast.success(t("auth.password_changed"));
        form.reset();
        currentNewPassword.value = "";
        currentConfirmPassword.value = "";
      } else {
        toast.error(t("auth.password_change_failed"));
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : t("auth.password_change_failed"),
      );
    } finally {
      changing.value = false;
    }
  },
});

const canChangePassword = computed(() => {
  const newPassword =
    currentNewPassword.value || form.state.values.newPassword || "";
  const confirmPassword =
    currentConfirmPassword.value || form.state.values.confirmPassword || "";
  return newPassword === confirmPassword && confirmPassword.length > 0;
});

function isInvalid(field: AnyFieldApi) {
  return field.state.meta.isTouched && !field.state.meta.isValid;
}

const handleNewPasswordInput = (e: Event, field: AnyFieldApi) => {
  const value = (e.target as HTMLInputElement).value;
  currentNewPassword.value = value;
  field.handleChange(value);
};

const handleConfirmPasswordInput = (e: Event, field: AnyFieldApi) => {
  const value = (e.target as HTMLInputElement).value;
  currentConfirmPassword.value = value;
  field.handleChange(value);
};
</script>
