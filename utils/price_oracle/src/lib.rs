use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::error::Error;

/// Represents a price in USD with 6 decimal precision (lamports-style)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Price {
    pub symbol: String,
    pub price_usd: u64, // Price in USD * 1_000_000 (6 decimals)
    pub timestamp: i64,
}

/// Fetches the current price of SOL in USD from CoinGecko API
/// Returns price in USD with 6 decimal precision (e.g., $50.00 = 50_000_000)
pub fn fetch_sol_price() -> Result<u64, Box<dyn Error>> {
    let client = Client::new();
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
    
    let response = client
        .get(url)
        .header("User-Agent", "Solana Options Escrow DApp")
        .send()?;
    
    let json: serde_json::Value = response.json()?;
    
    let price_float = json["solana"]["usd"]
        .as_f64()
        .ok_or("Failed to parse SOL price")?;
    
    // Convert to 6 decimal precision (e.g., 50.123456 -> 50_123_456)
    let price_lamports = (price_float * 1_000_000.0) as u64;
    
    Ok(price_lamports)
}

/// Fetches the current price of a stock symbol from Alpha Vantage API
/// Note: You need to set ALPHA_VANTAGE_API_KEY environment variable
/// Get free API key from: https://www.alphavantage.co/support/#api-key
pub fn fetch_stock_price(symbol: &str) -> Result<u64, Box<dyn Error>> {
    let api_key = std::env::var("ALPHA_VANTAGE_API_KEY")
        .unwrap_or_else(|_| "demo".to_string());
    
    let client = Client::new();
    let url = format!(
        "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={}&apikey={}",
        symbol, api_key
    );
    
    let response = client
        .get(&url)
        .header("User-Agent", "Solana Options Escrow DApp")
        .send()?;
    
    let json: serde_json::Value = response.json()?;
    
    // Alpha Vantage returns data in "Global Quote" field
    let price_str = json["Global Quote"]["05. price"]
        .as_str()
        .ok_or(format!("Failed to parse {} price. Check API key or rate limits.", symbol))?;
    
    let price_float: f64 = price_str.parse()?;
    
    // Convert to 6 decimal precision
    let price_lamports = (price_float * 1_000_000.0) as u64;
    
    Ok(price_lamports)
}

/// Fetches historical stock price for a specific date using Alpha Vantage
/// Date format: YYYY-MM-DD
pub fn fetch_historical_stock_price(symbol: &str, date: &str) -> Result<u64, Box<dyn Error>> {
    let api_key = std::env::var("ALPHA_VANTAGE_API_KEY")
        .unwrap_or_else(|_| "demo".to_string());
    
    let client = Client::new();
    let url = format!(
        "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={}&apikey={}",
        symbol, api_key
    );
    
    let response = client
        .get(&url)
        .header("User-Agent", "Solana Options Escrow DApp")
        .send()?;
    
    let json: serde_json::Value = response.json()?;
    
    // Get the closing price for the specific date
    let price_str = json["Time Series (Daily)"][date]["4. close"]
        .as_str()
        .ok_or(format!("Failed to get historical price for {} on {}", symbol, date))?;
    
    let price_float: f64 = price_str.parse()?;
    let price_lamports = (price_float * 1_000_000.0) as u64;
    
    Ok(price_lamports)
}

/// Mock function for testing - returns simulated prices for AAPL
/// This is useful for testing without API dependencies
pub fn mock_aapl_price(date: &str) -> Result<u64, Box<dyn Error>> {
    // Simulated AAPL prices for August-September 2025
    let prices = match date {
        "2025-08-01" => 225.50,  // Initial price
        "2025-08-05" => 228.75,  // Small gain
        "2025-08-10" => 223.25,  // Small loss
        "2025-08-15" => 230.50,  // Recovery
        "2025-08-20" => 235.00,  // Strong gain
        "2025-08-25" => 232.50,  // Slight pullback
        "2025-08-30" => 238.75,  // Near expiry gain
        "2025-09-01" => 240.00,  // Expiry price
        _ => 225.50,  // Default
    };
    
    Ok((prices * 1_000_000.0) as u64)
}

/// Mock function for testing - returns simulated SOL prices
pub fn mock_sol_price(date: &str) -> Result<u64, Box<dyn Error>> {
    // Simulated SOL prices for August-September 2025
    let prices = match date {
        "2025-08-01" => 150.00,  // Initial price
        "2025-08-05" => 152.50,
        "2025-08-10" => 148.00,
        "2025-08-15" => 155.00,
        "2025-08-20" => 160.00,
        "2025-08-25" => 157.50,
        "2025-08-30" => 162.00,
        "2025-09-01" => 165.00,  // Expiry price
        _ => 150.00,  // Default
    };
    
    Ok((prices * 1_000_000.0) as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_prices() {
        let aapl_price = mock_aapl_price("2025-08-01").unwrap();
        assert_eq!(aapl_price, 225_500_000); // $225.50 in lamports
        
        let sol_price = mock_sol_price("2025-08-01").unwrap();
        assert_eq!(sol_price, 150_000_000); // $150.00 in lamports
    }
    
    #[test]
    fn test_price_ratio() {
        let aapl = mock_aapl_price("2025-08-01").unwrap();
        let sol = mock_sol_price("2025-08-01").unwrap();
        
        // AAPL/SOL = 225.50 / 150.00 = 1.503333
        let ratio = (aapl as f64) / (sol as f64);
        assert!((ratio - 1.503333).abs() < 0.001);
    }
}
