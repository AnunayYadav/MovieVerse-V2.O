# Contributing to CinePro Core

Hey there! 👋 Thanks for your interest in contributing to CinePro Core! We're excited to have you here.

## Getting Started

Before contributing, please:

1. Read the [README.md](https://github.com/cinepro-org/core/blob/main/README.md) to understand the project
2. Familiarize yourself with the [OMSS Framework](https://github.com/omss-spec/framework) and [OMSS Specification](https://github.com/omss-spec/omss-spec), since the core relies heavily on these standards
3. Check [existing issues](https://github.com/cinepro-org/core/issues) to see what's being worked on
4. Read our [Code of Conduct](CODE_OF_CONDUCT.md)

## How to Contribute

### Reporting Issues

When reporting issues, please use the appropriate issue template:

- **🐛 Bug Report**: For reporting bugs or unexpected behavior
- **🌟 Feature Request**: For suggesting new features
- **📀 Provider Request**: For requesting new streaming providers
- **❓ Question**: For asking questions or starting discussions

### Contributing Code

#### 1. Setting Up Your Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/core.git
cd core

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
# Add your TMDB_API_KEY to .env and modify other settings as needed

# Start development server
npm run dev
```

#### 2. Making Changes

1. **Create a new branch** for your feature or fix:

    ```bash
    git checkout -b feat/amazing-provider
    # or
    git checkout -b fix/bug-description
    ```

2. **Write clean, readable code** following our standards:
    - Use TypeScript strict mode (no `any` types or `@ts-ignore`'s)
    - Follow existing code style and patterns (e.g, async/await, error handling, **logging**, 4-space indentation...)
    - Add comments for complex logic
    - Use meaningful variable and function names

Note that the `@omss/framework` does not support single provider tests yet. If you want to test a single provider, create a file called test.ts in the provider's directory and add: 

```typescript
import { ProviderMediaObject } from "@omss/framework"
import {ExampleProvider} from "./example.js"

const prov = new ExampleProvider()

const mediaObj: ProviderMediaObject = {
  title: "The Dark Knight",
  tmdbId: "155",
  releaseYear: "2008",
  type: "movie",
  imdbId: "tt0468569"
}

const resp = await prov.getMovieSources(mediaObj)

console.log(resp)
```

Then run it with `npx tsx src/providers/example/test.ts`.
A full testing suite will be added in the future, but for now, this is the best way to test a single provider without having to run the entire server and make API calls to it.

When testing the whole setup, make sure to set `INTERNAL_DEBUG` to `true` in your `.env` file to get ALL sources (also non-playable ones) and detailed diagnostics in the response. This will help you identify any issues with your provider.

3. **Test your changes**:
    - Test with multiple TMDB IDs (movies and TV shows)
    - Verify error handling works correctly
    - Check that your provider works with the proxy system (that means, check if the URLs returned are proxy URLs and they actually play when accessed. You might have to modfiy the headers for the proxy to work correctly!)
    - Test with both development and production configurations

#### 3. Adding a New Provider

When adding a new provider, follow the [OMSS Framework provider guide](https://github.com/omss-spec/framework#creating-custom-providers).

**Provider Checklist:**

- [ ] Extends `BaseProvider` from `@omss/framework`
- [ ] Has unique `id` and descriptive `name`
- [ ] Declares correct `capabilities` (movies/tv support)
- [ ] Implements `getMovieSources()` and/or `getTVSources()`
- [ ] Uses `this.createProxyUrl()` for all streaming URLs
- [ ] Includes proper error handling with diagnostics
- [ ] Uses `this.console.log()` for logging (**not `console.log()`**)
- [ ] Includes appropriate headers via `this.HEADERS`
- [ ] Returns standardized `ProviderResult` format
- [ ] File is placed in `src/providers/` directory
- [ ] Provider works with auto-discovery (keep new providers in the `src/providers/` directory)

**Example Provider Structure:**

```typescript
import { BaseProvider } from '@omss/framework';

export class MyProvider extends BaseProvider {
    readonly id = 'my-provider';
    readonly name = 'My Provider';
    readonly BASE_URL = 'https://provider.com';
    readonly capabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media) {
        // Implementation
    }

    async getTVSources(media) {
        // Implementation
    }
}
```

#### 4. Code Style & Standards

- **Formatting**: Run `npm run format` before committing
- **TypeScript**: Ensure no type errors (`npm run build`)
- **Naming Conventions**:
    - Classes: `PascalCase`
    - Functions/Variables: `camelCase`
    - Constants: `UPPER_SNAKE_CASE`
    - Files: `kebab-case.ts` - (type files should be `*.types.ts`)
- **Error Handling**: Always include diagnostics in provider responses
- **Comments**: Add JSDoc comments when possible, especially for complex logic

#### 5. Commit Guidelines

Write clear, descriptive commit messages:

```bash
# Good examples:
git commit -m "feat: add VidSrc provider implementation"
git commit -m "fix: resolve proxy URL encoding issue"
git commit -m "docs: update provider creation guide"

# Use conventional commits format:
# feat: new feature
# fix: bug fix
# docs: documentation changes
# refactor: code refactoring
# test: adding tests
# chore: maintenance tasks
```

#### 6. Submitting a Pull Request

1. **Push your branch**:

    ```bash
    git push origin feature/amazing-provider
    ```

2. **Create a Pull Request** on GitHub with:
    - Clear title describing the change
    - Description of what was changed and why
    - Reference to related issues (e.g., "Closes #123")
    - Screenshots or examples if applicable

3. **Respond to feedback**:
    - Be open to constructive criticism
    - Make requested changes promptly
    - Ask questions if something is unclear

4. **Wait for approval**:
    - At least one maintainer review is required
    - CI checks must pass
    - Conflicts must be resolved

## Provider Development Guidelines

### Testing Your Provider

1. **Manual Testing**:

    ```bash
    # Test a movie
    curl http://localhost:3000/v1/movies/155

    # Test a TV episode
    curl http://localhost:3000/v1/tv/1399/1/1
    ```

2. **Common Test Cases**:
    - Popular movies (e.g., The Dark Knight: 155)
    - Recent movies (check TMDB for current IDs)
    - Popular TV shows (e.g., Game of Thrones: 1399)
    - Different seasons and episodes
    - Edge cases (missing content, errors)

### Provider Best Practicesv

- ✅ **DO (IMPORTANT)**: Use `Promise.all()` for concurrent requests when fetching multiple sources!
- ✅ **DO**: Use `this.createProxyUrl()` for all external URLs
- ✅ **DO**: Include quality information when available
- ✅ **DO**: Support multiple audio tracks if the provider offers them
- ✅ **DO**: Return empty arrays (`sources: [], subtitles: []`) on failure with diagnostics
- ✅ **DO**: Use try-catch blocks and proper error handling
- ❌ **DON'T**: Make requests without proper headers
- ❌ **DON'T**: Return direct streaming URLs without proxying
- ❌ **DON'T**: Use blocking/synchronous operations

## Documentation Contributions

Documentation improvements are always welcome! This includes:

- Fixing typos or unclear explanations
- Adding examples or use cases
- Improving README clarity
- Creating tutorials or guides
- Updating outdated information

## Questions?

- Check [CinePro Documentation](https://docs.cinepro.cc)
- Ask in [GitHub Discussions](https://github.com/orgs/cinepro-org/discussions)
- Open a [Question Issue](https://github.com/cinepro-org/core/issues/new/choose)

## License

By contributing to CinePro Core, you agree that your contributions will be licensed under the PolyForm Noncommercial 1.0 License.

---

**Thank you for contributing to CinePro Core! 🎬🚀**
