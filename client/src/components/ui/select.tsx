export function Select() {
  return <select />;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function SelectItem({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function SelectTrigger({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}

export function SelectValue({ children }: { children: React.ReactNode }) {
  return <span>{children}</span>;
}