# UI/UX Accessibility Testing Workflow

This workflow executes comprehensive accessibility, usability, and visual
regression testing to ensure features and components are deploy-ready with
inclusive design principles.

## Workflow Steps

### 1. Load Context and Validate Inputs

```javascript
// Load feature descriptions and user workflows
let featureContext = null
let workflowContext = null

// Try to load feature descriptions from common locations
const featurePaths = [
  'docs/feature-descriptions.md',
  'docs/features/',
  'docs/user-stories/',
  'README.md'
]

for (const path of featurePaths) {
  try {
    featureContext = await read_file(path)
    if (featureContext) break
  } catch (error) {
    // File doesn't exist, continue to next path
  }
}

// Search for workflow files in source code
workflowContext = await search_files(
  'src/',
  /user-workflow|test-scenario|accessibility-test/
)

// Validate required inputs
if (!featureContext && !workflowContext) {
  throw new Error(
    'Must provide feature descriptions or user workflows for testing'
  )
}
```

### 2. Execute Accessibility Testing Procedure

```javascript
// Load the skill definition
const skillDefinition = await read_file(
  'skills/ui-ux-accessibility-testing/SKILL.md'
)

// Run accessibility tests using existing tools
// - Jest with axe-core integration
// - Playwright accessibility plugins
// - Cypress accessibility testing
```

### 3. Generate Comprehensive Report

```javascript
// Compile accessibility audit results
// Generate visual regression diffs
// Calculate coverage metrics
// Provide actionable fix recommendations
```

### 4. Quality Gate Validation

```javascript
// Verify 80% accessibility test coverage
// Check for zero high-priority violations
// Flag items requiring manual review
// Provide deployment readiness assessment
```

### 5. Execute Retro Loop

After testing completion, run the retro loop to capture improvements:

```javascript
// Step 6: Retro Loop - Collect feedback and improve the skill
async function executeRetroLoop() {
  // Ask user 3 feedback questions
  const question1 = await ask_followup_question(
    'What went wrong or was slow during the accessibility testing process?',
    [
      'Test execution was too slow',
      'Report format needs improvement',
      'Missing specific accessibility checks',
      'Integration issues with existing tools',
      'Nothing went wrong'
    ]
  )

  const question2 = await ask_followup_question(
    'What output format would be more useful for accessibility testing results?',
    [
      'Interactive HTML report with screenshots',
      'JSON format for CI/CD integration',
      'PDF summary for stakeholders',
      'Detailed markdown documentation',
      'Current format is sufficient'
    ]
  )

  const question3 = await ask_followup_question(
    'Any new constraint discovered (libs, API, file paths, CI)?',
    [
      'New accessibility libraries needed',
      'CI pipeline integration requirements',
      'File path structure changes',
      'API endpoint modifications',
      'No new constraints'
    ]
  )

  // Update skill documentation with findings
  await updateSkillDocumentation({
    issues: [question1],
    outputPreferences: [question2],
    constraints: [question3]
  })
}

// Update skill documentation function
async function updateSkillDocumentation(feedback) {
  const skillPath = 'skills/ui-ux-accessibility-testing/SKILL.md'

  try {
    const currentContent = await read_file(skillPath)

    // Append findings to appropriate sections
    let updatedContent = currentContent

    // Update Failure modes section
    if (feedback.issues && feedback.issues.length > 0) {
      const failureModes = feedback.issues.filter(
        issue => issue !== 'Nothing went wrong'
      )
      if (failureModes.length > 0) {
        const failureModesText = failureModes
          .map(mode => `- ${mode}`)
          .join('\n')
        updatedContent = updatedContent.replace(
          '## Failure modes\n',
          `## Failure modes\n\n${failureModesText}\n`
        )
      }
    }

    // Update Evaluation checklist section
    if (feedback.outputPreferences && feedback.outputPreferences.length > 0) {
      const preferences = feedback.outputPreferences.filter(
        pref => pref !== 'Current format is sufficient'
      )
      if (preferences.length > 0) {
        const preferencesText = preferences.map(pref => `- ${pref}`).join('\n')
        updatedContent = updatedContent.replace(
          '## Evaluation checklist\n',
          `## Evaluation checklist\n\n${preferencesText}\n`
        )
      }
    }

    // Update Changelog section
    const timestamp = new Date().toISOString().split('T')[0]
    const changelogEntry = `- ${timestamp}: Added retro loop feedback and improvements`

    // Check if changelog section exists and has entries
    const changelogMatch = updatedContent.match(
      /## Changelog\n([\s\S]*?)(?=\n## |\n$|$)/
    )
    if (changelogMatch) {
      // Add to existing changelog
      const existingChangelog = changelogMatch[1].trim()
      const newChangelog = existingChangelog
        ? `${changelogEntry}\n${existingChangelog}`
        : changelogEntry
      updatedContent = updatedContent.replace(
        /## Changelog\n[\s\S]*?(?=\n## |\n$|$)/,
        `## Changelog\n\n${newChangelog}\n`
      )
    } else {
      // Create new changelog section
      updatedContent = updatedContent.replace(
        '## Changelog\n',
        `## Changelog\n\n${changelogEntry}\n`
      )
    }

    // Write updated content back to file
    await write_to_file(skillPath, updatedContent)

    console.log('✅ Skill documentation updated with retro loop findings')
  } catch (error) {
    console.error('❌ Failed to update skill documentation:', error.message)
    throw error
  }
}

// Execute retro loop after testing
await executeRetroLoop()
```

## Usage

Trigger this workflow when:

- New features need accessibility validation before deployment
- Components require usability assessment
- Visual regression testing is needed for UI changes
- Ensuring compliance with WCAG 2.1 AA standards

## Integration Points

- Uses existing Jest, Cypress, and Playwright configurations
- Integrates with axe-core for accessibility testing
- Connects to CI/CD pipeline for automated testing
- Provides reports for manual review processes
