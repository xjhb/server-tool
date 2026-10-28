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
  order?: number
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

  async function reorderSessions(fromIndex: number, toIndex: number) {
    const items = [...sessions.value]
    const [moved] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)
    
    // Update order values
    items.forEach((item, index) => {
      item.order = index
    })
    
    // Save all sessions with new order
    for (const item of items) {
      await window.electronAPI.saveSession(item)
    }
    
    await loadSessions()
  }

  return { sessions, loading, loadSessions, saveSession, deleteSession, getGroups, reorderSessions }
})
