import React, { useState, useEffect } from "react";
import { Button, Upload, message, Table, Space } from "antd";
import { UploadOutlined, EyeOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons";
import MainAreaLayout from "../components/main-layout/main-layout";
import { useParams } from "react-router";
import { requestClient } from "../store";
import { AxiosError } from "axios";
import * as XLSX from "xlsx";
import mongoose from "mongoose";
import { signStatus } from "../libs/constants";

interface TemplateVariable {
  name: string;
  required: boolean;
  showOnExcel: boolean;
}

interface Document {
  id: string;
  name: string;
  filePath: string;
  uploadedAt: string;
  signedDate?: string;
  signStatus: number;
  data: Record<string, any>;
}

interface Request {
  id: string;
  title: string;
  documentCount: number;
  documents: Document[];
  status: string;
  templateVariables: TemplateVariable[];
}

const Request: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchRequest = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await requestClient.getRequest(id);
      console.log('Fetched request:', data);
      setRequest({
        ...data,
        documents: (data.documents || []).map((doc: any) => ({
          ...doc,
          signStatus: doc.signStatus || signStatus.unsigned,
          data: doc.data || {},
        })),
        templateVariables: data.templateVariables || [],
      });
    } catch (error) {
      handleError(error, "Failed to fetch request");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (fileList: File[]) => {
    if (!id) return;
    try {
      setUploading(true);

      const dataEntries: any[] = [];
      for (const file of fileList) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];

        rows.forEach(row => {
          const rowData: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] || '';
          });
          dataEntries.push({
            id: new mongoose.Types.ObjectId().toString(),
            url: file.name,
            data: rowData,
            signStatus: signStatus.unsigned,
            createdAt: new Date().toISOString(),
          });
        });
      }

      console.log('Uploading documents:', { files: fileList.map(f => f.name), dataEntries });

      await requestClient.uploadDocuments(id, fileList, dataEntries);
      message.success("Documents uploaded successfully!");
      await fetchRequest();
    } catch (error) {
      console.error('handleUpload error:', error);
      handleError(error, "Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!request?.templateVariables) {
      message.error("No template variables available");
      return;
    }

    // Filter variables where showOnExcel is true
    const excelVariables = request.templateVariables
      .filter(v => v.showOnExcel)
      .map(v => v.name);

    if (excelVariables.length === 0) {
      message.error("No variables to include in Excel template");
      return;
    }

    // Create a worksheet with variable names as headers
    const ws = XLSX.utils.json_to_sheet([{}], { header: excelVariables });

    // Create a workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    // Generate Excel file and trigger download
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${request.title}_template.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewDocument = (document: Document) => {
    window.open(document.filePath, '_blank');
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!id) return;
    try {
      await requestClient.deleteDocument(id, document.id);
      message.success("Document deleted successfully!");
      await fetchRequest();
    } catch (error) {
      console.error('deleteDocument error:', error);
      handleError(error, "Failed to delete document");
    }
  };

  const handleError = (error: unknown, fallbackMsg: string) => {
    if (error instanceof AxiosError) {
      message.error(error.response?.data?.error || fallbackMsg);
      return;
    }
    if (error instanceof Error) {
      message.error(error.message);
      return;
    }
    message.error(fallbackMsg);
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const getColumns = (documents: Document[]) => {
    const excelFields = new Set<string>();
    documents.forEach(doc => {
      Object.keys(doc.data).forEach(field => excelFields.add(field));
    });

    const dynamicColumns = Array.from(excelFields).map(field => ({
      title: field,
      dataIndex: ['data', field],
      key: field,
      render: (value: any) => value || '-',
    }));

    return [
      ...dynamicColumns,
      {
        title: 'Sign Date',
        dataIndex: 'signedDate',
        key: 'signedDate',
        render: (text: string) => (text ? new Date(text).toLocaleDateString() : '-'),
      },
      {
        title: 'Request Status',
        dataIndex: 'signStatus',
        key: 'signStatus',
        render: (status: keyof typeof signStatus) => {
          const statusMap: Record<number, string> = {
            [signStatus.unsigned]: 'Unsigned',
            [signStatus.Signed]: 'Signed',
            [signStatus.delegated]: 'Delegated',
          };
          return statusMap[status as any] || 'Unknown';
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: any, record: Document) => (
          <Space>
            {record.signStatus === signStatus.Signed && (
              <Button
                icon={<DownloadOutlined />}
                // onClick={() => handleDownloadDocument(record)}
              >
                Download
              </Button>
            )}
            {(record.signStatus === signStatus.unsigned || record.signStatus === signStatus.delegated) && (
              <Button
                icon={<EyeOutlined />}
                onClick={() => handlePreviewDocument(record)}
              >
                Preview
              </Button>
            )}
            {record.signStatus === signStatus.unsigned && (
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDeleteDocument(record)}
              >
                Delete
              </Button>
            )}
          </Space>
        ),
      },
    ];
  };

  return (
    <MainAreaLayout
      title={`Request: ${request?.title || "Loading..."}`}
      extra={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Upload
            accept=".xlsx,.xls,.csv"
            multiple
            showUploadList={false}
            beforeUpload={() => false}
            fileList={[]}
            onChange={({ fileList }) =>
              handleUpload(fileList.map((file) => file.originFileObj as File))
            }
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
            >
              Bulk Upload Excel Files
            </Button>
          </Upload>
          <Button onClick={handleDownloadTemplate}>
            Download Template
          </Button>
        </div>
      }
    >
      <Table
        columns={request?.documents ? getColumns(request.documents) : []}
        dataSource={request?.documents || []}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: "No documents uploaded yet" }}
      />
    </MainAreaLayout>
  );
};

export default Request;