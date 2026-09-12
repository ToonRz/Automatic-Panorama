PYTHON ?= python3
PIP ?= $(PYTHON) -m pip

.PHONY: install backend-install frontend-install test lint typecheck frontend-build run-backend run-frontend

install: backend-install frontend-install

backend-install:
	$(PIP) install -r requirements.txt -r backend/requirements-dev.txt

frontend-install:
	cd frontend && npm install

test:
	PYTHONPATH=backend $(PYTHON) -m pytest -q
	cd frontend && npm test

lint:
	$(PYTHON) -m ruff check backend/app

typecheck:
	$(PYTHON) -m mypy backend/app

frontend-build:
	cd frontend && npm run build

run-backend:
	PYTHONPATH=backend $(PYTHON) -m uvicorn app.main:app --reload --port 8000

run-frontend:
	cd frontend && npm run dev
