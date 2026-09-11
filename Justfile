# lepid-design — shared design-system styles and React components
# Requires: just, node, pnpm

default:
    @just --list

# Install dependencies
install:
    pnpm install

# Build
build:
    pnpm build

# Run all checks (lint + typecheck + test)
check: lint typecheck test

# Lint and check formatting (no linter or formatter is configured yet — wire its check mode here)
lint:
    @echo "lint: no linter or formatter configured"

# Fix lint and formatting issues (no linter or formatter is configured yet — wire its write mode here)
fix:
    @echo "fix: no linter or formatter configured"

# Type-check
typecheck:
    pnpm -r run typecheck

# Run tests
test:
    pnpm test

# Remove build artifacts and node_modules
clean:
    rm -rf node_modules styles/node_modules components/*/node_modules components/*/dist

# Reinstall from scratch
fresh: clean install
