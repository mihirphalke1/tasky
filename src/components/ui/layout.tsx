import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  spacing?: "none" | "sm" | "md" | "lg";
}

// Standardized container with consistent responsive padding
export const Container: React.FC<ContainerProps> = ({
  children,
  className,
  size = "lg",
  padding = "md",
}) => {
  const sizeClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-none",
  };

  const paddingClasses = {
    none: "",
    sm: "px-3 sm:px-4 md:px-6",
    md: "px-4 sm:px-6 md:px-8 lg:px-10",
    lg: "px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16",
  };

  return (
    <div
      className={cn(
        "container mx-auto",
        sizeClasses[size],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

// Standardized page wrapper with consistent vertical spacing
export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn("min-h-screen bg-[#FAF8F6] dark:bg-gray-900", className)}
    >
      {children}
    </div>
  );
};

// Standardized section with consistent spacing
export const Section: React.FC<SectionProps> = ({
  children,
  className,
  spacing = "md",
}) => {
  const spacingClasses = {
    none: "",
    sm: "py-3 sm:py-4",
    md: "py-4 sm:py-6 md:py-8",
    lg: "py-6 sm:py-8 md:py-12",
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>{children}</div>
  );
};

// Standardized card padding
export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}> = ({ children, className, padding = "md" }) => {
  const paddingClasses = {
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  return (
    <div className={cn(paddingClasses[padding], className)}>{children}</div>
  );
};

// Standardized responsive grid
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
  cols?: "1" | "2" | "3" | "4" | "auto";
  gap?: "sm" | "md" | "lg";
}> = ({ children, className, cols = "auto", gap = "md" }) => {
  const colClasses = {
    "1": "grid-cols-1",
    "2": "grid-cols-1 md:grid-cols-2",
    "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    auto: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  const gapClasses = {
    sm: "gap-3 sm:gap-4",
    md: "gap-4 sm:gap-6",
    lg: "gap-6 sm:gap-8",
  };

  return (
    <div className={cn("grid", colClasses[cols], gapClasses[gap], className)}>
      {children}
    </div>
  );
};

// Standardized flex layouts
export const FlexContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  direction?: "row" | "col";
  justify?: "start" | "center" | "end" | "between" | "around";
  align?: "start" | "center" | "end" | "stretch";
  gap?: "sm" | "md" | "lg";
  wrap?: boolean;
}> = ({
  children,
  className,
  direction = "row",
  justify = "start",
  align = "start",
  gap = "md",
  wrap = false,
}) => {
  const directionClasses = {
    row: "flex-row",
    col: "flex-col",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  const gapClasses = {
    sm: "gap-2 sm:gap-3",
    md: "gap-3 sm:gap-4 md:gap-6",
    lg: "gap-4 sm:gap-6 md:gap-8",
  };

  return (
    <div
      className={cn(
        "flex",
        directionClasses[direction],
        justifyClasses[justify],
        alignClasses[align],
        gapClasses[gap],
        wrap && "flex-wrap",
        className
      )}
    >
      {children}
    </div>
  );
};
