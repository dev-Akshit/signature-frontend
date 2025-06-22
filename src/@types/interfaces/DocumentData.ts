export interface DocumentData {
    documentId: string;
    templateName: string;
    description: string;
    data: Record<string, any>;
    signedDate?: string;
  }