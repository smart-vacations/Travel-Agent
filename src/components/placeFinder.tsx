//component that calls google places API to render a list of POI
//TODO: move interfaces to model files
import React, { useState, FormEvent, ChangeEvent } from 'react';

interface ApiResponse {
  places: PlaceData[];
}

interface DisplayName {
  text: string | undefined;
  languageCode?: string | undefined;
}

interface PlaceData {
  displayName: DisplayName | undefined;
  formattedAddress: string | undefined;
  Id: string | undefined;
  priceLevel: string | undefined;
  rating: number | undefined;
}

const PlaceFinder: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [places, setPlaces] = useState<PlaceData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlace = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/findPlaces', {
        method: 'POST',
        body: JSON.stringify({query: query})
      });


      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data: ApiResponse = await response.json();
      const places: PlaceData[] = data.places;

      setPlaces(places);
    }
    catch (err: any) {
      setError(err.message);
    }
    finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query) {
      fetchPlace();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type='text'
          value={query}
          onChange={handleInputChange}
          placeholder='Search for a place'
        />
      </form>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {places && places?.length > 0 && (
        <div>
          {places?.map((place, index) => (
            <div key={index}>
              <p>{place.displayName?.text}</p>
              {/* <p>{place.Id}</p>
              <p>{place.rating}</p> */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaceFinder