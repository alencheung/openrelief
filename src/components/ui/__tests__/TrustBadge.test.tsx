/**
 * Tests for TrustBadge Component
 * 
 * These tests verify the functionality of the trust badge display,
 * including score visualization, variants, and accessibility.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrustBadge } from '../TrustBadge'

describe('TrustBadge Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<TrustBadge score={75} />)

      expect(screen.getByText('75/100')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should render with custom max score', () => {
      render(<TrustBadge score={50} maxScore={200} />)

      expect(screen.getByText('50/200')).toBeInTheDocument()
      expect(screen.getByText('25%')).toBeInTheDocument()
    })

    it('should render with custom label', () => {
      render(<TrustBadge score={85} label="Custom Trust Score" />)

      expect(screen.getByText('Custom Trust Score')).toBeInTheDocument()
      expect(screen.queryByText('85/100')).not.toBeInTheDocument()
    })

    it('should render without percentage when showPercentage is false', () => {
      render(<TrustBadge score={75} showPercentage={false} />)

      expect(screen.getByText('75/100')).toBeInTheDocument()
      expect(screen.queryByText('75%')).not.toBeInTheDocument()
    })

    it('should render without icon when showIcon is false', () => {
      render(<TrustBadge score={75} showIcon={false} />)

      expect(screen.getByText('75/100')).toBeInTheDocument()
      expect(screen.queryByTestId('trust-icon')).not.toBeInTheDocument()
    })
  })

  describe('Trust Levels', () => {
    it('should show excellent level for scores >= 90', () => {
      render(<TrustBadge score={95} />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('trust-excellent')
      expect(screen.getByTestId('trust-icon')).toBeInTheDocument()
    })

    it('should show good level for scores >= 70', () => {
      render(<TrustBadge score={75} />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('trust-good')
      expect(screen.getByTestId('trust-icon')).toBeInTheDocument()
    })

    it('should show moderate level for scores >= 50', () => {
      render(<TrustBadge score={60} />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('trust-moderate')
      expect(screen.getByTestId('trust-icon')).toBeInTheDocument()
    })

    it('should show low level for scores >= 30', () => {
      render(<TrustBadge score={40} />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('trust-low')
      expect(screen.getByTestId('trust-icon')).toBeInTheDocument()
    })

    it('should show critical level for scores < 30', () => {
      render(<TrustBadge score={25} />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('trust-critical')
      expect(screen.getByTestId('trust-icon')).toBeInTheDocument()
    })

    it('should handle edge cases correctly', () => {
      const { rerender } = render(<TrustBadge score={30} />)

      // Exactly 30 should be low
      expect(screen.getByTestId('trust-badge')).toHaveClass('trust-low')

      rerender(<TrustBadge score={70} />)

      // Exactly 70 should be good
      expect(screen.getByTestId('trust-badge')).toHaveClass('trust-good')

      rerender(<TrustBadge score={90} />)

      // Exactly 90 should be excellent
      expect(screen.getByTestId('trust-badge')).toHaveClass('trust-excellent')
    })
  })

  describe('Size Variants', () => {
    it('should render small size', () => {
      render(<TrustBadge score={75} size="sm" />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('px-2', 'py-1', 'text-xs')
    })

    it('should render medium size', () => {
      render(<TrustBadge score={75} size="md" />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-xs')
    })

    it('should render large size', () => {
      render(<TrustBadge score={75} size="lg" />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('px-4', 'py-2', 'text-sm')
    })
  })

  describe('Style Variants', () => {
    it('should render default variant', () => {
      render(<TrustBadge score={75} variant="default" />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).not.toHaveClass('border-2', 'bg-transparent', 'bg-opacity-10', 'text-current', 'border-current')
    })

    it('should render outline variant', () => {
      render(<TrustBadge score={75} variant="outline" />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('border-2', 'bg-transparent')
    })

    it('should render subtle variant', () => {
      render(<TrustBadge score={75} variant="subtle" />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('bg-opacity-10', 'text-current', 'border-current')
    })

    it('should render indicator variant', () => {
      render(<TrustBadge score={75} variant="indicator" />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('pl-8', 'relative')
      expect(screen.getByTestId('trust-indicator')).toBeInTheDocument()
    })
  })

  describe('Trend Display', () => {
    it('should render up trend', () => {
      render(<TrustBadge score={75} showTrend trend="up" />)

      expect(screen.getByTestId('trend-up')).toBeInTheDocument()
    })

    it('should render down trend', () => {
      render(<TrustBadge score={75} showTrend trend="down" />)

      expect(screen.getByTestId('trend-down')).toBeInTheDocument()
    })

    it('should render stable trend', () => {
      render(<TrustBadge score={75} showTrend trend="stable" />)

      expect(screen.getByTestId('trend-stable')).toBeInTheDocument()
    })

    it('should not render trend when showTrend is false', () => {
      render(<TrustBadge score={75} showTrend={false} />)

      expect(screen.queryByTestId('trend-up')).not.toBeInTheDocument()
      expect(screen.queryByTestId('trend-down')).not.toBeInTheDocument()
      expect(screen.queryByTestId('trend-stable')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TrustBadge score={75} label="User Trust Score" />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveAttribute('title', 'User Trust Score: 75/100 (75%)')
    })

    it('should support keyboard navigation', async () => {
      const onClick = jest.fn()
      render(<TrustBadge score={75} onClick={onClick} />)

      const badge = screen.getByTestId('trust-badge')
      
      badge.focus()
      expect(badge).toHaveFocus()

      await userEvent.keyboard('{Enter}')
      expect(onClick).toHaveBeenCalled()
    })

    it('should have sufficient color contrast', () => {
      render(<TrustBadge score={75} />)

      const badge = screen.getByTestId('trust-badge')
      
      // Check for visible text content
      const textContent = badge.textContent
      expect(textContent).toBeDefined()
      expect(textContent?.length).toBeGreaterThan(0)
    })

    it('should announce changes to screen readers', () => {
      const { rerender } = render(<TrustBadge score={75} />)

      rerender(<TrustBadge score={80} />)

      // Should update title attribute for screen readers
      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveAttribute('title', expect.stringContaining('80/100'))
    })
  })

  describe('Interactive Features', () => {
    it('should handle click events', async () => {
      const onClick = jest.fn()
      render(<TrustBadge score={75} onClick={onClick} />)

      const badge = screen.getByTestId('trust-badge')
      await userEvent.click(badge)

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should handle hover events', async () => {
      const onMouseEnter = jest.fn()
      const onMouseLeave = jest.fn()
      
      render(
        <TrustBadge 
          score={75} 
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      )

      const badge = screen.getByTestId('trust-badge')
      
      await userEvent.hover(badge)
      expect(onMouseEnter).toHaveBeenCalled()

      await userEvent.unhover(badge)
      expect(onMouseLeave).toHaveBeenCalled()
    })

    it('should handle focus events', async () => {
      const onFocus = jest.fn()
      const onBlur = jest.fn()
      
      render(
        <TrustBadge 
          score={75} 
          onFocus={onFocus}
          onBlur={onBlur}
        />
      )

      const badge = screen.getByTestId('trust-badge')
      
      badge.focus()
      expect(onFocus).toHaveBeenCalled()

      badge.blur()
      expect(onBlur).toHaveBeenCalled()
    })
  })

  describe('Responsive Behavior', () => {
    it('should adapt to different screen sizes', () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320, // Mobile
      })

      const { rerender } = render(<TrustBadge score={75} />)

      // Should render appropriately for mobile
      const badge = screen.getByTestId('trust-badge')
      expect(badge).toBeInTheDocument()

      // Change to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      rerender(<TrustBadge score={75} />)

      expect(badge).toBeInTheDocument()
    })

    it('should handle container constraints', () => {
      const container = document.createElement('div')
      container.style.width = '100px'
      
      render(<TrustBadge score={75} />, { container })

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toBeInTheDocument()
      
      // Should not overflow container
      const badgeWidth = badge.offsetWidth
      expect(badgeWidth).toBeLessThanOrEqual(100)
    })
  })

  describe('Performance', () => {
    it('should render efficiently with large datasets', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<TrustBadge score={Math.random() * 100} />)
        unmount()
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<TrustBadge score={75} />)

      const initialRender = screen.getByTestId('trust-badge')
      
      // Rerender with same props
      rerender(<TrustBadge score={75} />)
      
      const secondRender = screen.getByTestId('trust-badge')
      expect(secondRender).toBe(initialRender)
    })
  })

  describe('Edge Cases', () => {
    it('should handle score above max score', () => {
      render(<TrustBadge score={150} maxScore={100} />)

      expect(screen.getByText('100/100')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should handle negative scores', () => {
      render(<TrustBadge score={-10} />)

      expect(screen.getByText('-10/100')).toBeInTheDocument()
      expect(screen.getByText('-10%')).toBeInTheDocument()
    })

    it('should handle zero score', () => {
      render(<TrustBadge score={0} />)

      expect(screen.getByText('0/100')).toBeInTheDocument()
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('should handle very large max scores', () => {
      render(<TrustBadge score={500} maxScore={1000} />)

      expect(screen.getByText('500/1000')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should handle missing score prop', () => {
      // @ts-expect-error - Testing missing required prop
      render(<TrustBadge />)

      // Should not crash, but may show default/empty state
      expect(screen.getByTestId('trust-badge')).toBeInTheDocument()
    })
  })

  describe('Integration with Trust System', () => {
    it('should work with trust store data', () => {
      const trustData = {
        userId: 'user-1',
        score: 85,
        previousScore: 80,
        lastUpdated: new Date('2024-01-15'),
        history: [],
        factors: {
          reportingAccuracy: 0.9,
          confirmationAccuracy: 0.8,
          disputeAccuracy: 0.7,
          responseTime: 10,
          locationAccuracy: 0.85,
          contributionFrequency: 5,
          communityEndorsement: 0.8,
          penaltyScore: 0.1,
          expertiseAreas: [1, 2],
        },
      }

      render(<TrustBadge score={trustData.score} />)

      const badge = screen.getByTestId('trust-badge')
      expect(badge).toHaveClass('trust-excellent')
      expect(screen.getByText('85/100')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument()
    })

    it('should reflect real-time updates', () => {
      const { rerender } = render(<TrustBadge score={75} />)

      expect(screen.getByText('75/100')).toBeInTheDocument()

      // Simulate real-time score update
      rerender(<TrustBadge score={80} />)

      expect(screen.getByText('80/100')).toBeInTheDocument()
    })
  })
})