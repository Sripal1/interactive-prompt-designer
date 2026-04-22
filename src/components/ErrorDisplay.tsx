interface Props {
  message: string;
}

export function ErrorDisplay({ message }: Props) {
  return (
    <div className="rounded-md border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.08)] p-3 text-[hsl(var(--danger))] text-sm font-sans">
      <div className="font-semibold mb-1">Run failed</div>
      <div className="whitespace-pre-wrap">{message}</div>
    </div>
  );
}
