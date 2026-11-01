import { useEffect } from 'react';
import L from 'leaflet';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import icono from 'leaflet/dist/images/marker-icon.png';
import icono2x from 'leaflet/dist/images/marker-icon-2x.png';
import sombra from 'leaflet/dist/images/marker-shadow.png';
import { NEGOCIO, RADIO_COBERTURA_KM } from '../../services/cobertura.js';

// Con Vite, Leaflet no encuentra solo las imágenes del marcador: se indican a mano.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: icono, iconRetinaUrl: icono2x, shadowUrl: sombra });

const CENTRO = [NEGOCIO.lat, NEGOCIO.lng];
const LIMITES_ZONA = L.latLng(CENTRO).toBounds(RADIO_COBERTURA_KM * 2000);
const ESTILO_ZONA = { color: '#CE4B31', weight: 2, fillColor: '#CE4B31', fillOpacity: 0.08 };

/** Un toque en el mapa mueve el pin. */
function AlTocar({ onCambiar }) {
  useMapEvents({ click: evento => onCambiar({ lat: evento.latlng.lat, lng: evento.latlng.lng }) });
  return null;
}

/** Encuadra el local y la ubicación elegida cuando `enfocar` cambia (por ejemplo al usar el GPS). */
function Enfocar({ enfocar }) {
  const mapa = useMap();
  useEffect(() => {
    if (!enfocar) return;
    mapa.fitBounds(L.latLngBounds([CENTRO, [enfocar.lat, enfocar.lng]]).pad(0.3));
  }, [enfocar, mapa]);
  return null;
}

/**
 * Mapa del checkout (react-leaflet + OpenStreetMap): círculo con la zona de cobertura,
 * el local en el centro y un pin que se arrastra o se mueve tocando el mapa.
 */
export default function MapPicker({ ubicacion, onCambiar, enfocar }) {
  const posicion = ubicacion ? [ubicacion.lat, ubicacion.lng] : CENTRO;
  return (
    <MapContainer bounds={LIMITES_ZONA} boundsOptions={{ padding: [8, 8] }} className="map-leaflet" style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution="© OpenStreetMap" />
      <Circle center={CENTRO} radius={RADIO_COBERTURA_KM * 1000} pathOptions={ESTILO_ZONA} />
      <CircleMarker center={CENTRO} radius={7} pathOptions={{ color: '#272421', fillColor: '#272421', fillOpacity: 1 }}>
        <Tooltip>{NEGOCIO.nombre} (local)</Tooltip>
      </CircleMarker>
      <Marker
        position={posicion}
        draggable
        eventHandlers={{
          dragend: evento => {
            const punto = evento.target.getLatLng();
            onCambiar({ lat: punto.lat, lng: punto.lng });
          }
        }}
      />
      <AlTocar onCambiar={onCambiar} />
      <Enfocar enfocar={enfocar} />
    </MapContainer>
  );
}
