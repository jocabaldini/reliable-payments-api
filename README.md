# Reliable Payments API

A reference backend application built with NestJS and PostgreSQL to explore reliable payment processing in distributed systems.

The project focuses on practical approaches to idempotency, concurrency control, failure recovery, transactional consistency, and observability. It is being developed as a hands-on study project and as a demonstration of backend engineering decisions and trade-offs.

## Project status

Work in progress.

The initial scope includes:

- idempotent payment creation;
- safe handling of concurrent requests;
- PostgreSQL-backed idempotency records;
- request payload validation;
- replay of previously completed responses;
- detection of idempotency-key reuse with a different payload;
- recovery strategies for interrupted operations;
- automated tests for concurrency and failure scenarios.

## Tech stack

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Docker
- Jest

## Goals

This repository is intended to document not only the final implementation, but also the reasoning behind its architecture. As the project evolves, this README will include setup instructions, API examples, diagrams, testing guidance, operational considerations, known limitations, and the trade-offs behind the chosen solutions.

## License

This project is licensed under the [MIT License](LICENSE).
