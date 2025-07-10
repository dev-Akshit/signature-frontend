import Zod from 'zod';
import { Client } from './abstract';
import { signStatus, signStatusDisplay } from '../libs/constants';

export const documentSchema = Zod.object({
  id: Zod.string().optional(),
  name: Zod.string().optional(),
  filePath: Zod.string().optional(),
  uploadedAt: Zod.string().optional(),
  signedDate: Zod.string().optional(),
  signStatus: Zod.number().optional(),
  rejectionReason: Zod.string().optional(),
  qrCodePath: Zod.string().optional(),
  data: Zod.record(Zod.any()).optional(),
  createdeBy: Zod.string().optional(),
});

export const templateVariablesSchema = Zod.object({
  name: Zod.string(),
  required: Zod.boolean(),
  showOnExcel: Zod.boolean(),
});

export const requestSchema = Zod.object({
  id: Zod.string(),
  title: Zod.string(),
  url: Zod.string().optional(),
  documentCount: Zod.number(),
  rejectedCount: Zod.number(),
  createdAt: Zod.string(),
  createdBy: Zod.string().optional(),
  status: Zod.number()
    .optional()
    .transform((val) =>
      typeof val === 'number' ? signStatusDisplay[val as signStatus] : signStatusDisplay[signStatus.unsigned]
    ),
  rejectionReason: Zod.string().optional(),
  templateVariables: Zod.array(templateVariablesSchema).optional(),
  documents: Zod.array(documentSchema).optional(),
});

export const documentDataSchema = Zod.object({
  documentId: Zod.string(),
  templateName: Zod.string(),
  description: Zod.string(),
  data: Zod.record(Zod.any()),
  signedDate: Zod.string().optional(),
  signedPath: Zod.string().optional(),
  qrCodePath: Zod.string().optional(),
});

export const pdfResponseSchema = Zod.object({
  pdf: Zod.string(),
});

export const officerSchema = Zod.object({
  id: Zod.string(),
  name: Zod.string(),
});

export const signatureSchema = Zod.object({
  id: Zod.string(),
  userId: Zod.string(),
  url: Zod.string(),
  createdBy: Zod.string(),
  updatedBy: Zod.string(),
});

export class RequestClient extends Client {
  constructor(url: string) {
    super(url);
  }

  async getRequests() {
    try {
      const res = await this.request('GET', '/api/requests');
      const body = Zod.array(requestSchema).safeParse(res?.data);
      if (!body.success) {
        console.error('getRequests parse error:', body.error);
        throw new Error('Invalid data from backend');
      }
      return body.data;
    } catch (error) {
      console.error('getRequests error:', error);
      throw error;
    }
  }

  async getRequest(id: string) {
    try {
      const res = await this.request('GET', `/api/requests/${id}`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('getRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('getRequest error:', error);
      throw error;
    }
  }

  async getDocumentData(documentId: string) {
    try {
      const res = await this.request('GET', `/api/requests/documents/${documentId}`);
      const parsedData = documentDataSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('getDocumentData parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('getDocumentData error:', error);
      throw error;
    }
  }

  async getOfficers() {
    try {
      const res = await this.request('GET', '/api/users/officers');
      const body = Zod.array(officerSchema).safeParse(res?.data);
      if (!body.success) {
        console.error('getOfficers parse error:', body.error);
        throw new Error('Invalid data from backend');
      }
      return body.data;
    } catch (error) {
      console.error('getOfficers error:', error);
      throw error;
    }
  }

  async createRequest(data: { title: string; description: string; templateFile: File }) {
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('templateFile', data.templateFile);

      console.log('Sending createRequest with:', {
        title: data.title,
        description: data.description,
        templateFile: {
          name: data.templateFile.name,
          type: data.templateFile.type,
          size: data.templateFile.size,
        },
      });

      const res = await this.request('POST', '/api/requests', {
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('createRequest response:', res?.data);

      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('createRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('createRequest error:', error);
      throw error;
    }
  }

  async getRequestPdf(id: string) {
    const res = await this.request('GET', `/api/requests/${id}/pdf`);
    const parsed = pdfResponseSchema.safeParse(res?.data);
    if (!parsed.success) {
      console.error('Validation error:', parsed.error);
      throw new Error('Invalid PDF data from backend');
    }
    return parsed.data;
  }

  async uploadDocuments(id: string, files: File[], dataEntries?: any[]) {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('documents', file));

      if (dataEntries) {
        formData.append('dataEntries', JSON.stringify(dataEntries));
      }
      console.log('Sending uploadDocuments with:', { id, files: files.map((f) => f.name), dataEntries });

      const res = await this.request('POST', `/api/requests/${id}/documents`, {
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('uploadDocuments response:', res.data);
      const parsed = requestSchema.safeParse(res.data);
      if (!parsed.success) {
        console.error('uploadDocuments parse error:', parsed.error);
        throw new Error('Invalid data from backend');
      }
    } catch (error) {
      console.error('uploadDocuments error:', error);
      throw error;
    }
  }

  async deleteDocument(id: string, documentId: string) {
    try {
      const res = await this.request('DELETE', `/api/requests/${id}/documents/${documentId}`);
      console.log('deleteDocument response:', res.data);
    } catch (error) {
      console.error('deleteDocument error:', error);
      throw error;
    }
  }

  async sendForSignature(requestId: string, data: { officerId: string }) {
    try {
      const res = await this.request('POST', `/api/requests/${requestId}/send`, {
        data,
      });
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('sendForSignature parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('sendForSignature error:', error);
      throw error;
    }
  }

  async cloneRequest(requestId: string) {
    try {
      const res = await this.request('POST', `/api/requests/${requestId}/clone`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('cloneRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('cloneRequest error:', error);
      throw error;
    }
  }

  async deleteRequest(requestId: string) {
    try {
      await this.request('DELETE', `/api/requests/${requestId}`);
    } catch (error) {
      console.error('deleteRequest error:', error);
      throw error;
    }
  }

  async signRequest(requestId: string, signatureId?: string) {
    try {
      const formData = new FormData();
      if (signatureId) {
        formData.append('signatureId', signatureId);
      }

      console.log('Sending signRequest with:', { requestId, signatureId });
      const res = await this.request('POST', `/api/requests/${requestId}/sign`, {
        data: formData,
        headers: {},
      });

      return res;
    } catch (error) {
      console.error('signRequest error:', error);
      throw error;
    }
  }

  async uploadSignature(signatureFile: File) {
    try {
      const formData = new FormData();
      formData.append('signatureFile', signatureFile);

      const res = await this.request('POST', '/api/signatures', {
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const parsedData = signatureSchema.safeParse(res.data);
      if (!parsedData.success) {
        console.error('uploadSignature parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }

      return parsedData.data;
    } catch (error) {
      console.error('uploadSignature error:', error);
      throw error;
    }
  }

  async getSignatures() {
    try {
      const res = await this.request('GET', '/api/signatures');
      const body = Zod.array(signatureSchema).safeParse(res.data);
      if (!body.success) {
        console.error('getSignatures parse error:', body.error);
        throw new Error('Invalid data from backend');
      }
      return body.data;
    } catch (error) {
      console.error('getSignatures error:', error);
      throw error;
    }
  }

  async printRequest(requestId: string) {
    try {
      const res = await this.request('POST', `/api/requests/${requestId}/print`, {
        responseType: 'blob',
      });
      return res.data;
    } catch (error) {
      console.error('printRequest error:', error);
      throw error;
    }
  }

  async downloadZip(requestId: string) {
    try {
      const res = await this.request('POST', `/api/requests/${requestId}/download-zip`, {
        responseType: 'blob',
      });
      return res.data;
    } catch (error) {
      console.error('downloadZip error:', error);
      throw error;
    }
  }

  async dispatchRequest(requestId: string) {
    try {
      const res = await this.request('POST', `/api/requests/${requestId}/dispatch`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('dispatchRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('dispatchRequest error:', error);
      throw error;
    }
  }

  async rejectRequest(requestId: string, rejectionReason: string) {
    try {
      const res = await this.request('POST', `/api/requests/${requestId}/reject`, {
        data: { rejectionReason },
      });
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('rejectRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('rejectRequest error:', error);
      throw error;
    }
  }

  async rejectDocument(requestId: string, documentId: string, rejectionReason: string) {
    try{
      console.log('rejectDocument called with:', { requestId, documentId, rejectionReason });
      const res = await this.request('POST', `/api/requests/${requestId}/documents/${documentId}/reject`, {
        data: { rejectionReason },
      });
      console.log('rejectDocument response:', res.data);
      const parsedData = documentSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('rejectDocument parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      console.log('rejectDocument parsed data:', parsedData.data);
      return parsedData.data;
    } catch (error) {
      console.error('rejectDocument error:', error);
      throw error;
    }
  }

  async delegateRequest(id: string) {
    try {
      const res = await this.request('POST', `/api/requests/${id}/delegate`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('delegateRequest parse error:', parsedData.error);
        throw new Error('Invalid data from backend');
      }
      return parsedData.data;
    } catch (error) {
      console.error('delegateRequest error:', error);
      throw error;
    }
  }
}