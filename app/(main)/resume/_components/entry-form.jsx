"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { entrySchema } from "@/app/lib/schema";
import { Sparkles, PlusCircle, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const formatDisplayDate = (dateString) => {
  if (!dateString) return "";
  const date = parse(dateString, "yyyy-MM", new Date());
  return format(date, "MMM yyyy");
};

export function EntryForm({ type, entries, onChange, industry }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(entrySchema),
  });

  const current = watch("current");

  const handleAdd = handleSubmit((data) => {
    onChange([
      ...entries,
      {
        ...data,
        startDate: formatDisplayDate(data.startDate),
        endDate: data.current ? "" : formatDisplayDate(data.endDate),
      },
    ]);
    reset();
    setIsAdding(false);
  });

  const handleImproveDescription = async () => {
    const description = watch("description");
    if (!description) {
      toast.error("Please enter a description first");
      return;
    }

    try {
      setIsImproving(true);

      const res = await fetch("/api/ai/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current: description,
          type: type.toLowerCase(),
          industry,
        }),
      });

      if (!res.ok) throw new Error("AI improvement failed");

      const { improvedContent } = await res.json();
      setValue("description", improvedContent);
      toast.success("Description improved!");
    } catch (err) {
      toast.error(err.message || "Failed to improve description");
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {entries.map((item, index) => (
        <Card key={index}>
          <CardHeader className="flex justify-between">
            <CardTitle className="text-sm">
              {item.title} @ {item.organization}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {item.current
                ? `${item.startDate} - Present`
                : `${item.startDate} - ${item.endDate}`}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{item.description}</p>
          </CardContent>
        </Card>
      ))}

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Add {type}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Title" {...register("title")} />
            <Input placeholder="Organization" {...register("organization")} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="month" {...register("startDate")} />
              <Input type="month" {...register("endDate")} disabled={current} />
            </div>
            <Textarea
              placeholder={`Describe your ${type}`}
              {...register("description")}
            />

            <Button
              type="button"
              variant="ghost"
              onClick={handleImproveDescription}
              disabled={isImproving}
            >
              {isImproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Improving...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Improve with AI
                </>
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add
            </Button>
          </CardFooter>
        </Card>
      )}

      {!isAdding && (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add {type}
        </Button>
      )}
    </div>
  );
}
