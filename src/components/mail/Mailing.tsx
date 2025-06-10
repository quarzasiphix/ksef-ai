/**
 * Sends an email with a PDF attachment using the external API.
 * @param mail Recipient email address
 * @param subject Email subject
 * @param message Email message body
 * @param pdfBlob The PDF file as a Blob
 * @param filename The filename for the PDF attachment
 * @returns Promise<boolean> true if sent successfully, false otherwise
 */
export async function sendInvoiceEmail({
  mail,
  subject,
  message,
  pdfBlob,
  filename = 'invoice.pdf',
}: {
  mail: string;
  subject: string;
  message: string;
  pdfBlob: Blob;
  filename?: string;
}): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('mail', mail);
    formData.append('subject', subject);
    formData.append('message', message);
    formData.append('file', pdfBlob, filename);
    const response = await fetch('https://n8n.tovernet.nl/webhook/send-mail', {
      method: 'POST',
      body: formData,
    });
    return response.ok;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return false;
  }
}
