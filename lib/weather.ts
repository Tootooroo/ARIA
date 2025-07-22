//NOT USED RIGHT NOW
import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

export function detectWeatherQuery(input: string): boolean {
    const patterns = [
        /\bweather\b/i,
        /\btemperature\b/i,
        /\brain\b/i,
        /\bsnow\b/i,
        /\bsunny\b/i,
        /\bcloudy\b/i,
        /\bforecast\b/i,
        /\bhow (hot|cold)\b/i,
        /\bhumid\b/i,
        /\bwindy\b/i,
      ];      
    return patterns.some((regex) => regex.test(input));
}

export async function fetchWeatherData(userMessage: string): Promise<string> {
    // Try to extract city from input like "in San Francisco"
    let location = 'San Francisco'; // Default fallback
    const locationMatch = userMessage.match(/\b(?:in|at|for)\s+([a-zA-Z\s]+?)(?:\s+today|\s+now|\b|$)/i);
    if (locationMatch?.[1]) {
      location = locationMatch[1].trim();
    }
  
    if (!OPENWEATHER_API_KEY) {
      return '⚠️ Weather service is not configured properly.';
    }
  
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
  
      const data = response.data;
      const desc = data.weather[0].description;
      const temp = data.main.temp;
      const feels = data.main.feels_like;
      const humidity = data.main.humidity;
  
      return `In ${data.name}, it's currently ${desc} with a temperature of ${temp}°C (feels like ${feels}°C). Humidity is at ${humidity}%.`;
    } catch (error: any) {
      console.error('Weather Fetch Error:', error?.response?.data || error.message);
      return `❌ I couldn't get the weather for "${location}". Try another location.`;
    }
  }