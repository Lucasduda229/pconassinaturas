import jsPDF from 'jspdf';

interface InvoicePdfData {
  clientName: string;
  clientDocument: string | null;
  clientEmail: string;
  clientPhone: string | null;
  planName: string;
  value: number;
  dueDate: string;
  qrCodeBase64: string;
  pixCopyPaste: string;
  subscriptionId: string;
}

const drawIcon = (doc: jsPDF, type: 'arrow' | 'clock' | 'calendar' | 'dollar', x: number, y: number, size: number, color: [number, number, number]) => {
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  // Draw circle outline
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, r, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size * 0.7);
  doc.setTextColor(...color);

  if (type === 'arrow') doc.text('→', cx - size * 0.25, cy + size * 0.2);
  if (type === 'clock') doc.text('⏱', cx - size * 0.3, cy + size * 0.25);
  if (type === 'calendar') doc.text('📅', cx - size * 0.35, cy + size * 0.25);
  if (type === 'dollar') doc.text('$', cx - size * 0.18, cy + size * 0.25);
};

export const generateInvoicePDF = (data: InvoicePdfData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const primaryColor: [number, number, number] = [30, 79, 163];
  const pixColor: [number, number, number] = [50, 188, 173];
  const textColor: [number, number, number] = [33, 33, 33];
  const grayColor: [number, number, number] = [120, 120, 120];
  const white: [number, number, number] = [255, 255, 255];

  // ===== HEADER BAND (blue) =====
  const headerH = 50;
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...white);
  doc.text('P-CON', margin + 2, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('CONSTRUNET', margin + 2, 28);

  // Client info on the right side of header
  const infoX = 85;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...white);
  doc.text(data.clientName.toUpperCase(), infoX, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`CPF/CNPJ: ${data.clientDocument || 'Não informado'}`, infoX, 23);

  const clientCode = data.subscriptionId.split('-')[0].toUpperCase();
  doc.text(`Código do cliente: ${clientCode}`, infoX, 29);

  if (data.clientEmail) {
    doc.text(`E-mail: ${data.clientEmail}`, infoX, 35);
  }
  if (data.clientPhone) {
    doc.text(`Telefone: ${data.clientPhone}`, infoX, 41);
  }

  y = headerH + 8;

  // ===== INFO CARDS ROW =====
  // Código de cobrança | Referência | Vencimento | Valor
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(data.value);

  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dueParts = data.dueDate.split('/');
  const monthRef = dueParts.length >= 2 ? months[parseInt(dueParts[1], 10) - 1] || '' : '';

  // Background box for info cards
  doc.setFillColor(240, 243, 248);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F');
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'S');

  const cardW = contentWidth / 4;
  const cardData = [
    { label: 'Código de cobrança', value: clientCode, icon: '→' },
    { label: `Referência: ${monthRef}`, value: data.dueDate, icon: '◷' },
    { label: 'Vencimento', value: data.dueDate, icon: '▣' },
    { label: 'Valor', value: formattedValue, icon: '$' },
  ];

  cardData.forEach((card, i) => {
    const cx = margin + cardW * i;

    // Vertical separator
    if (i > 0) {
      doc.setDrawColor(200, 210, 225);
      doc.setLineWidth(0.3);
      doc.line(cx, y + 4, cx, y + 24);
    }

    // Icon circle
    const iconX = cx + 6;
    const iconY = y + 8;
    doc.setDrawColor(...primaryColor);
    doc.setFillColor(...white);
    doc.setLineWidth(0.5);
    doc.circle(iconX, iconY + 3, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...primaryColor);
    doc.text(card.icon, iconX - 1.5, iconY + 4.5);

    // Label
    const textX = iconX + 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...grayColor);
    doc.text(card.label, textX, y + 9);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text(card.value, textX, y + 16);
  });

  y += 36;

  // ===== PIX SECTION =====
  doc.setFillColor(235, 245, 255);
  doc.roundedRect(margin, y, contentWidth, 85, 2, 2, 'F');
  doc.setDrawColor(180, 200, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 85, 2, 2, 'S');

  // Pix icon + title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('◆  Pague com Pix', margin + 5, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('Leia o QR Code com seu celular.', margin + 5, y + 18);
  doc.text('A liquidação da fatura é instantânea!', margin + 5, y + 23);

  // Pix copia e cola label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text('Pix copia e cola', margin + 5, y + 33);

  // Pix code
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...grayColor);
  const maxPixWidth = contentWidth - 60;
  const pixLines = doc.splitTextToSize(data.pixCopyPaste, maxPixWidth);
  doc.text(pixLines, margin + 5, y + 40);

  // QR Code on the right
  if (data.qrCodeBase64) {
    try {
      const qrSrc = data.qrCodeBase64.startsWith('data:')
        ? data.qrCodeBase64
        : `data:image/png;base64,${data.qrCodeBase64}`;
      const qrSize = 45;
      const qrX = pageWidth - margin - qrSize - 5;
      const qrY = y + 10;
      doc.addImage(qrSrc, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.error('Error adding QR code to PDF:', e);
    }
  }

  y += 93;

  // ===== PLAN INFO =====
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('Plano:', margin + 5, y + 7);
  doc.setTextColor(...textColor);
  doc.text(data.planName, margin + 22, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Total:', margin + 5, y + 14);
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text(formattedValue, margin + 22, y + 14);

  y += 26;

  // ===== FOOTER =====
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.text('P-CON CONSTRUNET - Sistema de Gestão de Assinaturas', pageWidth / 2, y, { align: 'center' });
  doc.text(
    `Fatura gerada em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    pageWidth / 2, y + 5, { align: 'center' }
  );
  doc.text('Pagamento via PIX integrado com Mercado Pago', pageWidth / 2, y + 10, { align: 'center' });

  // Save
  const fileName = `Fatura_${data.planName.replace(/\s+/g, '_')}_${data.dueDate.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};
