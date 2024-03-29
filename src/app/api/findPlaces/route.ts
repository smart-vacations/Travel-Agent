import { NextApiResponse } from "next";

export async function POST(req: Request, res: NextApiResponse) {
  const body = await req.json();

  if (body.query === '') {
    res.status(400).json({message: 'Query parameter is required'});
    return;
  }

  const key: string = process.env.NEXT_PUBLIC_GOOGLE_KEY!;

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.priceLevel',
  
      },
      body: JSON.stringify({
        textQuery: body.query,
        languageCode: 'en',
      })
    });

    const data = await response.json();

    return Response.json(data);
  }
  catch {
    return Response.error()
  }

}