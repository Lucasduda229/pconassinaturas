import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Column<T> {
  key: string;
  header: string;
  hideOnMobile?: boolean;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}

function DataTable<T extends { id: string }>({ 
  data, 
  columns, 
  onRowClick 
}: DataTableProps<T>) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={`text-muted-foreground font-medium whitespace-nowrap ${
                    column.hideOnMobile ? 'hidden sm:table-cell' : ''
                  }`}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow 
                key={item.id}
                className="border-border/30 hover:bg-secondary/30 cursor-pointer transition-colors"
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <TableCell 
                    key={column.key} 
                    className={`py-3 sm:py-4 ${
                      column.hideOnMobile ? 'hidden sm:table-cell' : ''
                    }`}
                  >
                    {column.render 
                      ? column.render(item) 
                      : (item as Record<string, unknown>)[column.key] as ReactNode
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default DataTable;
