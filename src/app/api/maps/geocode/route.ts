import { NextRequest, NextResponse } from 'next/server';


interface GeocodeResponse {
  success: boolean;
  source: 'google' | 'osm' | 'local_fallback';
  formattedAddress: string;
  street: string;
  area: string;
  building: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  error?: string;
}

export async function GET(req: NextRequest) {
  try {
    const latStr = req.nextUrl.searchParams.get('lat');
    const lngStr = req.nextUrl.searchParams.get('lng');

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { success: false, error: 'Missing lat or lng parameter' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lat or lng parameter' },
        { status: 400 }
      );
    }

    const googleApiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      '';

    // 1. Try Google Maps Geocoding API if a key is provided
    if (googleApiKey && googleApiKey.trim().length > 10) {
      try {
        const googleRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey.trim()}`,
          { next: { revalidate: 3600 } }
        );
        const googleData = await googleRes.json();

        if (googleData.status === 'OK' && googleData.results && googleData.results.length > 0) {
          const result = googleData.results[0];
          let street = '';
          let area = '';
          let building = '';
          let city = 'Indore';
          let pincode = '';

          for (const comp of result.address_components) {
            const types = comp.types;
            if (types.includes('route')) {
              street = comp.long_name;
            } else if (
              types.includes('sublocality_level_1') ||
              types.includes('sublocality') ||
              types.includes('neighborhood')
            ) {
              area = comp.long_name;
            } else if (
              types.includes('premise') ||
              types.includes('point_of_interest') ||
              types.includes('establishment')
            ) {
              building = comp.long_name;
            } else if (types.includes('locality')) {
              city = comp.long_name;
            } else if (types.includes('postal_code')) {
              pincode = comp.long_name;
            }
          }

          const combinedStreet = street
            ? area ? `${street}, ${area}` : street
            : area || result.formatted_address.split(',')[0] || 'Selected Location';

          return NextResponse.json({
            success: true,
            source: 'google',
            formattedAddress: result.formatted_address,
            street: combinedStreet,
            area: area || city,
            building: building,
            city,
            pincode,
            lat,
            lng,
          });
        }
      } catch (gErr) {
        console.warn('Google geocoding error, falling back to OSM:', gErr);
      }
    }

    // 2. High-accuracy fallback: OpenStreetMap Nominatim reverse geocode
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'NiteOwlDeliveryApp/1.0 (contact: app@niteowl.in)',
            'Accept-Language': 'en',
          },
          next: { revalidate: 3600 },
        }
      );

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const addr = osmData.address || {};

        const street =
          addr.road ||
          addr.pedestrian ||
          addr.residential ||
          addr.suburb ||
          addr.neighbourhood ||
          'Indore City Area';

        const area =
          addr.suburb ||
          addr.neighbourhood ||
          addr.city_district ||
          addr.county ||
          'Bhawarkua';

        const building =
          addr.building ||
          addr.commercial ||
          addr.amenity ||
          addr.house_name ||
          addr.shop ||
          '';

        const city = addr.city || addr.town || addr.county || 'Indore';
        const pincode = addr.postcode || '';

        const formattedStreet = street.includes(area)
          ? street
          : `${street}, ${area}`;

        return NextResponse.json({
          success: true,
          source: 'osm',
          formattedAddress: osmData.display_name || `${formattedStreet}, ${city}`,
          street: formattedStreet,
          area,
          building,
          city,
          pincode,
          lat,
          lng,
        });
      }
    } catch (osmErr) {
      console.warn('OSM Geocoding failed, falling back to local presets:', osmErr);
    }

    // 3. Local Indore Landmark Approximation Fallback
    const localFallback = getIndoreLocalPreset(lat, lng);
    return NextResponse.json({
      success: true,
      source: 'local_fallback',
      ...localFallback,
      lat,
      lng,
    });
  } catch (err: any) {
    if (err?.digest?.includes('NEXT_PRERENDER')) {
      throw err;
    }
    console.error('Geocoding route exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function getIndoreLocalPreset(lat: number, lng: number) {
  // Bhawarkua landmark centroids
  const presets = [
    {
      name: 'Bholaram Ustad Marg',
      building: 'Maa Gayatri PG',
      lat: 22.6938,
      lng: 75.8654,
    },
    {
      name: 'Vishnu Puri NX',
      building: 'Shree Krishna Heights',
      lat: 22.6882,
      lng: 75.8621,
    },
    {
      name: 'Tower Square Crossing',
      building: 'Tower Square Library',
      lat: 22.6942,
      lng: 75.8691,
    },
    {
      name: 'Indrapuri Colony',
      building: 'Indrapuri Residency',
      lat: 22.6912,
      lng: 75.861,
    },
  ];

  let closest = presets[0];
  let minDiff = 9999;
  for (const p of presets) {
    const d = Math.hypot(p.lat - lat, p.lng - lng);
    if (d < minDiff) {
      minDiff = d;
      closest = p;
    }
  }

  return {
    formattedAddress: `${closest.name}, Bhawarkua, Indore, Madhya Pradesh`,
    street: closest.name,
    area: 'Bhawarkua',
    building: closest.building,
    city: 'Indore',
    pincode: '452001',
  };
}
