<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watchEffect } from '@vue/runtime-core'
import { apolloClient } from '../../providers/ApolloProvider'
import { NetworkGraph } from '../../renderer/NetworkGraph'
import {
  GetUserStarredRepositoriesQuery,
  GetUserStarredRepositoriesQueryVariables,
} from '../../types/api'
import GetUserStarredRepositories from '../../gql/GetUserStarredRepositories.gql'

interface User {
  id: string
  nickname: string
  name: string | null
  avatarUrl: string | null
  bio: string | null
  email: string | null
}

interface Repository {
  id: string
  name: string
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
      label: user.nickname,
      shape: 'circle',
      image: user.avatarUrl,
      extra: user,
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
  $graph = new NetworkGraph(canvas.value!)
})

onBeforeUnmount(() => {
  $graph.destroy()
})

function onSubmit() {
  if (inputNickname.value) {
    getStarredRepositories(inputNickname.value)
  } else {
    currentUser.value = null
  }
}

async function getStarredRepositories(nickname: string, lastCursor?: string) {
  const { data } = await apolloClient.query<
    GetUserStarredRepositoriesQuery,
    GetUserStarredRepositoriesQueryVariables
  >({
    query: GetUserStarredRepositories,
    variables: {
      nickname,
      lastCursor,
    },
  })

  if (
    data.user &&
    data.user.starredRepositories.edges &&
    data.user.starredRepositories.edges.length > 0
  ) {
    const user = {
      id: data.user.id,
      nickname: data.user.login,
      name: data.user.name ?? null,
      avatarUrl: data.user.avatarUrl,
      bio: data.user.bio ?? null,
      email: data.user.email,
    }
    const repos = data.user.starredRepositories.edges.map<Repository>(
      (edge) => {
        return {
          id: edge!.node.id,
          name: edge!.node.name,
        }
      }
    )

    currentUser.value = user
    userRepogitoriesMap.value.set(user, repos ?? [])
  }
}
</script>

<template>
  <div class="relative w-full h-full">
    <div
      class="absolute px-6 pt-2 pb-4 space-y-4 bg-gray-100 rounded top-8 left-10"
    >
      <div class="flex items-center space-x-2">
        <form @submit.prevent="onSubmit">
          <input
            class="px-1 py-2 placeholder-gray-400 bg-gray-100 border-b border-gray-200 focus:outline-none focus:ring-0"
            placeholder="Github 닉네임 검색"
            v-model="inputNickname"
          />
        </form>
        <div class="text-gray-500">⏎</div>
      </div>

      <template v-if="currentUser">
        <div class="flex items-center space-x-4">
          <img class="w-12 h-12 rounded-2xl" :src="currentUser.avatarUrl" />

          <div class="text-sm text-gray-600">
            <div class="space-x-1">
              <a
                class="font-semibold hover:text-black"
                target="_blank"
                :href="`https://github.com/${currentUser.nickname}`"
                >{{ currentUser.nickname }}</a
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
