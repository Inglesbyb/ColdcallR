import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface ChoroplethMapInnerProps {
  stats: Record<string, { avg_house_price: number; crime_count: number }>;
  minPrice: number;
  maxCrime: number;
  searchedOutcode?: string | null;
  onPolygonClick: (outcode: string, stat: any, latLng: [number, number]) => void;
}

function CenterMap({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function ChoroplethMapInner({ stats, minPrice, maxCrime, searchedOutcode, onPolygonClick }: ChoroplethMapInnerProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  useEffect(() => {
    fetch('/liverpool-outcodes.geojson')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        // Do NOT auto-fit the whole country
      })
      .catch(err => console.error("Failed to load geojson:", err));
  }, []);

  if (!geoData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate global min/max for coloring
  let maxP = 0;
  Object.values(stats).forEach((s: any) => {
    if (s.avg_house_price > maxP) maxP = s.avg_house_price;
  });

  const getColor = (price: number) => {
    if (!price || maxP === 0) return '#334155'; // Slate 700 (no data)
    // Scale from yellow to red based on price
    const ratio = price / maxP;
    if (ratio > 0.8) return '#ef4444'; // Red 500
    if (ratio > 0.6) return '#f97316'; // Orange 500
    if (ratio > 0.4) return '#eab308'; // Yellow 500
    if (ratio > 0.2) return '#84cc16'; // Lime 500
    return '#22c55e'; // Green 500
  };

  const style = (feature: any) => {
    const outcode = feature.properties.name;
    const stat = stats[outcode];

    // Default style (hidden or gray if no data)
    let fillOpacity = 0.5;
    let color = '#334155';
    let weight = 1;

    if (stat) {
      // Check filters
      if (stat.avg_house_price >= minPrice && stat.crime_count <= maxCrime) {
        color = getColor(stat.avg_house_price);
        fillOpacity = 0.7;
        weight = 2;
      } else {
        fillOpacity = 0.1; // Dim outcodes that don't match
        color = '#334155';
      }
    } else {
       fillOpacity = 0.1;
    }

    return {
      fillColor: color,
      weight: weight,
      opacity: 1,
      color: 'white',
      fillOpacity: fillOpacity,
      className: 'transition-all duration-300'
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const outcode = feature.properties.name;
    const stat = stats[outcode];
    
    if (stat) {
      const popupContent = `
        <div class="text-slate-900 font-sans p-1">
          <div class="font-bold text-lg border-b pb-1 mb-2">${outcode}</div>
          <div class="flex justify-between items-center mb-1">
            <span class="text-slate-500 mr-4">Avg Price:</span>
            <span class="font-semibold text-green-600">£${stat.avg_house_price.toLocaleString()}</span>
          </div>
          <div class="flex justify-between items-center mb-2">
            <span class="text-slate-500 mr-4">Crime Level:</span>
            <span class="font-semibold ${stat.crime_count > 300 ? 'text-red-600' : 'text-orange-500'}">${stat.crime_count} incidents</span>
          </div>
          <div class="text-xs text-slate-400 mt-2 text-center">(Click to Add to Route)</div>
        </div>
      `;
      layer.bindTooltip(popupContent, { className: 'rounded-xl shadow-xl border-0 overflow-hidden' });
    }

    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          color: '#3b82f6', // Blue outline on hover
          fillOpacity: 0.9
        });
        layer.bringToFront();
      },
      mouseout: (e) => {
        // Reset style
        const layerGeoJSON = L.geoJSON(geoData, { style });
        layerGeoJSON.eachLayer((l: any) => {
          if (l.feature.properties.name === outcode) {
             (layer as any).setStyle(style(feature));
          }
        });
      },
      click: (e) => {
         // Get center of polygon to use as routing waypoint
         const bounds = (layer as L.Polygon).getBounds();
         const center = bounds.getCenter();
         if (stat) {
           onPolygonClick(outcode, stat, [center.lat, center.lng]);
         }
      }
    });
  };

  // A helper component to fly to a specific outcode
  const FlyToSearched = () => {
    const map = useMap();
    useEffect(() => {
      if (searchedOutcode && geoData) {
        // Find the feature for this outcode
        const feature = geoData.features.find((f: any) => f.properties.name === searchedOutcode);
        if (feature) {
          const layer = L.geoJSON(feature);
          map.flyToBounds(layer.getBounds(), { padding: [50, 50], duration: 1.5 });
        }
      }
    }, [searchedOutcode, geoData, map]);
    return null;
  };

  return (
    <MapContainer
      center={[53.4084, -2.9916]} // Default to Liverpool
      zoom={12}
      zoomControl={false}
      scrollWheelZoom={true}
      className="w-full h-full z-0 bg-[#0B1015]"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, RoHS, and the GIS User Community'
      />
      {bounds && <CenterMap bounds={bounds} />}
      <FlyToSearched />
      <GeoJSON 
        key={`geojson-${minPrice}-${maxCrime}`} // Force re-render on filter change
        data={geoData} 
        style={style} 
        onEachFeature={onEachFeature} 
      />
    </MapContainer>
  );
}
