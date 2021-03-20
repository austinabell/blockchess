build:
	cd contract && cargo build --target wasm32-unknown-unknown --release
	cp contract/target/wasm32-unknown-unknown/release/rust_counter_tutorial.wasm ./out/main.wasm

deploy-contract:
	near deploy

deploy-pages:
	cd frontend && yarn deploy

deploy: build deploy-contract

deploy-dev: build
	near dev-deploy

frontend-deps:
	cd frontend && yarn

start-frontend: frontend-deps
	cd frontend && yarn start

start: deploy start-frontend

test-cargo: cd contract && cargo test -- --nocapture

test-frontend:
	cd frontend && yarn test

test: build test-cargo test-frontend
	

.PHONY: build deploy-contract deploy-pages deploy deploy-dev start-frontend start test-cargo test-frontend test