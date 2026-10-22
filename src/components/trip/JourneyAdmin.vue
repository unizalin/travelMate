<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { loadAdminState, rotateInvite, revokeInvite, removeMember, type AdminState, type AdminMember } from '@/services/journeyInviteService'
const state=ref<AdminState>({isAdmin:false}); const link=ref(''); const busy=ref(false); const error=ref(''); const notice=ref(''); const removing=ref<AdminMember|null>(null)
const allClaimed=computed(()=>state.value.isAdmin && state.value.members.every(m=>m.email))
async function refresh(){ state.value=await loadAdminState() }
async function run(action:()=>Promise<unknown>){ if(busy.value)return; busy.value=true;error.value='';notice.value='';try{await action();await refresh()}catch(cause){error.value=cause instanceof Error?cause.message:'管理操作失敗。'}finally{busy.value=false} }
async function rotate(){ await run(async()=>{ link.value='';const token=await rotateInvite();link.value=window.location.origin+'/iceland/join?token='+token }) }
async function revoke(){ await run(async()=>{await revokeInvite();link.value=''}) }
async function copy(){try{await navigator.clipboard.writeText(link.value);notice.value='邀請連結已複製。'}catch{error.value='無法自動複製，請選取連結手動複製。'} }
onMounted(()=>{void run(refresh)})
</script>
<template>
 <details v-if="state.isAdmin" class="mt-6 rounded-xl border border-stone-200 p-4" aria-label="旅伴管理後台">
  <summary class="cursor-pointer font-semibold">旅伴管理後台</summary>
  <p class="my-3 text-sm">邀請連結：{{state.inviteActive?'有效':'未啟用或已撤銷'}}。產生新連結會讓舊連結立即失效。</p>
  <p v-if="allClaimed" class="my-3 text-sm">六位旅伴皆已認領，建議撤銷邀請連結。</p>
  <button data-test="rotate-invite" :disabled="busy" class="mr-3 min-h-11 rounded-xl border px-3" @click="rotate">產生新邀請連結</button>
  <button v-if="state.inviteActive" data-test="revoke-invite" :disabled="busy" class="min-h-11 rounded-xl border px-3" @click="revoke">撤銷邀請連結</button>
  <div v-if="link" class="my-3 flex gap-2"><input aria-label="邀請連結" :value="link" readonly class="min-w-0 flex-1 rounded-lg border p-2" /><button @click="copy">複製</button></div>
  <p v-if="state.inviteActive && !link" class="my-3 text-xs">為保護邀請，重新開啟後不顯示舊連結；需要複製時請產生新連結。</p>
  <ul class="mt-4 divide-y"><li v-for="m in state.members" :key="m.id" class="py-3 text-sm"><b>{{m.name}}</b> · {{m.email?'已認領':'未認領'}}<template v-if="m.email"><p class="break-all">{{m.email}}</p><time>{{m.claimedAt ? new Date(m.claimedAt).toLocaleString('zh-TW') : ''}}</time><button v-if="!m.isOwner" :disabled="busy" class="ml-3 min-h-11 underline" @click="removing=m">解除綁定／移除存取</button></template></li></ul>
  <section v-if="removing" class="mt-3 rounded-lg border p-3"><p>解除 {{removing.name}} 的綁定並移除私人存取權？</p><button :disabled="busy" class="mr-4 min-h-11 underline" @click="run(async()=>{await removeMember(removing!.id);removing=null})">確定解除</button><button @click="removing=null">取消</button></section>
  <p v-if="error" role="alert" class="mt-3 text-red-700">{{error}}</p><p v-if="notice" role="status">{{notice}}</p>
 </details>
</template>
