import React, { createContext, useContext, useState, ReactNode } from 'react';
import Beach from '../interfaces/Beach';

// Types
interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m: number[];
    uv_index: number[];
  };
  hourly_units: {
    temperature_2m: string;
    uv_index: string;
  };
}

// Constante pour le nombre de jours à afficher
const DAYS_TO_DISPLAY = 7;
const HOURS_PER_DAY = 24;
const TOTAL_HOURS = DAYS_TO_DISPLAY * HOURS_PER_DAY;

interface WeatherContextType {
  hours: Date[];
  temperatures: number[];
  uvIndices: number[];
  tempUnit: string;
  isLoading: boolean;
  error: string | null;
  fetchWeatherData: (location: Beach) => Promise<void>;
}

// Create context with default values
const WeatherContext = createContext<WeatherContextType>({
  hours: [],
  temperatures: [],
  uvIndices: [],
  tempUnit: '°C',
  isLoading: false,
  error: null,
  fetchWeatherData: async () => { },
});

// Custom hook to use the context
export const useWeather = () => useContext(WeatherContext);

// Provider component
interface WeatherProviderProps {
  children: ReactNode;
}

export const WeatherProvider: React.FC<WeatherProviderProps> = ({ children }) => {
  const [hours, setHours] = useState<Date[]>([]);
  const [temperatures, setTemperatures] = useState<number[]>([]);
  const [uvIndices, setUvIndices] = useState<number[]>([]);
  const [tempUnit, setTempUnit] = useState<string>('°C');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherData = async (location: Beach) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=temperature_2m,uv_index&timezone=auto&forecast_days=${DAYS_TO_DISPLAY}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json() as WeatherData;

      // Obtenir la date courante et réinitialiser à minuit (00h00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Parse the API time strings to Date objects
      const apiTimes = data.hourly.time.map(timeStr => new Date(timeStr));

      // Generate hours for all days
      const hoursList: Date[] = [];
      const tempsList: number[] = [];
      const uvList: number[] = [];

      // Generate dates for each day at each hour (7 days * 24 hours)
      for (let day = 0; day < DAYS_TO_DISPLAY; day++) {
        for (let hourOfDay = 0; hourOfDay < HOURS_PER_DAY; hourOfDay++) {
          const targetHour = new Date(today);
          targetHour.setHours(hourOfDay);
          targetHour.setDate(today.getDate() + day);
          hoursList.push(targetHour);

          // Find the closest matching time in the API data
          const closestTimeIndex = apiTimes.findIndex(apiTime => {
            return apiTime.getHours() === targetHour.getHours() &&
              apiTime.getDate() === targetHour.getDate() &&
              apiTime.getMonth() === targetHour.getMonth();
          });

          // Add corresponding temperature and UV data
          if (closestTimeIndex !== -1) {
            tempsList.push(data.hourly.temperature_2m[closestTimeIndex]);
            uvList.push(data.hourly.uv_index[closestTimeIndex]);
          } else {
            // Fallback if no matching time is found
            tempsList.push(0);
            uvList.push(0);
          }
        }
      }

      setHours(hoursList);
      setTemperatures(tempsList);
      setUvIndices(uvList);
      setTempUnit(data.hourly_units.temperature_2m);
      setIsLoading(false);

    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');

      // Fallback if API fails - generate hours without weather data
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Generate dates for full 7 days from midnight
      const hoursList = Array.from({ length: TOTAL_HOURS }, (_, i) => {
        const hourDate = new Date(today);
        const day = Math.floor(i / 24);
        const hour = i % 24;
        hourDate.setDate(hourDate.getDate() + day);
        hourDate.setHours(hour);
        return hourDate;
      });
      setHours(hoursList);
      setIsLoading(false);
    }
  };

  const value = {
    hours,
    temperatures,
    uvIndices,
    tempUnit,
    isLoading,
    error,
    fetchWeatherData
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};