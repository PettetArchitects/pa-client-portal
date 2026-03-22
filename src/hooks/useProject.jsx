import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const ProjectContext = createContext({})
const STORAGE_KEY = 'pa_selected_project'

export function ProjectProvider({ children }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [accessLevel, setAccessLevel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clientPreview, setClientPreview] = useState(false)

  useEffect(() => {
    if (!user) return

    async function loadProjects() {
      // Get all projects the user has access to
      const { data: accessRows } = await supabase
        .from('homeowner_project_access')
        .select('project_id, access_level, metadata')
        .eq('homeowner_user_id', user.id)
        .eq('active', true)

      if (accessRows && accessRows.length > 0) {
        const isArchitect = accessRows.some(r => r.access_level === 'architect')
        setAccessLevel(isArchitect ? 'architect' : accessRows[0].access_level)

        const projectIds = accessRows.map(r => r.project_id)

        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)
          .eq('stream', 'architectural')

        if (projectData) {
          // Merge access metadata (project_name, client) into project records
          const merged = projectData.map(p => {
            const access = accessRows.find(a => a.project_id === p.id)
            return {
              ...p,
              project_id: p.id,
              display_name: access?.metadata?.project_name || p.name,
              client_display: access?.metadata?.client || p.client_name || '',
            }
          })
          setProjects(merged)

          // Restore previously selected project from localStorage, or default to first
          const savedId = localStorage.getItem(STORAGE_KEY)
          const restored = savedId ? merged.find(p => p.project_id === savedId) : null
          setSelectedProject(restored || merged[0])
        }
      }
      setLoading(false)
    }

    loadProjects()
  }, [user])

  function switchProject(projectId) {
    const p = projects.find(p => p.project_id === projectId)
    if (p) {
      setSelectedProject(p)
      localStorage.setItem(STORAGE_KEY, projectId)
    }
  }

  return (
    <ProjectContext.Provider value={{
      projects,
      project: selectedProject,
      switchProject,
      accessLevel,
      loading,
      isArchitect: accessLevel === 'architect' && !clientPreview,
      isActualArchitect: accessLevel === 'architect',
      clientPreview,
      setClientPreview,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
