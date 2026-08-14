import { useCallback, useEffect, useState } from 'react'
import type { MetricsPayload, TasksPayload, UsagePayload } from '../lib/format'

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data as T
}

export function useMonitorData() {
  const [usage, setUsage] = useState<UsagePayload | null>(null)
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null)
  const [tasks, setTasks] = useState<TasksPayload | null>(null)
  const [usageError, setUsageError] = useState<string | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [refreshingUsage, setRefreshingUsage] = useState(false)

  const loadMetrics = useCallback(async () => {
    try {
      const data = await getJson<MetricsPayload>('/api/metrics')
      setMetrics(data)
      setMetricsError(null)
    } catch (error) {
      setMetricsError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      const data = await getJson<TasksPayload>('/api/tasks')
      setTasks(data)
      setTasksError(null)
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  const loadUsage = useCallback(async (force = false) => {
    setRefreshingUsage(true)
    try {
      const data = await getJson<UsagePayload>(
        force ? '/api/usage?refresh=1' : '/api/usage',
      )
      setUsage(data)
      setUsageError(data.staleError || null)
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : String(error))
    } finally {
      setRefreshingUsage(false)
    }
  }, [])

  useEffect(() => {
    void loadUsage(true)
    void loadMetrics()
    void loadTasks()
    const warm = window.setTimeout(() => {
      void loadMetrics()
    }, 1200)

    const metricsTimer = window.setInterval(() => {
      if (!document.hidden) void loadMetrics()
    }, 5000)

    const tasksTimer = window.setInterval(() => {
      if (!document.hidden) void loadTasks()
    }, 8000)

    const usageTimer = window.setInterval(() => {
      if (!document.hidden) void loadUsage(false)
    }, 60000)

    return () => {
      window.clearTimeout(warm)
      window.clearInterval(metricsTimer)
      window.clearInterval(tasksTimer)
      window.clearInterval(usageTimer)
    }
  }, [loadMetrics, loadTasks, loadUsage])

  return {
    usage,
    metrics,
    tasks,
    usageError,
    metricsError,
    tasksError,
    refreshingUsage,
    refreshUsage: () => loadUsage(true),
    refreshTasks: () => loadTasks(),
  }
}
