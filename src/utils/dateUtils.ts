import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data no padrão brasileiro sem alterar o dia
 * Para datas que são apenas "YYYY-MM-DD", evita problemas de timezone
 */
export const formatBrazilDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!date) return '';
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Se for uma string no formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
    // Adiciona o horário de meio-dia para evitar problemas de timezone
    if (date.includes('T')) {
      // É um datetime completo, usa direto
      dateObj = new Date(date);
    } else {
      // É apenas uma data, adiciona horário para evitar offset
      dateObj = new Date(date + 'T12:00:00');
    }
  } else {
    dateObj = date;
  }
  
  return format(dateObj, formatStr, { locale: ptBR });
};

/**
 * Formata data e hora no padrão brasileiro
 */
export const formatBrazilDateTime = (date: Date | string): string => {
  return formatBrazilDate(date, "dd/MM/yyyy 'às' HH:mm");
};

/**
 * Retorna a data atual
 */
export const getBrazilNow = (): Date => {
  return new Date();
};

/**
 * Converte para Date object de forma segura
 */
export const toBrazilTime = (date: Date | string): Date => {
  if (typeof date === 'string') {
    if (date.includes('T')) {
      return new Date(date);
    }
    return new Date(date + 'T12:00:00');
  }
  return date;
};

/**
 * Formata data para exibição relativa (ex: "há 2 dias")
 */
export const formatRelativeDate = (date: Date | string): string => {
  const dateObj = toBrazilTime(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  return formatBrazilDate(date);
};
