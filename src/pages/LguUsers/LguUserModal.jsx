import React, { useEffect } from 'react';
import { Form, Input, Modal, Select, message, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getLgus } from '../Lgu/lgu.api';

const LguUserModal = ({
	open,
	onCancel,
	onSubmit,
	loading,
	mode = 'create',
	initialValues = null,
	currentUserRole = 'super_admin',
	currentUserLguId = null,
	currentUserLguName = null,
}) => {
	const [form] = Form.useForm();
	const isLguAdmin = currentUserRole === 'lgu_admin';

	const { data: lguList = [], isLoading: lgusLoading } = useQuery({
		queryKey: ['lgus'],
		queryFn: getLgus,
		select: (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []),
	});

	const lguOptions = lguList.map((lgu) => ({ label: lgu.name, value: lgu.id }));

	useEffect(() => {
		if (!open) return;

		const defaults = { 
			role_slug: 'lgu_staff',
		};

		// If lgu_admin, always lock to their assigned LGU
		if (isLguAdmin && currentUserLguId) {
			defaults.lgu_id = currentUserLguId;
		}

		const mappedValues = initialValues
			? {
					...defaults,
					...initialValues,
					lgu_id: initialValues?.lgu_id || initialValues?.lgu?.id || defaults.lgu_id,
				}
			: defaults;

		form.setFieldsValue(mappedValues);
	}, [open, initialValues, form, isLguAdmin, currentUserLguId, lguList.length]);

	const handleOk = async () => {
		try {
			const values = await form.validateFields();
			await onSubmit(values);
			form.resetFields();
		} catch (err) {
			console.error(err);
			if (err?.errorFields) {
				return;
			}
			message.error('Failed to save LGU user. Please try again.');
		}
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	return (
		<Modal
			title={mode === 'edit' ? 'Edit LGU User' : 'Add LGU User'}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={loading}
			centered
			okText={mode === 'edit' ? 'Update User' : 'Save User'}
			cancelText="Cancel"
			okButtonProps={{ className: 'bg-green-600' }}
			width={560}
			styles={{ body: { minHeight: '150px' } }}
		>
			<Form form={form} layout="vertical" name="lguUserForm">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Form.Item
						name="first_name"
						label="First Name"
						rules={[{ required: true, message: 'Please input first name' }]}
					>
						<Input size="large" placeholder="Enter first name" />
					</Form.Item>

					<Form.Item
						name="last_name"
						label="Last Name"
						rules={[{ required: true, message: 'Please input last name' }]}
					>
						<Input size="large" placeholder="Enter last name" />
					</Form.Item>
				</div>

				<Form.Item
					name="email"
					label="Email Address"
					rules={[
						{ required: true, message: 'Please input email address' },
						{ type: 'email', message: 'Please enter a valid email address' },
					]}
				>
					<Input size="large" placeholder="name@example.com" />
				</Form.Item>


			{isLguAdmin ? (
				<Form.Item
					name="lgu_id"
					label="Assigned LGU"
					rules={[{ required: true, message: 'Please select an LGU' }]}
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
					label="Assigned LGU"
					rules={[{ required: true, message: 'Please select an LGU' }]}
				>
					<Select
						size="large"
						placeholder="Select LGU"
						loading={lgusLoading}
						options={lguOptions}
					/>
				</Form.Item>
			)}


				<Form.Item
					name="role_slug"
					label="Role"
					rules={[{ required: true, message: 'Please select a role' }]}
				>
					<Select
						size="large"
						placeholder="Select role"
						options={[
							{
								value: 'lgu_admin',
								label: (
									<div>
										<span className="font-medium">LGU Admin</span>
										<p className="text-xs text-gray-400 m-0">Can create staff and manage kiosks</p>
									</div>
								),
							},
							{
								value: 'lgu_staff',
								label: (
									<div>
										<span className="font-medium">LGU Staff</span>
										<p className="text-xs text-gray-400 m-0">Can view analytics and manage kiosks</p>
									</div>
								),
							},
							{
								value: 'lgu_technician',
								label: (
									<div>
										<span className="font-medium">LGU Technician</span>
										<p className="text-xs text-gray-400 m-0">Can handle kiosk maintenance tickets</p>
									</div>
								),
							},
						]}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default LguUserModal;
