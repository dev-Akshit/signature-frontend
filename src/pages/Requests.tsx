import React, { useEffect, useState } from "react";
import { Button, Menu, Dropdown, Tag, message, Form, Input, Tooltip } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import CustomTable from "../components/CustomTable";
import MainAreaLayout from "../components/main-layout/main-layout";
import { useNavigate } from "react-router";
import { requestClient, useAppStore } from "../store";
import { AxiosError } from "axios";
import { roles, signStatus, signStatusDisplay } from "../libs/constants";
import { Request, Officer, Signature } from '../@types/interfaces/Requests';
import { SendForSignDrawer, CreateRequestDrawer, RejectRequestDrawer, SignRequestDrawer } from "../components/drawers";
import socket from "../client/socket";

const Requests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingRequestId, setSigningRequestId] = useState<string | null>(null);
  const [isSendDrawerOpen, setIsSendDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isSignDrawerOpen, setIsSignDrawerOpen] = useState(false);
  const [isRejectDrawerOpen, setIsRejectDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [signForm] = Form.useForm();
  const [sendForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const { session } = useAppStore();
  const userRole = session?.role;
  const userId = session?.userId;
  const isReader = userRole === roles.reader;
  const [signingProgress, setSigningProgress] = useState<{ [requestId: string]: { current: number; total: number }; }>({});

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestClient.getRequests();
      const sortedRequests = (data as Request[]).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const mappedData = sortedRequests.map((req: any) => ({
        ...req,
        rawStatus: req.status
          ? Number(
            Object.keys(signStatusDisplay).find(
              (key) =>
                signStatusDisplay[key as unknown as keyof typeof signStatusDisplay] === req.status
            )
          )
          : signStatus.unsigned,
      }));
      setRequests(mappedData);
      setFilteredRequests(mappedData);
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

  const fetchSignatures = async () => {
    try {
      const data = await requestClient.getSignatures();
      setSignatures(
        data.map((item) => ({
          id: item.id,
          name: item.userId,
          url: item.url,
          createdAt: item.createdBy,
        }))
      );
    } catch (error: any) {
      if (!error.message.includes('404')) {
        message.error('Failed to fetch signatures');
      }
      setSignatures([]);
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
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      if (!allowedTypes.includes(templateFile.type)) {
        message.error("Invalid file type. Please upload a .doc or .docx file.");
        return;
      }
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

  const handleSignRequest = async () => {
    let requestId: string | undefined;
    try {
      const values = await signForm.validateFields();
      requestId = selectedRequest!.id;
      setSigningRequestId(requestId);
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? {
              ...req,
              status: signStatusDisplay[signStatus.inProcess],
              rawStatus: signStatus.inProcess,
            }
            : req
        )
      );
      setFilteredRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? {
              ...req,
              status: signStatusDisplay[signStatus.inProcess],
              rawStatus: signStatus.inProcess,
            }
            : req
        )
      );
      await requestClient.signRequest(requestId, values.signatureId);
      // message.success("Request signed successfully!");
      message.success("Request queued for signing")
      // await fetchRequests();
      setIsSignDrawerOpen(false);
      signForm.resetFields();
      setSelectedRequest(null);
    } catch (error) {
      console.error('handleSignRequest error:', error);
      handleError(error, "Failed to sign request");
      await fetchRequests();
    } finally {
      setSigningRequestId(null);
      if (requestId) {
        setSigningProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[requestId!];
          return newProgress;
        });
      }
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

  const handleRejectRequest = async () => {
    try {
      const values = await rejectForm.validateFields();
      setLoading(true);
      await requestClient.rejectRequest(selectedRequest!.id, values.rejectionReason);
      message.success("Request rejected successfully!");
      await fetchRequests();
      setIsRejectDrawerOpen(false);
      rejectForm.resetFields();
      setSelectedRequest(null);
    } catch (error) {
      console.error('handleRejectRequest error:', error);
      handleError(error, "Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintRequest = async (requestId: string) => {
    try {
      const pdfBlob = await requestClient.printRequest(requestId);
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          printWindow.onbeforeunload = () => URL.revokeObjectURL(url);
        };
      } else {
        message.error('Failed to open print window');
      }
    } catch (error) {
      console.error('handlePrintRequest error:', error);
      handleError(error, 'Failed to print documents');
    }
  };

  const handleDownloadAll = async (requestId: string, requestTitle: string) => {
    try {
      const zipBlob = await requestClient.downloadZip(requestId);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${requestTitle}_signed_documents.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('handleDownloadAll error:', error);
      handleError(error, 'Failed to download ZIP');
    }
  };

  const handleDelegateRequest = async (id: string) => {
    try {
      setLoading(true);
      await requestClient.delegateRequest(id);

      message.success("Request delegated successfully!");
      await fetchRequests();
    } catch (error) {
      console.error('handleDelegateRequest error:', error);
      handleError(error, "Failed to delegate request");
    } finally {
      setLoading(false);
    }
  };

  const handleSigningProgress = (data: { requestId: string; current: number; total: number }) => {
    setSigningProgress((prev) => ({
      ...prev,
      [data.requestId]: { current: data.current, total: data.total },
    }));
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

  const signStatusUpdate = (data: any) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === data.requestId
          ? {
            ...req,
            status:
              data.status === 'inProcess'
                ? signStatusDisplay[signStatus.inProcess]
                : data.status === 'rejected'
                  ? signStatusDisplay[signStatus.rejected]
                  : signStatusDisplay[signStatus.Signed],
            rawStatus:
              data.status === 'inProcess'
                ? signStatus.inProcess
                : data.status === 'rejected'
                  ? signStatus.rejected
                  : signStatus.Signed,
            rejectionReason: data.rejectionReason || req.rejectionReason,
          }
          : req
      )
    );
    setFilteredRequests((prev) =>
      prev.map((req) =>
        req.id === data.requestId
          ? {
            ...req,
            status:
              data.status === 'inProcess'
                ? signStatusDisplay[signStatus.inProcess]
                : data.status === 'rejected'
                  ? signStatusDisplay[signStatus.rejected]
                  : signStatusDisplay[signStatus.Signed],
            rawStatus:
              data.status === 'inProcess'
                ? signStatus.inProcess
                : data.status === 'rejected'
                  ? signStatus.rejected
                  : signStatus.Signed,
            rejectionReason: data.rejectionReason || req.rejectionReason,
          }
          : req
      )
    );
  };

  useEffect(() => {
    fetchRequests();
    fetchOfficers();

    socket.on('signingRequest', handleSigningProgress);
    socket.on('requestStatusUpdate', signStatusUpdate);

    return () => {
      socket.off('signingRequest', handleSigningProgress);
    };
  }, []);

  const getActions = (record: Request) => {
    const menuItems: any[] = [];
    menuItems.push({
      key: "clone",
      label: "Clone",
      onClick: () => handleCloneRequest(record.id),
    });

    if (record.rawStatus === signStatus.unsigned) {
      menuItems.push(
        {
          key: "send",
          label: "Send for Signature",
          disabled: record.documentCount === 0 || officers.length === 0,
          onClick: () => {
            setSelectedRequest(record);
            setIsSendDrawerOpen(true);
          },
        },
        {
          key: "delete",
          label: "Delete",
          danger: true,
          onClick: () => handleDeleteRequest(record.id),
        }
      );
    } else if (record.rawStatus === signStatus.delegated && record.createdBy == userId) {
      menuItems.push({
        key: "sign",
        label: "Sign",
        disabled: signingRequestId === record.id,
        onClick: () => {
          setSelectedRequest(record);
          setIsSignDrawerOpen(true);
          fetchSignatures();
        },
      });
    } else if (record.rawStatus === signStatus.readForSign && !isReader && record.createdBy != userId) {
      menuItems.push(
        {
          key: "sign",
          label: "Sign",
          disabled: signingRequestId === record.id,
          onClick: () => {
            setSelectedRequest(record);
            setIsSignDrawerOpen(true);
            fetchSignatures();
          },
        },
        {
          key: "reject",
          label: "Reject",
          danger: true,
          onClick: () => {
            setSelectedRequest(record);
            setIsRejectDrawerOpen(true);
          },
        },
        {
          key: "delegate",
          label: "Delegate",
          onClick: () => handleDelegateRequest(record.id),
        }
      );
    } else if (record.rawStatus === signStatus.Signed) {
      menuItems.push(
        {
          key: "print",
          label: "Print",
          onClick: () => handlePrintRequest(record.id),
        },
        {
          key: "download",
          label: "Download All (ZIP)",
          onClick: () => handleDownloadAll(record.id, record.title),
        }
      );
      if (isReader) {
        menuItems.push({
          key: "dispatch",
          label: "Dispatch",
          onClick: () => handleDispatch(record.id),
        });
      }
    }

    const menu = (
      <Menu
        items={menuItems.map((item) => ({
          ...item,
          onClick: () => {
            item.onClick?.();
          },
          danger: item.danger,
          disabled: item.disabled,
        }))}
      />
    );

    return (
      <Dropdown overlay={menu} trigger={["click"]}>
        <Button icon={<MoreOutlined />} />
      </Dropdown>
    );
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
      render: (count: number, record: Request) => (
        <Button
          type="link"
          onClick={() => navigate(`/dashboard/request/${record.id}/rejected`)}
          disabled={count === 0}
        >
          {count}
        </Button>
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
      render: (_: string, record: Request) => {
        const displayStatus = record.createdBy == userId && record.rawStatus === signStatus.Signed
          ? signStatusDisplay[signStatus.readyForDispatch]
          : record.status;
        const progress = signingProgress[record.id];
        return (
          <div>
            <Tooltip
              title={
                record.rawStatus === signStatus.rejected && record.rejectionReason
                  ? `Reason: ${record.rejectionReason}`
                  : ''
              }
            >
              <Tag
                color={
                  displayStatus === signStatusDisplay[signStatus.unsigned]
                    ? "red"
                    : displayStatus === signStatusDisplay[signStatus.readForSign]
                      ? "orange"
                      : displayStatus === signStatusDisplay[signStatus.rejected]
                        ? "volcano"
                        : displayStatus === signStatusDisplay[signStatus.delegated]
                          ? "blue"
                          : displayStatus === signStatusDisplay[signStatus.inProcess]
                            ? "cyan"
                            : displayStatus === signStatusDisplay[signStatus.Signed]
                              ? "green"
                              : displayStatus === signStatusDisplay[signStatus.readyForDispatch]
                                ? "lime"
                                : displayStatus === signStatusDisplay[signStatus.dispatched]
                                  ? "purple"
                                  : "default"
                }
              >
                {displayStatus || "Unknown"}
              </Tag>
            </Tooltip>
            {progress && record.rawStatus === signStatus.inProcess && (
              <div style={{ marginTop: 4, fontSize: 12, color: "#555" }}>
                {progress.current}/{progress.total}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (record: Request) => getActions(record),
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

      <SendForSignDrawer
        open={isSendDrawerOpen}
        onClose={() => {
          setIsSendDrawerOpen(false);
          setSelectedRequest(null);
          sendForm.resetFields();
        }}
        form={sendForm}
        officers={officers}
        loading={loading}
        onFinish={handleSendForSignature}
      />
      <CreateRequestDrawer
        open={isCreateDrawerOpen}
        onClose={() => {
          setIsCreateDrawerOpen(false);
          createForm.resetFields();
        }}
        form={createForm}
        loading={loading}
        onFinish={handleCreateRequest}
      />
      <SignRequestDrawer
        open={isSignDrawerOpen}
        onClose={() => {
          setIsSignDrawerOpen(false);
          setSelectedRequest(null);
          signForm.resetFields();
        }}
        form={signForm}
        signatures={signatures}
        loading={loading}
        onFinish={handleSignRequest}
      />
      <RejectRequestDrawer
        open={isRejectDrawerOpen}
        onClose={() => {
          setIsRejectDrawerOpen(false);
          setSelectedRequest(null);
          rejectForm.resetFields();
        }}
        form={rejectForm}
        onFinish={handleRejectRequest}
        loading={loading}
      />
    </MainAreaLayout>
  );
};

export default Requests;