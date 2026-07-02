// Minimal ambient declarations for packages whose @types cannot be installed
// in this environment. Provides just enough type information for the functions.

declare module 'pdfkit' {
  import { Writable } from 'stream';

  interface PDFDocumentOptions {
    margin?: number;
    size?: string | [number, number];
  }

  interface TextOptions {
    align?: 'left' | 'center' | 'right' | 'justify';
    width?: number;
    continued?: boolean;
  }

  class PDFDocument extends Writable {
    constructor(options?: PDFDocumentOptions);
    y: number;
    fontSize(size: number): this;
    font(src: string): this;
    text(text: string, x?: number, y?: number, options?: TextOptions): this;
    text(text: string, options?: TextOptions): this;
    moveDown(lines?: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(): this;
    end(): void;
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export = PDFDocument;
}

declare module 'nodemailer' {
  interface TransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  }

  interface MailOptions {
    from?: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }

  interface Transporter {
    sendMail(options: MailOptions): Promise<unknown>;
  }

  function createTransport(options: TransportOptions): Transporter;
}
