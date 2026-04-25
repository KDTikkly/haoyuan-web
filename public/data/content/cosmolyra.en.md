# Cosmolyra — Multi-Agent Simulation & Trading Platform

## Background

Cosmolyra is an experimental platform that deeply integrates large language models (LLMs) with blockchain smart contracts. The core premise: **let AI agents compete with real stakes on-chain** — each agent operates with its own decision strategy, interacts through DeFi protocols, and simulates the cooperative-competitive dynamics of multi-party participants in a macro market.

## Core Modules

### 1. Agent Decision Engine
- Multi-agent framework powered by GPT-4o / Claude 3
- Each agent is configured with an independent "risk-preference personality" and memory window
- Supports Chain-of-Thought (CoT) reasoning trace visualization

### 2. On-Chain Interaction Layer
- Integrates Ethers.js with Solidity smart contracts
- Agents can execute: Swap, liquidity provision, limit orders, and more
- All on-chain actions are indexed in real time via The Graph

### 3. Simulation Sandbox
- Forks mainnet state for isolated local simulation
- "Stress test" mode: inject black-swan events and observe agent group responses

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI    | LangChain · OpenAI API · Anthropic |
| On-Chain | Solidity · Hardhat · The Graph |
| Backend | Node.js · FastAPI |
| Frontend | React · Viem · RainbowKit |

## Current Status

- [x] Agent framework MVP
- [x] Local sandbox simulation
- [ ] Mainnet deployment (Q3 2026)
- [ ] Multi-chain support

## Outlook

Exploring AI × Web3 native application scenarios, delivering a more autonomous participant model for decentralized markets.
