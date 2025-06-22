import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Descriptions, Spin, message } from 'antd';
import { requestClient } from '../store';
import MainAreaLayout from '../components/main-layout/main-layout';
import type { DocumentData } from '../@types/interfaces/DocumentData';

const DocumentData: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDocumentData = async () => {
      if (!documentId) return;
      try {
        setLoading(true);
        const data = await requestClient.getDocumentData(documentId);
        setDocumentData(data);
      } catch (error) {
        console.error('fetchDocumentData error:', error);
        message.error('Failed to fetch document data');
      } finally {
        setLoading(false);
      }
    };
    fetchDocumentData();
  }, [documentId]);

  if (loading) {
    return <Spin tip="Loading document data..." />;
  }

  if (!documentData) {
    return <div>Document not found</div>;
  }

  const filteredData = Object.fromEntries(
    Object.entries(documentData.data).filter(([key]) => key !== 'Signature' && key !== 'qrCode')
  );

  return (
    <MainAreaLayout title={`Document ${documentId}`}>
      <Card title={documentData.templateName} bordered={false}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Description">{documentData.description || 'N/A'}</Descriptions.Item>
        </Descriptions>
        <h3>Document Data</h3>
        <Descriptions bordered column={1}>
          {Object.entries(filteredData).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>{value || 'N/A'}</Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
    </MainAreaLayout>
  );
};

export default DocumentData;