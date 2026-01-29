import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Converte uma string de data para Date de forma segura, evitando problemas de timezone
 */
export const parseDate = (date: Date | string): Date => {
  if (!date) return new Date();
  
  if (date instanceof Date) return date;
  
  // Se for uma string no formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
  if (typeof date === 'string') {
    // Se contém 'T', é um datetime completo - usa parseISO
    if (date.includes('T')) {
      return parseISO(date);
    }
    // Se é apenas uma data (YYYY-MM-DD), adiciona horário de meio-dia para evitar problemas de timezone
    return new Date(date + 'T12:00:00');
  }
  
  return new Date(date);
};

/**
 * Formata uma data no padrão brasileiro sem alterar o dia
 * Para datas que são apenas "YYYY-MM-DD", evita problemas de timezone
 */
export const formatBrazilDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!date) return '';
  
  const dateObj = parseDate(date);
  
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
  return parseDate(date);
};

/**
 * Formata data para exibição relativa (ex: "há 2 dias")
 */
export const formatRelativeDate = (date: Date | string): string => {
  const dateObj = parseDate(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  return formatBrazilDate(date);
};

/**
 * Formata uma data para o formato aceito pelo input type="date" (yyyy-MM-dd)
 * Corrige problemas de timezone ao converter para string de input
 */
export const formatDateForInput = (date: Date | string): string => {
  if (!date) return '';
  
  const dateObj = parseDate(date);
  
  // Usa getFullYear, getMonth, getDate para evitar problemas de timezone
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Converte uma data de input type="date" para ISO string segura
 * Mantém a data exata selecionada sem alterações de timezone
 */
export const inputDateToISO = (inputDate: string): string => {
  if (!inputDate) return '';
  
  // inputDate está no formato yyyy-MM-dd
  // Retorna diretamente com horário de meio-dia UTC para garantir que a data não mude
  return `${inputDate}T12:00:00.000Z`;
};
