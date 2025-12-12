"use client"
import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useCategoryColor } from "@/hooks/useCategoryColor"
interface ComboboxProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}
const ComboboxItem = ({ option, value, onSelect }: { option: { value: string; label: string }, value: string, onSelect: (currentValue: string) => void }) => {
  const colorClass = useCategoryColor(option.value);
  return (
    <CommandItem
      key={option.value}
      value={option.value}
      onSelect={onSelect}
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          value === option.value ? "opacity-100" : "opacity-0"
        )}
      />
      <div className={cn("mr-2 w-3 h-3 rounded-full opacity-70", colorClass)} aria-hidden="true" />
      {option.label}
    </CommandItem>
  );
};
export function Combobox({ options, value, onChange, placeholder = "Select an option...", disabled = false }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar o crear..." />
          <CommandList>
            <CommandEmpty>No se encontró la categoría.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <ComboboxItem
                  key={option.value}
                  option={option}
                  value={value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}