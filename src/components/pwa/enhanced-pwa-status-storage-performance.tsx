/**
 * Enhanced PWA Status - Storage & Performance Tab Panels
 *
 * StorageTab and PerformanceTab extracted from the main tabs file to keep
 * each module under 500 lines.
 */

import {
  formatFileSize,
  formatDuration
} from '@/lib/pwa-utils'
import {
  DatabaseIcon,
  TrashIcon,
  DownloadIcon
} from 'lucide-react'
import type { Button } from '@/components/ui/Button'
import type {
  CacheStatus,
  PerformanceMetrics
} from './enhanced-pwa-status-helpers'
import {
  getCacheTypeColor,
  getPerformanceGrade
} from './enhanced-pwa-status-helpers'

interface StorageTabProps {
  storageQuota: { used: number; quota: number; percentage: number }
  cacheStatus: CacheStatus[]
  performanceMetrics: PerformanceMetrics
  onPreloadAssets: () => void
  onClearCache: (cacheName?: string) => void
  ButtonComp: typeof Button
}

export function StorageTab({
  storageQuota,
  cacheStatus,
  performanceMetrics,
  onPreloadAssets,
  onClearCache,
  ButtonComp
}: StorageTabProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Storage Management</h2>
        <div className="flex gap-2">
          <ButtonComp onClick={onPreloadAssets} size="sm" variant="outline">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Preload Assets
          </ButtonComp>
          <ButtonComp onClick={() => onClearCache()} size="sm" variant="outline">
            <TrashIcon className="w-4 h-4 mr-2" />
            Clear All
          </ButtonComp>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Storage Usage</h3>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Used Space</span>
              <span className="text-sm font-medium">
                {formatFileSize(storageQuota.used)} / {formatFileSize(storageQuota.quota)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`
                  h-3 rounded-full transition-all duration-300
                  ${
                    storageQuota.percentage > 80
                      ? 'bg-red-500'
                      : storageQuota.percentage > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }
                `}
                style={{ width: `${Math.min(100, storageQuota.percentage)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">0%</span>
              <span className="text-xs text-gray-600 font-medium">
                {Math.round(storageQuota.percentage)}%
              </span>
              <span className="text-xs text-gray-500">100%</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Cache Statistics</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">{cacheStatus.length}</div>
              <div className="text-sm text-gray-600">Cache stores</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">
                {cacheStatus.reduce((sum, cache) => sum + cache.entries, 0)}
              </div>
              <div className="text-sm text-gray-600">Total entries</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">
                {formatFileSize(cacheStatus.reduce((sum, cache) => sum + cache.size, 0))}
              </div>
              <div className="text-sm text-gray-600">Total size</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">
                {Math.round(performanceMetrics.cacheHitRate)}%
              </div>
              <div className="text-sm text-gray-600">Hit rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Details */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Cache Details</h3>

        <div className="space-y-3">
          {cacheStatus.map((cache, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getCacheTypeColor(cache.type)}`}>
                  <DatabaseIcon className="w-5 h-5" />
                </div>

                <div>
                  <div className="font-medium text-gray-900">{cache.name}</div>
                  <div className="text-sm text-gray-600">
                    {cache.entries} entries • {formatFileSize(cache.size)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getCacheTypeColor(cache.type)}`}
                >
                  {cache.type}
                </div>

                <ButtonComp
                  onClick={() => onClearCache(cache.name)}
                  size="sm"
                  variant="ghost"
                >
                  <TrashIcon className="w-4 h-4" />
                </ButtonComp>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface PerformanceTabProps {
  performanceMetrics: PerformanceMetrics
}

export function PerformanceTab({ performanceMetrics }: PerformanceTabProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Metrics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Load Performance */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Page Load Performance</h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Load Complete</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatDuration(performanceMetrics.loadComplete)}
                </span>
                <span
                  className={`text-sm font-medium ${getPerformanceGrade(performanceMetrics.loadComplete).color}`}
                >
                  Grade {getPerformanceGrade(performanceMetrics.loadComplete).grade}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">DOM Content Loaded</span>
              <span className="text-sm font-medium">
                {formatDuration(performanceMetrics.domContentLoaded)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">First Contentful Paint</span>
              <span className="text-sm font-medium">
                {performanceMetrics.firstContentfulPaint
                  ? formatDuration(performanceMetrics.firstContentfulPaint)
                  : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Largest Contentful Paint</span>
              <span className="text-sm font-medium">
                {performanceMetrics.largestContentfulPaint
                  ? formatDuration(performanceMetrics.largestContentfulPaint)
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Cache Performance */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Cache Performance</h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cache Hit Rate</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${performanceMetrics.cacheHitRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {Math.round(performanceMetrics.cacheHitRate)}%
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Requests</span>
              <span className="text-sm font-medium">{performanceMetrics.totalRequests}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cached Requests</span>
              <span className="text-sm font-medium text-green-600">
                {performanceMetrics.cachedRequests}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Network Requests</span>
              <span className="text-sm font-medium text-orange-600">
                {performanceMetrics.totalRequests - performanceMetrics.cachedRequests}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Visualization */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Performance Breakdown</h3>

        <div className="space-y-3">
          {[
            { name: 'DNS Lookup', time: 50, color: 'bg-blue-500' },
            { name: 'TCP Connect', time: 100, color: 'bg-green-500' },
            { name: 'Request', time: 200, color: 'bg-yellow-500' },
            { name: 'Response', time: 300, color: 'bg-purple-500' },
            { name: 'Processing', time: 150, color: 'bg-orange-500' }
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-24">{item.name}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className={`${item.color} h-4 rounded-full transition-all duration-300`}
                  style={{ width: `${(item.time / 800) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium w-12 text-right">{item.time}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
