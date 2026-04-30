<template>
  <!-- Restore Missing Defaults confirmation -->
  <Dialog v-model:open="showRestoreDialog">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle class="text-base font-semibold tracking-tight">
          <span class="border-l-2 border-primary pl-2">{{
            $t("settings.restore_missing_defaults")
          }}</span>
        </DialogTitle>
        <DialogDescription>{{
          $t("settings.confirm_restore_defaults")
        }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="showRestoreDialog = false">
          {{ $t("cancel") }}
        </Button>
        <Button
          class="bg-primary text-primary-foreground hover:bg-primary/90"
          :disabled="restoreInProgress"
          @click="handleRestore"
        >
          {{ $t("settings.restore_missing_defaults") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Full Restore confirmation (step 1) -->
  <Dialog v-model:open="showFullRestoreDialog">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle class="text-base font-semibold tracking-tight">
          <span class="border-l-2 border-destructive pl-2">{{
            $t("settings.full_restore_genres")
          }}</span>
        </DialogTitle>
        <DialogDescription>{{
          $t("settings.confirm_full_restore")
        }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="showFullRestoreDialog = false">
          {{ $t("cancel") }}
        </Button>
        <Button variant="destructive" @click="handleFullRestoreStep2">
          {{ $t("delete") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Full Restore confirmation (step 2) -->
  <Dialog v-model:open="showFullRestoreDialog2">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle class="text-base font-semibold tracking-tight">
          <span class="border-l-2 border-destructive pl-2">{{
            $t("settings.full_restore_genres")
          }}</span>
        </DialogTitle>
        <DialogDescription>{{
          $t("settings.confirm_full_restore_2")
        }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="showFullRestoreDialog2 = false">
          {{ $t("cancel") }}
        </Button>
        <Button
          variant="destructive"
          :disabled="fullRestoreInProgress"
          @click="handleFullRestore"
        >
          {{ $t("delete") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  restoreInProgress: boolean;
  fullRestoreInProgress: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  restore: [];
  "full-restore-step2": [];
  "full-restore": [];
}>();

const showRestoreDialog = defineModel<boolean>("showRestoreDialog", {
  required: true,
});
const showFullRestoreDialog = defineModel<boolean>("showFullRestoreDialog", {
  required: true,
});
const showFullRestoreDialog2 = defineModel<boolean>("showFullRestoreDialog2", {
  required: true,
});

const handleRestore = () => {
  emit("restore");
};

const handleFullRestoreStep2 = () => {
  emit("full-restore-step2");
};

const handleFullRestore = () => {
  emit("full-restore");
};
</script>
