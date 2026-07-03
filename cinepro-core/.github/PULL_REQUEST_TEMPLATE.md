# Pull Request

<!--
Thank you for contributing to the Open Media Source Scraper! Please fill out the following template to help us understand your changes and review them effectively.


**Please enable `Allow edits from maintainers` so we can make any necessary adjustments to your PR.**


-->

## Description

<!-- Provide a clear and concise description of what this PR does -->

### Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] 🌟 New feature (non-breaking change which adds functionality)
- [ ] 📀 New provider (adding a new streaming source provider)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] 🎨 Style/formatting changes
- [ ] ⚡ Performance improvement
- [ ] 🔧 Configuration change

## Related Issues

<!-- Link to related issues using keywords: Closes #123, Fixes #456, Resolves #789 -->

Closes #

## Changes Made

<!-- List the specific changes made in this PR -->

-
-
-

## Provider Information (if applicable)

<!-- Complete this section if you're adding or modifying a provider -->

### Provider Details

- **Provider Name**:
- **Provider ID**:
- **Base URL**:
- **Content Types Supported**:
    - [ ] Movies
    - [ ] TV Shows

### Provider Testing

<!-- Confirm you've tested the provider with these -->

**Tested with the following TMDB IDs:**

- Movies:
    - [ ] TMDB ID: 550 (Fight Club)
    - [ ] TMDB ID: **\_** (Your test movie)
- TV Shows:
    - [ ] TMDB ID: 1399/1/1 (Game of Thrones S01E01)
    - [ ] TMDB ID: **\_** (Your test episode)

**Test Results:**

<!-- Describe what happened during testing -->

```
Paste relevant API response or logs here
```

## Checklist

<!-- Mark completed items with an 'x' -->

### General

- [ ] My code follows the code style of this project
- [ ] I have run `npm run format` to format my code
- [ ] My code builds without errors (`npm run build`)
- [ ] I have tested my changes locally
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings or errors
- [ ] I have read the [CONTRIBUTING.md](CONTRIBUTING.md) guidelines

### Provider Checklist (if adding/modifying a provider)

- [ ] Provider extends `BaseProvider` from `@omss/framework`
- [ ] Provider has a unique `id` and descriptive `name`
- [ ] Provider declares correct `capabilities` (movies/tv support)
- [ ] Implements `getMovieSources()` and/or `getTVSources()` correctly
- [ ] All streaming URLs use `this.createProxyUrl()` for proxying
- [ ] Includes proper error handling with diagnostics
- [ ] Uses `this.console.log()` for logging (not `console.log()`)
- [ ] Includes appropriate headers via `this.HEADERS`
- [ ] Returns standardized `ProviderResult` format
- [ ] Provider file is in `src/providers/` directory
- [ ] Provider exports the class properly for auto-discovery
- [ ] Tested with multiple TMDB IDs for movies and/or TV shows
- [ ] Works correctly with the proxy system
- [ ] Handles edge cases (missing content, API errors)

### Documentation

- [ ] I have updated the README.md if necessary
- [ ] I have added/updated comments in my code
- [ ] I have documented any new environment variables
- [ ] I have added examples if introducing new patterns

## Testing

### How Has This Been Tested?

<!-- Describe the tests you ran to verify your changes -->

**Test Configuration:**

- Node.js version:
- Operating System:
- Cache type used: (memory/redis)

**Testing Steps:**

1.
2.
3.

### Test Output

<!-- Include relevant test outputs, API responses, or logs -->

```
Paste test output here
```

## Screenshots (if applicable)

<!-- Add screenshots to help explain your changes -->

## Additional Context

<!-- Add any other context about the PR here -->

### Performance Impact

<!-- Describe any performance implications of your changes -->

- [ ] No performance impact
- [ ] Performance improvement (describe below)
- [ ] Potential performance concern (describe below)

**Details:**

### Breaking Changes

<!-- If this PR includes breaking changes, describe them here -->

**Details:**

### Dependencies

<!-- List any new dependencies added or updated -->

-
-

## Reviewer Notes

<!-- Any specific areas you'd like reviewers to focus on? -->

---

## For Maintainers

### Merge Checklist

- [ ] Code review completed
- [ ] All CI checks passing
- [ ] No merge conflicts
- [ ] Provider tested by reviewer (if applicable)
- [ ] Documentation updated (if needed)
- [ ] Version bump needed? (yes/no)
