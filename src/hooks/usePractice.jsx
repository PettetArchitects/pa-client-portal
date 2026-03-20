import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const PracticeContext = createContext({})

export function PracticeProvider({ children }) {
  const [practice, setPractice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('practice_public_profile')
        .select('*')
        .eq('practice_slug', 'pettet-architects')
        .single()

      if (data) setPractice(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <PracticeContext.Provider value={{ practice, loading }}>
      {children}
    </PracticeContext.Provider>
  )
}

export function usePractice() {
  return useContext(PracticeContext)
}
