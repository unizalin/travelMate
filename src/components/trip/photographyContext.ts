import type { InjectionKey, Ref } from 'vue'
import type { PhotographyWeather } from '@/domain/photographyAdvice'
export const photographyWeatherKey: InjectionKey<Readonly<Ref<PhotographyWeather | null>>> = Symbol('photography-weather')
