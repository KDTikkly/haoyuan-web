# Cosmolyra — 多智能体模拟与交易平台

## 项目背景

Cosmolyra 是一个将大型语言模型（LLM）与区块链智能合约深度融合的实验性平台。核心命题是：**让 AI Agent 在链上真实博弈**——每个 Agent 拥有独立的决策策略，通过 DeFi 协议交互，模拟宏观市场中多方参与者的竞合关系。

## 核心模块

### 1. Agent 决策引擎
- 基于 GPT-4o / Claude 3 驱动的多 Agent 框架
- 每个 Agent 配置独立的"风险偏好人格"与记忆窗口
- 支持 CoT（Chain-of-Thought）推理链路可视化

### 2. 链上交互层
- 集成 Ethers.js 与 Solidity 合约
- Agent 可执行：Swap、流动性提供、限价委托等操作
- 所有链上行为实时记录至 The Graph 索引

### 3. 模拟沙箱
- Fork 主网状态进行本地隔离模拟
- 支持"压力测试"模式：注入黑天鹅事件观察 Agent 群体反应

## 技术栈

| 层级 | 技术 |
|------|------|
| AI   | LangChain · OpenAI API · Anthropic |
| 链上 | Solidity · Hardhat · The Graph |
| 后端 | Node.js · FastAPI |
| 前端 | React · Viem · RainbowKit |

## 当前阶段

- [x] Agent 框架 MVP
- [x] 本地沙箱模拟
- [ ] 主网部署（Q3 2026）
- [ ] 多链支持

## 展望

探索 AI × Web3 原生应用场景，为去中心化市场提供更具自主性的参与者模型。
