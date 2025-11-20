.PHONY: help fmt test package-lambdas tf-init tf-plan tf-apply tf-destroy web-dev web-build deploy-web customer-portal-build deploy-customer-portal clean cleanup-all estimate-costs

help:
	@echo "Cloud Golden Guard - Makefile Commands"
	@echo ""
	@echo "Development:"
	@echo "  make fmt              - Format Python and TypeScript code"
	@echo "  make test             - Run all tests"
	@echo "  make web-dev          - Start Vite dev server"
	@echo ""
	@echo "Packaging:"
	@echo "  make package-lambdas  - Package Lambda functions with dependencies"
	@echo ""
	@echo "Infrastructure:"
	@echo "  make tf-init          - Initialize Terraform"
	@echo "  make tf-plan          - Plan Terraform changes"
	@echo "  make tf-apply         - Apply Terraform changes"
	@echo "  make tf-destroy       - Destroy Terraform resources"
	@echo ""
	@echo "Deployment:"
	@echo "  make web-build                - Build admin web UI for production"
	@echo "  make deploy-web               - Deploy admin web UI to S3"
	@echo "  make customer-portal-build    - Build customer portal for production"
	@echo "  make deploy-customer-portal   - Deploy customer portal to S3"
	@echo ""
	@echo "Cost Management:"
	@echo "  make estimate-costs   - Estimate current AWS costs"
	@echo "  make cleanup-all      - Destroy ALL resources (stop billing)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            - Remove build artifacts"

fmt:
	@echo "Formatting Python code..."
	cd lambdas && python -m black . || echo "black not installed, skipping"
	cd lambdas && python -m ruff check --fix . || echo "ruff not installed, skipping"
	@echo "Formatting TypeScript code..."
	cd web && npm run format || echo "npm dependencies not installed"

test:
	@echo "Running Python tests..."
	cd lambdas/scan_handler && python -m pytest tests/ -v || echo "pytest not installed or tests failed"
	cd lambdas/findings_handler && python -m pytest tests/ -v || echo "pytest not installed or tests failed"
	cd lambdas/metrics_handler && python -m pytest test_metrics.py -v || echo "pytest not installed or tests failed"
	@echo "Running TypeScript tests..."
	cd web && npm test || echo "npm dependencies not installed"

package-lambdas:
	@echo "Packaging Lambda functions..."
	@rm -rf dist/
	@mkdir -p dist
	
	@echo "Packaging scan_handler..."
	@mkdir -p dist/scan_handler_build
	@cp -r lambdas/common dist/scan_handler_build/
	@cp -r lambdas/scan_handler/*.py dist/scan_handler_build/
	@cp -r rules dist/scan_handler_build/
	@pip install -r lambdas/scan_handler/requirements.txt -t dist/scan_handler_build/ --quiet
	@cd dist/scan_handler_build && zip -r ../scan_handler.zip . -q
	@rm -rf dist/scan_handler_build

	@echo "Packaging onboarding_handler..."
	@mkdir -p dist/onboarding_handler_build
	@cp -r lambdas/common dist/onboarding_handler_build/
	@cp -r lambdas/onboarding_handler/*.py dist/onboarding_handler_build/
	@cp -r rules dist/onboarding_handler_build/
	@pip install -r lambdas/onboarding_handler/requirements.txt -t dist/onboarding_handler_build/ --quiet
	@cd dist/onboarding_handler_build && zip -r ../onboarding_handler.zip . -q
	@rm -rf dist/onboarding_handler_build
	
	@echo "Packaging findings_handler..."
	@mkdir -p dist/findings_handler_build
	@cp -r lambdas/common dist/findings_handler_build/
	@cp -r lambdas/findings_handler/*.py dist/findings_handler_build/
	@pip install -r lambdas/findings_handler/requirements.txt -t dist/findings_handler_build/ --quiet
	@cd dist/findings_handler_build && zip -r ../findings_handler.zip . -q
	@rm -rf dist/findings_handler_build
	
	@echo "Packaging authorizer..."
	@mkdir -p dist/authorizer_build
	@cp lambdas/authorizer/authorizer.py dist/authorizer_build/
	@cd dist/authorizer_build && zip -r ../authorizer.zip . -q
	@rm -rf dist/authorizer_build
	
	@echo "Packaging registration_handler..."
	@mkdir -p dist/registration_handler_build
	@cp -r lambdas/common dist/registration_handler_build/
	@cp lambdas/registration_handler/app.py dist/registration_handler_build/
	@cd dist/registration_handler_build && zip -r ../registration_handler.zip . -q
	@rm -rf dist/registration_handler_build
	
	@echo "Packaging customers_handler..."
	@mkdir -p dist/customers_handler_build
	@cp lambdas/customers_handler/app.py dist/customers_handler_build/
	@cd dist/customers_handler_build && zip -r ../customers_handler.zip . -q
	@rm -rf dist/customers_handler_build
	
	@echo "Packaging resources_handler..."
	@mkdir -p dist/resources_handler_build
	@cp -r lambdas/common dist/resources_handler_build/
	@cp lambdas/resources_handler/app.py dist/resources_handler_build/
	@cd dist/resources_handler_build && zip -r ../resources_handler.zip . -q
	@rm -rf dist/resources_handler_build
	
	@echo "Packaging metrics_handler..."
	@mkdir -p dist/metrics_handler_build
	@cp -r lambdas/common dist/metrics_handler_build/
	@cp lambdas/metrics_handler/app.py dist/metrics_handler_build/
	@cd dist/metrics_handler_build && zip -r ../metrics_handler.zip . -q
	@rm -rf dist/metrics_handler_build
	
	@echo "Lambda packages created in dist/"

tf-init:
	@echo "Initializing Terraform..."
	cd infra && terraform init

tf-plan: package-lambdas
	@echo "Planning Terraform changes..."
	cd infra && terraform plan

tf-apply: package-lambdas
	@echo "Applying Terraform changes..."
	cd infra && terraform apply

tf-destroy:
	@echo "Destroying Terraform resources..."
	@echo "Emptying S3 buckets (including versions)..."
	@cd infra && for bucket in $$(terraform state list | grep 'aws_s3_bucket\.' | grep -v policy | grep -v versioning | grep -v public_access | grep -v encryption | grep -v website | grep -v server_side); do \
		bucket_name=$$(terraform state show $$bucket 2>/dev/null | grep -E "^\s*bucket\s*=" | head -1 | cut -d'"' -f2); \
		if [ -n "$$bucket_name" ]; then \
			echo "Emptying $$bucket_name..."; \
			aws s3 rm s3://$$bucket_name --recursive 2>/dev/null || true; \
			echo "Deleting all versions in $$bucket_name..."; \
			python3 -c "import boto3; s3=boto3.resource('s3'); bucket=s3.Bucket('$$bucket_name'); bucket.object_versions.all().delete()" 2>/dev/null || true; \
		fi; \
	done
	@echo "Running terraform destroy..."
	cd infra && terraform destroy

web-dev:
	@echo "Starting Vite dev server..."
	@echo "Make sure to set VITE_API_URL and VITE_API_KEY in web/.env"
	cd web && npm run dev

web-build:
	@echo "Building web UI..."
	cd web && npm run build

deploy-web: web-build
	@echo "Deploying web UI to S3..."
	@echo "Getting bucket name from Terraform..."
	$(eval WEB_BUCKET := $(shell cd infra && terraform output -raw web_bucket 2>/dev/null || echo ""))
	@if [ -z "$(WEB_BUCKET)" ]; then \
		echo "Error: Could not get web bucket name from Terraform"; \
		exit 1; \
	fi
	@echo "Deploying to bucket: $(WEB_BUCKET)"
	aws s3 sync web/dist/ s3://$(WEB_BUCKET)/ --delete
	@echo "Web UI deployed successfully"

customer-portal-build:
	@echo "Building customer portal..."
	cd customer-portal && npm run build

deploy-customer-portal: customer-portal-build
	@echo "Deploying customer portal to S3..."
	@echo "Getting bucket name from Terraform..."
	$(eval CUSTOMER_PORTAL_BUCKET := $(shell cd infra && terraform output -raw customer_portal_bucket 2>/dev/null || echo ""))
	@if [ -z "$(CUSTOMER_PORTAL_BUCKET)" ]; then \
		echo "Error: Could not get customer portal bucket name from Terraform"; \
		echo "Make sure customer portal infrastructure is uncommented in infra/customers.tf"; \
		exit 1; \
	fi
	@echo "Deploying to bucket: $(CUSTOMER_PORTAL_BUCKET)"
	aws s3 sync customer-portal/dist/ s3://$(CUSTOMER_PORTAL_BUCKET)/ --delete
	@echo "Customer portal deployed successfully"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf web/dist/
	rm -rf web/node_modules/
	rm -rf customer-portal/dist/
	rm -rf customer-portal/node_modules/
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	@echo "Clean complete"

cleanup-all:
	@echo "Running complete cleanup (destroys all AWS resources)..."
	@bash cleanup-scripts/cleanup-all.sh

estimate-costs:
	@echo "Estimating AWS costs..."
	@bash scripts/estimate-costs.sh
