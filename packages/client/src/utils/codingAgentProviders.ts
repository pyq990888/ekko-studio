import type { AvailableModelGroup } from '@/api/hermes/system'
import type { ProviderApiMode } from '@/api/studio/provider-api-mode'

export function providerModelApiMode(group?: AvailableModelGroup, model = ''): ProviderApiMode | undefined {
  return (group?.api_mode_by_model ? group.api_mode_by_model[model] : group?.api_mode) ?? undefined
}
