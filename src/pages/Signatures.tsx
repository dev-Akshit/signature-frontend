import React, { useState, useEffect } from 'react';
import { Button, Upload, message, Spin, List } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import MainAreaLayout from '../components/main-layout/main-layout';
import { requestClient } from '../store';
import type { Signature } from '../@types/interfaces/Signature';
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Signature: React.FC = () => {
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [signatures, setSignatures] = useState<Signature[]>([]);

    const fetchSignatures = async () => {
        try {
            setLoading(true);
            const data = await requestClient.getSignatures();
            setSignatures(
                data.map((item: any) => ({
                    id: item.id,
                    userId: item.userId,
                    filePath: item.url,
                    createdBy: item.createdBy,
                    updatedBy: item.updatedBy,
                }))
            );
        } catch (error: any) {
            if (error.message.includes('404')) {
                setSignatures([]);
            } else {
                message.error('Failed to load signatures');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.error('Please select a signature file');
            return;
        }

        try {
            setUploading(true);
            const signatureFile = fileList[0];
            await requestClient.uploadSignature(signatureFile);
            message.success('Signature uploaded successfully');
            setFileList([]);
            await fetchSignatures();
        } catch (error) {
            console.error('handleUpload error:', error);
            message.error('Failed to upload signature');
        } finally {
            setUploading(false);
        }
    };

    const uploadProps = {
        accept: '.png,.jpg,.jpeg',
        beforeUpload: (file: File) => {
            setFileList([file]);
            return false;
        },
        onRemove: () => {
            setFileList([]);
        },
        fileList,
    };

    useEffect(() => {
        fetchSignatures();
        return () => {
            // Cleanup if needed
        };
    }, []);

    return (
        <MainAreaLayout title="Upload Signature">
            <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
                <h2>Upload Your Signature</h2>
                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />}>Select Signature File</Button>
                </Upload>
                {fileList.length > 0 && (
                    <Button
                        type="primary"
                        onClick={handleUpload}
                        loading={uploading}
                        style={{ marginTop: 16 }}
                    >
                        Upload Signature
                    </Button>
                )}
                <div style={{ marginTop: 24 }}>
                    <h3>Your Signatures</h3>
                    {loading ? (
                        <Spin size="large" />
                    ) : signatures.length > 0 ? (
                        <List
                            grid={{ gutter: 16, column: 3 }}
                            dataSource={signatures}
                            renderItem={(signature) => (
                                <List.Item>
                                    <div style={{ textAlign: 'center' }}>
                                        <img
                                            src={`${backendUrl}${signature.filePath}`}
                                            style={{ maxWidth: '150px', border: '1px solid #d9d9d9', padding: 4 }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#888' }}>
                                        </p>
                                    </div>
                                </List.Item>
                            )}
                        />
                    ) : (
                        <p>No signatures uploaded yet.</p>
                    )}
                </div>
            </div>
        </MainAreaLayout>
    );
};

export default Signature;