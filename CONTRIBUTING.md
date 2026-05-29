# Contributing Guide

Thank you for considering a contribution to the Note-to-Action Agent! This document provides guidelines and instructions for contributing.

## Code of Conduct

We are committed to providing a welcoming and inspiring community. Please read and adhere to our Code of Conduct:

- Be respectful and inclusive
- Welcome diverse perspectives and experiences
- Give and receive feedback graciously
- Focus on what is best for the community

## Getting Started

### 1. Fork & Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/note-to-action-agent.git
cd note-to-action-agent

# Add upstream remote
git remote add upstream https://github.com/original-owner/note-to-action-agent.git
```

### 2. Setup Development Environment

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your API keys
nano .env
```

### 3. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Follow branch naming:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions
- `chore/` - Maintenance tasks

---

## Development Workflow

### Running Locally

```bash
# Start development server
npm start

# In another terminal, run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Check formatting
npm run format:check
```

### Making Changes

1. **Write tests first** (TDD preferred)
2. **Implement feature/fix**
3. **Run tests**: `npm test`
4. **Check linting**: `npm run lint`
5. **Format code**: `npm run format`

### Code Style

- **Prettier** for formatting (auto-run on commit)
- **ESLint** for code quality
- Use semantic variable names
- Add comments for complex logic
- Follow existing code patterns

### Documentation

- Update README.md if adding user-facing features
- Add JSDoc comments for new functions
- Update ACCESSIBILITY.md for a11y changes
- Add examples for new APIs

---

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting (Prettier)
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Build, deps, tooling

**Examples:**
```
feat(sanitization): add DOMPurify for XSS protection
fix(api): handle 429 rate limit responses gracefully
docs(deployment): add Docker setup instructions
```

---

## Pull Request Process

### Before Submitting

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**:
   ```bash
   npm run lint
   npm run format
   npm test
   ```

3. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Creating PR

1. Go to GitHub and create Pull Request
2. Fill out PR template:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   How was this tested?

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Tests pass
   - [ ] Documentation updated
   - [ ] No console errors
   ```

3. Link any related issues: `Closes #123`

### Review Process

- Maintainers will review within 1-2 weeks
- Address feedback and push updates
- PR must pass all checks before merging
- Squash commits before merge (maintainers can do this)

---

## Testing

### Write Tests For:
- ✅ All new features
- ✅ Bug fixes
- ✅ Edge cases
- ✅ Error scenarios

### Test Structure

```javascript
describe('Feature Name', () => {
    test('should do something', () => {
        // Arrange
        const input = ...

        // Act
        const result = ...

        // Assert
        expect(result).toBe(...)
    })
})
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test process.test.js

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

---

## Accessibility

### Guidelines

- ✅ Use semantic HTML elements
- ✅ Add ARIA labels to icon buttons
- ✅ Ensure keyboard navigation works
- ✅ Test with screen readers
- ✅ Maintain 4.5:1 color contrast
- ✅ See [ACCESSIBILITY.md](./ACCESSIBILITY.md)

### Testing

```bash
# Manual testing
# 1. Navigate with Tab key
# 2. Test with VoiceOver (Mac), NVDA (Windows), or JAWS
# 3. Check focus indicators
```

---

## Performance

### Best Practices

- ✅ Minimize bundle size
- ✅ Use efficient algorithms
- ✅ Avoid unnecessary re-renders
- ✅ Cache responses appropriately
- ✅ Lazy load where possible

### Benchmarking

```bash
# Check bundle size
npm run build -- --analyze
```

---

## Security

### Before Committing

- ✅ No hardcoded secrets
- ✅ Validate all inputs
- ✅ Sanitize all outputs
- ✅ Use HTTPS for external calls
- ✅ Run `npm audit`

---

## Documentation

### Update Documentation For:
- New features
- API changes
- Configuration options
- Breaking changes
- Bug fixes (if significant)

### Documentation Files

- `README.md` - Project overview
- `DEPLOYMENT.md` - Deployment guide
- `ACCESSIBILITY.md` - A11y features
- `CONTRIBUTING.md` - This file
- JSDoc comments in code

---

## Areas for Contribution

### High Priority
- 🔴 Bug fixes
- 🔴 Performance improvements
- 🔴 Test coverage
- 🔴 Documentation

### Medium Priority
- 🟡 Feature requests (create issue first)
- 🟡 Accessibility improvements
- 🟡 Code refactoring

### Low Priority
- 🟢 Style/formatting
- 🟢 Dependency updates
- 🟢 Minor docs

---

## Getting Help

- **Questions**: Create a Discussion
- **Bugs**: Open an Issue with reproducible example
- **Features**: Create an Issue to discuss first
- **Chat**: Join Discord community (link in README)

---

## Recognition

Contributors will be:
- ✅ Listed in CONTRIBUTORS.md
- ✅ Thanked in release notes
- ✅ Featured in monthly updates

---

## Questions?

- Check existing issues/PRs
- Review CONTRIBUTING.md for similar examples
- Create a Discussion for questions

---

Thank you for contributing! 🎉

Last updated: May 29, 2026
