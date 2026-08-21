import { CONFIG } from '../config/config.js';
import { SAFE_ROUTES_GEOJSON } from '../data/demo-data.js';

/**
 * Interactive Leaflet GIS controller with specialized layer styling.
 */
export class GISHeatMap {
  constructor(containerId, onZoneSelect) {
    this.map = L.map(containerId, { zoomControl: false }).setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | 40Guard 2m Heat Layer',
      maxZoom: 18
    }).addTo(this.map);

    this.zoneLayers = L.featureGroup().addTo(this.map);
    this.routeLayer = L.geoJSON(null).addTo(this.map);
    this.onZoneSelect = onZoneSelect;
    this.activeLayerType = 'snapshot';
  }

  renderZones(zones, layerType = 'snapshot') {
    this.activeLayerType = layerType;
    this.zoneLayers.clearLayers();

    zones.forEach(zone => {
      let fillColor = '#10b981';
      let valueDisplay = `${zone.temp_c}°C`;

      if (layerType === 'snapshot') {
        if (zone.temp_c > 45) fillColor = '#ef4444';
        else if (zone.temp_c > 42) fillColor = '#f59e0b';
      } else if (layerType === 'exceedance') {
        valueDisplay = `${zone.exceedance_hours} hrs`;
        fillColor = zone.exceedance_hours > 4.5 ? '#ef4444' : '#f59e0b';
      } else if (layerType === 'persistence') {
        valueDisplay = `${zone.persistence_hours} hrs`;
        fillColor = zone.persistence_hours > 4.0 ? '#ef4444' : '#f59e0b';
      }

      const polygon = L.polygon(zone.polygon, {
        color: fillColor,
        fillColor: fillColor,
        fillOpacity: 0.45,
        weight: 2
      }).addTo(this.zoneLayers);

      polygon.on('click', () => this.onZoneSelect(zone));

      polygon.bindPopup(`
        <div style="font-size:11px;">
          <strong>${zone.name}</strong><br/>
          Layer Value: <b>${valueDisplay}</b><br/>
          Composite Risk: <b>${zone.risk || '--'}/100</b>
        </div>
      `);
    });
  }

  toggleCoolRoutes(show) {
    this.routeLayer.clearLayers();
    if (show) {
      this.routeLayer.addData(SAFE_ROUTES_GEOJSON);
      this.routeLayer.setStyle(feature => ({
        color: feature.properties.risk > 50 ? '#ef4444' : '#06b6d4',
        weight: 4,
        dashArray: feature.properties.risk > 50 ? '6, 6' : null
      }));
    }
  }
}
