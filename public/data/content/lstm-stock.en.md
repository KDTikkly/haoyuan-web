# Portfolio LSTM AI Forecasting

## Project Goal

Build an **LSTM (Long Short-Term Memory)** based multi-asset portfolio forecasting system. The goal is not to precisely predict individual stock movements, but to optimize the Sharpe ratio and control maximum drawdown at the portfolio level.

## Methodology

### Feature Engineering
- Technical: MA5/10/20, MACD, RSI, Bollinger Band Width
- Fundamental: PE-TTM, ROE, YoY revenue growth
- Sentiment: Northbound fund net inflow, margin balance change

### Model Architecture
```
Input (60 days × N features)
       ↓
LSTM Layer 1 (256 units, return_sequences=True)
       ↓
Dropout (0.3)
       ↓
LSTM Layer 2 (128 units)
       ↓
Dense (64) → ReLU
       ↓
Output: Next-day return prediction
```

### Backtesting Framework
- Rolling training window: 252 trading days
- Position strategy: Multi-factor scoring → Top-K equal-weight portfolio
- Transaction cost: 0.15% round-trip (including stamp duty)

## Backtesting Results

| Metric | Strategy | CSI 300 Benchmark |
|--------|----------|-------------------|
| Annualized Return | 23.4% | 8.1% |
| Sharpe Ratio | 1.42 | 0.61 |
| Max Drawdown | -18.3% | -31.5% |
| Calmar Ratio | 1.28 | 0.26 |

> ⚠️ Historical backtest results. Not financial advice.

## Tech Stack

`Python` · `PyTorch` · `Tushare API` · `Backtrader` · `Plotly`
