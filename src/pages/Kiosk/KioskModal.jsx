import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message, Tag } from 'antd';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect(`${lat}, ${lng}`);
    },
  });
  return null;
};

const KioskModal = ({
  open,
  onCancel,
  onSubmit,
  loading,
  lguOptions,
  scheduleOptions = [],
  mode = 'create',
  initialValues = null,
  currentUserRole = 'super_admin',
  currentUserLguId = null,
  currentUserLguName = null,
}) => {
  const [form] = Form.useForm();
  const isLguAdmin = currentUserRole === 'lgu_admin';
  const watchedLocation = Form.useWatch('location', form);
  const watchedLguId = Form.useWatch('lgu_id', form);
  const [coordinates, setCoordinates] = useState(null);
  const [mapCenter, setMapCenter] = useState([14.5995, 120.9842]); // Default to Manila

  const filteredScheduleOptions = (scheduleOptions || []).filter((schedule) => {
    if (!watchedLguId || !schedule?.lgu_id) {
      return true;
    }

    return Number(schedule.lgu_id) === Number(watchedLguId);
  });

  useEffect(() => {
    if (!open) return;

    const defaultValues = { status: 'active' };

    if (isLguAdmin && currentUserLguId) {
      defaultValues.lgu_id = currentUserLguId;
    }

    const mappedValues = initialValues
      ? {
          ...defaultValues,
          ...initialValues,
          lgu_id: initialValues?.lgu_id || initialValues?.lgu?.id || defaultValues.lgu_id,
        }
      : defaultValues;

    form.setFieldsValue(mappedValues);

    if (!initialValues?.location) {
      setCoordinates(null);
      setMapCenter([14.5995, 120.9842]);
    }
  }, [open, initialValues, form, isLguAdmin, currentUserLguId, lguOptions.length]);

  useEffect(() => {
    if (!watchedLocation) {
      setCoordinates(null);
      return;
    }

    const coords = watchedLocation.split(',').map(c => parseFloat(c.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      setMapCenter([coords[0], coords[1]]);
      setCoordinates(watchedLocation);
    }
  }, [watchedLocation]);

  const handleLocationSelect = (location) => {
    form.setFieldValue('location', location);
    setCoordinates(location);
    message.success('Location selected');
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
      form.resetFields();
      setCoordinates(null);
      setMapCenter([14.5995, 120.9842]);
    } catch (err) {
      console.error(err);
      if (err?.errorFields) {
        return;
      }
      message.error('Failed to create kiosk. Please try again.');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCoordinates(null);
    setMapCenter([14.5995, 120.9842]);
    onCancel();
  };

  return (
    <Modal
      title={
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-0">
            {mode === 'edit' ? 'Edit Kiosk' : 'Add New Kiosk'}
          </h3>
          <p className="text-xs text-slate-500 m-0">
            {mode === 'edit' ? 'Update kiosk details and map location' : 'Set the kiosk details and exact map location'}
          </p>
        </div>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      centered
      okText={mode === 'edit' ? 'Update Kiosk' : 'Save Kiosk'}
      cancelText="Cancel"
      okButtonProps={{ className: 'bg-green-600' }}
      width={800}
      styles={{ body: { minHeight: '520px' } }}
    >
      <Form
        form={form}
        layout="vertical"
        name="kioskForm"
      >
        <Form.Item
          name="kiosk_code"
          label="Kiosk Code"
          rules={[{ required: true, message: 'Please input the kiosk code!' }]}
        >
          <Input size="large" placeholder="e.g. UCC-Kiosk-0001" />
        </Form.Item>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5">
          <p className="text-sm font-medium text-slate-700 mb-2">Kiosk Location</p>
          <Form.Item
            name="location"
            rules={[{ required: true, message: 'Please select a location!' }]}
            className="mb-2"
          >
            <Input size="large" placeholder="Enter coordinates (e.g. 14.5995, 120.9842)" />
          </Form.Item>
          <p className="text-xs text-slate-500 mb-3">Click anywhere on the map to auto-fill coordinates.</p>

          <div className="border rounded-lg overflow-hidden" style={{ height: '300px' }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
              key={`${mapCenter[0]}-${mapCenter[1]}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onLocationSelect={handleLocationSelect} />
              {coordinates && (
                <Marker
                  position={coordinates.split(',').map(c => parseFloat(c.trim()))}
                />
              )}
            </MapContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLguAdmin ? (
            <Form.Item
              name="lgu_id"
              label="Select LGU"
              rules={[{ required: true, message: 'Please select an LGU!' }]}
            >
              <div className="flex items-center gap-2 py-2">
                <Tag color="green" className="m-0">
                  {currentUserLguName || 'Loading...'}
                </Tag>
                <span className="text-sm text-slate-500">(Locked to your LGU)</span>
              </div>
            </Form.Item>
          ) : (
            <Form.Item
              name="lgu_id"
              label="Select LGU"
              rules={[{ required: true, message: 'Please select an LGU!' }]}
            >
              <Select
                size="large"
                placeholder="Choose an LGU"
                options={(lguOptions || []).map((lgu) => ({
                  label: lgu.name,
                  value: lgu.id,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="collection_schedule_id"
            label="Collection Schedule"
          >
            <Select
              allowClear
              size="large"
              placeholder="Select schedule"
              options={filteredScheduleOptions.map((schedule) => ({
                label: schedule.name,
                value: schedule.id,
              }))}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select the status!' }]}
          >
            <Select
              size="large"
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default KioskModal;
