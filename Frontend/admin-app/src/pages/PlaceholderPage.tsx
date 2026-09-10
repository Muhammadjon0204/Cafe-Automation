interface PlaceholderPageProps {
  title: string;
  note: string;
}

export function PlaceholderPage({ title, note }: PlaceholderPageProps) {
  return (
    <div className="page-state">
      <h1>{title}</h1>
      <p>{note}</p>
    </div>
  );
}
