# Contributing to Discord Calendar Bot

Thank you for your interest in contributing to Discord Calendar Bot! 🎉

## 🚀 Quick Start for Contributors

### Development Setup
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/discord-calendar-bot.git
   cd discord-calendar-bot
   ```
3. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Set up your environment variables (copy from `.env.example`)

### Development Workflow
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test thoroughly
4. Commit with a clear message: `git commit -m "Add feature: description"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request

## 🐛 Bug Reports

When reporting bugs, please include:
- **Clear title** describing the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, Python version, etc.)
- **Error messages** or logs if available
- **Screenshots** if relevant

## 💡 Feature Requests

For new features:
- **Describe the problem** you're trying to solve
- **Explain your proposed solution**
- **Consider alternatives** you've thought about
- **Provide use cases** or examples

## 🔧 Code Guidelines

### Python Code Style
- Follow PEP 8
- Use meaningful variable and function names
- Add docstrings for functions and classes
- Keep functions small and focused
- Add type hints where helpful

### Commit Messages
- Use present tense ("Add feature" not "Added feature")
- Keep first line under 72 characters
- Reference issues when applicable (#123)

Example:
```
Add calendar link generation feature

- Implement generate_calendar_link() helper function
- Add UTC timezone conversion for Google Calendar
- Update /t2g and /schedule commands to include links
- Resolves #123
```

## 🧪 Testing

Before submitting:
- Test your changes locally
- Verify Discord commands work correctly
- Check Google Calendar integration
- Ensure error handling works properly

## 📝 Documentation

When adding features:
- Update README.md if user-facing changes
- Add inline code comments for complex logic
- Update docstrings if function signatures change

## 🏷️ Release Process

This project follows semantic versioning (semver):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality (backward compatible)
- **PATCH** version for bug fixes (backward compatible)

## 🤝 Community Guidelines

- Be respectful and constructive
- Help newcomers get started
- Share knowledge and learn from others
- Focus on the code and ideas, not the person

## 🎯 Priority Areas for Contribution

Current focus areas where contributions are especially welcome:

### High Priority
- 🐛 **Bug fixes** and stability improvements
- 📚 **Documentation** improvements and translations
- 🧪 **Test coverage** expansion
- ♿ **Accessibility** improvements

### Medium Priority
- ⚡ **Performance** optimizations
- 🎨 **User experience** enhancements
- 🔧 **Configuration** and setup simplification
- 🌐 **Internationalization** (i18n)

### Future Features
- 👥 **Multi-user support** and team features
- 🔄 **Advanced scheduling** algorithms
- 📊 **Analytics and reporting** enhancements
- 🌐 **Web dashboard** interface

## 📞 Getting Help

If you need help:
1. Check existing [Issues](https://github.com/Nodee-1014/discord-calendar-bot/issues)
2. Look at [Discussions](https://github.com/Nodee-1014/discord-calendar-bot/discussions)
3. Create a new issue with the `question` label

## 🌟 Recognition

Contributors will be:
- Listed in the README contributors section
- Mentioned in release notes for significant contributions
- Given credit in commit history

Thank you for making Discord Calendar Bot better! 🚀