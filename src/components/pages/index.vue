<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watchEffect } from '@vue/runtime-core'
import { NetworkGraph } from '../../renderer/NetworkGraph'

interface User {
  id: string
  type: 'Organization' | 'User'
  login: string
  name: string | null
  avatar_url: string | null
  bio: string | null
  email: string | null
}

interface Repository {
  id: string
  name: string
  html_url: string
  owner: {
    login: string,
  },
}

const canvas = ref<HTMLCanvasElement | null>(null)

const inputNickname = ref<string | null>(null)
const currentUser = ref<User | null>(null)
const userRepogitoriesMap = ref<Map<User, Repository[]>>(new Map())

let $graph!: NetworkGraph

watchEffect(() => {
  for (const [user, repos] of userRepogitoriesMap.value) {
    $graph.addNode({
      id: user.id,
      label: user.login,
      shape: 'circle',
      image: user.avatar_url,
      extra: null,
    })
    for (const repo of repos) {
      $graph.addNode({
        id: repo.id,
        label: repo.name,
        shape: 'text',
        extra: repo,
      })
      $graph.addEdge({
        source: user.id,
        target: repo.id,
      })
    }
  }
})

onMounted(() => {
  if (!canvas.value) {
    return
  }
  $graph = new NetworkGraph(canvas.value)
  $graph.on('click_node', (node) => {
    if (node.extra) {
      inputNickname.value = null
      getStarredRepositories((node.extra as Repository).owner.login)
    }
  })

  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  $graph.destroy()

  window.removeEventListener('resize', onResize)
})

function onResize() {
  $graph.resize()
}

function onSubmit() {
  if (inputNickname.value) {
    getStarredRepositories(inputNickname.value)
  } else {
    currentUser.value = null
  }
}

async function getStarredRepositories(nickname: string) {
  nickname = nickname.trim()
  if (!nickname) {
    return
  }

  const user = await fetch(`https://api.github.com/users/${nickname}`).then((r) => r.status === 200 ? r.json() as Promise<User> : Promise.resolve(null))

  if (!user) {
    alert('사용자를 찾을 수 없습니다.')
    inputNickname.value = null
    return
  }

  const stars = user.type === 'User'
    ? await fetch(`https://api.github.com/users/${nickname}/starred?per_page=100`).then((r) => r.status === 200 ? r.json() as Promise<Repository[]> : Promise.resolve(null))
    : null

  currentUser.value = user
  userRepogitoriesMap.value.set(user, stars ?? [])
}
</script>

<template>
  <div class="relative w-full h-full">
    <div
      class="absolute px-6 pt-2 pb-4 space-y-4 bg-white rounded-lg shadow-lg top-8 left-10"
    >
      <div class="flex items-center space-x-2">
        <form @submit.prevent="onSubmit">
          <input
            class="px-1 py-2 placeholder-gray-400 border-b border-gray-200 focus:outline-none focus:ring-0"
            placeholder="Github 닉네임 검색"
            v-model="inputNickname"
          />
        </form>
        <div class="text-gray-500">⏎</div>
      </div>

      <template v-if="currentUser">
        <div class="flex items-center space-x-4">
          <img class="w-12 h-12 rounded-2xl" :src="currentUser.avatar_url" />

          <div class="text-sm text-gray-600">
            <div class="space-x-1">
              <a
                class="font-semibold hover:text-black"
                target="_blank"
                :href="`https://github.com/${currentUser.login}`"
                >{{ currentUser.login }}</a
              >
              <span>({{ currentUser.name }})</span>
            </div>
            <div class="text-ellipsis">{{ currentUser.bio }}</div>
            <div class="">{{ currentUser.email }}</div>
          </div>
        </div>
      </template>

      <template v-if="currentUser">
        <div class="pt-4 text-sm text-gray-400">
          * 유저들 간의 스타를 누른 리포지토리 관계를 보여줍니다.
        </div>
      </template>
    </div>

    <canvas class="w-full h-full" ref="canvas" />
  </div>
</template>
