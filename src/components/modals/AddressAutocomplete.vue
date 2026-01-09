<template>
  <div class="relative group" ref="containerRef">
    <div class="relative">
      <div v-if="loading" class="absolute right-3 top-3">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
      <input
        type="text"
        :value="modelValue"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="showSuggestions = true"
        class="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
        :placeholder="placeholder"
      />
    </div>

    <!-- Suggestions Dropdown -->
    <div
      v-if="showSuggestions && suggestions.length > 0"
      class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
    >
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        @click="selectSuggestion(suggestion)"
        :class="[
          'relative cursor-default select-none py-2 pl-3 pr-9',
          activeIndex === index ? 'bg-blue-600 text-white' : 'text-gray-900 hover:bg-gray-100'
        ]"
      >
        <div class="flex items-start">
          <span class="mr-2 text-lg">{{ getFlagEmoji(suggestion.country_code) }}</span>
          <div class="flex flex-col">
            <span :class="['truncate font-medium', activeIndex === index ? 'text-white' : 'text-gray-900']">
              {{ suggestion.name }}
            </span>
            <span :class="['truncate text-xs', activeIndex === index ? 'text-blue-200' : 'text-gray-500']">
              {{ suggestion.formatted_address }}
            </span>
          </div>
          <span
            v-if="suggestion.city"
            :class="[
              'ml-auto rounded-full px-2 py-0.5 text-xs',
              activeIndex === index ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
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
