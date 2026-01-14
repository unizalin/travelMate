<script setup lang="ts">
import { geminiService, type ActivitySuggestion } from '@/services/geminiService';
import { PaperAirplaneIcon, PlusIcon, SparklesIcon, XMarkIcon } from '@heroicons/vue/24/solid';
import { nextTick, ref, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import DOMPurify from 'dompurify';

const props = defineProps<{
  destination: string
  dayNumber: number
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'add-activity', activity: ActivitySuggestion): void
  (e: 'close'): void
}>()

interface Message {
  role: 'user' | 'assistant';
  content: string; // HTML content for assistant, text for user
  suggestions?: ActivitySuggestion[];
}

const messages = ref<Message[]>([
  {
    role: 'assistant',
    content: `你好！我是你的 AI 行程助手。我已知您這天預計在 <strong>${props.destination}</strong>。請問有什麼我可以幫您的？例如：「推薦附近的早午餐」或「安排下午的文藝行程」。`
  }
])

const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// Scroll to bottom when opening
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    scrollToBottom()
  }
})

async function sendMessage() {
  if (!inputMessage.value.trim() || isLoading.value) return

  const userText = inputMessage.value.trim()
  inputMessage.value = ''

  // Add user message
  messages.value.push({
    role: 'user',
    content: userText
  })

  scrollToBottom()

  try {
    isLoading.value = true

    // Call Gemini Service
    const suggestions = await geminiService.getItinerarySuggestions(
      userText,
      props.destination,
      props.dayNumber
    )

    // Construct AI response based on suggestions
    let aiContent = ''
    if (suggestions.length > 0) {
      aiContent = `好的，根據您的需求，我為您找到了 ${suggestions.length} 個推薦景點：`
    } else {
      aiContent = '抱歉，我暫時找不到符合您需求的特定景點建議，能否請您提供更多細節？'
    }

    messages.value.push({
      role: 'assistant',
      content: aiContent,
      suggestions: suggestions
    })

  } catch (error: any) {
    console.error(error)
    messages.value.push({
      role: 'assistant',
      content: `抱歉，發生了一些錯誤：${error.message || '無法連線到 AI 服務'}。請稍後再試。`
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function handleAdd(suggestion: ActivitySuggestion) {
  emit('add-activity', suggestion)
}

// Sanitize HTML content to prevent XSS attacks
function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'u', 'br', 'p', 'span'],
    ALLOWED_ATTR: []
  })
}
</script>

<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-50" @close="emit('close')">
      <!-- Backdrop -->
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
        leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <TransitionChild as="template" enter="transform transition ease-in-out duration-300 sm:duration-500"
              enter-from="translate-x-full" enter-to="translate-x-0"
              leave="transform transition ease-in-out duration-300 sm:duration-500" leave-from="translate-x-0"
              leave-to="translate-x-full">
              <DialogPanel class="pointer-events-auto w-screen max-w-md">
                <div class="flex h-full flex-col bg-white shadow-xl">
                  
                  <!-- Header -->
                  <div class="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div class="flex items-center">
                      <SparklesIcon class="w-5 h-5 text-primary-600 mr-2" />
                      <DialogTitle class="font-bold text-gray-800">AI 行程助手</DialogTitle>
                    </div>
                    <button @click="emit('close')" class="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                      <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <!-- Messages Area -->
                  <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    <div v-for="(msg, index) in messages" :key="index" class="flex flex-col"
                      :class="msg.role === 'user' ? 'items-end' : 'items-start'">
                      <!-- Chat Bubble -->
                      <div class="max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed" :class="msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'">
                        <div v-if="msg.role === 'assistant'" v-html="sanitizeHTML(msg.content)"></div>
                        <div v-else>{{ msg.content }}</div>
                      </div>

                      <!-- Suggestions Cards (Only for assistant) -->
                      <div v-if="msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0"
                        class="mt-3 w-full max-w-[90%] space-y-2">
                        <div v-for="(suggestion, idx) in msg.suggestions" :key="idx"
                          class="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2">
                          <div class="flex justify-between items-start">
                            <div>
                              <h4 class="font-bold text-gray-800">{{ suggestion.name }}</h4>
                              <p class="text-xs text-gray-500 mt-0.5"><span class="mr-1">📍</span>{{ suggestion.location }}</p>
                            </div>
                            <span class="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                              {{ suggestion.recommendedTime }}
                            </span>
                          </div>

                          <p class="text-xs text-gray-600 line-clamp-2">{{ suggestion.description }}</p>

                          <button @click="handleAdd(suggestion)"
                            class="mt-1 w-full flex items-center justify-center py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded text-xs font-bold transition-colors">
                            <PlusIcon class="w-3 h-3 mr-1" />
                            加入行程
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Loading Indicator -->
                    <div v-if="isLoading" class="flex items-start">
                      <div class="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                        <div class="flex space-x-1">
                          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Input Area -->
                  <div class="p-4 bg-white border-t border-gray-200">
                    <div class="relative">
                      <textarea v-model="inputMessage" @keydown="handleKeydown" placeholder="輸入需求... (Shift + Enter 換行)" rows="1"
                        class="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none max-h-32 text-sm shadow-sm"
                        style="min-height: 48px;"></textarea>
                      <button @click="sendMessage" :disabled="!inputMessage.trim() || isLoading"
                        class="absolute right-2 bottom-2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:bg-gray-400 transition-colors">
                        <PaperAirplaneIcon class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
