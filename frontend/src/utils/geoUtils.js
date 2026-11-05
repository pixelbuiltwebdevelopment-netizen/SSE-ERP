/**
 * Geolocation & Reverse Geocoding Utilities
 */

/**
 * Acquire GPS location using the device/browser Geolocation API
 * @returns {Promise<{lat: number, lng: number, accuracy: number, address: string}>}
 */
export const getCurrentGPSLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser/device.'));
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy || 0);

        let address = '';
        try {
          // Attempt reverse geocoding via BigDataCloud
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (res.ok) {
            const data = await res.json();
            const parts = [
              data.locality,
              data.city,
              data.principalSubdivision,
              data.countryName,
            ].filter(Boolean);
            if (parts.length > 0) {
              address = parts.join(', ');
            }
          }
        } catch {
          // Fallback reverse geocoding
        }

        if (!address) {
          address = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}${accuracy ? ` (±${accuracy}m)` : ''}`;
        }

        resolve({
          lat,
          lng,
          accuracy,
          address,
        });
      },
      (error) => {
        let msg = 'Failed to retrieve GPS location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'GPS Location permission denied. Please allow location access in your browser settings to proceed.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'GPS location is unavailable. Please ensure your device GPS or Location Service is switched on.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out. Please check your signal and click Retry.';
            break;
          default:
            msg = error.message || 'Unable to acquire location.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Calculate working duration between start and stop/current timestamps
 */
export const calculateWorkingDuration = (startTime, stopTime, currentTime = Date.now()) => {
  if (!startTime) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '0 Hours 0 Minutes',
      timerDisplay: '00:00:00',
    };
  }

  const startMs = new Date(startTime).getTime();
  const endMs = stopTime ? new Date(stopTime).getTime() : currentTime;
  const diffMs = Math.max(0, endMs - startMs);

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const pad = (n) => String(n).padStart(2, '0');
  const timerDisplay = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const formatted = `${hours} Hours ${minutes} Minutes`;

  return {
    hours,
    minutes,
    seconds,
    diffMs,
    formatted,
    timerDisplay,
  };
};

/**
 * Generate Map View URL
 */
export const getMapUrl = (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
};
