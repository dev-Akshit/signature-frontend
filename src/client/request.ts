import Zod from "zod";
import { Client } from "./abstract";
import { signStatus, signStatusDisplay } from "../libs/constants";

export const documentSchema = Zod.object({
  id: Zod.string(),
  name: Zod.string(),
  filePath: Zod.string(),
  uploadedAt: Zod.string(),
  signedDate: Zod.string().optional(),
  signStatus: Zod.any(),
  data: Zod.record(Zod.any()),
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
  status: Zod.number().optional().transform((val) => 
    typeof val === 'number' ? signStatusDisplay[val as signStatus] : signStatusDisplay[signStatus.unsigned]
  ),
  templateVariables: Zod.array(templateVariablesSchema).optional(),
  documents: Zod.array(documentSchema).optional(),
});

export const pdfResponseSchema = Zod.object({
  pdf: Zod.string(),
});

export const officerSchema = Zod.object({
  id: Zod.string(),
  name: Zod.string(),
});

export class RequestClient extends Client {
  constructor(url: string) {
    super(url);
  }

  async getRequests(){
    try {
      const res = await this.request("GET", "/api/requests");
      const body = Zod.array(requestSchema).safeParse(res?.data);
      if (!body.success) {
        console.error('getRequests parse error:', body.error);
        throw new Error("Invalid data from backend");
      }
      return body.data;
    } catch (error) {
      console.error('getRequests error:', error);
      throw error;
    }
  }

  async getRequest(id: string) {
    try {
      const res = await this.request("GET", `/api/requests/${id}`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('getRequest parse error:', parsedData.error);
        throw new Error("Invalid data from backend");
      }
      
      return parsedData.data;
    } catch (error) {
      console.error('getRequest error:', error);
      throw error;
    }
  }

  async getOfficers(){
    try {
      const res = await this.request("GET", "/api/users/officers");
      const body = Zod.array(officerSchema).safeParse(res?.data);
      if (!body.success) {
        console.error('getOfficers parse error:', body.error);
        throw new Error("Invalid data from backend");
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
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("templateFile", data.templateFile);

      console.log('Sending createRequest with:', {
        title: data.title,
        description: data.description,
        templateFile: {
          name: data.templateFile.name,
          type: data.templateFile.type,
          size: data.templateFile.size,
        },
      });

      const res = await this.request("POST", "/api/requests", {
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log('createRequest response:', res?.data);

      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('createRequest parse error:', parsedData.error);
        throw new Error("Invalid data from backend");
      }
      return parsedData.data;
    } catch (error) {
      console.error('createRequest error:', error);
      throw error;
    }
  }

  async getRequestPdf(id: string) {
    const res = await this.request("GET", `/api/requests/${id}/pdf`);
    const parsed = pdfResponseSchema.safeParse(res?.data);
    if (!parsed.success) {
      console.error("Validation error:", parsed.error);
      throw new Error("Invalid PDF data from backend");
    }
    return parsed.data;
  }

  async uploadDocuments(id: string, files: File[], dataEntries?: any[]) {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append("documents", file));


      if (dataEntries) {
        formData.append("dataEntries", JSON.stringify(dataEntries));
      }
      console.log('Sending uploadDocuments with:', { id, files: files.map(f => f.name), dataEntries });

      const res = await this.request("POST", `/api/requests/${id}/documents`, {
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log('uploadDocuments response:', res.data);
      const parsed = requestSchema.safeParse(res.data);
      if (!parsed.success) {
        console.error('uploadDocuments parse error:', parsed.error);
        throw new Error("Invalid data from backend");
      }
    } catch (error) {
      console.error('uploadDocuments error:', error);
      throw error;
    }
  }

  async deleteDocument(id: string, documentId: string) {
    try {
      const res = await this.request("DELETE", `/api/requests/${id}/documents/${documentId}`);
      console.log('deleteDocument response:', res.data);
    } catch (error) {
      console.error('deleteDocument error:', error);
      throw error;
    }
  }

  async sendForSignature(requestId: string, data: { officerId: string }) {
    try {
      const res = await this.request("POST", `/api/requests/${requestId}/send`, {
        data,
      });
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('sendForSignature parse error:', parsedData.error);
        throw new Error("Invalid data from backend");
      }
      return parsedData.data;
    } catch (error) {
      console.error('sendForSignature error:', error);
      throw error;
    }
  }

  async cloneRequest(requestId: string) {
    try {
      const res = await this.request("POST", `/api/requests/${requestId}/clone`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('cloneRequest parse error:', parsedData.error);
        throw new Error("Invalid data from backend");
      }
      return parsedData.data;
    } catch (error) {
      console.error('cloneRequest error:', error);
      throw error;
    }
  }

  async deleteRequest(requestId: string) {
    try {
      await this.request("DELETE", `/api/requests/${requestId}`);
    } catch (error) {
      console.error('deleteRequest error:', error);
      throw error;
    }
  }

  async signRequest(requestId: string) {
    try {
      const res = await this.request("POST", `/api/requests/${requestId}/sign`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('signRequest parse error:', parsedData.error);
        throw new Error("Invalid data from backend");
      }
      return parsedData.data;
    } catch (error) {
      console.error('signRequest error:', error);
      throw error;
    }
  }

  async dispatchRequest(requestId: string) {
    try {
      const res = await this.request("POST", `/api/requests/${requestId}/dispatch`);
      const parsedData = requestSchema.safeParse(res?.data);
      if (!parsedData.success) {
        console.error('dispatchRequest parse error:', parsedData.error);
        throw new Error("Invalid data from backend");
      }
      return parsedData.data;
    } catch (error) {
      console.error('dispatchRequest error:', error);
      throw error;
    }
  }
}