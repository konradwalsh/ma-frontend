<script setup lang="ts">
import { useRegisterSW } from "virtual:pwa-register/vue";

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW();

const close = async () => {
  offlineReady.value = false;
  needRefresh.value = false;
};
</script>

<template>
  <transition name="pwa-toast-slide">
    <div v-if="offlineReady || needRefresh" class="pwa-toast" role="alert">
      <div class="pwa-toast__accent" aria-hidden="true" />
      <div class="message">
        <span v-if="offlineReady"> Streamloader is ready to work offline </span>
        <span v-else>
          A new version of Streamloader is available — reload to update.
        </span>
      </div>
      <div class="pwa-toast__actions">
        <button
          v-if="needRefresh"
          class="pwa-btn pwa-btn--primary"
          @click="updateServiceWorker()"
        >
          Reload
        </button>
        <button class="pwa-btn pwa-btn--ghost" @click="close">Dismiss</button>
      </div>
    </div>
  </transition>
</template>

<style>
.pwa-toast {
  position: fixed;
  right: 0;
  bottom: 0;
  margin: 16px;
  padding: 14px 16px 14px 18px;
  border: 1px solid rgba(45, 212, 191, 0.45);
  border-radius: 10px;
  z-index: 1;
  text-align: left;
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.25),
    0 12px 32px rgba(15, 118, 110, 0.35),
    0 2px 6px rgba(0, 0, 0, 0.35);
  background:
    linear-gradient(
      135deg,
      rgba(45, 212, 191, 0.12) 0%,
      rgba(15, 118, 110, 0.08) 100%
    ),
    rgba(20, 24, 28, 0.96);
  color: rgb(229, 231, 235);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  overflow: hidden;
  min-width: 260px;
  max-width: 380px;
}

.pwa-toast__accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: linear-gradient(
    180deg,
    rgb(45, 212, 191) 0%,
    rgb(15, 118, 110) 100%
  );
}

.pwa-toast .message {
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.pwa-toast__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.pwa-toast .pwa-btn {
  border: 1px solid transparent;
  outline: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 200ms cubic-bezier(0.34, 1.36, 0.64, 1),
    background-color 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.pwa-toast .pwa-btn--primary {
  background: rgb(45, 212, 191);
  color: rgb(15, 23, 23);
  border-color: rgb(45, 212, 191);
  box-shadow: 0 4px 14px rgba(45, 212, 191, 0.35);
}

.pwa-toast .pwa-btn--primary:hover {
  background: rgb(94, 234, 212);
  border-color: rgb(94, 234, 212);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(45, 212, 191, 0.5);
}

.pwa-toast .pwa-btn--primary:focus-visible {
  outline: 2px solid rgb(94, 234, 212);
  outline-offset: 2px;
}

.pwa-toast .pwa-btn--ghost {
  background: transparent;
  color: rgba(94, 234, 212, 0.9);
  border-color: rgba(45, 212, 191, 0.35);
}

.pwa-toast .pwa-btn--ghost:hover {
  background: rgba(45, 212, 191, 0.1);
  border-color: rgba(45, 212, 191, 0.6);
  color: rgb(94, 234, 212);
}

.pwa-toast .pwa-btn--ghost:focus-visible {
  outline: 2px solid rgb(45, 212, 191);
  outline-offset: 2px;
}

.pwa-toast-slide-enter-active {
  transition: all 380ms cubic-bezier(0.34, 1.36, 0.64, 1);
}
.pwa-toast-slide-leave-active {
  transition: all 220ms ease;
}
.pwa-toast-slide-enter-from {
  opacity: 0;
  transform: translateY(24px) translateX(8px);
}
.pwa-toast-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (hover: none) {
  .pwa-toast .pwa-btn--primary:hover {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pwa-toast .pwa-btn,
  .pwa-toast .pwa-btn--primary:hover {
    transition: none;
    transform: none;
  }
  .pwa-toast-slide-enter-active,
  .pwa-toast-slide-leave-active {
    transition: opacity 120ms ease;
  }
  .pwa-toast-slide-enter-from,
  .pwa-toast-slide-leave-to {
    transform: none;
  }
}

@media (prefers-color-scheme: light) {
  .pwa-toast {
    background:
      linear-gradient(
        135deg,
        rgba(15, 118, 110, 0.08) 0%,
        rgba(45, 212, 191, 0.05) 100%
      ),
      rgba(255, 255, 255, 0.98);
    color: rgb(17, 24, 28);
    border-color: rgba(15, 118, 110, 0.45);
    box-shadow:
      0 0 0 1px rgba(15, 118, 110, 0.18),
      0 12px 32px rgba(15, 118, 110, 0.18),
      0 2px 6px rgba(0, 0, 0, 0.08);
  }
  .pwa-toast .pwa-btn--primary {
    background: rgb(15, 118, 110);
    color: rgb(255, 255, 255);
    border-color: rgb(15, 118, 110);
    box-shadow: 0 4px 14px rgba(15, 118, 110, 0.3);
  }
  .pwa-toast .pwa-btn--primary:hover {
    background: rgb(13, 148, 136);
    border-color: rgb(13, 148, 136);
  }
  .pwa-toast .pwa-btn--ghost {
    color: rgb(15, 118, 110);
    border-color: rgba(15, 118, 110, 0.4);
  }
  .pwa-toast .pwa-btn--ghost:hover {
    background: rgba(15, 118, 110, 0.08);
    color: rgb(13, 92, 86);
  }
}
</style>
