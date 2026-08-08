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
import { BookOpen } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
import type { PrivacyEducationTab, Recommendation } from './privacy-education-types'

const PrivacyEducation: React.FC = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<PrivacyEducationTab>('tutorials')
  const [selectedTutorial, _setSelectedTutorial] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // Mock data for demonstration
  const [tutorials, _setTutorials] = useState(getDefaultTutorials())

  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    getDefaultRecommendations()
  )

  const [riskAssessments, _setRiskAssessments] = useState(getDefaultRiskAssessments())

  const [bestPractices, _setBestPractices] = useState(getDefaultBestPractices())

  const [privacySettings, _setPrivacySettings] = useState(getDefaultPrivacySettings())

  // Start tutorial
  const startTutorial = (id: string) => {
    _setSelectedTutorial(id)
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
    </div>
  )
}

export default PrivacyEducation
