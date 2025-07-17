import { Drawer, Form, Select, Button, Input, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import React from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

interface SendForSign {
    open: boolean;
    onClose: () => void;
    form: any;
    officers: any[];
    loading: boolean;
    onFinish: () => void;
}

interface Request {
    open: boolean;
    onClose: () => void;
    form: any;
    loading: boolean;
    onFinish: () => void;
}

interface SignRequest {
    open: boolean;
    onClose: () => void;
    form: any;
    signatures: any[];
    loading: boolean;
    onFinish: () => void;
}

export const SendForSignDrawer: React.FC<SendForSign> = ({ open, onClose, form, officers, loading, onFinish }) => (
    <Drawer
        title="Send for Signature"
        open={open}
        onClose={onClose}
        footer={null}
        width={400}
    >
        <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
                label="Select Officer"
                name="officerId"
                rules={[{ required: true, message: "Please select an officer" }]}
            >
                <Select
                    placeholder="Select an officer"
                    disabled={officers.length === 0}
                    options={officers.map((officer) => ({
                        value: officer.id,
                        label: officer.name,
                    }))}
                />
            </Form.Item>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading} disabled={officers.length === 0}>
                    Send
                </Button>
            </div>
        </Form>
    </Drawer>
);

export const CreateRequestDrawer: React.FC<Request> = ({ open, onClose, form, loading, onFinish }) => (
    <Drawer
        title="Create New Request"
        open={open}
        onClose={onClose}
        footer={null}
        width={400}
    >
        <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
                label="Title"
                name="title"
                rules={[{ required: true, message: "Please enter a title" }]}
            >
                <Input placeholder="Enter request title" />
            </Form.Item>
            <Form.Item
                label="Description"
                name="description"
                rules={[{ required: true, message: "Please enter a description" }]}
            >
                <Input placeholder="Enter request description" />
            </Form.Item>
            <Form.Item
                label="Template File"
                name="templateFile"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e.fileList)}
                rules={[{ required: true, message: "Please upload a template file" }]}
            >
                <Upload
                    accept=".doc,.docx"
                    maxCount={1}
                    beforeUpload={() => false}
                >
                    <Button icon={<UploadOutlined />}>Upload Template File</Button>
                </Upload>
            </Form.Item>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                    Create
                </Button>
            </div>
        </Form>
    </Drawer>
);

export const RejectRequestDrawer: React.FC<Request> = ({ open, onClose, form, loading, onFinish }) => (
    <Drawer
        title="Reject Request"
        open={open}
        onClose={onClose}
        footer={null}
        width={400}
    >
        <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
                label="Rejection Reason"
                name="rejectionReason"
                rules={[{ required: true, message: "Please enter a rejection reason" }]}
            >
                <Input.TextArea
                    placeholder="Enter the reason for rejection"
                    rows={4}
                />
            </Form.Item>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                    Reject
                </Button>
            </div>
        </Form>
    </Drawer>
);

export const SignRequestDrawer: React.FC<SignRequest> = ({ open, onClose, form, signatures, loading, onFinish }) => (
    <Drawer
        title="Sign Request"
        open={open}
        onClose={onClose}
        footer={null}
        width={400}
    >
        <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
                label="Select Signature"
                name="signatureId"
                rules={[{ required: true, message: "Please select a signature" }]}
            >
                <Select
                    placeholder="Select a signature"
                    style={{ width: '100%' }}
                    options={signatures.map((sig) => ({
                        value: sig.id,
                        label: (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img
                                    src={`${backendUrl}${sig.url}`}
                                    alt={sig.name}
                                    style={{ width: 40, height: 40, objectFit: 'contain', border: '1px solid #ddd' }}
                                />
                                <span>{sig.name}</span>
                            </div>
                        ),
                    }))}
                />
            </Form.Item>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                    Sign
                </Button>
            </div>
        </Form>
    </Drawer>
);
