<script setup lang="ts">
import PageLoading from '@/components/common/PageLoading.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  NButton,
  NTabs,
  NTabPane,
  NTag,
} from "naive-ui";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "@/stores/hermes/settings";
import DisplaySettings from "@/components/hermes/settings/DisplaySettings.vue";
import ProxySettings from "@/components/hermes/settings/ProxySettings.vue";
import CompressionSettings from "@/components/hermes/settings/CompressionSettings.vue";
import PrivacySettings from "@/components/hermes/settings/PrivacySettings.vue";
import ModelSettings from "@/components/hermes/settings/ModelSettings.vue";
import AccountSettings from "@/components/hermes/settings/AccountSettings.vue";
import UserManagementSettings from "@/components/hermes/settings/UserManagementSettings.vue";
import WebhookSettings from "@/components/hermes/settings/WebhookSettings.vue";
import VersionManagementModal from "@/components/layout/VersionManagementModal.vue";
import { isStoredSuperAdmin } from "@/api/client";
import { fetchAgentStatusSnapshot, type AgentStatusSnapshot } from "@/api/agent-status";
import { useProfilesStore } from "@/stores/hermes/profiles";

const settingsStore = useSettingsStore();
const profilesStore = useProfilesStore();
const { t } = useI18n();
const canManageUsers = isStoredSuperAdmin();
const route = useRoute();
const router = useRouter();
const activeTab = ref("account");
const runtimeManagerVisible = ref(false);
const agentStatusSnapshot = ref<AgentStatusSnapshot | null>(null);

const hermesRuntime = computed(() => agentStatusSnapshot.value?.agents.find(agent => agent.id === "hermes"));
const hermesInstalled = computed(() => Boolean(hermesRuntime.value?.installed));
const hermesVersion = computed(() => hermesRuntime.value?.version?.trim() || t("agentManager.unknownVersion"));

const validTabs = computed(() => new Set([
  "account",
  ...(canManageUsers ? ["users"] : []),
  ...(canManageUsers ? ["webhooks"] : []),
  ...(canManageUsers ? ["runtime"] : []),
  "display",
  "proxy",
  "compression",
  "privacy",
  "models",
]));

function normalizeTab(value: unknown): string {
  const tab = typeof value === "string" ? value : "";
  return validTabs.value.has(tab) ? tab : "account";
}

function handleTabUpdate(tab: string) {
  activeTab.value = normalizeTab(tab);
  router.replace({
    query: {
      ...route.query,
      tab: activeTab.value === "account" ? undefined : activeTab.value,
    },
  });
}

watch(() => route.query.tab, (tab) => {
  if (tab === "agent" || tab === "memory" || tab === "session" || tab === "gateway") {
    void router.replace({
      name: "hermes.configSettings",
      query: {
        ...route.query,
        tab: tab === "agent" || tab === "gateway" ? undefined : tab,
      },
    });
    return;
  }
  activeTab.value = normalizeTab(tab);
}, { immediate: true });

async function loadSettingsForProfile() {
  if (!profilesStore.activeProfileName || profilesStore.profiles.length === 0) {
    await profilesStore.fetchProfiles();
  }
  await settingsStore.fetchSettings();
}

async function loadRuntimeStatus() {
  try {
    agentStatusSnapshot.value = await fetchAgentStatusSnapshot();
  } catch {
    agentStatusSnapshot.value = null;
  }
}

const initializing = ref(true)

onMounted(() => {
  void Promise.all([loadSettingsForProfile(), loadRuntimeStatus()]).finally(() => { initializing.value = false });
});
</script>

<template>
  <PageLoading :show="initializing || settingsStore.loading" class="settings-view">
    <PageHeader>
    <header class="page-header">
      <h2 class="header-title">{{ t("settings.title") }}</h2>
    </header>
    </PageHeader>

    <div class="settings-content">
      <div>
        <NTabs v-model:value="activeTab" type="line" animated @update:value="handleTabUpdate">
          <NTabPane name="account" :tab="t('settings.tabs.account')">
            <AccountSettings />
          </NTabPane>
          <NTabPane v-if="canManageUsers" name="users" :tab="t('settings.tabs.users')">
            <UserManagementSettings />
          </NTabPane>
          <NTabPane v-if="canManageUsers" name="webhooks" :tab="t('settings.tabs.webhooks')">
            <WebhookSettings />
          </NTabPane>
          <NTabPane v-if="canManageUsers" name="runtime" :tab="t('runtimeVersions.title')">
            <section class="runtime-settings" data-testid="hermes-runtime-settings">
              <div class="runtime-summary">
                <div>
                  <h3>{{ t('runtimeVersions.runtimeTitle') }}</h3>
                  <p>{{ t('runtimeVersions.currentHermesAgentVersion') }}: {{ hermesVersion }}</p>
                </div>
                <NTag :type="hermesInstalled ? 'success' : 'warning'" size="small" :bordered="false">
                  {{ hermesInstalled ? t('codingAgents.installed') : t('codingAgents.notInstalled') }}
                </NTag>
              </div>
              <p class="runtime-description">{{ t('runtimeVersions.cliUpdateDescription') }}</p>
              <NButton type="primary" @click="runtimeManagerVisible = true">
                {{ hermesInstalled ? t('agentManager.manageRuntime') : t('codingAgents.installNow') }}
              </NButton>
            </section>
          </NTabPane>
          <NTabPane name="display" :tab="t('settings.tabs.display')">
            <DisplaySettings />
          </NTabPane>
          <NTabPane name="proxy" :tab="t('settings.tabs.proxy')">
            <ProxySettings />
          </NTabPane>
          <NTabPane name="compression" :tab="t('settings.tabs.compression')">
            <CompressionSettings />
          </NTabPane>
          <NTabPane name="privacy" :tab="t('settings.tabs.privacy')">
            <PrivacySettings />
          </NTabPane>
          <NTabPane name="models" :tab="t('settings.tabs.models')">
            <ModelSettings />
          </NTabPane>
        </NTabs>
      </div>
    </div>
    <VersionManagementModal v-model:show="runtimeManagerVisible" />
  </PageLoading>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.settings-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: calc(20px * var(--spacing-scale, 1));
}

.runtime-settings {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(14px * var(--spacing-scale, 1));
  max-width: 680px;
}

.runtime-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(16px * var(--spacing-scale, 1));
  width: 100%;
  padding: calc(16px * var(--spacing-scale, 1));
  border: var(--border-width, 1px) solid var(--border-color);
  border-radius: $radius-md;

  h3 {
    margin: 0 0 6px;
    font-size: calc(var(--font-size-base, 14px) * 15 / 14);
  }

  p {
    margin: 0;
    color: $text-secondary;
    font-size: calc(var(--font-size-base, 14px) * 12 / 14);
  }
}

.runtime-description {
  margin: 0;
  color: $text-secondary;
  font-size: calc(var(--font-size-base, 14px) * 12 / 14);
}
</style>
