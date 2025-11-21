import yahooFinance from "yahoo-finance2";
import type { Quote } from "yahoo-finance2/esm/src/modules/quote";

export type QuoteResult = {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
};

export async function fetchQuote(symbol: string): Promise<QuoteResult> {
  const quote = (await yahooFinance.quote(
    symbol,
    {},
    { validateResult: false }
  )) as Quote | undefined;

  if (!quote || typeof quote.regularMarketPrice !== "number") {
    throw new Error(`無法取得 ${symbol} 的最新報價`);
  }

  return {
    symbol: quote.symbol ?? symbol,
    shortName: quote.shortName ?? quote.longName ?? quote.symbol ?? symbol,
    regularMarketPrice: quote.regularMarketPrice,
  };
}

