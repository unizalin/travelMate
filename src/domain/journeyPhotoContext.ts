import type { InjectionKey, Ref } from 'vue'
import type { MemberPhotoPreferences } from './photoPreferences'
export type PhotoContext = { preferences: Ref<MemberPhotoPreferences | null>; busy: Ref<boolean>; error: Ref<string>; update: (next: MemberPhotoPreferences) => Promise<void> }
export const journeyPhotoKey: InjectionKey<PhotoContext> = Symbol('journey-photo-preferences')
