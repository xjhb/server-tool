import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SessionConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
  group?: string
  createdAt: number
  updatedAt: number
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<SessionConfig[]>([])
  const loading = ref(false)

  async function loadSessions() {
    loading.value = true
    try {
      sessions.value = await window.electronAPI.loadSessions()
    } finally {
      loading.value = false
    }
  }

  async function saveSession(session: SessionConfig) {
    await window.electronAPI.saveSession(session)
    await loadSessions()
  }

  async function deleteSession(id: string) {
    await window.electronAPI.deleteSession(id)
    await loadSessions()
  }

  function getGroups(): string[] {
    const groups = new Set<string>()
    sessions.value.forEach(s => {
      if (s.group) groups.add(s.group)
    })
    return Array.from(groups)
  }

  return { sessions, loading, loadSessions, saveSession, deleteSession, getGroups }
})
