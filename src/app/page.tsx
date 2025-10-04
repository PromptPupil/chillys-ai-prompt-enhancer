'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { PlusCircle, Sparkles, Library, Search, LogOut } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { User } from '@supabase/supabase-js'

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

interface Prompt {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadPrompts()
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPrompts()
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPrompts() {
    const { data } = await supabase
      .from('prompts')
      .select('*')
      .order('updated_at', { ascending: false })

    if (data) {
      setPrompts(data)
    }
  }

  async function createPrompt() {
    if (!user) return

    const { data } = await supabase
      .from('prompts')
      .insert([
        {
          user_id: user.id,
          title: 'Untitled Prompt',
          content: '# New Prompt\n\nStart writing your prompt here...'
        }
      ])
      .select()
      .single()

    if (data) {
      setPrompts([data, ...prompts])
      setSelectedPrompt(data)
      setEditTitle(data.title)
      setEditContent(data.content)
      setIsEditing(true)
    }
  }

  async function savePrompt() {
    if (!selectedPrompt) return

    await supabase
      .from('prompts')
      .update({
        title: editTitle,
        content: editContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedPrompt.id)

    await loadPrompts()
    setIsEditing(false)
    setSelectedPrompt(null)
  }

  async function optimizePrompt() {
    if (!selectedPrompt) return

    setIsOptimizing(true)

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: editContent })
      })

      const data = await response.json()

      if (data.optimizedPrompt) {
        setEditContent(data.optimizedPrompt)
      }
    } catch (error) {
      console.error('Error optimizing prompt:', error)
      alert('Failed to optimize prompt')
    } finally {
      setIsOptimizing(false)
    }
  }

  const filteredPrompts = prompts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Show auth UI if not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200 dark:from-stone-950 dark:via-stone-900 dark:to-stone-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Sparkles className="h-12 w-12 text-stone-700 dark:text-stone-300" />
            </div>
            <CardTitle className="text-2xl">CHilly&apos;s AI Prompt Enhancer</CardTitle>
            <CardDescription>Sign in to access your prompt library</CardDescription>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]}
              redirectTo={typeof window !== 'undefined' ? window.location.origin : ''}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200 dark:from-stone-950 dark:via-stone-900 dark:to-stone-800">
      {/* Header */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-stone-700 dark:text-stone-300" />
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                CHilly&apos;s AI Prompt Enhancer
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-600 dark:text-stone-400">{user.email}</span>
              <Button onClick={() => supabase.auth.signOut()} variant="outline" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
              <Button onClick={createPrompt} size="lg" className="gap-2">
                <PlusCircle className="h-5 w-5" />
                New Prompt
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <Input
              placeholder="Search your prompts..."
              className="pl-10 h-12 bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Prompts Grid */}
        {filteredPrompts.length === 0 ? (
          <div className="text-center py-16">
            <Library className="h-16 w-16 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-stone-700 dark:text-stone-300 mb-2">
              No prompts yet
            </h2>
            <p className="text-stone-500 dark:text-stone-400 mb-6">
              Create your first AI prompt to get started
            </p>
            <Button onClick={createPrompt} size="lg" className="gap-2">
              <PlusCircle className="h-5 w-5" />
              Create Your First Prompt
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrompts.map((prompt) => (
              <Card
                key={prompt.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
                onClick={() => {
                  setSelectedPrompt(prompt)
                  setEditTitle(prompt.title)
                  setEditContent(prompt.content)
                  setIsEditing(true)
                }}
              >
                <CardHeader>
                  <CardTitle className="text-stone-900 dark:text-stone-100 line-clamp-1">
                    {prompt.title}
                  </CardTitle>
                  <CardDescription className="text-stone-500 dark:text-stone-400">
                    {new Date(prompt.updated_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-stone-600 dark:text-stone-300 line-clamp-3 text-sm">
                    {prompt.content.replace(/[#*`]/g, '').substring(0, 150)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-bold border-0 focus-visible:ring-0 px-0"
                placeholder="Prompt title..."
              />
            </DialogTitle>
            <DialogDescription>
              Edit your prompt using markdown. Click Optimize to enhance it with AI.
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="space-y-4">
            <div data-color-mode="light" className="min-h-[400px]">
              <MDEditor
                value={editContent}
                onChange={(val) => setEditContent(val || '')}
                height={400}
                preview="edit"
              />
            </div>

            <div className="flex justify-between gap-4">
              <Button
                onClick={optimizePrompt}
                disabled={isOptimizing}
                variant="outline"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isOptimizing ? 'Optimizing...' : 'Optimize with AI'}
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={savePrompt}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
