import { useGameStore } from '../game/gameStore';
import type { TimeMode, WeatherMode } from '../types/game';
import { KidButton } from './KidButton';

const TIME_OPTIONS: Array<{ id: TimeMode; label: string }> = [
  { id: 'cycle', label: '🌗 Day and night' },
  { id: 'day', label: '☀️ Always day' },
  { id: 'night', label: '🌙 Always night' },
];

const WEATHER_OPTIONS: Array<{ id: WeatherMode; label: string }> = [
  { id: 'sunny', label: '😎 Sunny' },
  { id: 'rain', label: '🌧️ Rain' },
  { id: 'snow', label: '❄️ Snowfall' },
];

/** Time-of-day and weather toggles for the menu. */
export function WorldSettings() {
  const timeMode = useGameStore((state) => state.timeMode);
  const weather = useGameStore((state) => state.weather);
  const setTimeMode = useGameStore((state) => state.setTimeMode);
  const setWeather = useGameStore((state) => state.setWeather);

  return (
    <>
      <div className="setting-group" role="group" aria-label="Time of day">
        <h3>Sky and time</h3>
        {TIME_OPTIONS.map((option) => (
          <KidButton
            key={option.id}
            tone={timeMode === option.id ? 'primary' : 'default'}
            aria-pressed={timeMode === option.id}
            onClick={() => setTimeMode(option.id)}
          >
            {option.label}
          </KidButton>
        ))}
      </div>
      <div className="setting-group" role="group" aria-label="Weather">
        <h3>Weather</h3>
        {WEATHER_OPTIONS.map((option) => (
          <KidButton
            key={option.id}
            tone={weather === option.id ? 'primary' : 'default'}
            aria-pressed={weather === option.id}
            onClick={() => setWeather(option.id)}
          >
            {option.label}
          </KidButton>
        ))}
      </div>
    </>
  );
}
