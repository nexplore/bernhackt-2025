import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DataSource = 'static' | 'mapped';

interface ProjectSelectionProps {
  selectedDataSource: DataSource;
  onDataSourceChange: (dataSource: DataSource) => void;
}

export function ProjectSelection({ selectedDataSource, onDataSourceChange }: ProjectSelectionProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Data Source</SidebarGroupLabel>
      <SidebarGroupContent>
        <Select value={selectedDataSource} onValueChange={onDataSourceChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select data source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="static">Static Example Data</SelectItem>
            <SelectItem value="mapped">Real Project Data</SelectItem>
          </SelectContent>
        </Select>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}