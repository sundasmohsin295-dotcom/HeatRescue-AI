/**
 * Validated Demonstration Dataset (Phoenix Metropolitan Urban Heat Island)
 * Formatted directly to simulate 40Guard 2m Ground-Level Temperature Feeds.
 */
export const PHOENIX_ZONES = [
  {
    id: 'PHX-01',
    name: 'Downtown Core & Civic Plaza',
    type: 'commercial',
    coords: [33.4484, -112.0740],
    polygon: [
      [33.453, -112.080], [33.453, -112.068],
      [33.443, -112.068], [33.443, -112.080]
    ],
    temp_c: 44.2,
    humidity: 18,
    solar_wm2: 940,
    exceedance_hours: 4.2,
    persistence_hours: 3.8,
    canopy_cover: 0.08,
    vulnerability_score: 75,
    timeline: {
      "10": 36.1, "12": 39.5, "14": 43.0, "15": 44.2, "16": 44.8, "18": 41.2
    }
  },
  {
    id: 'PHX-02',
    name: 'South Mountain Logistics Hub',
    type: 'industrial',
    coords: [33.4010, -112.0710],
    polygon: [
      [33.415, -112.085], [33.415, -112.055],
      [33.390, -112.055], [33.390, -112.085]
    ],
    temp_c: 46.5,
    humidity: 22,
    solar_wm2: 990,
    exceedance_hours: 5.6,
    persistence_hours: 5.1,
    canopy_cover: 0.02,
    vulnerability_score: 92,
    timeline: {
      "10": 38.0, "12": 42.1, "14": 45.4, "15": 46.5, "16": 47.1, "18": 43.8
    }
  },
  {
    id: 'PHX-03',
    name: 'Camelback East Corridor',
    type: 'residential',
    coords: [33.5092, -112.0000],
    polygon: [
      [33.520, -112.015], [33.520, -111.985],
      [33.495, -111.985], [33.495, -112.015]
    ],
    temp_c: 41.8,
    humidity: 16,
    solar_wm2: 890,
    exceedance_hours: 2.8,
    persistence_hours: 2.1,
    canopy_cover: 0.22,
    vulnerability_score: 48,
    timeline: {
      "10": 34.0, "12": 37.2, "14": 40.5, "15": 41.8, "16": 42.0, "18": 39.0
    }
  },
  {
    id: 'PHX-04',
    name: 'West Phoenix Rail Yards',
    type: 'industrial',
    coords: [33.4550, -112.1300],
    polygon: [
      [33.468, -112.145], [33.468, -112.115],
      [33.442, -112.115], [33.442, -112.145]
    ],
    temp_c: 45.8,
    humidity: 19,
    solar_wm2: 975,
    exceedance_hours: 4.9,
    persistence_hours: 4.6,
    canopy_cover: 0.04,
    vulnerability_score: 88,
    timeline: {
      "10": 37.2, "12": 41.0, "14": 44.8, "15": 45.8, "16": 46.2, "18": 42.5
    }
  }
];

export const SAFE_ROUTES_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Direct Asphalt Transit (High Exposure)", risk: 84, duration_min: 18 },
      geometry: {
        type: "LineString",
        coordinates: [[-112.0740, 33.4484], [-112.0730, 33.4250], [-112.0710, 33.4010]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Canopy & Shaded Corridor Route (Recommended)", risk: 46, duration_min: 23 },
      geometry: {
        type: "LineString",
        coordinates: [[-112.0740, 33.4484], [-112.0950, 33.4350], [-112.0880, 33.4150], [-112.0710, 33.4010]]
      }
    }
  ]
};
