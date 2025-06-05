declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFData {
    numpages: number;
    text: string;
    version: string;
    info: any;
  }

  interface PDFOptions {
    max?: number;
    version?: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export default pdfParse;
}
