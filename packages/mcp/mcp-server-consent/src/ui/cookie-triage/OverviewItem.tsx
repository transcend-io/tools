interface OverviewItemProps {
  label: string;
  value: number;
}

export const OverviewItem = ({ label, value }: OverviewItemProps) => {
  return (
    <div className="flex min-w-16 flex-col gap-1 border border-line-subtle rounded-md p-2 grow-0 shrink-0 basis-[108px]">
      <div className="text-sm text-content uppercase">{label}</div>
      <div className="text-heading-md text-content">{value}</div>
    </div>
  );
};
