import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProject() {
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function loadProject() {
      // Get the project the homeowner has access to
      const { data: access } = await supabase
        .from('homeowner_project_access')
        .select('project_id')
        .eq('homeowner_user_id', user.id)
        .eq('active', true)
        .limit(1)
        .single()

      if (access) {
        const { data: proj } = await supabase
          .from('projects')
          .select('*')
          .eq('project_id', access.project_id)
          .single()

        setProject({ ...proj, project_id: access.project_id })
      }
      setLoading(false)
    }

    loadProject()
  }, [user])

  return { project, loading }
}
