# Developer shortcuts, named after GitHub's "Scripts to Rule Them All" convention:
# `bootstrap` installs what the project needs, `setup` prepares a fresh clone, then `dev` / `test`.
#
# Every Node command runs with the version pinned in .nvmrc when nvm is installed, so no manual
# `nvm use` is needed. Without nvm, the Node on PATH is used and npm's `engines` check rejects an
# older one. Written for the GNU Make 3.81 shipped with macOS.

SHELL := /bin/bash
.DEFAULT_GOAL := help

NODE_VERSION := $(shell cat .nvmrc)
NVM_DIR ?= $(HOME)/.nvm
# nvm installed by its script, or by Homebrew (Apple Silicon or Intel).
NVM_SH := $(firstword $(wildcard $(NVM_DIR)/nvm.sh /opt/homebrew/opt/nvm/nvm.sh /usr/local/opt/nvm/nvm.sh))

# Recipe prefix: loads nvm and switches to the pinned version (nothing happens without nvm).
NODE = $(if $(NVM_SH),. "$(NVM_SH)" --no-use && { nvm use --silent >/dev/null || { echo "Node $(NODE_VERSION) is not installed: run 'make bootstrap'." >&2; exit 1; }; } &&,)

.PHONY: help node bootstrap setup dev build start lint typecheck format check test test-watch \
	test-coverage test-e2e test-e2e-ui ci clean

help: ## List the available commands
	@echo "Usage: make <command>"
	@echo
	@awk 'BEGIN { FS = ":.*## " } /^[a-z0-9-]+:.*## / { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

node: ## Install the Node version pinned in .nvmrc (with nvm) and show the one in use
ifneq ($(NVM_SH),)
	@. "$(NVM_SH)" --no-use && { nvm use --silent >/dev/null 2>&1 || nvm install --no-progress; } && \
		echo "Node $$(node --version) (npm $$(npm --version))"
else
	@echo "nvm was not found: Node $(NODE_VERSION) has to be installed manually (https://github.com/nvm-sh/nvm)." >&2
	@node --version
endif

bootstrap: node ## Install everything the project needs: Node, npm dependencies, Playwright browsers
	@$(NODE) npm ci
	@$(NODE) npx playwright install chromium webkit

setup: bootstrap ## First run after cloning: bootstrap, plus a local env file from .env.example
	@if [ -f .env.local ]; then echo ".env.local already exists, it was left untouched."; \
	else cp .env.example .env.local && echo "Created .env.local from .env.example."; fi
	@echo "Ready: 'make dev' starts the app at http://localhost:3000."

dev: ## Start the dev server (http://localhost:3000, and the LAN address for phones)
	@$(NODE) npm run dev

build: ## Create a production build
	@$(NODE) npm run build

start: ## Serve the production build
	@$(NODE) npm run start

lint: ## Run ESLint
	@$(NODE) npm run lint

typecheck: ## Generate route types and type-check the project
	@$(NODE) npm run typecheck

format: ## Format every file with Prettier
	@$(NODE) npm run format

check: ## Run the fast checks: lint, types, formatting and unit tests
	@$(NODE) npm run lint && npm run typecheck && npm run format:check && npm test

test: ## Run the unit and component tests
	@$(NODE) npm test

test-watch: ## Run the unit and component tests in watch mode
	@$(NODE) npm run test:watch

test-coverage: ## Run the unit and component tests with coverage (coverage/)
	@$(NODE) npm run test:coverage

test-e2e: ## Run the E2E tests against a fresh production build
	@$(NODE) npm run test:e2e

test-e2e-ui: ## Run the E2E tests in Playwright's UI mode
	@$(NODE) npm run test:e2e:ui

ci: check test-e2e ## Run everything the CI pipeline runs

clean: ## Remove build output, test reports and caches
	rm -rf .next coverage playwright-report test-results tsconfig.tsbuildinfo
