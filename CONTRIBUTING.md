# Contributing to Chat2Desk Order Bot

Thank you for considering contributing to this project! 🎉

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Bun version, etc.)

### Suggesting Features

Feature requests are welcome! Please:
- Check existing issues first
- Explain the use case
- Describe the proposed solution

### Pull Requests

1. **Fork the repository**

2. **Create a feature branch**
```bash
   git checkout -b feature/your-feature-name
```

3. **Make your changes**
    - Follow existing code style
    - Add tests if applicable
    - Update documentation

4. **Commit using Conventional Commits**
```bash
   git commit -m "feat: add amazing feature"
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

5. **Push and create Pull Request**
```bash
   git push origin feature/your-feature-name
```

6. **Wait for review**
    - Respond to feedback
    - Make requested changes

## Development Setup
```bash
# Install dependencies
bun install

# Start development environment
bun run docker:up
bun run dev:server  # Terminal 1
bun run dev:worker  # Terminal 2
```

## Code Style

- Use TypeScript
- Follow ESLint rules (`bun run lint`)
- Format with Prettier (`bun run format`)
- Write clear commit messages

## Testing

Before submitting PR:
```bash
# Run linter
bun run lint

# Format code
bun run format

# Test manually
curl -X POST http://localhost:3000/webhook/chat2desk \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test","message_id":"msg_1","text":"Hello"}'
```

## Questions?

Feel free to open an issue for any questions!

Thank you for contributing! 🚀
