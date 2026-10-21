<template>
  <div class="relative group" ref="containerRef">
    <div class="relative">
      <div v-if="loading" class="absolute right-4 top-1/2 -translate-y-1/2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 transition-colors"></div>
      </div>
      <input
        type="text"
        :value="modelValue"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="showSuggestions = true"
        class="block w-full rounded-2xl bg-gray-50 dark:bg-white/5 border-none shadow-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white dark:focus:bg-secondary-900 py-4 px-6 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 transition-all outline-none"
        :placeholder="placeholder"
      />
    </div>

    <!-- Suggestions Dropdown -->
    <div
      v-if="showSuggestions && suggestions.length > 0"
      class="absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-3xl bg-white dark:bg-secondary-900 py-3 text-sm shadow-2xl border border-gray-100 dark:border-white/5 focus:outline-none transition-all"
    >
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        @click="selectSuggestion(suggestion)"
        :class="[
          'relative cursor-pointer select-none py-3 px-6 transition-colors mx-2 rounded-2xl mb-1 last:mb-0',
          activeIndex === index ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10'
        ]"
      >
        <div class="flex items-start">
          <span class="mr-2 text-lg">{{ getFlagEmoji(suggestion.country_code) }}</span>
          <div class="flex flex-col min-w-0">
            <span :class="['truncate font-black text-[11px] uppercase tracking-wider transition-colors', activeIndex === index ? 'text-white' : 'text-gray-900 dark:text-white']">
              {{ suggestion.name }}
            </span>
            <span :class="['truncate text-[10px] font-medium transition-colors', activeIndex === index ? 'text-primary-100' : 'text-gray-400 dark:text-white/20']">
              {{ suggestion.formatted_address }}
            </span>
          </div>
          <span
            v-if="suggestion.city"
            :class="[
              'ml-auto rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest transition-colors',
              activeIndex === index ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40'
            ]"
          >
            {{ suggestion.city }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { searchAddress, type AddressSearchResult } from '@/services/geocodingService';

defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'select', result: AddressSearchResult): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const loading = ref(false);
const showSuggestions = ref(false);
const suggestions = ref<AddressSearchResult[]>([]);
const activeIndex = ref(-1);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

onClickOutside(containerRef, () => {
  showSuggestions.value = false;
});

const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  emit('update:modelValue', value);
  
  if (debounceTimer) clearTimeout(debounceTimer);
  
  if (value.length < 2) {
    suggestions.value = [];
    return;
  }

  loading.value = true;
  debounceTimer = setTimeout(async () => {
    try {
      suggestions.value = await searchAddress(value);
      showSuggestions.value = true;
      activeIndex.value = -1;
    } finally {
      loading.value = false;
    }
  }, 500);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (!showSuggestions.value || suggestions.value.length === 0) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      activeIndex.value = (activeIndex.value + 1) % suggestions.value.length;
      break;
    case 'ArrowUp':
      e.preventDefault();
      activeIndex.value = activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1;
      break;
    case 'Enter':
      e.preventDefault();
      if (activeIndex.value >= 0) {
        selectSuggestion(suggestions.value[activeIndex.value]);
      }
      break;
    case 'Escape':
      showSuggestions.value = false;
      break;
  }
};

const selectSuggestion = (suggestion: AddressSearchResult) => {
  emit('update:modelValue', suggestion.formatted_address);
  emit('select', suggestion);
  showSuggestions.value = false;
};

// Helper to convert country code to flag emoji
const getFlagEmoji = (countryCode?: string) => {
  if (!countryCode) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};
</script>
