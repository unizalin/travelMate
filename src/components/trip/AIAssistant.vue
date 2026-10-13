<script setup lang="ts">
import { geminiService, type ActivitySuggestion } from '@/services/geminiService';
import { aiSuggestionService } from '@/services/aiSuggestionService';
import { useAuthStore } from '@/stores/auth';
import { PaperAirplaneIcon, PlusIcon, SparklesIcon, XMarkIcon } from '@heroicons/vue/24/solid';
import { nextTick, onMounted, ref, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import DOMPurify from 'dompurify';

const props = defineProps<{
  tripId: string
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

const authStore = useAuthStore()

const messages = ref<Message[]>([
  {
    role: 'assistant',
    content: `你好！我是您的行程助手。我已知您這天預計在 <strong>${props.destination}</strong>。請問有什麼我可以幫您的？例如：「推薦附近的早午餐」或「安排下午的文藝行程」。`
  }
])

const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// Load history on mount
onMounted(async () => {
  try {
    const history = await aiSuggestionService.getSuggestionsByDay(props.tripId, props.dayNumber)
    if (history && history.length > 0) {
      messages.value = history.flatMap(h => [
        { role: 'user', content: h.user_message },
        { role: 'assistant', content: h.ai_response, suggestions: h.suggested_activities }
      ])
    }
  } catch (error) {
    console.error('Failed to load AI history:', error)
  }
})

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

    const assistantMsg = {
      role: 'assistant' as const,
      content: aiContent,
      suggestions: suggestions
    }
    messages.value.push(assistantMsg)

    // Save to DB (Fire & Forget, or background)
    if (authStore.user) {
      aiSuggestionService.saveSuggestion({
        trip_id: props.tripId,
        user_id: authStore.user.id,
        day_number: props.dayNumber,
        user_message: userText,
        ai_response: aiContent,
        suggested_activities: suggestions
      }).catch(err => console.error('Failed to save AI suggestion:', err))
    }

  } catch (error: any) {
    console.error(error)
    messages.value.push({
      role: 'assistant',
      content: `抱歉，目前連線稍有延遲：${error.message || '無法取得建議'}。請稍後再試。`
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
        <div class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <TransitionChild as="template" enter="transform transition ease-in-out duration-300 sm:duration-500"
              enter-from="translate-x-full" enter-to="translate-x-0"
              leave="transform transition ease-in-out duration-300 sm:duration-500" leave-from="translate-x-0"
              leave-to="translate-x-full">
              <DialogPanel class="pointer-events-auto w-screen max-w-md transition-all">
                <div class="flex h-full flex-col bg-white dark:bg-secondary-950 shadow-2xl transition-colors border-l border-gray-100 dark:border-white/5">
                  
                  <!-- Header -->
                  <div class="px-6 py-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-secondary-900 transition-colors">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center transition-colors">
                        <SparklesIcon class="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <DialogTitle class="text-[11px] font-black uppercase tracking-[0.2em] text-primary-600/40 dark:text-primary-400/20 transition-colors">智慧行程靈感</DialogTitle>
                        <p class="text-sm font-black text-secondary-900 dark:text-white transition-colors">智慧助手</p>
                      </div>
                    </div>
                    <button @click="emit('close')" class="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 dark:text-white/20 transition-all">
                      <XMarkIcon class="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <!-- Messages Area -->
                  <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-secondary-950 transition-colors bg-[radial-gradient(circle_at_50%_0%,#3b82f60a_0%,transparent_50%)]">
                    <div v-for="(msg, index) in messages" :key="index" class="flex flex-col animate-fade-in-up"
                      :class="msg.role === 'user' ? 'items-end' : 'items-start'">
                      <!-- Chat Bubble -->
                      <div class="max-w-[85%] rounded-3xl px-5 py-4 shadow-sm text-sm leading-relaxed transition-all" :class="msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-none shadow-xl shadow-primary-500/20 font-bold'
                        : 'bg-white dark:bg-secondary-900 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-bl-none font-medium backdrop-blur-3xl shadow-lg shadow-black/5'">
                        <div v-if="msg.role === 'assistant'" v-html="sanitizeHTML(msg.content)"></div>
                        <div v-else>{{ msg.content }}</div>
                      </div>

                      <!-- Suggestions Cards (Only for assistant) -->
                      <div v-if="msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0"
                        class="mt-4 w-full max-w-[95%] space-y-3">
                        <div v-for="(suggestion, idx) in msg.suggestions" :key="idx"
                          class="bg-white dark:bg-secondary-900 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all flex flex-col gap-3 group/card overflow-hidden relative">
                          <div class="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover/card:bg-primary-500/10 transition-colors"></div>
                          
                          <div class="flex justify-between items-start relative z-10">
                            <div class="min-w-0 flex-1 pr-2">
                              <h4 class="font-black text-gray-900 dark:text-white truncate transition-colors">{{ suggestion.name }}</h4>
                              <p class="text-[9px] text-gray-400 dark:text-white/20 mt-1 truncate uppercase tracking-[0.2em] font-black"><span class="mr-1">📍</span>{{ suggestion.location }}</p>
                            </div>
                            <span class="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl whitespace-nowrap transition-all group-hover/card:scale-105">
                              {{ suggestion.recommendedTime }}
                            </span>
                          </div>
 
                          <p class="text-xs text-gray-500 dark:text-white/40 line-clamp-2 font-medium relative z-10 leading-relaxed">{{ suggestion.description }}</p>
 
                          <button @click="handleAdd(suggestion)"
                            class="relative z-10 mt-2 w-full flex items-center justify-center py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gray-900/10 dark:shadow-white/5">
                            <PlusIcon class="w-3 h-3 mr-2" />
                            加入行程
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Loading Indicator -->
                    <div v-if="isLoading" class="flex items-start">
                      <div class="bg-white dark:bg-secondary-900 border border-gray-100 dark:border-white/5 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm transition-colors">
                        <div class="flex space-x-1">
                          <div class="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                          <div class="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                          <div class="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Input Area -->
                  <div class="p-6 bg-white dark:bg-secondary-900 border-t border-gray-100 dark:border-white/5 transition-colors">
                    <div class="relative group">
                      <div class="absolute -inset-0.5 bg-primary-500/20 rounded-[1.5rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                      <div class="relative flex items-end gap-2 bg-gray-50 dark:bg-secondary-950 rounded-[1.5rem] border border-gray-200 dark:border-white/10 p-2 focus-within:border-primary-500/50 transition-all">
                        <textarea v-model="inputMessage" @keydown="handleKeydown" placeholder="輸入需求... (Shift + Enter 換行)" rows="1"
                          class="flex-1 pl-4 pr-2 py-3 bg-transparent border-none focus:ring-0 resize-none max-h-40 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/10 outline-none"
                          style="min-height: 48px;"></textarea>
                        <button @click="sendMessage" :disabled="!inputMessage.trim() || isLoading"
                          class="p-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-500 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 shadow-xl shadow-primary-500/20 aspect-square">
                          <PaperAirplaneIcon v-if="!isLoading" class="w-5 h-5 -rotate-45 -translate-y-0.5 translate-x-0.5" />
                          <div v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        </button>
                      </div>
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
