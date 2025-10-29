import React, { forwardRef, useState, useRef, useEffect } from 'react'
import { FiMapPin } from 'react-icons/fi'
import styles from './LocationFilter.module.css'

interface LocationFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const LocationFilter = forwardRef<HTMLInputElement, LocationFilterProps>(({
  value,
  onChange,
  placeholder = "Filter by location",
  ...props
}, ref) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const popularLocations = [
    'Manila',
    'Quezon City',
    'Makati',
    'Taguig',
    'Pasig',
    'Cebu City',
    'Davao City',
    'Iloilo City',
    'Baguio',
    'Cagayan de Oro',
    'Batangas',
    'Cavite',
    'Alabang',
    'Laguna'
  ];

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (location: string) => {
    onChange(location);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.locationFilterContainer} ref={containerRef}>
      <div className={styles.locationFilter}>
        <FiMapPin className={styles.locationIcon} aria-hidden="true" />
        <input 
          ref={ref}
          type="text" 
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleInputFocus}
          className={styles.locationInput}
          aria-label={placeholder}
          {...props}
        />
      </div>
      
      {showSuggestions && (
        <div className={styles.suggestionsDropdown}>
          {popularLocations
            .filter(location => 
              !value || location.toLowerCase().includes(value.toLowerCase())
            )
            .map((location, index) => (
              <button
                key={index}
                type="button"
                className={styles.suggestionItem}
                onClick={() => handleSuggestionClick(location)}
              >
                <FiMapPin className={styles.suggestionIcon} />
                {location}
              </button>
            ))}
        </div>
      )}
    </div>
  )
})

LocationFilter.displayName = 'LocationFilter';

export default LocationFilter
