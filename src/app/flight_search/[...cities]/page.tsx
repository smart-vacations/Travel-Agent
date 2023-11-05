import { NextResponse } from 'next/server';
var Amadeus = require('amadeus');

var amadeus = new Amadeus({
    clientId: process.env.API_Key,
    clientSecret: process.env.API_Secret
});

const sleep = (delay: number | undefined) => new Promise((resolve) => setTimeout(resolve, delay))


interface Location {  
    start: string;
    finish: string;
}

interface FlightData {
    flights: any[];
    flight_data: Location;
}

interface FlightDetails {
    airlineName: string;
    airportName: string;
    arrivalTime: string;
    departureTime: string;
    flightNumber: string;
    layoverLength: string | null;
}

async function city(origin: string, destination: string) {
    sleep(250);
    const start: String = await amadeus.referenceData.locations
        .get({
            keyword: origin,
            subType: Amadeus.location.any,
        })
        .then(function (response: { result: any; }) {
            for (let i = 0; i < response.result.data.length; i++) {
                if (response.result.data[i].subType == 'AIRPORT') {
                    return response.result.data[i].iataCode;
                }
            }
        })
        .catch(function (response: any) {
            return response;
        });
    sleep(250);
    const finish: String = await amadeus.referenceData.locations
        .get({
            keyword: destination,
            subType: Amadeus.location.any,
        })
        .then(function (response: { result: any; }) {
            for (let i = 0; i < response.result.data.length; i++) {
                if (response.result.data[i].subType == 'AIRPORT') {
                    return response.result.data[i].iataCode;
                }
            }
        })
        .catch(function (response: any) {
            return response;
        });
    let results: Location = {start: start.toString(), finish: finish.toString()};
    return results;
}

async function flight(location: Location, departureDate: string, returnDate?: string)    {
    sleep(250);
    const departureFlight = amadeus.shopping.flightOffersSearch.get({
        originLocationCode: location.start,
        destinationLocationCode: location.finish,
        departureDate: departureDate,
        adults: '1',
        max: '3'
    }).then(function(response: { result: any; }) {
        console.log(response.result.data[0]);
        return response.result.data[0];
    }).catch(function(response: any) {
        console.log(response);
    });

    if (returnDate) {
        sleep(250);
        const returnFlight = amadeus.shopping.flightOffersSearch.get({
            originLocationCode: location.finish,
            destinationLocationCode: location.start,
            departureDate: returnDate,
            adults: '1',
            max: '3'
        }).then(function(response: { result: any; }) {
            console.log(response.result.data[0]);
            return response.result.data[0];
        }).catch(function(response: any) {
            console.log(response);
        });
        const flightOffers = await Promise.all([departureFlight, returnFlight]);

        return flightOffers;
    }

    return departureFlight;
}

async function confirm(flight: any) {
    sleep(250);
    const flightConfirm = amadeus.shopping.flightOffersSearch.post(
        JSON.stringify({
            'data': {
                'type': 'flight-offers-pricing',
                'flightOffers': [flight],
            }
        })
    ).then(function(response: { result: any; }) {
        console.log(response.result.data[0]);
        return response.result.data[0];
    }).catch(function(response: any) {
        console.log(response);
    });
    return flightConfirm;
}

async function getAirportName(iataCode: string) {
    sleep(250);
    const res = await amadeus.referenceData.locations.get({
        keyword: iataCode,
        subType: 'AIRPORT,CITY'
    }).then(function (response: { result: any; }) {
        if (response.result.data.length > 0) {
            const airport = response.result.data[0].name;
            const city = response.result.data[0].address.cityName;
            return { airport, city };
        } else {
            return { airport: '', city: '' };
        }
    }).catch(function (response: any) {
        console.log(response);
        return { airport: '', city: '' };
    });
    return `${res.airport} (${res.city})`
}

async function getAirlineName(iataCode: string) {
    sleep(250);
    const res = await amadeus.referenceData.airlines.get({
        airlineCodes: iataCode
    }).then(function (response: { result: any; }) {
        if (response.result.data.length > 0) {
            return response.result.data[0].businessName;
        } else {
            return '';
        }
    }).catch(function (response: any) {
        console.log(response);
        return '';
    });
    return res;
}

function getTotalPrice(flights: any[]) {
    let totalPrice = 0;
    flights.forEach((flight) => {
        totalPrice += parseInt(flight.price.total);
    });
    return totalPrice;
}

function getCurrency(flights: any[]) {
    return flights[0].price.currency;
}

function convertToHoursAndMinutes(duration: number) {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
}

function getTotalDuration(segments: any[]) {
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const totalDurationInMinutes = Math.round((Number(new Date(lastSegment.arrival.at)) - Number(new Date(firstSegment.departure.at))) / (1000 * 60));
    return convertToHoursAndMinutes(totalDurationInMinutes);
}

function getLayoverLength(segment1: any, segment2: any) {
    const layoverLengthInMinutes = Math.round((Number(new Date(segment2.departure.at)) - Number(new Date(segment1.arrival.at))) / (1000 * 60));
    return convertToHoursAndMinutes(layoverLengthInMinutes);
}

async function getFlightDetails(flight: any): Promise<FlightDetails[]> {
    const flightDetails: FlightDetails[] = [];
    for (let i = 0; i < flight.itineraries[0].segments.length; i++) {
        const segment = flight.itineraries[0].segments[i];
        const airlineName = await getAirlineName(segment.carrierCode);
        const departureTime = segment.departure.at;
        const arrivalTime = segment.arrival.at;
        const airportName = await getAirportName(segment.departure.iataCode);
        const flightNumber = segment.number;
        const layoverLength = i < flight.itineraries[0].segments.length - 1 ? getLayoverLength(segment, flight.itineraries[0].segments[i + 1]) : null;
        flightDetails.push({ airlineName, airportName, arrivalTime, departureTime, flightNumber, layoverLength });
    }
    return flightDetails;
}

async function getFlightData(params: { cities: string[] }): Promise<FlightData> {
    const flight_data = await city(params.cities[0], params.cities[1]).then(function(response: Location) {
        if (params.cities.length == 4) {
            return flight(response, params.cities[2], params.cities[3]);
        }
        return flight(response, params.cities[2]);
    });
    const [flights] = await Promise.all([flight_data]);
    return { flights, flight_data };
}

export default async function Page({ params }: { params: { cities: string[] } }) {
    const { flights, flight_data } = await getFlightData(params);
    const totalPrice = getTotalPrice(flights);
    const currency = getCurrency(flights);
    const flightDetails = await Promise.all(flights.map((flight: any) => getFlightDetails(flight)));

    return (
        <>
            <div className="fixed top-0 w-full z-50">
                <div className="bg-blue-500 text-white p-4">
                    <p className="text-lg font-bold">
                        Total cost: {totalPrice} {currency}
                    </p>
                </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
                {flight_data ? (
                    <>
                        {flights.map((flight: any, index: number) => (
                            <div key={index} className="bg-blue-200 rounded-lg overflow-hidden text-gray-700">
                                <div className="px-6 py-4">
                                    <div className="font-bold text-xl mb-2">From {index === 0 ? params.cities[0] : params.cities[1]} to {index === 0 ? params.cities[1] : params.cities[0]}</div>
                                    <ul className="mb-4">
                                        {flightDetails[index].map((segment: FlightDetails, index: number) => {
                                            return (
                                                <li key={index} className="mb-4">
                                                    <h3 className="text-lg font-bold mb-2">Segment {index + 1}</h3>
                                                    <ul>
                                                        <li className="mb-2">Airline: {segment.airlineName}</li>
                                                        <li className="mb-2">Flight Number: {segment.flightNumber}</li>
                                                        <li className="mb-2">Departure Location: {segment.airportName}</li>
                                                        <li className="mb-2">Departure Time: {segment.departureTime}</li>
                                                        <li className="mb-2">Arrival Location: {segment.airportName}</li>
                                                        <li className="mb-2">Arrival Time: {segment.arrivalTime}</li>
                                                        {segment.layoverLength && <li className="mb-2">Layover Length: {segment.layoverLength}</li>}
                                                    </ul>
                                                </li>
                                            );
                                        })}
                                        <li className="mb-2">Total Journey Time: {getTotalDuration(flight.itineraries[0].segments)}</li>
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    <h1>Loading...</h1>
                )}
            </div>
        </>
    );
}
