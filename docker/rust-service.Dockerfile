FROM rust:1.89-bookworm AS builder

ARG SERVICE_BIN

WORKDIR /workspace/backend/rust

COPY backend/rust/Cargo.toml ./
COPY backend/rust/crates/common/Cargo.toml ./crates/common/Cargo.toml
COPY backend/rust/crates/categorization-service/Cargo.toml ./crates/categorization-service/Cargo.toml
COPY backend/rust/crates/rag-service/Cargo.toml ./crates/rag-service/Cargo.toml
COPY backend/rust/crates ./crates

RUN cargo build --release --package ${SERVICE_BIN}

FROM debian:bookworm-slim

ARG SERVICE_BIN

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /workspace/backend/rust/target/release/${SERVICE_BIN} /usr/local/bin/service

CMD ["/usr/local/bin/service"]
