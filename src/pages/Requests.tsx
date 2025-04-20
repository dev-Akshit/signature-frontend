import React, { useEffect, useState } from "react";
import { Button, Drawer, Select, Tag, message, Form, Input, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import CustomTable from "../components/CustomTable";
import MainAreaLayout from "../components/main-layout/main-layout";
import { useNavigate } from "react-router";
import { requestClient, useAppStore } from "../store";
import { AxiosError } from "axios";
import { roles, signStatus, signStatusDisplay } from "../libs/constants";

interface Request {
  id: string;
  title: string;
  documentCount: number;
  rejectedCount: number;
  createdAt: string;
  status: string;
}

interface Officer {
  id: string;
  name: string;
}

const Requests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSendDrawerOpen, setIsSendDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [sendForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const { session } = useAppStore();
  const userRole = session?.role;
  const isReader = userRole === roles.reader;

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestClient.getRequests();

      setRequests(data);
      setFilteredRequests(data);
    } catch (error) {
      handleError(error, "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const data = await requestClient.getOfficers();
      setOfficers(data);
    } catch (error) {
      console.error('fetchOfficers error:', error);
      handleError(error, "Failed to fetch officers. Please try again later.");
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const filtered = requests.filter((request) =>
      request.title.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredRequests(filtered);
  };

  const handleAddRequest = () => {
    setIsCreateDrawerOpen(true);
    createForm.resetFields();
  };

  const handleCreateRequest = async () => {
    try {
      const values = await createForm.validateFields();
      setLoading(true);

      const templateFile = values.templateFile?.[0]?.originFileObj;

      if (!templateFile) {
        throw new Error("Please upload a template file");
      }

      console.log('Uploading template:', {
        name: templateFile.name,
        type: templateFile.type,
        size: templateFile.size,
      });

      await requestClient.createRequest({
        title: values.title,
        description: values.description,
        templateFile,
      });

      message.success("Request created successfully!");
      await fetchRequests();
      setIsCreateDrawerOpen(false);
      createForm.resetFields();
    } catch (error) {
      console.error('handleCreateRequest error:', error);
      handleError(error, "Failed to create request");
    } finally {
      setLoading(false);
    }
  };

  const handleSendForSignature = async () => {
    try {
      const values = await sendForm.validateFields();
      setLoading(true);
      await requestClient.sendForSignature(selectedRequest!.id, {
        officerId: values.officerId,
      });
      message.success("Request sent for signature!");
      await fetchRequests();
      setIsSendDrawerOpen(false);
      sendForm.resetFields();
      setSelectedRequest(null);
    } catch (error) {
      console.error('handleSendForSignature error:', error);
      handleError(error, "Failed to send request for signature");
    } finally {
      setLoading(false);
    }
  };

  const handleCloneRequest = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.cloneRequest(id);
      message.success("Request cloned successfully!");
      await fetchRequests();
    } catch (error) {
      console.error('handleCloneRequest error:', error);
      handleError(error, "Failed to clone request");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.deleteRequest(id);
      message.success("Request deleted successfully!");
      setRequests((prev) => prev.filter((req) => req.id !== id));
      setFilteredRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (error) {
      console.error('handleDeleteRequest error:', error);
      handleError(error, "Failed to delete request");
    } finally {
      setLoading(false);
    }
  };

  const handleSignRequest = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.signRequest(id);
      message.success("Request signed successfully!");
      await fetchRequests();
    } catch (error) {
      console.error('handleSignRequest error:', error);
      handleError(error, "Failed to sign request");
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.dispatchRequest(id);
      message.success("Request dispatched successfully!");
      await fetchRequests();
    } catch (error) {
      console.error('handleDispatch error:', error);
      handleError(error, "Failed to dispatch request");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.request("POST", `/api/requests/${id}/reject`);
      message.success("Request rejected successfully!");
      await fetchRequests();
    } catch (error) {
      console.error('handleRejectRequest error:', error);
      handleError(error, "Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const handleDelegateRequest = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.request("POST", `/api/requests/${id}/delegate`);
      message.success("Request delegated successfully!");
      await fetchRequests();
    } catch (error) {
      console.error('handleDelegateRequest error:', error);
      handleError(error, "Failed to delegate request");
    } finally {
      setLoading(false);
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
    fetchRequests();
    if (isReader) {
      fetchOfficers();
    }
  }, [isReader]);

  const getActions = (record: Request) => {
    const actions: JSX.Element[] = [];
    const requestStatus = record.status;

    console.log('Rendering actions for request:', { id: record.id, status: requestStatus });

    actions.push(
      <Button key="clone" onClick={() => handleCloneRequest(record.id)}>
        Clone
      </Button>
    );

    if (isReader) {
      if (requestStatus === signStatusDisplay[signStatus.unsigned]) {
        actions.push(
          <Button
            key="send"
            type="primary"
            disabled={record.documentCount === 0 || officers.length === 0}
            onClick={() => {
              setSelectedRequest(record);
              setIsSendDrawerOpen(true);
            }}
          >
            Send for Signature
          </Button>,
          <Button
            key="delete"
            danger
            onClick={() => handleDeleteRequest(record.id)}
          >
            Delete
          </Button>
        );
      } else if (requestStatus === signStatusDisplay[signStatus.delegated]) {
        actions.push(
          <Button
            key="sign"
            type="primary"
            onClick={() => handleSignRequest(record.id)}
          >
            Sign
          </Button>
        );
      } else if (requestStatus === signStatusDisplay[signStatus.readyForDispatch]) {
        actions.push(
          <Button key="print">Print</Button>,
          <Button key="download">Download All (ZIP)</Button>,
          <Button
            key="dispatch"
            type="primary"
            onClick={() => handleDispatch(record.id)}
          >
            Dispatch
          </Button>
        );
      }
    } else {
      // Officer-specific actions
      if (requestStatus === signStatusDisplay[signStatus.readForSign]) {
        actions.push(
          <Button
            key="sign"
            type="primary"
            onClick={() => handleSignRequest(record.id)}
          >
            Sign
          </Button>,
          <Button
            key="reject"
            danger
            onClick={() => handleRejectRequest(record.id)}
          >
            Reject
          </Button>,
          <Button
            key="delegate"
            onClick={() => handleDelegateRequest(record.id)}
          >
            Delegate
          </Button>
        );
      } else if (requestStatus === signStatusDisplay[signStatus.readyForDispatch]) {
        actions.push(
          <Button key="submit">Submit</Button>,
          <Button key="print">Print All</Button>,
          <Button key="download">Download All (ZIP)</Button>,
          <Button
            key="dispatch"
            type="primary"
            onClick={() => handleDispatch(record.id)}
          >
            Dispatch
          </Button>
        );
      }
    }

    return actions;
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Request) => (
        <Button
          type="link"
          onClick={() => navigate(`/dashboard/template/${record.id}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "Number of Documents",
      dataIndex: "documentCount",
      key: "documentCount",
      render: (count: number, record: Request) => (
        <Button
          type="link"
          onClick={() => navigate(`/dashboard/request/${record.id}`)}
        >
          {count}
        </Button>
      ),
    },
    {
      title: "Rejected Documents",
      dataIndex: "rejectedCount",
      key: "rejectedCount",
      render: (count: number, record: Request) =>
        count > 0 ? (
          <Button
            type="link"
            onClick={() => navigate(`/dashboard/request/${record.id}/rejected`)}
          >
            {count}
          </Button>
        ) : (
          count
        ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
    },
    {
      title: "Request Status",
      dataIndex: "status",
      key: "status",
      render: (requestStatus: string) => {
        console.log('Rendering status:', requestStatus);
        return (
          <Tag
            color={
              requestStatus === signStatusDisplay[signStatus.unsigned]
                ? "red"
                : requestStatus === signStatusDisplay[signStatus.readForSign]
                ? "orange"
                : requestStatus === signStatusDisplay[signStatus.rejected]
                ? "volcano"
                : requestStatus === signStatusDisplay[signStatus.delegated]
                ? "blue"
                : requestStatus === signStatusDisplay[signStatus.inProcess]
                ? "cyan"
                : requestStatus === signStatusDisplay[signStatus.Signed]
                ? "green"
                : requestStatus === signStatusDisplay[signStatus.readyForDispatch]
                ? "lime"
                : requestStatus === signStatusDisplay[signStatus.dispatched]
                ? "purple"
                : "default"
            }
          >
            {requestStatus || "Unknown"}
          </Tag>
        );
      },
    },
    {
      title: "Action",
      key: "actions",
      render: (record: Request) => (
        <div style={{ display: "flex", gap: "8px" }}>{getActions(record)}</div>
      ),
    },
  ];

  return (
    <MainAreaLayout
      title="Requests"
      extra={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Input.Search
            placeholder="Search by title"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Button type="primary" onClick={handleAddRequest}>
            New Request for Signature
          </Button>
        </div>
      }
    >
      <CustomTable
        serialNumberConfig={{ name: "", show: true }}
        columns={columns}
        data={filteredRequests}
        loading={loading}
      />
      <Drawer
        title="Send for Signature"
        open={isSendDrawerOpen}
        onClose={() => {
          setIsSendDrawerOpen(false);
          setSelectedRequest(null);
          sendForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form form={sendForm} layout="vertical" onFinish={handleSendForSignature}>
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
            <Button
              onClick={() => {
                setIsSendDrawerOpen(false);
                setSelectedRequest(null);
                sendForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} disabled={officers.length === 0}>
              Send
            </Button>
          </div>
        </Form>
      </Drawer>
      <Drawer
        title="Create New Request"
        open={isCreateDrawerOpen}
        onClose={() => {
          setIsCreateDrawerOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateRequest}>
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
              onClick={() => {
                setIsCreateDrawerOpen(false);
                createForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create
            </Button>
          </div>
        </Form>
      </Drawer>
    </MainAreaLayout>
  );
};

export default Requests;
