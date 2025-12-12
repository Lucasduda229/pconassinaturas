import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Fuso horário do Brasil (Brasília)
const BRAZIL_TIMEZONE_OFFSET = -3; // UTC-3

/**
 * Converte uma data UTC para o horário de Brasília
 */
export const toBrazilTime = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (BRAZIL_TIMEZONE_OFFSET * 3600000));
};

/**
 * Formata uma data no padrão brasileiro com fuso horário correto
 */
export const formatBrazilDate = (date: Date | string, formatStr: string = 'dd/MM/yyyy'): string => {
  const brazilDate = toBrazilTime(date);
  return format(brazilDate, formatStr, { locale: ptBR });
};

/**
 * Formata data e hora no padrão brasileiro
 */
export const formatBrazilDateTime = (date: Date | string): string => {
  return formatBrazilDate(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Retorna a data atual no fuso horário do Brasil
 */
export const getBrazilNow = (): Date => {
  return toBrazilTime(new Date());
};

/**
 * Formata data para exibição relativa (ex: "há 2 dias")
 */
export const formatRelativeDate = (date: Date | string): string => {
  const brazilDate = toBrazilTime(date);
  const now = getBrazilNow();
  const diffMs = now.getTime() - brazilDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  return formatBrazilDate(date);
};
