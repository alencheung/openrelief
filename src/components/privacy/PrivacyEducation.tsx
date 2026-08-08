/**
 * Privacy Education and Guidance Component for OpenRelief
 *
 * This component provides interactive privacy tutorials, data minimization recommendations,
 * privacy setting suggestions, risk assessment tools, and best practices guidance.
 *
 * Types live in privacy-education-types.ts, helper / mock data builders live in
 * privacy-education-helpers.ts, and tab view components live in privacy-education-tabs.tsx.
 * They are re-exported below for backward compatibility.
 */

'use client'

import React, { useState } from 'react'
import { BookOpen, Clock, CheckCircle, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/Button'

// Re-export extracted types and helpers for backward compatibility
export * from './privacy-education-types'
export * from './privacy-education-helpers'
import {
  getDefaultBestPractices,
  getDefaultPrivacySettings,
  getDefaultRecommendations,
  getDefaultRiskAssessments,
  getDefaultTutorials
} from './privacy-education-helpers'
import {
  AssessmentTab,
  PracticesTab,
  RecommendationsTab,
  SettingsTab,
  TutorialsTab
} from './privacy-education-tabs'
import type { PrivacyEducationTab, Recommendation, Tutorial } from './privacy-education-types'

const PrivacyEducation: React.FC = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<PrivacyEducationTab>('tutorials')
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // Tutorials start from curated default content; `startTutorial` /
  // `completeTutorial` update progress + completion locally so the button has a
  // visible effect (previously it set an unused `_setSelectedTutorial` state).
  const [tutorials, setTutorials] = useState<Tutorial[]>(getDefaultTutorials())

  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    getDefaultRecommendations()
  )

  const [riskAssessments, _setRiskAssessments] = useState(getDefaultRiskAssessments())

  const [bestPractices, _setBestPractices] = useState(getDefaultBestPractices())

  const [privacySettings, _setPrivacySettings] = useState(getDefaultPrivacySettings())

  // Open the tutorial overlay and mark it as started (progress > 0,
  // lastAccessed = now). Previously this only set an unused id and silently
  // dropped the click.
  const startTutorial = (id: string) => {
    const tutorial = tutorials.find(t => t.id === id)
    if (!tutorial) {
      return
    }
    setActiveTutorial(tutorial)
    setTutorials(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              progress: Math.max(t.progress, t.completed ? 100 : 10),
              lastAccessed: new Date()
            }
          : t
      )
    )
    toast({
      title: 'Tutorial started',
      description: `${tutorial.title} (${tutorial.duration} min)`
    })
  }

  const completeTutorial = (id: string) => {
    setTutorials(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: true, progress: 100 } : t))
    )
    setActiveTutorial(null)
    toast({
      title: 'Tutorial completed',
      description: 'Nice work — your progress has been saved.'
    })
  }

  // Implement recommendation by applying the corresponding privacy setting.
  // Maps recommendation IDs to privacy settings keys where possible; falls
  // back to a local-only update for recommendations with no setting mapping.
  const implementRecommendation = async (id: string) => {
    const rec = recommendations.find(r => r.id === id)
    if (!rec) {
      return
    }
    setIsLoading(true)
    try {
      // Map recommendation to a privacy setting where possible.
      const settingMap: Record<string, Record<string, unknown>> = {
        'enable-differential-privacy': { differentialPrivacy: true },
        'enable-k-anonymity': { kAnonymity: true },
        'enable-e2e-encryption': { endToEndEncryption: true },
        'reduce-data-retention': { dataRetentionDays: 7 },
        'disable-third-party-analytics': { thirdPartyAnalytics: false },
        'enable-privacy-budget-alerts': { privacyBudgetAlerts: true }
      }
      const settingsUpdate = settingMap[rec.id]

      if (settingsUpdate) {
        const response = await fetch('/api/privacy/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ settings: settingsUpdate })
        })
        if (!response.ok) {
          throw new Error(`Failed to apply setting (${response.status})`)
        }
      }

      setRecommendations(prev =>
        prev.map(r => (r.id === id ? { ...r, implemented: true } : r))
      )

      toast({
        title: 'Recommendation Applied',
        description: 'The privacy recommendation has been successfully implemented.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply recommendation',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Privacy Education & Guidance</h1>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">Learn & Improve</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b overflow-x-auto">
        {(['tutorials', 'recommendations', 'assessment', 'practices', 'settings'] as const).map(
          tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'tutorials'
                ? 'Interactive Tutorials'
                : tab === 'recommendations'
                  ? 'Smart Recommendations'
                  : tab === 'assessment'
                    ? 'Risk Assessment'
                    : tab === 'practices'
                      ? 'Best Practices'
                      : tab === 'settings'
                        ? 'Privacy Settings'
                        : tab}
            </button>
          )
        )}
      </div>

      {/* Tutorials Tab */}
      {activeTab === 'tutorials' && (
        <TutorialsTab
          tutorials={tutorials}
          filterCategory={filterCategory}
          searchQuery={searchQuery}
          onFilterCategoryChange={setFilterCategory}
          onSearchQueryChange={setSearchQuery}
          onStartTutorial={startTutorial}
        />
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <RecommendationsTab
          recommendations={recommendations}
          isLoading={isLoading}
          onImplement={implementRecommendation}
        />
      )}

      {/* Risk Assessment Tab */}
      {activeTab === 'assessment' && <AssessmentTab riskAssessments={riskAssessments} />}

      {/* Best Practices Tab */}
      {activeTab === 'practices' && <PracticesTab bestPractices={bestPractices} />}

      {/* Privacy Settings Tab */}
      {activeTab === 'settings' && <SettingsTab privacySettings={privacySettings} />}

      {/* Tutorial overlay — opened by `startTutorial`. Renders the tutorial's
       * content inline so the "Start" button has a visible effect instead of
       * silently no-op'ing. */}
      {activeTutorial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-title"
          onClick={() => setActiveTutorial(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 pb-4 border-b">
              <div className="flex-1 pr-4">
                <h2 id="tutorial-title" className="text-xl font-semibold">
                  {activeTutorial.title}
                </h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {activeTutorial.duration} min
                  </span>
                  <span className="capitalize">{activeTutorial.difficulty}</span>
                  <span className="capitalize">{activeTutorial.category}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTutorial(null)}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close tutorial"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">{activeTutorial.description}</p>

              <div>
                <h3 className="font-medium mb-2">Topics covered</h3>
                <div className="flex flex-wrap gap-2">
                  {activeTutorial.topics.map(topic => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {activeTutorial.interactiveElements && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  This tutorial includes interactive elements.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setActiveTutorial(null)}>
                Close
              </Button>
              <Button onClick={() => completeTutorial(activeTutorial.id)}>
                {activeTutorial.completed ? 'Mark as Reviewed' : 'Mark as Completed'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrivacyEducation
