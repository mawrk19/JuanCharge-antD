import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, Input, Select, Tag } from 'antd';
import { EnvironmentOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getKiosks } from '../Kiosk/kiosk.api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const parseLocation = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [latRaw, lngRaw] = value.split(',');
  const lat = Number(latRaw?.trim());
  const lng = Number(lngRaw?.trim());
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
};

const RecenterMap = ({ target }) => {
  const map = useMap();

  if (target?.lat && target?.lng) {
    map.setView([target.lat, target.lng], 14);
  }

  return null;
};

const MapView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [connectorFilter, setConnectorFilter] = useState('all');
  const [selectedKioskId, setSelectedKioskId] = useState(null);

  const { data: kiosks = [], isLoading } = useQuery({
    queryKey: ['map-kiosks'],
    queryFn: getKiosks,
    select: (res) => {
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return rows
        .map((item) => ({
          ...item,
          parsedLocation: parseLocation(item.location),
        }))
        .filter((item) => item.parsedLocation);
    },
  });

  const connectorOptions = useMemo(() => {
    const set = new Set();
    kiosks.forEach((kiosk) => {
      if (kiosk.connector_type) set.add(kiosk.connector_type);
    });

    return [{ value: 'all', label: 'All Types' }].concat(
      Array.from(set).map((type) => ({ value: type, label: type }))
    );
  }, [kiosks]);

  const filteredKiosks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return kiosks.filter((kiosk) => {
      const searchable = [
        kiosk.kiosk_code,
        kiosk.lgu_name,
        kiosk.location,
        kiosk.status,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');

      const statusPass = statusFilter === 'all' || (kiosk.status || '').toLowerCase() === statusFilter;
      const connectorPass = connectorFilter === 'all' || kiosk.connector_type === connectorFilter;
      const textPass = !term || searchable.includes(term);

      return statusPass && connectorPass && textPass;
    });
  }, [kiosks, searchTerm, statusFilter, connectorFilter]);

  const selectedKiosk = filteredKiosks.find((kiosk) => kiosk.id === selectedKioskId) || filteredKiosks[0] || null;
  const mapCenter = selectedKiosk?.parsedLocation || { lat: 14.7645, lng: 121.0454 };

  const openDirections = (kiosk) => {
    if (!kiosk?.parsedLocation) return;

    const destination = `${kiosk.parsedLocation.lat},${kiosk.parsedLocation.lng}`;
    const openUrl = (origin) => {
      const url = origin
        ? `https://www.google.com/maps/dir/${origin}/${destination}`
        : `https://www.google.com/maps/search/?api=1&query=${destination}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    if (!navigator.geolocation) {
      openUrl(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = `${position.coords.latitude},${position.coords.longitude}`;
        openUrl(origin);
      },
      () => {
        openUrl(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white min-h-[620px] lg:h-[calc(100vh-170px)]">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_390px] h-full">
        <div className="relative h-[440px] sm:h-[520px] xl:h-full">
          <div className="absolute top-4 left-4 right-4 z-[900] flex flex-wrap gap-3">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Search charging stations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-[360px]"
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full sm:w-[180px]"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Select
              value={connectorFilter}
              onChange={setConnectorFilter}
              className="w-full sm:w-[180px]"
              options={connectorOptions}
            />
          </div>

          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={13}
            scrollWheelZoom={true}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <RecenterMap target={mapCenter} />
            <ZoomControl position="topright" />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredKiosks.map((kiosk) => (
              <Marker
                key={kiosk.id}
                position={[kiosk.parsedLocation.lat, kiosk.parsedLocation.lng]}
                eventHandlers={{ click: () => setSelectedKioskId(kiosk.id) }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="font-semibold">{kiosk.kiosk_code || 'Kiosk'}</div>
                    <div className="text-xs text-slate-500">{kiosk.parsedLocation.lat}, {kiosk.parsedLocation.lng}</div>
                    <div className="mt-2">
                      <Tag color={(kiosk.status || '').toLowerCase() === 'active' ? 'green' : 'red'}>
                        {kiosk.status || 'Unknown'}
                      </Tag>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <aside className="h-full border-t xl:border-t-0 xl:border-l border-slate-200 bg-slate-50/40 overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-white">
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 leading-tight">Charging Stations</h2>
            <p className="text-slate-500 mt-1">{filteredKiosks.length} stations found</p>
          </div>

          <div className="h-[calc(100%-96px)] max-h-[420px] xl:max-h-none overflow-y-auto p-4 space-y-5">
            {filteredKiosks.map((kiosk) => {
              const isSelected = selectedKiosk?.id === kiosk.id;
              const totalPorts = Number(kiosk.total_ports || 1);
              const availablePorts = Number(kiosk.available_ports ?? totalPorts);
              const availabilityPct = totalPorts > 0 ? Math.round((availablePorts / totalPorts) * 100) : 0;

              return (
                <Card
                  key={kiosk.id}
                  hoverable
                  className={`rounded-2xl border transition-all ${isSelected ? 'border-green-300 shadow-md bg-green-50/30' : 'border-slate-200 shadow-sm bg-white'}`}
                  styles={{ body: { padding: 16 } }}
                  onClick={() => setSelectedKioskId(kiosk.id)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center mt-0.5">
                        <ThunderboltOutlined />
                      </div>
                      <div>
                        <div className="text-xl sm:text-2xl leading-7 font-semibold text-slate-900">{kiosk.kiosk_code || 'Kiosk'}</div>
                        <div className="text-slate-500 text-sm mt-1">{kiosk.parsedLocation.lat.toFixed(6)}, {kiosk.parsedLocation.lng.toFixed(6)}</div>
                      </div>
                    </div>
                    <Badge color={(kiosk.status || '').toLowerCase() === 'active' ? '#22c55e' : '#ef4444'} text={(kiosk.status || 'unknown').toLowerCase()} />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Tag className="m-0 bg-slate-100 border-slate-200 text-slate-600">{kiosk.lgu_name || 'Unassigned LGU'}</Tag>
                    {kiosk.connector_type ? <Tag className="m-0 bg-cyan-50 border-cyan-200 text-cyan-700">{kiosk.connector_type}</Tag> : null}
                  </div>

                  <div className="mt-3 text-sm text-slate-500">Availability</div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-500">{availabilityPct}% available</span>
                    <span className="text-green-600 font-semibold">{availablePorts}/{totalPorts} ports</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${availabilityPct}%` }} />
                  </div>

                  <div className="mt-4">
                    <Button
                      block
                      type="primary"
                      className="bg-green-600"
                      icon={<EnvironmentOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDirections(kiosk);
                      }}
                    >
                      Directions
                    </Button>
                  </div>
                </Card>
              );
            })}

            {!isLoading && filteredKiosks.length === 0 && (
              <Card className="rounded-xl border border-slate-200" styles={{ body: { padding: 18 } }}>
                <div className="text-slate-500 text-sm">No stations matched your filters.</div>
              </Card>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MapView;
