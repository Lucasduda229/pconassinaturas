import jsPDF from 'jspdf';

interface InvoicePdfData {
  clientName: string;
  clientDocument: string | null;
  clientEmail: string;
  clientPhone: string | null;
  planName: string;
  value: number;
  dueDate: string;
  qrCodeBase64: string; // base64 image data
  pixCopyPaste: string;
  subscriptionId: string;
}

export const generateInvoicePDF = (data: InvoicePdfData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const primaryColor: [number, number, number] = [30, 79, 163]; // #1E4FA3
  const pixColor: [number, number, number] = [50, 188, 173]; // #32BCAD
  const textColor: [number, number, number] = [33, 33, 33];
  const grayColor: [number, number, number] = [120, 120, 120];
  const lightGray: [number, number, number] = [240, 240, 240];

  // ===== HEADER =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('P-CON CONSTRUNET', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Fatura de Pagamento', margin, 28);

  y = 45;

  // ===== CLIENT INFO =====
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('DADOS DO CLIENTE', margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...textColor);

  const clientInfo = [
    { label: 'Nome:', value: data.clientName },
    { label: 'CPF/CNPJ:', value: data.clientDocument || 'Não informado' },
    { label: 'E-mail:', value: data.clientEmail },
    { label: 'Telefone:', value: data.clientPhone || 'Não informado' },
  ];

  let infoY = y + 15;
  clientInfo.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, margin + 5, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(item.value, margin + 35, infoY);
    infoY += 6;
  });

  y += 48;

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(data.value);

  // ===== INVOICE DETAILS =====
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('DETALHES DA FATURA', margin + 5, y + 8);

  // Table header with 4 columns: Referência | Código de cobrança | Vencimento | Valor
  const tableY = y + 14;
  doc.setFillColor(...primaryColor);
  doc.rect(margin + 5, tableY, contentWidth - 10, 7, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');

  const col1 = margin + 8;
  const col2 = margin + 48;
  const col3 = margin + 100;
  const col4 = margin + 140;

  doc.text('Referência', col1, tableY + 5);
  doc.text('Código de cobrança', col2, tableY + 5);
  doc.text('Vencimento', col3, tableY + 5);
  doc.text('Valor', col4, tableY + 5);

  // Table row
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const rowY = tableY + 13;

  // Referência = month name from dueDate
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dueParts = data.dueDate.split('/');
  const monthRef = dueParts.length >= 2 ? months[parseInt(dueParts[1], 10) - 1] || data.dueDate : data.dueDate;
  doc.text(monthRef, col1, rowY);

  // Código de cobrança = first segment of subscriptionId
  const cobrancaCode = data.subscriptionId.split('-')[0].toUpperCase();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(cobrancaCode, col2, rowY);

  // Vencimento
  doc.setFontSize(9);
  doc.text(data.dueDate, col3, rowY);

  // Valor
  doc.setFont('helvetica', 'bold');
  doc.text(formattedValue, col4, rowY);

  y += 40;

  // ===== TOTAL =====
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', margin + 5, y + 9);
  doc.text(formattedValue, pageWidth - margin - 5, y + 9, { align: 'right' });

  y += 22;

  // ===== PIX SECTION =====
  doc.setFillColor(245, 252, 251);
  doc.roundedRect(margin, y, contentWidth, 95, 3, 3, 'F');
  doc.setDrawColor(...pixColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, 95, 3, 3, 'S');

  // Pix header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...pixColor);
  doc.text('Pague com Pix', margin + 5, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('Leia o QR Code com seu celular. A liquidação é instantânea!', margin + 5, y + 17);

  // QR Code
  if (data.qrCodeBase64) {
    try {
      const qrSrc = data.qrCodeBase64.startsWith('data:')
        ? data.qrCodeBase64
        : `data:image/png;base64,${data.qrCodeBase64}`;
      doc.addImage(qrSrc, 'PNG', margin + 5, y + 22, 50, 50);
    } catch (e) {
      console.error('Error adding QR code to PDF:', e);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text('QR Code indisponível', margin + 10, y + 47);
    }
  }

  // Pix copy-paste
  const pixLabelX = margin + 62;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...pixColor);
  doc.text('Pix Copia e Cola:', pixLabelX, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textColor);

  // Word-wrap the pix code
  const pixLines = doc.splitTextToSize(data.pixCopyPaste, contentWidth - 67);
  doc.text(pixLines, pixLabelX, y + 33);

  // Instruction
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.text('Copie o código acima e cole no aplicativo do seu banco.', pixLabelX, y + 80);

  y += 103;

  // ===== FOOTER =====
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.text('P-CON CONSTRUNET - Sistema de Gestão de Assinaturas', pageWidth / 2, y, { align: 'center' });
  doc.text(`Fatura gerada em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, y + 5, { align: 'center' });
  doc.text('Pagamento via PIX integrado com Mercado Pago', pageWidth / 2, y + 10, { align: 'center' });

  // Save
  const fileName = `Fatura_${data.planName.replace(/\s+/g, '_')}_${data.dueDate.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};
