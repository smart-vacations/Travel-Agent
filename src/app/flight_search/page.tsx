'use client'

import { useState, useEffect } from 'react';

interface LocationData {
    from: string;
    to: string;
}



export default async function Page() {
    const [data, setData] = useState<LocationData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const response = await fetch('https://.../location_search/Boston/Chicago/2023-11-06');
            console.log(response);
            const data = await response.json();
            setData(data);
        }
        fetchData().catch(console.error);
    }, []);
   
    return (
        <div>
            {data ? (
                <h1>
                    From {data.from} to {data.to}
                </h1>
            ) : (
                <h1>Loading...</h1>
            )}
        </div>
    );
}