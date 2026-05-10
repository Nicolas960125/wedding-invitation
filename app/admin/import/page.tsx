import Link from 'next/link';
import { CsvUploader } from './_components/CsvUploader';

export default function AdminImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Importar invitados</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Subi un CSV con la lista. Cada fila es un invitado primario + N acompañantes.
        </p>
      </div>
      <div className="bg-muted/30 rounded-md border p-4">
        <h2 className="font-medium">Formato esperado</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Columnas: <code>Nombre, Parentezco, Acompañante, Nombre acompañantes</code>. Encoding
          UTF-8.
        </p>
        <Link href="/csv-template.csv" className="mt-3 inline-block text-sm underline">
          Descargar template
        </Link>
      </div>
      <CsvUploader />
    </div>
  );
}
