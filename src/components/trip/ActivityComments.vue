<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { icelandMemberName } from '@/data/icelandMemberNames'
import { loadActivityComments, postActivityComment, type ActivityComment } from '@/services/activityCommentService'
const props = defineProps<{
  tripId: string; activityId: string; accountId: string; canPost: boolean
  legacyMemo?: { content: string; updatedBy: string | null; updatedByName?: string | null; updatedAt: string | null }
  legacyPending?: boolean
}>()
const expanded = ref(false)
const seenAt = ref('')
const seenKey = computed(() => `tripbook.comments.seen:${props.accountId}:${props.tripId}:${props.activityId}`)
const unread = computed(() => comments.value.some(comment => comment.createdAt > seenAt.value))
function markSeen() {
  seenAt.value = comments.value.reduce((latest, comment) => comment.createdAt > latest ? comment.createdAt : latest, seenAt.value)
  try { localStorage.setItem(seenKey.value, seenAt.value) } catch {}
}
function toggle() { expanded.value = !expanded.value; if (expanded.value) markSeen() }
const avatarColor = (value: string) => ['#397d86','#867160','#777e52','#9a6474','#526e91'][Array.from(value).reduce((n,c) => n + c.charCodeAt(0),0) % 5]
const comments = ref<ActivityComment[]>([])
const text = ref('')
const reply = ref<ActivityComment | null>(null)
const loading = ref(false)
const sending = ref(false)
const loaded = ref(false)
const error = ref('')
const requestId = ref('')
let epoch = 0
let refreshGeneration = 0
let timer: ReturnType<typeof setInterval> | undefined
const ready = computed(() => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(props.tripId) && props.accountId !== 'local-preview')
const roots = computed(() => comments.value.filter(comment => comment.parentId === null))
const replies = (id: string) => comments.value.filter(comment => comment.parentId === id)
const name = (comment: ActivityComment) => comment.memberId ? icelandMemberName(comment.memberId, comment.authorName) : comment.authorName || '未設定姓名'
const time = (value: string) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
async function refresh() {
  if (!ready.value || sending.value) return
  const current = epoch, generation = ++refreshGeneration
  loading.value = true
  try {
    const result = await loadActivityComments(props.tripId, props.activityId)
    if (current === epoch && generation === refreshGeneration) { comments.value = result; loaded.value = true; error.value = ''; if (expanded.value) markSeen() }
  } catch (cause) { if (current === epoch && generation === refreshGeneration) error.value = cause instanceof Error ? cause.message : '留言暫時無法載入，請重試。' }
  finally { if (current === epoch && generation === refreshGeneration) loading.value = false }
}
async function send() {
  if (sending.value || !ready.value || !props.canPost || !loaded.value || !text.value.trim() || text.value.length > 2000) return
  const current = epoch
  sending.value = true; error.value = ''; refreshGeneration++; loading.value = false
  if (!requestId.value) requestId.value = crypto.randomUUID()
  try {
    const result = await postActivityComment({ tripId: props.tripId, activityId: props.activityId, requestId: requestId.value, parentId: reply.value?.id ?? null, content: text.value })
    if (current !== epoch) return
    if (!comments.value.some(comment => comment.id === result.id)) comments.value.push(result)
    text.value = ''; reply.value = null; requestId.value = ''
  } catch (cause) { if (current === epoch) error.value = cause instanceof Error ? cause.message : '留言未送出，內容仍保留。' }
  finally { if (current === epoch) sending.value = false }
}
function setReply(comment: ActivityComment | null) { reply.value = comment; requestId.value = '' }
watch(text, () => { if (!sending.value) requestId.value = '' })
watch(() => [props.tripId, props.activityId, props.accountId], () => {
  expanded.value = false; try { seenAt.value = localStorage.getItem(seenKey.value) || '' } catch { seenAt.value = '' }
  epoch++; refreshGeneration++; comments.value = []; text.value = ''; reply.value = null; requestId.value = ''; error.value = ''; sending.value = false; loading.value = false; loaded.value = false
  void refresh()
}, { immediate: true })
function refreshVisible() { if (document.visibilityState === 'visible' && !error.value) void refresh() }
onMounted(() => { timer = setInterval(refreshVisible, 30000); window.addEventListener('focus', refreshVisible) })
onBeforeUnmount(() => { epoch++; if (timer) clearInterval(timer); window.removeEventListener('focus', refreshVisible) })
</script>
<template>
  <section class="comments" aria-label="活動留言">
    <button type="button" class="comments-toggle" data-action="toggle-comments" :aria-expanded="expanded" @click="toggle"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H5l-4 3V11a9 9 0 0 1 19 0Z" /></svg>留言</span><span><i v-if="unread && !expanded" class="unread" aria-label="有新留言" />{{ comments.length ? `${comments.length} 則留言` : legacyMemo?.content ? '先前內容' : '' }}</span></button>
    <div v-if="expanded" class="comments-body">
    <div v-if="legacyMemo?.content" class="comment-row">
      <span class="avatar" aria-hidden="true">{{ legacyPending ? '…' : (legacyMemo.updatedByName || '?').slice(0, 1) }}</span>
      <div class="comment-main"><div class="bubble"><strong>{{ legacyPending ? '這部裝置保留的內容' : legacyMemo.updatedByName || '之前留下的內容' }}</strong><p>{{ legacyMemo.content }}</p></div><small v-if="legacyPending">尚未送出</small><time v-else-if="legacyMemo.updatedAt" :datetime="legacyMemo.updatedAt">{{ time(legacyMemo.updatedAt) }}</time></div>
    </div>
    <div v-for="comment in roots" :key="comment.id" class="thread">
      <div class="comment-row">
        <span class="avatar" :style="{ background: avatarColor(name(comment)), color: 'white' }" aria-hidden="true">{{ name(comment).slice(0, 1) }}</span>
        <div class="comment-main"><div class="bubble"><strong>{{ name(comment) }}</strong><p>{{ comment.content }}</p></div><div class="comment-meta"><time :datetime="comment.createdAt">{{ time(comment.createdAt) }}</time><button v-if="canPost" type="button" data-action="reply" class="text-action" :disabled="sending" @click="setReply(comment)">回覆</button></div></div>
      </div>
      <div v-for="answer in replies(comment.id)" :key="answer.id" class="comment-row reply-row">
        <span class="avatar" :style="{ background: avatarColor(name(answer)), color: 'white' }" aria-hidden="true">{{ name(answer).slice(0, 1) }}</span>
        <div class="comment-main"><div class="bubble"><strong>{{ name(answer) }}</strong><p>{{ answer.content }}</p></div><time :datetime="answer.createdAt">{{ time(answer.createdAt) }}</time></div>
      </div>
    </div>

    <p v-if="error" role="alert" class="error">{{ error }} <button type="button" @click="refresh">重試</button></p>
    <form @submit.prevent="send">
      <div v-if="reply" class="replying">回覆 {{ name(reply) }}<button type="button" class="text-action" :disabled="sending" @click="setReply(null)">取消</button></div>
      <div class="composer"><span class="avatar" aria-hidden="true">我</span><label class="sr-only" :for="`comment-${activityId}`">留言內容</label><div class="composer-pill"><textarea :id="`comment-${activityId}`" v-model="text" aria-label="留言內容" :placeholder="!ready ? '登入後就能留言' : !canPost ? '目前帳號僅可閱讀' : reply ? '寫下回覆…' : '寫下留言…'" rows="1" maxlength="2000" :disabled="sending || !ready || !canPost" /><button type="submit" :disabled="sending || !ready || !canPost || !loaded || !text.trim()">{{ sending ? '送出中…' : '送出' }}</button></div></div>
    </form>
    </div>
  </section>
</template>
<style scoped>
.comments{margin-top:9px;color:#263331}
.comments-toggle{display:flex;width:100%;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #dde3de;padding:8px 2px 2px;min-height:32px;background:none;color:#7a8783;font-size:12.5px;font-weight:600}
.comments-toggle>span{display:flex;align-items:center;gap:6px}.comments-toggle>span:last-child{font-size:11.5px;font-weight:400}
.comments-toggle svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.unread{width:6px;height:6px;background:#c76b46;border-radius:50%}
.comments-body{margin-top:6px;padding:0 0 8px}
.comment-row{display:flex;gap:8px;margin:0 0 9px}
.avatar{width:32px;height:32px;flex:none;border-radius:50%;background:var(--iceland-moss,#e5ebdf);color:#435347;display:grid;place-items:center;font-size:12.5px;font-weight:700}
.comment-main{min-width:0;flex:1}
.bubble{display:inline-block;max-width:100%;padding:6px 11px 7px;background:#eef1ee;border-radius:14px;overflow-wrap:anywhere}
.bubble strong{display:block;font-size:12.5px}
.bubble p{margin-top:1px;font-size:13px;line-height:1.5;white-space:pre-wrap}
.comment-meta{display:flex;gap:4px;align-items:center;margin-top:2px}
.comments time,.comments small{display:inline-block;color:#7a8783;font-size:11px}
.text-action{padding:2px 4px;color:#7a8783;font-size:11px;font-weight:600}
.text-action:hover{color:#263331}
.reply-row{margin-left:40px}.reply-row .avatar{width:28px;height:28px}
.error{margin:10px 0;color:#b42318;font-size:12px}
.composer{display:flex;align-items:center;gap:8px;margin-top:2px}.composer>.avatar{width:30px;height:30px;font-size:11.5px;background:#c76b46;color:white}
.composer-pill{display:flex;align-items:center;flex:1;min-width:0;background:#eef1ee;border-radius:999px;padding:4px 4px 4px 13px}
.composer textarea{width:100%;min-width:0;min-height:30px;height:30px;flex:1;resize:vertical;border:0;padding:5px 0;background:transparent;font-size:12.5px;line-height:1.6}
.composer button{flex:none;min-height:30px;border-radius:999px;padding:6px 12px;background:#397d86;color:white;font-size:12px}
.comments button:disabled,.composer textarea:disabled{opacity:.45;cursor:default}
.replying{margin-top:10px;color:#7a8783;font-size:12px}
.comments button:focus-visible,.composer textarea:focus-visible{outline:2px solid #83b3b6;outline-offset:2px}
</style>
