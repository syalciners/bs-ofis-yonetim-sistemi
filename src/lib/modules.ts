export type OptionalModuleId = 'kocluk' | 'deneme-merkezi' | 'kutuphane'

const enabledModules = new Set(
  String(import.meta.env.VITE_ENABLED_MODULES || '')
    .split(',')
    .map(value => value.trim().toLocaleLowerCase('tr-TR'))
    .filter(Boolean),
)

export function isModuleEnabled(moduleId: OptionalModuleId) {
  return enabledModules.has(moduleId)
}
